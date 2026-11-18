// Feature-removal qualification on modern engines; not a physical old-TV receipt.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../wwwroot/index.html',import.meta.url),'utf8');
test('Cast lifecycle works without Element.replaceChildren',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.request().url()==='http://127.0.0.1:4186/cast-compatibility'?route.fulfill({contentType:'text/html',body:html}):route.abort());
 await page.addInitScript(()=>{
  delete Element.prototype.replaceChildren;
  window.testSockets=[];
  window.WebSocket=class{constructor(url){this.url=url;window.testSockets.push(this);}close(){this.closed=true;this.onclose?.();}};
 });
 await page.goto('/cast-compatibility');
 await page.evaluate(()=>{
  window.dispatchEvent(new CustomEvent('djconnect-handoff',{detail:{session_id:'compatibility',ha_url:'https://ha.example.org',broadcast_token:'t'.repeat(24)}}));
 });
 expect(errors,'Missing API must not interrupt handoff or clearing').toEqual([]);
 expect(await page.evaluate(()=>window.testSockets.length)).toBe(1);
 await page.evaluate(()=>{
  window.testSockets[0].onmessage({data:JSON.stringify({type:'snapshot',session_id:'compatibility',capabilities:{view_broadcast:true,owner_controls:false},snapshot:{schema_version:1,session:{session_id:'compatibility',locale:'en'},broadcast:{snapshot_watermark:1},playback:{title:'Compatibility fixture',item_id:'fixture'},dj_moments:[]}})});
 });
 await expect(page.locator('#title')).toHaveText('Compatibility fixture');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('djconnect-host-stop')));
 await expect(page.locator('.waiting-brand')).toBeVisible();
 expect(await page.evaluate(()=>window.testSockets[0].closed)).toBe(true);
 expect(errors).toEqual([]);
});
