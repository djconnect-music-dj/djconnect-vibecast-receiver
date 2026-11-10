import {bindPageLifecycle} from './page-lifecycle.mjs';
import {renderState, observeQRLayout} from './view.mjs';
import { BootstrapController, unavailableAdapter } from './lifecycle.mjs';
import { createRendezvousAdapter } from './rendezvous.mjs';
import { createReloadState } from './reload-state.mjs';
import { selectLocale } from './locales.mjs';
import { createEffectsUpdater } from './effects.mjs';
// Discard unsolicited URL input without interpreting it as a destination.
if(location.search || location.hash) history.replaceState(null,'',location.pathname);
const byId = id => document.getElementById(id);
let language = selectLocale(navigator.language), current = {state:'initializing'};
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const contrast = matchMedia('(prefers-contrast: more)');
const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
function paint(){ renderState(document,language,current); }

let displayedMinute, clockLanguage;
function updateClock() {
 const now = new Date();
 const minute = Math.floor(now.getTime()/60000);
 if (minute === displayedMinute && language === clockLanguage) return;
 displayedMinute = minute;
 clockLanguage = language;
 byId('screen-time').textContent = now.toLocaleTimeString(language, {hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 byId('screen-date').textContent = now.toLocaleDateString(language, {weekday:'long',day:'numeric',month:'long'});
}

observeQRLayout(document, () => { if (['waiting','confirming'].includes(current.state)) paint(); });
const productionOrigin = 'https://vibecast.tv';
const reloadState = location.origin === productionOrigin ? createReloadState() : null;
const factory = () => location.origin === productionOrigin ? createRendezvousAdapter({reloadState}) : unavailableAdapter;
const controller = new BootstrapController({
 adapter: factory(), adapterFactory: factory, autoRotate: true, render: state => {current=state;paint();},
 navigate: url => { if (location.origin === productionOrigin) location.replace(url); },
});
function supported() {
 return isSecureContext && !!globalThis.crypto?.subtle && typeof AbortController === 'function' && typeof URL === 'function' && !!byId('qr').getContext?.('2d');
}
const effects = createEffectsUpdater({
 readPreferences: () => ({
  supported: globalThis.CSS?.supports?.('backdrop-filter','blur(1px)') || globalThis.CSS?.supports?.('-webkit-backdrop-filter','blur(1px)'),
  reduced: motion.matches || transparency.matches,
  highContrast: contrast.matches,
 }),
 apply: mode => { document.documentElement.dataset.effects = mode; },
});
byId('language').addEventListener('change',event => {language=selectLocale(event.target.value);paint();updateClock();});
for(const preference of [motion,contrast,transparency]) preference.addEventListener?.('change',effects);
bindPageLifecycle(controller);
updateClock();
setInterval(updateClock, 1000);
paint();effects();void controller.start(supported());
