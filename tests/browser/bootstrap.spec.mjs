import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
for(const locale of ['en','nl','de','fr','es'])for(const viewport of [{width:1920,height:1080},{width:390,height:844}])test(`${locale} ${viewport.width}: production build outside its canonical origin, focus, no QR or external data`,async({page})=>{
 await page.setViewportSize(viewport);const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4186'))external.push(r.url());});
 await page.goto('/?url=https://evil.example/');await page.locator('#language').selectOption(locale);
 await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
 await expect(page.locator('#qr-panel')).toBeHidden();await expect(page.locator('#state-title')).not.toHaveText('');
 await expect(page.locator('#effects')).toHaveCount(0);
 await page.locator('#language').focus();
 await expect(page.locator('#language')).toBeFocused();
 await expect(page.locator('#retry')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(external).toEqual([]);expect(page.url()).toBe('http://127.0.0.1:4186/');
});
test('security headers and reduced effects',async({page})=>{await page.emulateMedia({reducedMotion:'reduce',contrast:'more'});const r=await page.goto('/');expect(r.headers()['referrer-policy']).toBe('no-referrer');expect(r.headers()['content-security-policy']).toContain('connect-src https://api.djconnect.dev;');await expect(page.locator('html')).toHaveAttribute('data-effects','solid');expect(await page.locator('#status').getAttribute('role')).toBe('status');});
test('test-only adapter exercises actual browser lifecycle through pending/confirm/expiry',async({page})=>{await page.goto('/');const result=await page.evaluate(async()=>{const {BootstrapController}=await import('/lifecycle.mjs');const states=[];let resolveWait;const adapter={contract:'TEST_ONLY',create:async()=>({expiresAt:Date.now()+100,matrix:Array.from({length:21},()=>Array(21).fill(false))}),validateChallenge:()=>true,allowsDestination:()=>true,verifyDestination:async()=> 'https://ha.example/display',wait:({onConfirming})=>{onConfirming();return new Promise(r=>resolveWait=r);}};let navigations=0;const c=new BootstrapController({adapter,render:s=>states.push(s.state),navigate:()=>navigations++});const work=c.start();await new Promise(r=>setTimeout(r,180));resolveWait({});await work;return{states,navigations};});expect(result.states).toEqual(['creating','waiting','confirming','expired']);expect(result.navigations).toBe(0);});
test('every genuine UI state is localized and withdraws old QR pixels',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{const{renderState}=await import('/view.mjs');const states=['initializing','creating','waiting','confirming','received','redirecting','expired','recovering','unknown','unsafe','unsupported','unavailable'];const result=[];
 for(const language of ['en','nl','de','fr','es'])for(const state of states){renderState(document,language,{state,challenge:{expiresAt:Date.now()+1000,matrix:Array.from({length:21},()=>Array(21).fill(true))}});const c=document.getElementById('qr');result.push({language,state,visible:!document.getElementById('qr-panel').hidden,iconVisible:document.getElementById('qr-instruction-icon').getBoundingClientRect().width>0,title:document.getElementById('state-title-text').textContent,description:document.getElementById('state-description').textContent,pixels:c.width,quiet:state==='waiting'?Array.from(c.getContext('2d').getImageData(0,0,1,1).data):null});}return result;});
 for(const result of results){
  expect(result.iconVisible).toBe(result.state==='waiting');
  if(result.language==='nl'&&result.state==='waiting'){
   expect(result.title).toBe("Kies 'VibeCast sessie starten' in de app.");
   expect(result.description).toBe('Scan TV-QR-code');
  }
  expect(result.title.length).toBeGreaterThan(5);expect(result.visible).toBe(['waiting','confirming'].includes(result.state));if(!result.visible)expect(result.pixels).toBe(0);if(result.quiet)expect(result.quiet).toEqual([255,255,255,255]);}
});
for(const state of ['waiting','confirming'])for(const size of [21,177])test(`QR ${state}/${size} stays sharp and within the viewport after orientation changes`,async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto('/');
 await page.evaluate(async({state,size})=>{const{renderState,observeQRLayout}=await import('/view.mjs');const projection={state,challenge:{expiresAt:Date.now()+60000,matrix:Array.from({length:size},()=>Array(size).fill(true))}};const redraw=()=>renderState(document,'en',projection);redraw();window.testOnlyQRStop=observeQRLayout(document,redraw);},{state,size});
 const deadline=await page.locator('#expiry').textContent();
 for(const viewport of [{width:390,height:844},{width:320,height:720},{width:1920,height:1080}]){
  await page.setViewportSize(viewport);
  const metrics=()=>page.locator('#qr').evaluate((canvas,size)=>{const rect=canvas.getBoundingClientRect(),panel=document.querySelector('.panel').getBoundingClientRect(),available=document.getElementById('qr-panel').clientWidth-32;return {raster:canvas.width,css:rect.width,modules:size+8,available,root:document.documentElement.scrollWidth,viewport:innerWidth,clientWidth:document.documentElement.clientWidth,scrollbar:innerWidth-document.documentElement.clientWidth,preferencesRight:document.querySelector('.preferences').getBoundingClientRect().right,panelLeft:panel.left,panelRight:panel.right};},size);
  try {await expect.poll(async()=>{const m=await metrics();return m.css===m.raster&&m.raster%m.modules===0&&m.css<=m.available&&m.root<=m.viewport&&m.panelRight<=m.viewport&&m.panelLeft>=0;}).toBe(true);}
  catch(error){console.log('QR_LAYOUT_DIAGNOSTIC',JSON.stringify({state,size,requested:viewport,metrics:await metrics()}));throw error;}
  await expect(page.locator('#expiry')).toHaveText(deadline);
 }
 await page.evaluate(()=>window.testOnlyQRStop());
});

