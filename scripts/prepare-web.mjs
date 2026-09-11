import { readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
}
await copyFile('assets/icon.png', 'dist/app-icon.png');
await writeFile('dist/manifest.webmanifest', JSON.stringify({ name: 'GigaInvoice', short_name: 'GigaInvoice', start_url: '/', display: 'standalone', background_color: '#0b0f19', theme_color: '#0b0f19', icons: [{ src: '/app-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }] }));
const assets = (await files('dist')).filter(file => !file.endsWith('sw.js')).sort();
const hash = createHash('sha256');
for (const asset of assets) hash.update(await readFile(asset));
const version = hash.digest('hex').slice(0, 14);
const urls = assets.map(file => '/' + path.relative('dist', file).replaceAll(path.sep, '/'));
await writeFile('dist/sw.js', `/* Generated for this private, offline workspace. */
const CACHE = 'gigainvoice-${version}';
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gigainvoice-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    const route = url.pathname === '/' ? '/index.html' : url.pathname.replace(/\\/$/, '') + '.html';
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(CACHE)).match(route).then(response => response || caches.match('/index.html'))));
  } else event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
`);
console.info('Offline web cache and installable web manifest generated.');
