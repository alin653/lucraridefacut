(function(){
  'use strict';
  function go(screen){
    if(typeof window.nav==='function'){ window.nav(screen); return; }
    const el=document.getElementById(screen);
    if(!el) return;
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function install(){
    if(document.getElementById('ldf-auth-entry')) return;
    const bar=document.createElement('div');
    bar.id='ldf-auth-entry';
    bar.setAttribute('aria-label','Acces cont');
    bar.innerHTML='<button type="button" class="ldf-login">Autentificare</button><button type="button" class="ldf-signup">Creează cont</button>';
    const style=document.createElement('style');
    style.textContent='#ldf-auth-entry{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:55;display:flex;gap:10px;width:min(94vw,430px);padding:10px;background:#fff;border:1px solid #dbe3ea;border-radius:16px;box-shadow:0 10px 28px #0002}#ldf-auth-entry button{flex:1;border:0;border-radius:12px;padding:14px 12px;font-size:16px;font-weight:900;cursor:pointer}.ldf-login{background:#0b2340;color:#fff}.ldf-signup{background:#ffbf00;color:#0b2340}@media(min-width:800px){#ldf-auth-entry{left:auto;right:18px;bottom:18px;transform:none;width:390px}}';
    document.head.appendChild(style);
    document.body.appendChild(bar);
    bar.querySelector('.ldf-login').onclick=()=>go('login');
    bar.querySelector('.ldf-signup').onclick=()=>go('auth');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
