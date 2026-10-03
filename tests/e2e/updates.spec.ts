import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { cp, mkdtemp, readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fixtureCustomer } from '../fixtures/largeData';
import { defaultSettings } from '../../src/models/BusinessSettings';

test.describe('real exported service-worker versions',()=>{
  let rootA:string,rootB:string,activeRoot:string,origin:string,server:Server,failInstall=false;
  test.beforeAll(async()=>{
    const root=await mkdtemp(path.join(tmpdir(),'gigainvoice-update-'));
    async function prepare(label:string){
      const destination=path.join(root,label);await cp('dist',destination,{recursive:true});
      const jsDir=path.join(destination,'_expo/static/js/web');
      const names=(await readdir(jsDir)).filter(n=>n.endsWith('.js'));
      const replacements=names.map(n=>[n,n.replace('.js',`-${label}.js`)] as const);
      for(const [before,after] of replacements)await rename(path.join(jsDir,before),path.join(jsDir,after));
      async function rewrite(dir:string){for(const entry of await readdir(dir,{withFileTypes:true})){const filename=path.join(dir,entry.name);if(entry.isDirectory())await rewrite(filename);else if(/\.(html|js)$/.test(entry.name)&&entry.name!=='sw.js'){let contents=await readFile(filename,'utf8');for(const [before,after] of replacements)contents=contents.replaceAll(before,after);await writeFile(filename,contents);}}}
      await rewrite(destination);await writeFile(path.join(destination,'build-marker.txt'),label);
      execFileSync(process.execPath,['scripts/prepare-web.mjs',destination],{stdio:'pipe'});
      return destination;
    }
    rootA=await prepare('A');rootB=await prepare('B');activeRoot=rootA;
    server=createServer(async(req,res)=>{try{
      const url=new URL(req.url!, 'http://localhost');
      if(failInstall&&url.pathname==='/app-icon.png'){res.writeHead(503).end();return;}
      const route=url.pathname==='/'?'/index.html':path.extname(url.pathname)?url.pathname:`${url.pathname}.html`;
      const filename=path.resolve(activeRoot,`.${route}`);if(!filename.startsWith(activeRoot+path.sep)){res.writeHead(403).end();return;}
      const body=await readFile(filename);res.writeHead(200,{'Content-Type':filename.endsWith('.js')?'application/javascript':filename.endsWith('.html')?'text/html':filename.endsWith('.webmanifest')?'application/manifest+json':filename.endsWith('.png')?'image/png':'application/octet-stream','Cache-Control':'no-store'}).end(body);
    }catch{res.writeHead(404).end();}});
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  });
  test.afterAll(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));});
  test('failed first precache leaves no partial shell and recovers on a connected visit',async({page,context})=>{
    activeRoot=rootA;failInstall=true;
    await page.goto(origin);await page.getByRole('button',{name:'Continue as Guest',exact:true}).click();
    await page.evaluate(async()=>{
      const registration=await navigator.serviceWorker.register('/sw.js');const worker=registration.installing;
      if(worker)await new Promise<void>(resolve=>{const check=()=>{if(worker.state==='redundant'||worker.state==='installed')resolve();};worker.addEventListener('statechange',check);check();});
    });
    expect(await page.evaluate(async()=>await caches.keys())).toEqual([]);
    await context.setOffline(true);await expect(page.goto(origin+'/history')).rejects.toThrow();
    await context.setOffline(false);failInstall=false;await page.goto(origin);
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
    await context.setOffline(true);await page.goto(origin+'/history');
    await expect(page.getByRole('textbox',{name:'Search invoice history',exact:true})).toBeVisible();
    await context.setOffline(false);
  });
  test('incomplete update preserves A; B waits for both windows and retains offline data',async({context},info)=>{
    test.setTimeout(120_000);activeRoot=rootA;failInstall=false;
    const page=await context.newPage();await page.goto(origin);
    await page.getByRole('button',{name:'Continue as Guest',exact:true}).click();
    await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
    await page.getByRole('button',{name:'Enter customer manually'}).click();
    await page.getByRole('textbox',{name:'Customer name',exact:true}).fill('Update survives — Café');
    await page.getByRole('button',{name:'Plan & pricing',exact:true}).click();
    await page.getByRole('textbox',{name:'Plan name',exact:true}).fill('Versioned plan');
    await page.getByRole('textbox',{name:'Time period',exact:true}).fill('One month');
    await page.getByRole('button',{name:'Save invoice',exact:true}).click();
    await expect(page.getByText('Invoice saved',{exact:true})).toBeVisible();
    await page.evaluate(({customer,settings})=>{localStorage.setItem('gigainvoice:v2:guest:customers',JSON.stringify([customer]));localStorage.setItem('gigainvoice:v2:guest:settings',JSON.stringify(settings));},{customer:fixtureCustomer(7),settings:{...defaultSettings,companyName:'Fictional versioned business'}});
    await page.getByRole('button',{name:'Customer',exact:true}).click();
    await page.getByRole('textbox',{name:'Customer name',exact:true}).fill('In-progress update draft');
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('gigainvoice:v2:guest:draft'))).toContain('In-progress update draft');
    const second=await context.newPage();await second.goto(origin+'/settings');
    const before=await page.evaluate(async()=> (await caches.keys()).filter(k=>k.startsWith('gigainvoice-')));
    activeRoot=rootB;failInstall=true;
    await page.evaluate(async()=>{
      const reg=(await navigator.serviceWorker.getRegistration())!;await reg.update();
      const worker=reg.installing;if(worker)await new Promise<void>(resolve=>{const check=()=>{if(worker.state==='redundant'||worker.state==='installed')resolve();};worker.addEventListener('statechange',check);check();});
    });
    expect(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistration())?.waiting===null)).toBe(true);
    expect(await page.evaluate(async()=> (await caches.keys()).filter(k=>k.startsWith('gigainvoice-')))).toEqual(before);
    failInstall=false;await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration())!.update();});
    await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
    await expect(page.getByText('An update is ready.',{exact:false})).toBeVisible();
    await context.setOffline(true);
    const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export PDF',exact:true}).click();
    await (await downloading).saveAs(info.outputPath('version-A-offline.pdf'));
    expect(await page.evaluate(async()=>await (await fetch('/build-marker.txt')).text())).toBe('A');
    await page.close();
    expect(await second.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
    await second.close();await context.setOffline(false);
    const next=await context.newPage();await next.goto(origin);
    await expect.poll(()=>next.evaluate(async()=>await (await fetch('/build-marker.txt')).text())).toBe('B');
    await expect(next.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue('In-progress update draft');
    await context.setOffline(true);await next.reload();
    await expect(next.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue('In-progress update draft');
    const updatedPdf=next.waitForEvent('download');await next.getByRole('button',{name:'Export PDF',exact:true}).click();await (await updatedPdf).saveAs(info.outputPath('version-B-offline.pdf'));
    const cacheKeys=await next.evaluate(async()=>{const names=(await caches.keys()).filter(k=>k.startsWith('gigainvoice-'));return {names,urls:(await Promise.all(names.map(async n=>(await (await caches.open(n)).keys()).map(r=>r.url)))).flat()};});
    expect(cacheKeys.names).toHaveLength(1);expect(cacheKeys.urls.some(u=>/auth\/v1|rest\/v1|\.pdf|code=/.test(u))).toBe(false);
    expect(await next.evaluate(()=>JSON.parse(localStorage.getItem('gigainvoice:v2:guest:settings')!).companyName)).toBe('Fictional versioned business');
    expect(await next.evaluate(()=>JSON.parse(localStorage.getItem('gigainvoice:v2:guest:customers')!).length)).toBe(1);
    // A compatible previous bundle can be reinstalled under the same wait rule.
    await context.setOffline(false);activeRoot=rootA;
    await next.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration())!.update();});
    await expect.poll(()=>next.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);
    await next.close();const rollback=await context.newPage();await rollback.goto(origin);
    await expect.poll(()=>rollback.evaluate(async()=>await(await fetch('/build-marker.txt')).text())).toBe('A');
    await expect(rollback.getByRole('textbox',{name:'Customer name',exact:true})).toHaveValue('In-progress update draft');
    await rollback.close();
  });
});
