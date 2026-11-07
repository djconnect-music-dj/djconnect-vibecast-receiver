import {bindPageLifecycle} from './page-lifecycle.mjs';
import {renderState, observeQRLayout} from './view.mjs';
import { BootstrapController, unavailableAdapter } from './lifecycle.mjs';
import { selectLocale } from './locales.mjs';
import { createEffectsUpdater } from './effects.mjs';
// Discard unsolicited URL input without interpreting it as a destination.
if(location.search || location.hash) history.replaceState(null,'',location.pathname);
const byId = id => document.getElementById(id);
let language = selectLocale(navigator.language), current = {state:'initializing'}, fewer = false;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const contrast = matchMedia('(prefers-contrast: more)');
const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
function paint(){ renderState(document,language,current); }

observeQRLayout(document, () => { if (['waiting','confirming'].includes(current.state)) paint(); });
const controller = new BootstrapController({ adapter: unavailableAdapter, render: state => {current=state;paint();}, navigate: url => location.replace(url) });
function supported() {
 return isSecureContext && !!globalThis.crypto?.subtle && typeof AbortController === 'function' && typeof URL === 'function' && !!byId('qr').getContext?.('2d');
}
const effects = createEffectsUpdater({
 readPreferences: () => ({
  supported: globalThis.CSS?.supports?.('backdrop-filter','blur(1px)') || globalThis.CSS?.supports?.('-webkit-backdrop-filter','blur(1px)'),
  reduced: fewer || motion.matches || transparency.matches,
  highContrast: contrast.matches,
 }),
 apply: mode => { document.documentElement.dataset.effects = mode; },
});
byId('language').addEventListener('change',event => {language=selectLocale(event.target.value);paint();});
byId('effects').addEventListener('click',() => {fewer=!fewer;byId('effects').setAttribute('aria-pressed',String(fewer));effects();});
byId('retry').addEventListener('click',() => {void (current.state==='recovering' ? controller.reconnect() : controller.start(supported(),{explicit:true}));});
for(const preference of [motion,contrast,transparency]) preference.addEventListener?.('change',effects);
bindPageLifecycle(controller);
paint();effects();void controller.start(supported());
