(function(){
  'use strict';

  function hideLegacyStandalone(){
    ['v11-security','v13-online'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.style.setProperty('display','none','important');
    });
  }

  function go(screen){
    hideLegacyStandalone();
    if(typeof window.nav==='function'){ window.nav(screen); hideLegacyStandalone(); return; }
    const el=document.getElementById(screen);
    if(!el) return;
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');
    hideLegacyStandalone();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function getClient(){
    return window.supabaseClient || (typeof supabaseClient!=='undefined'?supabaseClient:null);
  }

  async function logout(){
    const client=getClient();
    if(!client?.auth?.signOut) return;
    try{
      await client.auth.signOut();
      try{ localStorage.removeItem('currentUser'); }catch(_e){}
      if(typeof window.currentUser!=='undefined') window.currentUser=null;
      renderState(false);
      if(typeof window.toast==='function') window.toast('Te-ai delogat.');
      go('home');
    }catch(err){
      console.error('LDF logout:',err);
      if(typeof window.toast==='function') window.toast('Nu am putut face delogarea. Încearcă din nou.');
    }
  }

  function renderState(authenticated){
    const bar=document.getElementById('ldf-auth-entry');
    if(!bar) return;
    bar.style.display='flex';
    if(authenticated){
      bar.classList.add('logged-in');
      bar.innerHTML='<button type="button" class="ldf-account">Contul meu</button><button type="button" class="ldf-logout">Delogare</button>';
      bar.querySelector('.ldf-account').onclick=()=>go('profile');
      bar.querySelector('.ldf-logout').onclick=logout;
    }else{
      bar.classList.remove('logged-in');
      bar.innerHTML='<button type="button" class="ldf-login">Autentificare</button><button type="button" class="ldf-signup">Creează cont</button>';
      bar.querySelector('.ldf-login').onclick=()=>go('login');
      bar.querySelector('.ldf-signup').onclick=()=>go('auth');
    }
  }

  async function syncAuthBar(){
    try{
      if(window.LDFCloud?.getSession){
        const session=await window.LDFCloud.getSession();
        renderState(!!session?.user); return;
      }
      const client=getClient();
      if(client?.auth?.getSession){
        const {data}=await client.auth.getSession();
        renderState(!!data?.session?.user); return;
      }
      renderState(false);
    }catch(err){ console.warn('LDF auth bar sync:',err); }
  }

  function bindAuthChanges(){
    const client=getClient();
    if(client?.auth?.onAuthStateChange && !window.__ldfAuthBarBound){
      window.__ldfAuthBarBound=true;
      client.auth.onAuthStateChange((_event,session)=>renderState(!!session?.user));
    }
  }

  function bindNavigationGuards(){
    document.querySelectorAll('[data-nav]').forEach(btn=>{
      if(btn.dataset.ldfGuard==='1') return;
      btn.dataset.ldfGuard='1';
      btn.addEventListener('click',()=>setTimeout(hideLegacyStandalone,0));
    });
    document.querySelectorAll('[data-nav="support"],#floatingHelp').forEach(btn=>{
      btn.onclick=(e)=>{
        e.preventDefault(); e.stopPropagation();
        const drawer=document.getElementById('drawer');
        if(drawer) drawer.classList.remove('open');
        go('support');
      };
    });
  }

  function install(){
    hideLegacyStandalone();
    if(!document.getElementById('ldf-auth-entry')){
      const bar=document.createElement('div');
      bar.id='ldf-auth-entry';
      bar.setAttribute('aria-label','Acces cont');
      const style=document.createElement('style');
      style.textContent='#v11-security,#v13-online{display:none!important}#ldf-auth-entry{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:55;display:flex;gap:10px;width:min(94vw,430px);padding:10px;background:#fff;border:1px solid #dbe3ea;border-radius:16px;box-shadow:0 10px 28px #0002}#ldf-auth-entry button{flex:1;border:0;border-radius:12px;padding:14px 12px;font-size:16px;font-weight:900;cursor:pointer}.ldf-login,.ldf-account{background:#0b2340;color:#fff}.ldf-signup{background:#ffbf00;color:#0b2340}.ldf-logout{background:#ffe8ea;color:#a01523}@media(min-width:800px){#ldf-auth-entry{left:auto;right:18px;bottom:18px;transform:none;width:390px}}';
      document.head.appendChild(style);
      document.body.appendChild(bar);
    }
    bindNavigationGuards(); bindAuthChanges(); syncAuthBar();
  }

  window.addEventListener('ldfcloudready',()=>{ hideLegacyStandalone(); bindNavigationGuards(); bindAuthChanges(); syncAuthBar(); });
  window.addEventListener('focus',()=>{ hideLegacyStandalone(); bindNavigationGuards(); syncAuthBar(); });
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ hideLegacyStandalone(); bindNavigationGuards(); syncAuthBar(); } });
  document.addEventListener('click',()=>setTimeout(hideLegacyStandalone,0),true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  let attempts=0;
  const timer=setInterval(()=>{ attempts++; hideLegacyStandalone(); bindNavigationGuards(); bindAuthChanges(); syncAuthBar(); if(window.__ldfAuthBarBound || attempts>=10) clearInterval(timer); },1000);
})();
