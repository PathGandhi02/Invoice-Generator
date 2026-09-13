import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
async function files(dir) { return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat(); }
const customers=JSON.parse(await readFile('temp/private-import/customers.json','utf8'));
const names=customers.map(c=>c.full_name).filter(n=>n.length>=18);
const logo=await readFile('temp/private-import/legacy-logo.jpg');
const needles=[...names.flatMap(n=>[Buffer.from(n,'utf8'),Buffer.from(n,'utf16le')]),logo,Buffer.from(logo.toString('base64'))];
const web=(await files('dist')).map(async file=>({name:file,bytes:await readFile(file)}));
const apkPath=process.argv[2]??'artifacts/GigaInvoice.apk';
const apk=await readFile(apkPath);
const native=Object.entries(unzipSync(apk,{filter:e=>e.name.startsWith('assets/')||/\.(png|jpe?g|webp|json)$/.test(e.name)})).map(([name,bytes])=>({name,bytes:Buffer.from(bytes)}));
for(const file of [...await Promise.all(web),...native]) {
 if(needles.some(needle=>file.bytes.includes(needle))) throw new Error(`Protected customer name or legacy logo found in ${file.name}. Do not distribute this build.`);
}
console.info(`PASS: web and APK assets contain none of ${names.length} protected customer names (UTF-8/UTF-16) or the legacy logo. APK SHA-256: ${createHash('sha256').update(apk).digest('hex')}`);
