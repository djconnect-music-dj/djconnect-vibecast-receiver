// Explicit SYNTHETIC intercepted QA service/static HTTPS origins. Actual browser
// app/fetch/crypto/CSP/QR/navigation; no provider/TLS/native/HA/physical acceptance.
import {test,expect} from '@playwright/test';import {readFile} from 'node:fs/promises';import path from 'node:path';import jsQR from 'jsqr';
import {syntheticQAService} from '../fixtures/qa-service.mjs';
const QA='https://qa.vibecast.tv',SERVICE='https://api-vibecast-qa.djconnect.dev';
async function fixture(page,{origin=QA,...options}={}){
 const s=syntheticQAService(options),unexpected=[],navigations=[];
 const policy=Object.fromEntries((await readFile('dist/bootstrap-qa/_headers','utf8')).split('\n').slice(1).filter(x=>x.includes(':')).map(x=>{const i=x.indexOf(':');return[x.slice(0,i).trim(),x.slice(i+1).trim()];}));
 const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
 await page.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.origin===SERVICE){
   if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':QA,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}});
   try{const response=await s.fetch(r.url(),{method:r.method(),body:r.postData(),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});}catch{return route.abort();}
  }
  if(u.origin===origin){const name=u.pathname==='/'?'index.html':u.pathname.slice(1);if(!/^[a-zA-Z0-9._-]+$/.test(name))throw Error('unsafe fixture asset');return route.fulfill({status:200,headers:{...policy,'content-type':types[path.extname(name)]||'text/plain'},body:await readFile('dist/bootstrap-qa/'+name)});}
  if(u.href==='https://ha.example.org/djconnect/vibecast/display'){navigations.push(u.href);return route.fulfill({status:200,contentType:'text/html',body:'<p>Synthetic destination observation only; no HA admission.</p>'});}
  unexpected.push(u.origin);return route.abort();
 });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');return{s,unexpected,navigations,errors};
}
test('QA actual app shows independently decoded QA QR then one synthetic JWE navigation',async({page})=>{
 const f=await fixture(page);await expect(page.locator('#qr-panel')).toBeVisible();
 const pixels=await page.locator('#qr').evaluate(c=>({data:Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),w:c.width,h:c.height}));
 const qr=jsQR(new Uint8ClampedArray(pixels.data),pixels.w,pixels.h);expect(qr).not.toBeNull();expect(JSON.parse(qr.data)).toEqual(f.s.qr);expect(JSON.parse(qr.data).service_origin).toBe(SERVICE);
 await expect(page).toHaveURL('https://ha.example.org/djconnect/vibecast/display');expect(f.s.calls.filter(c=>c.route==='consume')).toHaveLength(1);expect(f.navigations).toHaveLength(1);expect(f.unexpected).toEqual([]);expect(f.errors).toEqual([]);
});
test('QA rejects production QR and never exposes it',async({page})=>{
 const f=await fixture(page,{qrService:'https://api.djconnect.dev'});await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');await expect(page.locator('#qr-panel')).toBeHidden();expect(f.s.calls.map(c=>c.route)).toEqual(['create']);expect(f.navigations).toEqual([]);expect(f.errors).toEqual([]);
});
test('QA without a 2D canvas stays unsupported and never starts a transaction',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 const f=await fixture(page);await expect(page.locator('html')).toHaveAttribute('data-state','unsupported');
 await expect(page.locator('#qr-panel')).toBeHidden();await expect(page.locator('#retry')).toHaveCount(0);
 expect(f.s.calls).toEqual([]);expect(f.unexpected).toEqual([]);expect(f.navigations).toEqual([]);expect(f.errors).toEqual([]);
});
test('QA rejects authenticated production bootstrap origin without navigation',async({page})=>{
 const f=await fixture(page,{plainOrigin:'https://vibecast.tv'});await expect(page.locator('html')).toHaveAttribute('data-state','unsafe');expect(f.s.calls.filter(c=>c.route==='consume')).toHaveLength(1);expect(f.navigations).toEqual([]);await expect(page.locator('#qr-panel')).toBeHidden();expect(f.errors).toEqual([]);
});
for(const origin of ['https://vibecast.tv','https://wrong.example.org'])test('QA wrong browser host sends zero requests: '+origin,async({page})=>{
 const f=await fixture(page,{origin});await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');await expect(page.locator('#qr-panel')).toBeHidden();await page.evaluate(()=>{dispatchEvent(new Event('online'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});expect(f.s.calls).toEqual([]);expect(f.unexpected).toEqual([]);expect(f.navigations).toEqual([]);expect(f.errors).toEqual([]);
});
