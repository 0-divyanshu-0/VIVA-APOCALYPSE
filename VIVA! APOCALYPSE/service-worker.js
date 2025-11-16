const CACHE_NAME = 'hearthline-v1'
const OFFLINE_URL = '/index.html'
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'
]

self.addEventListener('install', evt =>{
  self.skipWaiting()
  evt.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)))
})

self.addEventListener('activate', evt =>{
  evt.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', evt =>{
  const req = evt.request
  
  evt.respondWith(fetch(req).catch(()=>caches.match(req).then(res=>res||caches.match(OFFLINE_URL))))
})


self.addEventListener('sync', evt =>{
  if(evt.tag === 'hearth-sync'){
    evt.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync(){

  const clientsList = await self.clients.matchAll({includeUncontrolled:true})
  for(const c of clientsList){
    c.postMessage({type:'background-sync'})
  }
}
