import {test,expect} from '@playwright/test';

test('VibeCast hero and canonical brand marks decode without implying a connection',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1,name:'VibeCast',exact:true})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
 await expect(page.locator('#qr-panel')).toBeHidden();
 const images=await page.evaluate(async()=>{
  const header=document.querySelector('.brand-mark'),status=document.querySelector('.screen-status img');
  await Promise.all([header.decode(),status.decode()]);
  return {header:[header.naturalWidth,header.getBoundingClientRect().width],status:status.naturalWidth,favicons:[...document.querySelectorAll('link[rel="icon"]')].map(n=>({size:n.sizes.value,type:n.type})),heroHidden:document.querySelector('.hero-symbol').getAttribute('aria-hidden')};
 });
 expect(images.header).toEqual([40,40]);expect(images.status).toBe(40);
 expect(images.favicons).toEqual([{size:'16x16',type:'image/png'},{size:'32x32',type:'image/png'}]);
 expect(images.heroHidden).toBe('true');
 const response=await page.request.get('/brand-mark-32.png');
 expect(response.headers()['content-type']).toBe('image/png');
});

test('hero is static and drops transparency/glows for increased contrast',async({page})=>{
 await page.emulateMedia({contrast:'more',reducedMotion:'reduce'});await page.goto('/');
 const style=await page.locator('.vibecast-hero').evaluate(node=>{const s=getComputedStyle(node);return{background:s.backgroundImage,animation:s.animationName,shadow:s.boxShadow};});
 expect(style).toEqual({background:'none',animation:'none',shadow:'none'});
 await expect(page.getByRole('heading',{level:1,name:'VibeCast',exact:true})).toBeVisible();
});
