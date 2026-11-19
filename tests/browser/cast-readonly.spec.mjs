// Actual browser execution of exact imported bytes; CAF/HA remain modeled.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../wwwroot/index.html',import.meta.url),'utf8');
for(const locale of ['en','nl','de','fr','es'])for(const viewport of [{width:1920,height:1080},{width:1080,height:1920}])test(`readonly Cast ${locale} ${viewport.width}: legacy grant inert, server end still clears`,async({page})=>{
 await page.setViewportSize(viewport);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{if(route.request().url()==='http://127.0.0.1:4186/cast-readonly')await route.fulfill({contentType:'text/html',body:html});else await route.abort();});
 await page.addInitScript(()=>{
  window.testSockets=[];window.testControls=0;
  window.fetch=()=>{window.testControls++;return Promise.reject(new Error('No screen controls'));};
  window.WebSocket=class{constructor(url){this.url=url;window.testSockets.push(this);}close(){this.closed=true;this.onclose?.();}};
  const context={addCustomMessageListener(){},start(){},addEventListener(){},isSystemReady:()=>true,sendCustomMessage(){}};
  window.cast={framework:{CastReceiverContext:{getInstance:()=>context},system:{EventType:{READY:'ready',SENDER_DISCONNECTED:'disconnected'},MessageType:{JSON:'JSON'}}}};
 });
 await page.goto('/cast-readonly');
 await expect(page.locator('.waiting-brand')).toBeVisible();
 await expect(page.locator('.receiver-brand img')).toBeVisible();
 await expect(page.locator('#handoff')).toBeHidden();
 expect(await page.evaluate(()=>window.testSockets.length)).toBe(0);
 await page.evaluate(locale=>{
  window.dispatchEvent(new CustomEvent('djconnect-handoff',{detail:{session_id:'synthetic',ha_url:'https://ha.example.org',broadcast_token:'t'.repeat(24),end_grant:'forged-legacy'}}));
  window.testSockets.at(-1).onmessage({data:JSON.stringify({type:'snapshot',session_id:'synthetic',capabilities:{view_broadcast:true,owner_controls:false},snapshot:{schema_version:1,session:{session_id:'synthetic',locale},broadcast:{snapshot_watermark:1},playback:{title:'Readonly fixture track',item_id:'fixture'},dj_moments:[]}})});
 },locale);
 await expect(page.locator('.waiting-brand')).toBeHidden();await expect(page.locator('#artwork-card')).toBeHidden();
 await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('#title')).toHaveText('Readonly fixture track');await expect(page.locator('#end-session')).toHaveCount(0);expect(await page.evaluate(()=>window.testControls)).toBe(0);
 await page.evaluate(()=>window.testSockets.at(-1).onmessage({data:JSON.stringify({type:'event',data:{session_id:'synthetic',delivery_sequence:2,event_type:'runtime_ended',payload:{}}})}));
 await expect(page.locator('.waiting-brand')).toBeVisible();await expect(page.locator('#title')).not.toHaveText('Readonly fixture track');await expect(page.locator('#artwork')).toBeHidden();expect(await page.evaluate(()=>window.testSockets.at(-1).closed)).toBe(true);expect(await page.evaluate(()=>window.testControls)).toBe(0);expect(errors).toEqual([]);
});