test('pairing layout fits the screen with a decodable compact QR',async({page})=>{
 const payload='VibeCast layout test only '.repeat(14);
 const qr=qrcode(0,'M');
 qr.addData(payload,'Byte');
 qr.make();
 const matrix=Array.from({length:qr.getModuleCount()},(_,y)=>
  Array.from({length:qr.getModuleCount()},(_,x)=>qr.isDark(y,x)));
 await page.goto('/');
 for(const [width,height] of [[1800,943],[1280,720],[1024,600],[390,844]]){
  await page.setViewportSize({width,height});
  const result=await page.evaluate(async matrix=>{
   const {renderState}=await import('/view.mjs');
   renderState(document,'nl',{state:'waiting',challenge:{expiresAt:Date.now()+120000,matrix}});
   const canvas=document.querySelector('#qr');
   const {width,height}=canvas;
   const pixels=canvas.getContext('2d').getImageData(0,0,width,height).data;
   return {width,height,pixels:[...pixels],scrollHeight:document.documentElement.scrollHeight,
    headerTop:document.querySelector('.screen-header').getBoundingClientRect().top,
    footerBottom:document.querySelector('.bottom-bar').getBoundingClientRect().bottom};
  },matrix);
  expect(result.scrollHeight,`full pairing page at ${width}×${height}`).toBeLessThanOrEqual(height);
  expect(result.headerTop).toBeGreaterThanOrEqual(0);
  expect(result.footerBottom).toBeLessThanOrEqual(height);
  expect(result.width).toBeLessThanOrEqual(244);
  expect(jsQR(Uint8ClampedArray.from(result.pixels),result.width,result.height)?.data).toBe(payload);
 }
});

test('canonical production app uses the fixed API and hides QR when service is closed', async ({page}) => {
 const origin = 'https://vibecast.tv';
 const endpoint = 'https://api.djconnect.dev/v1/rendezvous/create';
 const types = {'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
 const headers = Object.fromEntries((await readFile('dist/bootstrap/_headers','utf8')).split('\n')
  .filter(line => line.includes(':')).map(line => {
   const colon = line.indexOf(':');
   return [line.slice(0,colon).trim(),line.slice(colon+1).trim()];
  }));
 const calls = [];
 await page.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.href === endpoint) {
   const cors = {'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'};
   if (request.method() === 'OPTIONS') return route.fulfill({status:204,headers:cors});
   calls.push(request.method());
   return route.fulfill({status:503,headers:cors,json:{v:'djc-rendezvous/1',error:'service_unavailable'}});
  }
  if (url.origin !== origin) return route.abort();
  const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return route.abort();
  return route.fulfill({status:200,headers:{...headers,'content-type':types[extname(name)] ?? 'text/plain'},body:await readFile('dist/bootstrap/'+name)});
 });
 await page.goto(origin);
 await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
 await expect(page.locator('#qr-panel')).toBeHidden();
 expect(calls).toEqual(['POST']);
 expect(page.url()).toBe(origin+'/');
});
