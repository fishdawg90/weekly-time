/* Change VERSION whenever deploying changed assets. Local timesheets are never cached here. */
const VERSION='weekly-shell-v3';
const ASSETS=['./','./index.html','./styles.css?v=3','./app.mjs?v=3','./model.mjs?v=3','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(k=>k.startsWith('weekly-shell-')&&k!==VERSION).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(request.mode==='navigate')event.respondWith((async()=>{const cache=await caches.open(VERSION);try{const response=await fetch(request);if(response.ok)await cache.put('./index.html',response.clone());return response;}catch{const fallback=await cache.match('./index.html');return fallback||Response.error();}})());
 else event.respondWith((async()=>{const hit=await caches.match(request);return hit||fetch(request);})());
});
