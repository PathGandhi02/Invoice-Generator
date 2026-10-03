import { performance } from 'node:perf_hooks';
import { writeFile, mkdir } from 'node:fs/promises';
import { StorageService } from '../src/services/StorageService';
import { LocalInvoiceRepository } from '../src/repositories/LocalInvoiceRepository';
import { LocalCustomerRepository } from '../src/repositories/WorkspaceRepositories';
import { fixtureInvoice, fixtureCustomer } from '../tests/fixtures/largeData';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/models/Database';
import { CloudInvoiceRepository } from '../src/repositories/WorkspaceRepositories';

async function main() {
const results = [];
for (const count of [100,1000,10000]) {
  const rows = Array.from({length:count},(_,i) => fixtureInvoice(i));
  const data = new Map<string,string>();
  const storage = new StorageService({ getItem: async k => data.get(k) ?? null, setItem: async (k,v) => { data.set(k,v); } }, 'benchmark:');
  await storage.set('history', rows); await storage.set('customers',Array.from({length:count},(_,i)=>fixtureCustomer(i)));
  const invoices = new LocalInvoiceRepository(storage), customers = new LocalCustomerRepository(storage);
  const samples: Record<string,number[]> = {};
  const measure = async (name:string, work:()=>Promise<unknown>) => { const start=performance.now();await work();(samples[name]??=[]).push(+(performance.now()-start).toFixed(2)); };
  for(let run=0;run<3;run++) {
    await measure('restoreHistory',()=>invoices.getAll());
    await measure('historySearch',()=>invoices.search('LOAD-000099'));
    await measure('historySummaries',()=>invoices.summaries(''));
    await measure('openSnapshot',()=>invoices.get('fixture-99'));
    await measure('customerSearch',()=>customers.search('café'));
    await measure('saveUpdate',()=>invoices.save(rows[0]!));
  }
  results.push({count,serializedBytes:Buffer.byteLength(data.get('benchmark:history')!),samples});
}
const cloudResults=[];
// Valid tiny PNG with extra bytes after IEND: keeps a repeatable embedded-image
// payload without depending on private images or adding production fixtures.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT1cAAAAASUVORK5CYII=','base64');
for(const count of [100,1000,10000]){
  const rows=Array.from({length:count},(_,i)=>{const image='data:image/png;base64,'+Buffer.concat([png,Buffer.alloc(2048,i%2?i%251:0)]).toString('base64');const invoice=fixtureInvoice(i,image);return {id:`cloud-${i}`,local_id:invoice.id,document:invoice.data,created_at:invoice.savedAt,invoice_number:invoice.invoiceNumber,customer_name:invoice.customerName,customer_username:invoice.customerUsername,start_date:invoice.date,total_amount:invoice.total,is_paid:invoice.isPaid,currency_symbol:invoice.data.currencySymbol};});
  let requests=0,bytes=0;
  const client=createClient<Database>('https://fixture.supabase.co','sb_publishable_test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{
    const url=new URL(String(input)),columns=url.searchParams.get('select')!.split(',');requests++;
    const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));
    const body=JSON.stringify(rows.slice(offset,offset+limit).map(row=>Object.fromEntries(columns.map(key=>[key,row[key as keyof typeof row]]))));
    bytes+=Buffer.byteLength(body);return new Response(body,{headers:{'content-type':'application/json'}});
  }}});
  const repo=new CloudInvoiceRepository(client,'fixture');
  const samples=[];
  for(const mode of ['fullDocuments','summaries'] as const)for(let run=0;run<3;run++){
    requests=0;bytes=0;const started=performance.now();const results=await(mode==='fullDocuments'?repo.search('café'):repo.summaries('café'));
    samples.push({mode,run,ms:+(performance.now()-started).toFixed(2),requests,bytes,count:results.length});
  }
  cloudResults.push({count,imageBytes:png.length+2048,samples});
}
await mkdir('artifacts',{recursive:true});
const output = process.argv[2] || 'artifacts/invoice-benchmark.json';
await writeFile(output,JSON.stringify({node:process.version,platform:process.platform,description:'Three runs, in-memory adapter and mocked HTTP; excludes browser I/O, network latency and rendering',results,cloudResults},null,2));
console.info(JSON.stringify({output,results,cloudResults}));
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
