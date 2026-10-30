const CACHE='calango-v11';
const APP=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];

self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });

/* Abre sempre do cache (rápido e imune a falhas do GitHub) e atualiza em segundo plano.
   Só guarda respostas válidas (200 OK); páginas de erro nunca substituem o app. */
function atualizar(req,chave){
  return fetch(req,{cache:'no-store'}).then(r=>{
    if(r&&r.ok&&(r.type==='basic'||r.type==='cors')){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(chave||req,cp)); }
    return r;
  });
}
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  const fonte=url.host==='fonts.googleapis.com'||url.host==='fonts.gstatic.com';
  if(url.origin!==location.origin&&!fonte) return;

  if(req.mode==='navigate'){
    e.respondWith(caches.match('./index.html').then(hit=>{
      const rede=atualizar(req,'./index.html').catch(()=>null);
      if(hit){ e.waitUntil(rede); return hit; }
      return rede.then(r=>r&&r.ok?r:new Response('<h1>Sem conexão</h1><p>Abra o app uma vez com internet para instalá-lo.</p>',{headers:{'Content-Type':'text/html; charset=utf-8'}}));
    }));
    return;
  }

  e.respondWith(caches.match(req).then(hit=>{
    const rede=(fonte?fetch(req).then(r=>{ if(r&&(r.ok||r.type==='opaque')){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); } return r; }):atualizar(req)).catch(()=>null);
    if(hit){ e.waitUntil(rede); return hit; }
    return rede.then(r=>r||Response.error());
  }));
});
