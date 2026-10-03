import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const output = path.resolve(process.argv[2] || 'dist');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
}
await copyFile('assets/icon.png', path.join(output, 'app-icon.png'));
await writeFile(path.join(output, 'manifest.webmanifest'), JSON.stringify({ name: 'GigaInvoice', short_name: 'GigaInvoice', start_url: '/', display: 'standalone', background_color: '#0b0f19', theme_color: '#0b0f19', icons: [{ src: '/app-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }] }));
const assets = (await files(output)).filter(file => !file.endsWith('sw.js')).sort();
const hash = createHash('sha256');
for (const asset of assets) hash.update(await readFile(asset));
const version = hash.digest('hex').slice(0, 14);
const urls = assets.map(file => '/' + path.relative(output, file).replaceAll(path.sep, '/'));
await writeFile(path.join(output, 'sw.js'), `/* A new worker waits until all previous app windows close. */
const CACHE = 'gigainvoice-${version}';
const ASSETS = ${JSON.stringify(urls)};
const PUBLIC = new Set(ASSETS);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(async error => { await caches.delete(CACHE); throw error; })));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gigainvoice-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    const route = url.pathname === '/' ? '/index.html' : url.pathname.replace(/\\/$/, '') + '.html';
    // Serve a coherent shell for this worker's version, including online
    // navigations. Query strings (including Auth codes) never enter CacheStorage.
    if (PUBLIC.has(route)) event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(route)) || fetch(event.request)));
  } else if (PUBLIC.has(url.pathname) && !url.search) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  }
});
`);
console.info('Offline web cache and installable web manifest generated.');
