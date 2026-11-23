// Real browser execution of the produced landing; all invitation data is
// synthetic. No native app launch, guest redemption or physical scan is claimed.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const golden=JSON.parse(await readFile(new URL('../fixtures/native-join-golden.json',import.meta.url)));
const fragment='#'+new URLSearchParams(golden.fields).toString();
const headers=Object.fromEntries((await readFile('dist/bootstrap/_headers','utf8')).split('\n').slice(1).filter(line=>line.includes(':')).map(line=>{const i=line.indexOf(':');return[line.slice(0,i).trim(),line.slice(i+1).trim()];}));
async function landing(page,locale='en'){
 const requests=[],errors=[];page.on('request',request=>requests.push({url:request.url(),referrer:request.headers().referer||''}));page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(language=>Object.defineProperty(navigator,'language',{get:()=>language}),locale);
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='https://vibecast.tv')return route.abort();
  const file=url.pathname==='/join'?'join.html':url.pathname.slice(1);
  if(!/^[A-Za-z0-9._-]+$/.test(file))return route.abort();
  const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
  try{await route.fulfill({status:200,headers:{...headers,'Content-Type':types[path.extname(file)]||'text/plain'},body:await readFile('dist/bootstrap/'+file)});}catch{await route.abort();}
 });
 return{requests,errors};
}
for(const locale of ['en','nl','de','fr','es'])for(const viewport of [{width:390,height:844},{width:1920,height:1080}])test(`VibeCast Live native landing ${locale} ${viewport.width}: no admission or locator leakage`,async({page},info)=>{
 await page.setViewportSize(viewport);const result=await landing(page,locale);
 const response=await page.goto('https://vibecast.tv/join'+fragment);
 await expect(page.locator('html')).toHaveAttribute('lang',locale);
 await expect(page.locator('#join-open')).toBeEnabled();
 expect(page.url()).toBe('https://vibecast.tv/join');
 await expect(page.locator('h1')).toContainText('VibeCast Live');
 await expect(page.locator('#join-install')).toHaveAttribute('href','https://apps.apple.com/app/id6832635823');
 await expect(page.locator('#join-rescan')).not.toHaveText('');
 expect(await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,storage:[localStorage.length,sessionStorage.length]}))).toEqual({overflow:false,storage:[0,0]});
 expect(result.requests.every(request=>request.url.startsWith('https://vibecast.tv/'))).toBe(true);
 for(const request of result.requests)for(const secret of Object.values(golden.fields).filter(value=>value.length>30))expect(request.url+request.referrer).not.toContain(secret);
 expect(await page.locator('body').textContent()).not.toContain(golden.fields.invitation_secret);
 expect(response.headers()['referrer-policy']).toBe('no-referrer');expect(result.errors).toEqual([]);
 if(locale==='nl'&&viewport.width===390)await page.screenshot({path:info.outputPath('native-join-nl-phone.png'),fullPage:true});
});
for(const suffix of ['&v=1','&owner_token=synthetic','&invitation_secret=%ZZ'])test(`native landing refuses malformed invitation ${suffix}`,async({page})=>{
 const result=await landing(page);await page.goto('https://vibecast.tv/join'+fragment+suffix);
 await expect(page.locator('#join-open')).toBeDisabled();await expect(page.locator('#join-status')).not.toHaveText('');
 expect(page.url()).toBe('https://vibecast.tv/join');expect(result.requests.every(request=>request.url.startsWith('https://vibecast.tv/'))).toBe(true);expect(result.errors).toEqual([]);
});
test('reload and pagehide cannot restore or retain a native join invitation',async({page})=>{
 await landing(page);await page.goto('https://vibecast.tv/join'+fragment);await expect(page.locator('#join-open')).toBeEnabled();
 await page.reload();await expect(page.locator('#join-open')).toBeDisabled();
 await page.goto('https://vibecast.tv/join'+fragment);await expect(page.locator('#join-open')).toBeEnabled();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('#join-open')).toBeDisabled();
});
test('query parameters never become a replacement join authority',async({page})=>{
 await landing(page);await page.goto('https://vibecast.tv/join?next=https://evil.example'+fragment);
 await expect(page.locator('#join-open')).toBeDisabled();expect(page.url()).toBe('https://vibecast.tv/join');
});
