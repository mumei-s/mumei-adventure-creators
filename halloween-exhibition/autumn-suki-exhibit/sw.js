"use strict";
// Install without making a persistent offline copy of the temporary exhibit.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("fetch",event=>{
 const u=new URL(event.request.url);
 if(event.request.mode==="navigate"&&u.origin===self.location.origin&&u.href.startsWith(self.registration.scope)){
  event.respondWith(fetch(event.request));
 }
});
