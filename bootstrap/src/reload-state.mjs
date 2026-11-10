// One browser-owned record per tab. The page session holds the encryption key;
// IndexedDB keeps the nonextractable RSA object and encrypted invitation.
const storageKey = 'vibecast-qr-resume-v1';
const namePrefix = 'vibecast-qr:';
const token = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

async function importEncryption(value) {
  if (typeof value !== 'string') throw Error('reload encryption key missing');
  const raw = Uint8Array.from(atob(value), c=>c.charCodeAt(0));
  if (raw.length !== 32) throw Error('reload encryption key missing');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']);
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('reload database unavailable'));
  });
}

async function openJournal() {
  const request = indexedDB.open(storageKey, 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore('invitations').createIndex('expiry', 'expiry');
  };
  return requestResult(request);
}

function write(database, apply) {
  const transaction = database.transaction('invitations', 'readwrite', {durability:'strict'});
  if (transaction.durability !== 'strict') {
    transaction.abort();
    throw Error('reload durable storage unavailable');
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
    apply(transaction.objectStore('invitations'));
  });
}

function rotationDeadline(invitation) {
  if (typeof invitation.pollPending !== 'boolean' || invitation.consumeStarted !== false ||
      !Number.isSafeInteger(invitation.expires) || !Number.isFinite(invitation.deadline)) return null;
  return {expires: invitation.expires, deadline: invitation.deadline};
}

async function waitForDeadline(value, signal) {
  if (!Number.isSafeInteger(value?.expires) || !Number.isFinite(value?.deadline)) throw Error('reload deadline rejected');
  while (!reachedDeadline(value)) {
    if (signal.aborted) throw Error('reload interrupted');
    const remaining = Math.max(value.expires - Date.now(), value.deadline - performance.timeOrigin - performance.now());
    if (!Number.isFinite(remaining) || remaining > 120000) throw Error('reload deadline rejected');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, remaining);
      function abort() {
        clearTimeout(timer);
        reject(Error('reload interrupted'));
      }
      signal.addEventListener('abort', abort, {once:true});
    });
  }
  if (signal.aborted) throw Error('reload interrupted');
}

function reachedDeadline(value) {
  return Number.isSafeInteger(value?.expires) && Number.isFinite(value?.deadline) &&
    value.expires <= Date.now() && value.deadline <= performance.timeOrigin + performance.now();
}

