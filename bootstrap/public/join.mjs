// Consumer of Core's VIBECAST_NATIVE_GUEST_UI_V1 contract. No guest admission,
// session content, service request or durable invitation storage lives here.
const fields = ['v','ha_url','issuer_epoch','invitation_id','invitation_secret'];
export const appStoreURL = 'https://apps.apple.com/app/id6832635823';
export function parseNativeJoinFragment(fragment) {
 if (typeof fragment !== 'string' || fragment.length < 2 || fragment.length > 2048 || fragment[0] !== '#') throw Error('invalid_invitation');
 const values = Object.create(null), parts = fragment.slice(1).split('&');
 if (parts.length !== fields.length) throw Error('invalid_invitation');
 for (const part of parts) {
  const index = part.indexOf('='), key = part.slice(0,index);
  if (index < 1 || !fields.includes(key) || Object.hasOwn(values,key)) throw Error('invalid_invitation');
  let value; try { value = decodeURIComponent(part.slice(index+1)); } catch { throw Error('invalid_invitation'); }
  values[key] = value;
 }
 if (values.v !== '1' || !/^[A-Za-z0-9_-]{43}$/.test(values.issuer_epoch) ||
     !/^[A-Za-z0-9_-]{32}$/.test(values.invitation_id) || !/^[A-Za-z0-9_-]{43}$/.test(values.invitation_secret) ||
     values.ha_url.length > 1024 || /[\s\\]/.test(values.ha_url)) throw Error('invalid_invitation');
 let origin; try { origin = new URL(values.ha_url); } catch { throw Error('invalid_invitation'); }
 if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
     ![origin.origin,origin.origin+'/'].includes(values.ha_url)) throw Error('invalid_invitation');
 return Object.freeze({...values});
}

// This RAM ceiling never renews the producer's invitation or asserts that it
// remains redeemable. Only Core can check its original expiry and single use.
export class NativeJoinInvitation {
 #link; #deadline; #clock;
 constructor(fragment, clock = () => performance.now()) {
  parseNativeJoinFragment(fragment);
  this.#clock = clock; this.#deadline = clock()+120_000;
  this.#link = 'djconnect://join'+fragment;
 }
 get available() { return this.#link !== null && this.#clock() < this.#deadline; }
 take() { const link = this.available ? this.#link : null; this.clear(); return link; }
 clear() { this.#link = null; }
}

export const joinCopy = Object.freeze({
 en: {title:'Join VibeCast Party',open:'Open DJConnect',install:'Install DJConnect',rescan:'Scan the TV QR code again after installation.',invalid:'Scan a new QR code on the TV.'},
 nl: {title:'Deelnemen aan VibeCast Party',open:'Open DJConnect',install:'Installeer DJConnect',rescan:'Scan na installatie opnieuw de QR-code op de tv.',invalid:'Scan een nieuwe QR-code op de tv.'},
 de: {title:'VibeCast Party beitreten',open:'DJConnect öffnen',install:'DJConnect installieren',rescan:'Scanne nach der Installation erneut den QR-Code auf dem Fernseher.',invalid:'Scanne einen neuen QR-Code auf dem Fernseher.'},
 fr: {title:'Rejoindre VibeCast Party',open:'Ouvrir DJConnect',install:'Installer DJConnect',rescan:'Après l’installation, scanne à nouveau le code QR sur le téléviseur.',invalid:'Scanne un nouveau code QR sur le téléviseur.'},
 es: {title:'Unirse a VibeCast Party',open:'Abrir DJConnect',install:'Instalar DJConnect',rescan:'Vuelve a escanear el código QR del televisor tras la instalación.',invalid:'Escanea un nuevo código QR del televisor.'},
});

export function startNativeJoinPage({window, document, navigate = url => window.location.assign(url)}) {
 const language = String(window.navigator.language || 'en').toLowerCase().split('-')[0];
 const copy = joinCopy[language] || joinCopy.en;
 document.documentElement.lang = Object.hasOwn(joinCopy,language) ? language : 'en';
 document.title = copy.title;
 document.getElementById('join-title').textContent = copy.title;
 document.getElementById('join-open-label').textContent = copy.open;
 document.getElementById('join-install-label').textContent = copy.install;
 const rescan = document.getElementById('join-rescan');
 rescan.textContent = copy.rescan;
 const button = document.getElementById('join-open'), status = document.getElementById('join-status');
 const install = document.getElementById('join-install');
 let invitation = null, timer, lastInvitationKey;
 function clear() {
  invitation?.clear(); invitation = null; button.disabled = true;
  if (timer) window.clearTimeout(timer);
  timer = null; status.textContent = copy.invalid; rescan.hidden = true;
 }
 function receive() {
  clear();
  install.removeAttribute('href'); install.setAttribute('aria-disabled','true');
  try {
   const fragment = window.location.hash;
   // Erase the entire input before validation, displaying links or navigation.
   const allowed = window.location.origin === 'https://vibecast.tv' && window.location.pathname === '/join' && !window.location.search;
   window.history.replaceState(null,'','/join');
   install.href = appStoreURL; install.removeAttribute('aria-disabled');
   if (!allowed) throw Error('invalid_invitation');
   const locator = parseNativeJoinFragment(fragment), key = locator.issuer_epoch+':'+locator.invitation_id;
   // An equivalent fragment must not renew an exposed/spent invitation.
   if (key === lastInvitationKey) return;
   invitation = new NativeJoinInvitation(fragment); lastInvitationKey = key;
   button.disabled = false; status.textContent = ''; rescan.hidden = false;
   timer = window.setTimeout(clear,120_000);
  } catch { clear(); }
 }
 receive();
 button.addEventListener('click',() => {
  // Recheck erasure at the actual external-navigation boundary as well.
  if (window.location.hash || window.location.search) { receive(); return; }
  try { window.history.replaceState(null,'','/join'); } catch { clear(); return; }
  const link = invitation?.take(); clear();
  if (link) navigate(link);
 });
 install.addEventListener('click',event => {
  try { window.history.replaceState(null,'','/join'); } catch { event.preventDefault(); }
  clear();
 });
 window.addEventListener('pagehide',clear);
 // A camera scan can reuse an existing tab and change only its fragment.
 window.addEventListener('hashchange',receive);
 document.addEventListener('visibilitychange',() => { if (document.hidden) clear(); });
 return {clear};
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') startNativeJoinPage({window,document});
