// Actual imported renderer in modern browsers; isolated synthetic HA/WS only.
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../wwwroot/index.html',import.meta.url),'utf8');
const citation={provider:'Wikipedia',license:'CC-BY-SA-4.0',title:'<em>Source as text</em>',url:'https://en.wikipedia.org/wiki/Artist',revision_url:'https://en.wikipedia.org/w/index.php?oldid=123'};
for(const scenario of ['valid','invalid','expired'])test(`Cast research ${scenario} preserves safe links and clearing`,async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.request().url()==='http://127.0.0.1:4186/cast-research'?route.fulfill({contentType:'text/html',body:html}):route.abort());
 await page.addInitScript(()=>{window.testSockets=[];window.WebSocket=class{constructor(){window.testSockets.push(this);}close(){this.closed=true;this.onclose?.();}};});
 await page.goto('/cast-research');
 await page.evaluate(({scenario,citation})=>{
  window.dispatchEvent(new CustomEvent('djconnect-handoff',{detail:{session_id:'research',ha_url:'https://ha.example.org',broadcast_token:'t'.repeat(24)}}));
  const sources=[{...citation,...(scenario==='invalid'?{revision_url:'https://de.wikipedia.org/w/index.php?oldid=123'}:{})}];
  const moment={moment_id:'research',type:'artist',summary:'Research fixture',playback_item_id:'track',created_at:new Date().toISOString(),presentation_intent:{maximum_duration_seconds:30},sources,...(scenario==='expired'?{display_expires_at:new Date(Date.now()-1000).toISOString()}:{})};
  window.testSockets[0].onmessage({data:JSON.stringify({type:'snapshot',session_id:'research',capabilities:{view_broadcast:true,owner_controls:false},snapshot:{schema_version:1,session:{session_id:'research',locale:'en'},broadcast:{snapshot_watermark:1},playback:{title:'Research track',item_id:'track'},dj_moments:[moment]}})});
 },{scenario,citation});
 if(scenario==='valid'){
  await expect(page.locator('#moment-card')).toBeVisible();
  const link=page.locator('#moment-research-sources a');await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href',citation.revision_url);await expect(link).toHaveAttribute('rel','noopener noreferrer');
  await expect(page.locator('#moment-research-sources em')).toHaveCount(0);
 }else{await expect(page.locator('#moment-card')).toBeHidden();await expect(page.locator('#moment-research-sources a')).toHaveCount(0);}
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('djconnect-host-stop')));
 await expect(page.locator('#moment-card')).toBeHidden();await expect(page.locator('#moment-research-sources a')).toHaveCount(0);
 expect(errors).toEqual([]);
});
