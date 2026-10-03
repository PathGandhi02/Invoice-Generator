import { test, expect } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
import { fixtureInvoice, fixtureCustomer } from '../fixtures/largeData';

test('browser capacity, history restore/search/open, snapshot PDF and bounded customer search', async ({page,browser}, info) => {
  test.setTimeout(180_000);
  await page.goto('/');
  const results:unknown[]=[];
  for (const count of [100,1000,10000]) {
    const rows=Array.from({length:count},(_,i)=>fixtureInvoice(i));
    const customers=Array.from({length:count},(_,i)=>fixtureCustomer(i));
    const raw=JSON.stringify(rows);
    const seeded=await page.evaluate(({raw,customers})=>{
      localStorage.setItem('gigainvoice:v2:preferences:guest-chosen','true');
      const before=localStorage.getItem('gigainvoice:v2:guest:history');
      try {localStorage.setItem('gigainvoice:v2:guest:history',raw);localStorage.setItem('gigainvoice:v2:guest:customers',JSON.stringify(customers));return {ok:true};}
      catch(e){return {ok:false,error:(e as Error).name,previousHistoryPreserved:before===localStorage.getItem('gigainvoice:v2:guest:history')};}
    },{raw,customers});
    if(!seeded.ok){expect(seeded.error).toBe('QuotaExceededError');expect(seeded.previousHistoryPreserved).toBe(true);results.push({count,utf8Bytes:Buffer.byteLength(raw),...seeded});continue;}
    const samples:Record<string,number[]>={};
    const measure=async(name:string,work:()=>Promise<unknown>)=>{const start=Date.now();await work();(samples[name]??=[]).push(Date.now()-start);};
    for(let run=0;run<3;run++){
      await measure('historyRestore',async()=>{await page.goto('/history');await expect(page.getByRole('button',{name:`Open ${rows.at(-1)!.isPaid?'receipt':'invoice'} ${rows.at(-1)!.invoiceNumber}`,exact:true})).toBeVisible();});
      await expect(page.getByText('Multiple currencies',{exact:true})).toHaveCount(2);
      await measure('historySearch',async()=>{await page.getByRole('textbox',{name:'Search invoice history',exact:true}).fill('LOAD-000099');await expect(page.getByRole('button',{name:/^Open (receipt|invoice) LOAD-/})).toHaveCount(1);await expect(page.getByRole('button',{name:'Open invoice LOAD-000099',exact:true})).toBeVisible();});
      await measure('openSnapshot',async()=>{await page.getByRole('button',{name:'Open invoice LOAD-000099',exact:true}).click();await expect(page.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue(rows[99]!.customerName);});
      await page.getByRole('button',{name:'Plan & pricing',exact:true}).click();
      await expect(page.getByRole('textbox',{name:'Plan price',exact:true})).toHaveValue('1250.5');
      const beforeSave=await page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:history'));
      await measure('saveUpdate',async()=>{await page.getByRole('button',{name:'Save invoice',exact:true}).click();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:history'))).not.toBe(beforeSave);});
    }
    await measure('pdf',async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();const file=info.outputPath(`scale-${count}.pdf`);await(await pending).saveAs(file);const bytes=await readFile(file);expect(bytes.subarray(0,5).toString()).toBe('%PDF-');expect(bytes.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(1);});
    await page.getByRole('button',{name:'New invoice',exact:true}).click();
    await measure('customerSearch',async()=>{await page.getByRole('textbox',{name:'Search customers'}).fill('café');await expect(page.getByRole('button',{name:/^Select Fictional/})).toHaveCount(15);});
    await page.getByRole('textbox',{name:'Search customers'}).fill(`fixture_${count-1}`);
    await expect(page.getByRole('button',{name:`Select ${customers.at(-1)!.full_name}, fixture_${count-1}`,exact:true})).toBeVisible();
    results.push({count,utf8Bytes:Buffer.byteLength(raw),ok:true,samples});
  }
  await writeFile(info.outputPath('browser-benchmark.json'),JSON.stringify({browser:browser.version(),project:info.project.name,origin:info.config.projects[0]!.use.baseURL,runs:3,results},null,2));
});

test('real browser quota failure preserves history and supports retry',async({page},info)=>{
  await page.goto('/');
  await page.evaluate(({first,second})=>{localStorage.setItem('gigainvoice:v2:preferences:guest-chosen','true');localStorage.setItem('gigainvoice:v2:guest:history',JSON.stringify([first]));localStorage.setItem('gigainvoice:v2:guest:draft',JSON.stringify(second.data));},{first:fixtureInvoice(1),second:fixtureInvoice(2)});
  await page.reload();await expect(page.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue(fixtureInvoice(2).customerName);
  const capacity=await page.evaluate(()=>{
    let content='';
    for(let size=1024*1024;size>=64;size=Math.floor(size/2))while(true){try{localStorage.setItem('quota-fixture',content+'x'.repeat(size));content+='x'.repeat(size);}catch{break;}}
    return {fillerCharacters:content.length,totalCharacters:Object.keys(localStorage).reduce((n,k)=>n+k.length+localStorage.getItem(k)!.length,0)};
  });
  await page.getByRole('button',{name:'Save invoice',exact:true}).click();
  await expect(page.getByText('Invoice could not be saved: device storage is full.',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('gigainvoice:v2:guest:history')!).length)).toBe(1);
  await page.evaluate(()=>localStorage.removeItem('quota-fixture'));
  await page.getByRole('button',{name:'Save invoice',exact:true}).click();await expect(page.getByText('Invoice saved',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('gigainvoice:v2:guest:history')!).length)).toBe(2);
  await writeFile(info.outputPath('storage-capacity.json'),JSON.stringify(capacity,null,2));
});