export function createReloadState() {
  const kind = performance.getEntriesByType('navigation')[0]?.type;
  if (kind !== 'navigate' && kind !== 'reload') return {async open() { throw Error('reload context rejected'); }};
  const entry = globalThis.navigation?.currentEntry?.key;
  if (!entry || !globalThis.indexedDB || !navigator.locks) {
    return kind === 'reload' ? {async open() { throw Error('reload context unavailable'); }} : null;
  }

  let initialization, first = true, generation = 0, encryption, cleanup;
  async function initialize(signal) {
    if (window !== top || signal.aborted) throw Error('reload context rejected');
    let marker;
    if (kind === 'reload') {
      marker = JSON.parse(sessionStorage.getItem(storageKey));
      if (marker?.entry !== entry || window.name !== namePrefix + marker.tab) throw Error('reload context rejected');
      if (typeof marker.tab !== 'string' || atob(marker.tab).length !== 32) throw Error('reload context rejected');
    } else {
      if (window.name && !window.name.startsWith(namePrefix)) throw Error('named tab unavailable');
      marker = {entry, tab:token()};
      window.name = namePrefix + marker.tab;
      sessionStorage.setItem(storageKey, JSON.stringify(marker));
    }
    const {tab} = marker;
    // Keep the exclusive lock for this document's lifetime. The browser
    // releases it on unload after terminating the old document.
    await new Promise((resolve, reject) => {
      navigator.locks.request(namePrefix + tab, {ifAvailable:true}, lock => {
        if (!lock) return reject(Error('reload already owned'));
        resolve();
        return new Promise(() => {});
      }).catch(reject);
    });
    const additionalData = new TextEncoder().encode(JSON.stringify([location.origin, entry, tab]));
    const database = await openJournal();
    return {tab,marker,additionalData,database};
  }

  async function clear(expected, restart = null) {
    if (!initialization) return;
    const {tab,marker,database} = await initialization;
    await write(database, store => {
      if (expected !== generation) return;
      clearTimeout(cleanup);
      generation++;
      encryption = null;
      // Replace the key and marker together. If a reload interrupts deletion,
      // the next document still must delete the sealed record before creating.
      delete marker.encryption;
      if (restart) marker.restart = restart;
      else delete marker.restart;
      sessionStorage.setItem(storageKey, JSON.stringify(marker));
      store.delete(tab);
    });
  }

  function scheduleCleanup(invitation, expected) {
    const expire = () => {
      if (expected !== generation) return;
      const remaining = Math.min(invitation.expires-Date.now(),invitation.deadline-performance.timeOrigin-performance.now());
      if (remaining > 0) cleanup = setTimeout(expire,remaining);
      else void clear(expected, rotationDeadline(invitation)).catch(()=>{});
    };
    clearTimeout(cleanup);
    expire();
  }

  return {
    async open(signal) {
      initialization ??= initialize(signal);
      const {tab,marker,additionalData,database} = await initialization;
      let read = first && kind === 'reload';
      first = false;
      const expected = ++generation;
      clearTimeout(cleanup);
      const startFresh = async () => {
        delete marker.restart;
        marker.encryption = token();
        sessionStorage.setItem(storageKey, JSON.stringify(marker));
        return importEncryption(marker.encryption);
      };
      if (read && !marker.encryption && marker.restart) {
        await waitForDeadline(marker.restart, signal);
        read = false;
      }
      encryption = await (read ? importEncryption(marker.encryption) : startFresh());
      await write(database, store => {
        if (!read) store.delete(tab);
        const request = store.index('expiry').openKeyCursor(IDBKeyRange.upperBound(Date.now()));
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (cursor.primaryKey !== tab) store.delete(cursor.primaryKey);
          cursor.continue();
        };
      });
      if (!read) return null;
      const stored = await requestResult(database.transaction('invitations').objectStore('invitations').get(tab));
      if (!stored) throw Error('reload invitation missing');
      const plaintext = await crypto.subtle.decrypt({name:'AES-GCM',iv:stored.iv,additionalData}, encryption, stored.sealed);
      const invitation = JSON.parse(new TextDecoder().decode(plaintext));
      if (invitation.expires !== stored.expiry) throw Error('reload expiry mismatch');
      if (invitation.pollPending === true) {
        const restart = rotationDeadline(invitation);
        if (!restart) throw Error('unresolved consume or invalid invitation');
        // The missing poll response may have carried a backoff. Retire this
        // invitation without another poll and wait out both original deadlines.
        await clear(expected, restart);
        await waitForDeadline(restart, signal);
        encryption = await startFresh();
        return null;
      }
      const remaining = Math.min(invitation.expires-Date.now(),invitation.deadline-performance.timeOrigin-performance.now());
      if (remaining <= 0) {
        const restart = rotationDeadline(invitation);
        await clear(expected);
        if (reachedDeadline(restart)) {
          encryption = await startFresh();
          return null;
        }
        throw Error('reload invitation expired');
      }
      scheduleCleanup(invitation,expected);
      return {...invitation,key:stored.key};
    },
    async save({key, ...invitation}) {
      const expected = generation, secret = encryption;
      const {tab,additionalData,database} = await initialization;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode(JSON.stringify(invitation));
      const sealed = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData}, secret, plaintext);
      await write(database, store => {
        if (expected === generation) store.put({key,iv,sealed,expiry:invitation.expires},tab);
      });
      if (expected !== generation) throw Error('reload record superseded');
      scheduleCleanup(invitation,expected);
    },
    clear() { return clear(generation); },
  };
}
