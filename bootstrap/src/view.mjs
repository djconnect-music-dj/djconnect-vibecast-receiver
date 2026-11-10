import { locales } from './locales.mjs';
export function renderState(document, language, current) {
 const byId = id => document.getElementById(id);
 const copy = locales[language]; document.documentElement.lang = language;
 byId('language').value = language;
 byId('privacy').textContent = copy.privacy;
 byId('language-label').textContent = copy.language; byId('state-label').textContent = copy.stateLabel;
 const pairing = ['creating','waiting','confirming','received','redirecting','recovering'].includes(current.state);
 byId('hero-tagline').textContent = copy.heroTagline;
 byId('screen-mode').textContent = pairing ? copy.pairing : copy.idle;
 byId('screen-status').textContent = pairing ? copy[current.state][0] : copy.idleDetail;
 byId('state-title').textContent = copy[current.state][0]; byId('state-description').textContent = copy[current.state][1];
 const visible = ['waiting','confirming'].includes(current.state) && !!current.challenge && !current.challenge.hideQR;
 const canvas = byId('qr'), ctx = visible ? canvas.getContext?.('2d') : null;
 byId('qr-panel').hidden = !ctx;
 if (ctx) {
  const matrix = current.challenge.matrix;
  const available = Math.max(185, Math.min(320, byId('qr-panel').clientWidth - 32 || 280));
  const scale = Math.max(1,Math.floor(available/(matrix.length+8)));
  canvas.width = canvas.height = (matrix.length+8)*scale;
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#000';
  matrix.forEach((row,y) => row.forEach((on,x) => {if(on) ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);}));
  canvas.setAttribute('aria-label',copy.qr);
  byId('expiry').textContent = copy.expiry+' '+new Date(current.challenge.expiresAt).toLocaleTimeString(language);
 } else {canvas.width = canvas.height = 0; byId('expiry').textContent='';}
 document.documentElement.dataset.state=current.state;
}

// Width-only observation avoids loops when canvas redraw changes panel height.
// One animation-frame redraw coalesces resize bursts without changing lifecycle.
export function observeQRLayout(document, redraw) {
 const win = document.defaultView, panel = document.getElementById('qr-panel');
 let pending = null, lastWidth = -1, stopped = false;
 const queue = () => {
  if (stopped || pending !== null) return;
  pending = win.requestAnimationFrame(() => { pending = null; if (!stopped) redraw(); });
 };
 const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(entries => {
  const width = Math.floor(entries[0].contentRect.width);
  if (width !== lastWidth) { lastWidth = width; queue(); }
 }) : null;
 observer?.observe(panel); win.addEventListener('resize', queue);
 return () => { stopped = true; observer?.disconnect(); win.removeEventListener('resize', queue); if (pending !== null) win.cancelAnimationFrame(pending); };
}
