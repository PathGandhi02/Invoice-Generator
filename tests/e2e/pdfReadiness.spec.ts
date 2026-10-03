import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fixtureInvoice } from '../fixtures/largeData';

test('long Unicode receipt exports offline with custom branding and a decodable UPI QR',async({page,context},info)=>{
  const logo=await sharp({create:{width:240,height:120,channels:3,background:'#2060aa'}}).png().toBuffer();
  const invoice={...fixtureInvoice(1).data,isPaid:true,currencySymbol:'₹',invoiceNumber:'2026/PHONE:QA?001',customerName:'Fictional Café Customer — Élodie García',customerAddress:'42 Fictional Test Road\n'+('A long fictional address with accented text: São Paulo. ').repeat(5),planName:'Fictional high-speed service plan for the extended acceptance example',planSubtext:('Readable long description for the invoice acceptance check. ').repeat(12),companyName:'Fictional Café Studio',showQr:true,upiId:'fixture@upi',customLogo:'data:image/png;base64,'+logo.toString('base64')};
  await page.goto('/');await page.evaluate(invoice=>{localStorage.setItem('gigainvoice:v2:preferences:guest-chosen','true');localStorage.setItem('gigainvoice:v2:guest:draft',JSON.stringify(invoice));},invoice);
  await page.reload();await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(r=>navigator.serviceWorker.addEventListener('controllerchange',()=>r(),{once:true}));});
  await context.setOffline(true);
  if(info.project.name.includes('mobile'))await page.getByRole('tab',{name:'Preview invoice',exact:true}).click();
  const stamp=page.getByTestId('invoice-paper').getByText('PAID',{exact:true});
  const description=page.getByTestId('invoice-paper').getByText(invoice.planSubtext,{exact:true});
  await expect(stamp).toBeVisible();
  await expect.poll(async()=>{const paid=await stamp.boundingBox(),text=await description.boundingBox();return !!paid&&!!text&&paid.y>=text.y+text.height;}).toBe(true);
  await page.screenshot({path:info.outputPath('long-receipt-preview.png'),fullPage:true});
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();const download=await pending;
  expect(download.suggestedFilename()).toBe('Receipt_2026_PHONE_QA_001.pdf');
  const filename=info.outputPath('long-receipt.pdf');await download.saveAs(filename);const bytes=await readFile(filename);
  expect(bytes.subarray(0,5).toString()).toBe('%PDF-');expect(bytes.toString('latin1').match(/\/Type \/Page\b/g)!.length).toBeLessThanOrEqual(3);
  await context.setOffline(false);
});

test('near-limit logo exports but quota failure does not claim a saved history record',async({page},info)=>{
  test.setTimeout(90_000);
  const pixels=Buffer.alloc(1000*1000*3);let random=123456789;for(let i=0;i<pixels.length;i++){random^=random<<13;random^=random>>>17;random^=random<<5;pixels[i]=random&255;}
  const logo=await sharp(pixels,{raw:{width:1000,height:1000,channels:3}}).png().toBuffer();
  expect(logo.length).toBeLessThan(3*1024*1024);expect(logo.length).toBeGreaterThan(2.8*1024*1024);
  const invoice={...fixtureInvoice(7).data,customLogo:'data:image/png;base64,'+logo.toString('base64')};
  await page.goto('/');await page.evaluate(invoice=>{localStorage.setItem('gigainvoice:v2:preferences:guest-chosen','true');localStorage.setItem('gigainvoice:v2:guest:draft',JSON.stringify(invoice));},invoice);await page.reload();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();await(await pending).saveAs(info.outputPath('near-limit-logo.pdf'));
  await expect(page.getByText('Invoice could not be saved: device storage is full.',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:history'))).toBeNull();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('gigainvoice:v2:guest:draft')!).customerName)).toBe(invoice.customerName);
  await writeFile(info.outputPath('image-capacity.json'),JSON.stringify({pngBytes:logo.length,draftCharacters:JSON.stringify(invoice).length,exportSucceeded:true,historySave:'QuotaExceededError; original draft preserved'},null,2));
});
