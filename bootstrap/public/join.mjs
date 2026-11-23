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
 en: {title:'Join VibeCast Live',intro:'Open DJConnect to confirm joining this session as a guest.',open:'Open DJConnect',install:'Install DJConnect',rescan:'After installing the app, scan the current QR code on the TV again.',invalid:'Scan a new QR code on the TV to join.',privacy:'This page does not join the session or retain your invitation.',note:'Joining is confirmed in the app. No PIN is needed.'},
 nl: {title:'Deelnemen aan VibeCast Live',intro:'Open DJConnect om deelname aan deze sessie als gast te bevestigen.',open:'Open DJConnect',install:'Installeer DJConnect',rescan:'Scan na het installeren van de app opnieuw de actuele QR-code op de tv.',invalid:'Scan een nieuwe QR-code op de tv om deel te nemen.',privacy:'Deze pagina meldt je niet aan en bewaart je uitnodiging niet.',note:'Je bevestigt deelname in de app. Een pincode is niet nodig.'},
 de: {title:'VibeCast Live beitreten',intro:'Öffne DJConnect, um die Teilnahme an dieser Sitzung als Gast zu bestätigen.',open:'DJConnect öffnen',install:'DJConnect installieren',rescan:'Scanne nach der Installation der App erneut den aktuellen QR-Code auf dem Fernseher.',invalid:'Scanne einen neuen QR-Code auf dem Fernseher, um beizutreten.',privacy:'Diese Seite tritt der Sitzung nicht bei und speichert deine Einladung nicht.',note:'Du bestätigst die Teilnahme in der App. Eine PIN ist nicht nötig.'},
 fr: {title:'Rejoindre VibeCast Live',intro:'Ouvre DJConnect pour confirmer ta participation à cette session en tant qu’invité.',open:'Ouvrir DJConnect',install:'Installer DJConnect',rescan:'Après avoir installé l’app, scanne à nouveau le QR code actuel sur le téléviseur.',invalid:'Scanne un nouveau QR code sur le téléviseur pour participer.',privacy:'Cette page ne rejoint pas la session et ne conserve pas ton invitation.',note:'Tu confirmes ta participation dans l’app. Aucun code PIN n’est nécessaire.'},
 es: {title:'Unirse a VibeCast Live',intro:'Abre DJConnect para confirmar que deseas unirte a esta sesión como invitado.',open:'Abrir DJConnect',install:'Instalar DJConnect',rescan:'Después de instalar la app, vuelve a escanear el código QR actual del televisor.',invalid:'Escanea un nuevo código QR del televisor para unirte.',privacy:'Esta página no se une a la sesión ni guarda tu invitación.',note:'Confirmas que deseas unirte en la app. No se necesita PIN.'},
});

export function startNativeJoinPage({window, document, navigate = url => window.location.assign(url)}) {
 const language = String(window.navigator.language || 'en').toLowerCase().split('-')[0];
 const copy = joinCopy[language] || joinCopy.en;
 document.documentElement.lang = Object.hasOwn(joinCopy,language) ? language : 'en';
 document.title = copy.title;
 for (const key of ['title','intro','open','install','rescan','privacy','note']) document.getElementById('join-'+key).textContent = copy[key];
 const button = document.getElementById('join-open'), status = document.getElementById('join-status');
 const install = document.getElementById('join-install'); install.href = appStoreURL;
 let invitation = null, timer, lastInvitationKey;
 function clear() {
  invitation?.clear(); invitation = null; button.disabled = true;
  if (timer) window.clearTimeout(timer);
  timer = null; status.textContent = copy.invalid;
 }
 function receive() {
  clear();
  try {
   const fragment = window.location.hash;
   // Erase the entire input before validation, displaying links or navigation.
   const allowed = window.location.origin === 'https://vibecast.tv' && window.location.pathname === '/join' && !window.location.search;
   window.history.replaceState(null,'','/join');
   if (!allowed) throw Error('invalid_invitation');
   const locator = parseNativeJoinFragment(fragment), key = locator.issuer_epoch+':'+locator.invitation_id;
   // An equivalent fragment must not renew an exposed/spent invitation.
   if (key === lastInvitationKey) return;
   invitation = new NativeJoinInvitation(fragment); lastInvitationKey = key;
   button.disabled = false; status.textContent = '';
   timer = window.setTimeout(clear,120_000);
  } catch { clear(); }
 }
 receive();
 button.addEventListener('click',() => {
  const link = invitation?.take(); clear();
  if (link) navigate(link);
 });
 window.addEventListener('pagehide',clear);
 // A camera scan can reuse an existing tab and change only its fragment.
 window.addEventListener('hashchange',receive);
 document.addEventListener('visibilitychange',() => { if (document.hidden) clear(); });
 return {clear};
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') startNativeJoinPage({window,document});
