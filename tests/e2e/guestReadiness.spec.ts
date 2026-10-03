import { test, expect, type Page } from '@playwright/test';
import { fixtureInvoice, fixtureCustomer } from '../fixtures/largeData';

async function seed(page: Page, extra: Record<string,string> = {}) {
  await page.goto('/');
  await page.evaluate(({invoice,customer,extra}) => {
    localStorage.setItem('gigainvoice:v2:preferences:guest-chosen','true');
    localStorage.setItem('gigainvoice:v2:guest:history',JSON.stringify([invoice]));
    localStorage.setItem('gigainvoice:v2:guest:customers',JSON.stringify([customer]));
    localStorage.setItem('gigainvoice:v1:history','private-legacy-sentinel');
    localStorage.setItem('other-app','keep');
    for(const [key,value] of Object.entries(extra))localStorage.setItem(key,value);
  }, {invoice:fixtureInvoice(1),customer:fixtureCustomer(1),extra});
  await page.reload();
}
async function confirmClear(page: Page) {
  await page.getByRole('button',{name:/^(Clear guest data on this device|Retry clearing guest data)$/}).click();
  await expect(page.getByText('Clear guest data?',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Clear guest data',exact:true}).click();
}
test('guest clearing is explicit, preserves unrelated data, and persists across reload',async({page})=>{
  await seed(page);
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:'Clear guest data on this device',exact:true}).click();
  await expect(page.getByText('1 customers and 1 saved documents.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:history'))).toContain('LOAD-000001');
  await confirmClear(page);
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('');
  await page.getByRole('link',{name:'History',exact:true}).click();
  await expect(page.getByText('Your next chapter starts here.',{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText('Your next chapter starts here.',{exact:true})).toBeVisible();
  const kept=await page.evaluate(()=>[localStorage.getItem('gigainvoice:v1:history'),localStorage.getItem('other-app'),localStorage.getItem('gigainvoice:v2:preferences:guest-chosen')]);
  expect(kept).toEqual(['private-legacy-sentinel','keep','true']);
});
test('another editing tab cannot restore a draft after clearing, including pagehide flush',async({page,context})=>{
  await seed(page);
  await page.getByRole('button',{name:'Enter customer manually'}).click();
  await page.getByRole('textbox',{name:'Customer name',exact:true}).fill('Old suspended draft');
  const second=await context.newPage();await second.goto('/settings');
  // Race the first tab's debounce/background handler with reset.
  await page.getByRole('textbox',{name:'Customer name',exact:true}).fill('Stale pending write');
  await confirmClear(second);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  await expect(page.getByRole('textbox',{name:'Search customers'})).toBeVisible();
  await page.reload();
  await expect(page.getByText('0 customers available',{exact:false})).toBeVisible();
  const values=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('gigainvoice:v2:guest:')).map(k=>localStorage.getItem(k)).join(' '));
  expect(values).not.toContain('Stale pending write');expect(values).not.toContain('Old suspended draft');
  await page.getByRole('button',{name:'Enter customer manually'}).click();
  await page.getByRole('textbox',{name:'Customer name',exact:true}).fill('Fresh after reset');
  await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('gigainvoice:v2:guest:')).map(k=>localStorage.getItem(k)).join(' '))).toContain('Fresh after reset');
  await second.close();
});
test('corrupt guest startup can be cleared without restoring its data first',async({page})=>{
  await seed(page,{'gigainvoice:v2:guest:draft':'{broken'});
  await expect(page.getByText('Your saved workspace could not be restored.',{exact:true})).toBeVisible();
  await confirmClear(page);
  await expect(page.getByRole('textbox',{name:'Search customers'})).toBeVisible();
});

test('schema-invalid settings remain untouched until explicitly cleared',async({page})=>{
  await seed(page,{'gigainvoice:v2:guest:settings':'{"broken":true}'});
  await expect(page.getByText('Your saved workspace could not be restored.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:settings'))).toBe('{"broken":true}');
  await confirmClear(page);
  await expect(page.getByRole('textbox',{name:'Search customers'})).toBeVisible();
});
test('partial removal reports failure, fences old data through reload, then retries',async({page})=>{
  await seed(page);await page.goto('/settings');
  await page.evaluate(()=>{
    const original=Storage.prototype.removeItem;let fail=true;
    Storage.prototype.removeItem=function(key:string){if(fail&&key.startsWith('gigainvoice:v2:guest:')&&!key.endsWith('__control')){fail=false;throw new Error('Simulated unavailable storage');}return original.call(this,key);};
  });
  await confirmClear(page);
  await expect(page.getByText('Guest data was not completely cleared. Retry clearing to finish.',{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Retry clearing guest data',exact:true})).toBeVisible();
  await confirmClear(page);
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Business name',exact:true})).toHaveValue('');
});
test('offline reset retains the app cache and supports a new PDF afterward',async({page,context})=>{
  await seed(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
  await context.setOffline(true);await page.goto('/settings');await confirmClear(page);
  await page.getByRole('link',{name:'Invoice',exact:true}).click();
  await page.getByRole('button',{name:'Enter customer manually'}).click();
  await page.getByRole('textbox',{name:'Customer name',exact:true}).fill('Offline fresh customer');
  await page.getByRole('button',{name:'Plan & pricing',exact:true}).click();
  await page.getByRole('textbox',{name:'Plan name',exact:true}).fill('Offline Plan');
  await page.getByRole('textbox',{name:'Time period',exact:true}).fill('One month');
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();
  expect((await downloading).suggestedFilename()).toMatch(/^Invoice_.*\.pdf$/);
  expect(await page.evaluate(async()=> (await caches.keys()).filter(k=>k.startsWith('gigainvoice-')).length)).toBeGreaterThan(0);
  await context.setOffline(false);
});
