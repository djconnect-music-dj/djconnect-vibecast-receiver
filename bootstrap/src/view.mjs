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
 byId('screen-status').textContent = current.state === 'waiting' ? copy.waitingStatus : pairing ? copy[current.state][0] : copy.idleDetail;
 byId('state-title-text').textContent = copy[current.state][0]; byId('state-description').textContent = copy[current.state][1];
 byId('qr-instruction-icon').toggleAttribute('hidden', current.state !== 'waiting');
 const visible = ['waiting','confirming'].includes(current.state) && !!current.challenge && !current.hideQR;
 const canvas = byId('qr'), ctx = visible ? canvas.getContext?.('2d') : null;
 byId('qr-panel').hidden = !ctx;
 if (ctx) {
  const matrix = current.challenge.matrix;
  const available = Math.max(185, Math.min(320, byId('qr-panel').clientWidth - 32 || 280));
  const scale = Math.max(1,Math.floor(available/(matrix.length+8)));
  canvas.width = canvas.height = (matrix.length+8)*scale;
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#000';
  matrix.forEach((row,y) => row.forEach((on,x) => {if(on) ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);}));
  const brand = byId('qr-brand');
  // A circular badge fits between version 14's four nearby alignment marks.
  if (matrix.length === 73 && brand.complete && brand.naturalWidth > 0) {
   const center = canvas.width / 2;
   const logoSize = 18 * scale;
   ctx.beginPath();
   ctx.arc(center, center, 10 * scale, 0, 2 * Math.PI);
   ctx.fillStyle = '#fff';
   ctx.fill();
   ctx.drawImage(brand, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize);
  }
  canvas.setAttribute('aria-label',copy.qr);
  byId('expiry').textContent = copy.expiry+' '+new Date(current.challenge.expiresAt).toLocaleTimeString(language);
 } else {canvas.width = canvas.height = 0; byId('expiry').textContent='';}
 document.documentElement.dataset.state=current.state;
}

// Width-only observation avoids loops when canvas redraw changes panel height.
// One animation-frame redraw coalesces resize bursts without changing lifecycle.
export function observeQRLayout(document, redraw) {
 const win = document.defaultView, panel = document.getElementById('qr-panel');
 const brand = document.getElementById('qr-brand');
 let pending = null, lastWidth = -1, stopped = false;
 const queue = () => {
  if (stopped || pending !== null) return;
  pending = win.requestAnimationFrame(() => { pending = null; if (!stopped) redraw(); });
 };
 const observer = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(entries => {
  const width = Math.floor(entries[0].contentRect.width);
  if (width !== lastWidth) { lastWidth = width; queue(); }
 }) : null;
 observer?.observe(panel); win.addEventListener('resize', queue); brand.addEventListener('load', queue, {once:true});
 return () => { stopped = true; observer?.disconnect(); win.removeEventListener('resize', queue); brand.removeEventListener('load', queue); if (pending !== null) win.cancelAnimationFrame(pending); };
}
