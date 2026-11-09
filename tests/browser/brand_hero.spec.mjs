import {test,expect} from '@playwright/test';

test('VibeCast hero and canonical brand marks decode without implying a connection',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1,name:'VibeCast',exact:true})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-state','unavailable');
 await expect(page.locator('#qr-panel')).toBeHidden();
 const header = page.locator('svg.brand-mark');
 await expect(header).toBeVisible();
 await expect(header).toHaveCSS('color', 'rgb(255, 255, 255)');
 const images=await page.evaluate(()=>{
  return {favicons:[...document.querySelectorAll('link[rel="icon"]')].map(n=>({size:n.sizes.value,type:n.type})),heroHidden:document.querySelector('.hero-symbol').getAttribute('aria-hidden')};
 });
 expect(images.favicons).toEqual([{size:'16x16',type:'image/png'},{size:'32x32',type:'image/png'}]);
 expect(images.heroHidden).toBe('true');
 const response=await page.request.get('/brand-mark-32.png');
 expect(response.headers()['content-type']).toBe('image/png');
});

test('the waiting row animates the vector avatar and trailing dots on iPhone widths', async ({page}) => {
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');
 await page.locator('#language').selectOption('nl');
 const status = page.locator('#screen-status');
 const avatarDots = page.locator('.waiting-avatar-dots');
 await expect(status).toHaveText('Wachten op een sessie');
 await expect(page.locator('svg.waiting-avatar')).toBeVisible();
 await expect(avatarDots).toHaveCSS('animation-name','waiting-avatar-pulse');
 const trailingAnimation = () => status.evaluate(node => getComputedStyle(node,'::after').animationName);
 expect(await trailingAnimation()).toBe('waiting-dots');
 await expect(page.locator('#state-title')).toHaveText('Verbinden is nog niet beschikbaar');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(avatarDots).toHaveCSS('animation-name','none');
 expect(await trailingAnimation()).toBe('none');
});

test('hero is static and drops transparency/glows for increased contrast',async({page})=>{
 await page.emulateMedia({contrast:'more',reducedMotion:'reduce'});await page.goto('/');
 const style=await page.locator('.vibecast-hero').evaluate(node=>{const s=getComputedStyle(node);return{background:s.backgroundImage,animation:s.animationName,shadow:s.boxShadow};});
 expect(style).toEqual({background:'none',animation:'none',shadow:'none'});
 await expect(page.getByRole('heading',{level:1,name:'VibeCast',exact:true})).toBeVisible();
});
