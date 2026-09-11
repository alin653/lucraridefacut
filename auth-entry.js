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

  async function syncLocalUserFromSession(){
    try{
      const cloud=window.LDFCloud;
      if(!cloud?.getSession) return null;
      const session=await cloud.getSession();
      if(!session?.user) return null;
      let profile=null;
      try{ profile=await cloud.getMyProfile(); }catch(_e){}
      if(typeof currentUser!=='undefined'){
        currentUser=currentUser||{};
        currentUser.id=session.user.id;
        currentUser.email=session.user.email||currentUser.email||'';
        if(profile){
          currentUser.name=profile.full_name||currentUser.name||'';
          currentUser.city=profile.city||currentUser.city||'';
          currentUser.county=profile.county||currentUser.county||'';
          currentUser.role=profile.role==='admin'?'admin':(profile.role==='worker'?'meseriaș':'client');
        }
        if(typeof persist==='function') persist();
      }
      return {session,profile};
    }catch(err){ console.warn('LDF user sync:',err); return null; }
  }

  async function logout(){
    const client=getClient();
    if(!client?.auth?.signOut) return;
    try{
      await client.auth.signOut();
      try{ localStorage.removeItem('ldf_currentUser'); localStorage.removeItem('currentUser'); }catch(_e){}
      if(typeof currentUser!=='undefined') currentUser=null;
      if(typeof persist==='function') persist();
      if(typeof updateNotificationBadge==='function') updateNotificationBadge();
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
        renderState(!!session?.user);
        if(session?.user) await syncLocalUserFromSession();
        return;
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
      client.auth.onAuthStateChange(async(_event,session)=>{renderState(!!session?.user);if(session?.user)await syncLocalUserFromSession();});
    }
  }

  function bindRoleButtons(){
    const post=document.getElementById('postJobBtn');
    if(post && post.dataset.ldfSessionGuard!=='1'){
      post.dataset.ldfSessionGuard='1';
      post.onclick=async(e)=>{
        e?.preventDefault?.();
        const state=await syncLocalUserFromSession();
        if(!state?.session?.user){go('auth');return;}
        const role=state.profile?.role || (typeof currentUser!=='undefined'?currentUser?.role:null);
        if(role==='client'||role==='admin'){go('post');return;}
        if(typeof window.toast==='function')window.toast('Pentru a posta o lucrare ai nevoie de cont de client.');
        go('profile');
      };
    }
    const find=document.getElementById('findJobsBtn');
    if(find && find.dataset.ldfSessionGuard!=='1'){
      find.dataset.ldfSessionGuard='1';
      find.onclick=async(e)=>{
        e?.preventDefault?.();
        const state=await syncLocalUserFromSession();
        if(!state?.session?.user){go('auth');return;}
        const role=state.profile?.role || (typeof currentUser!=='undefined'?currentUser?.role:null);
        if(role==='worker'||role==='meseriaș'||role==='admin'){go('jobs');return;}
        if(typeof window.toast==='function')window.toast('Pentru a vedea lucrările ca meseriaș ai nevoie de cont de meseriaș.');
        go('profile');
      };
    }
  }

  function bindNavigationGuards(){
    document.querySelectorAll('[data-nav]').forEach(btn=>{
      if(btn.dataset.ldfGuard==='1') return;
      btn.dataset.ldfGuard='1';
      btn.addEventListener('click',()=>setTimeout(hideLegacyStandalone,0));
    });
    bindRoleButtons();
  }

  function install(){
    hideLegacyStandalone();
    if(!document.getElementById('ldf-auth-entry')){
      const bar=document.createElement('div');
      bar.id='ldf-auth-entry';
      bar.setAttribute('aria-label','Acces cont');
      const style=document.createElement('style');
      style.textContent='#v11-security,#v13-online{display:none!important}body{padding-bottom:86px}#ldf-auth-entry{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:55;display:flex;gap:8px;width:min(92vw,400px);padding:7px;background:#fff;border:1px solid #dbe3ea;border-radius:14px;box-shadow:0 8px 22px #0002}#ldf-auth-entry button{flex:1;min-height:46px;border:0;border-radius:10px;padding:10px 8px;font-size:15px;font-weight:900;cursor:pointer}.ldf-login,.ldf-account{background:#0b2340;color:#fff}.ldf-signup{background:#ffbf00;color:#0b2340}.ldf-logout{background:#ffe8ea;color:#a01523}@media(max-width:480px){body{padding-bottom:76px}#ldf-auth-entry{bottom:8px;width:calc(100vw - 24px);padding:6px;gap:6px;border-radius:12px}#ldf-auth-entry button{min-height:44px;padding:9px 6px;font-size:14px;border-radius:9px}}@media(min-width:800px){body{padding-bottom:0}#ldf-auth-entry{left:auto;right:18px;bottom:18px;transform:none;width:360px}}';
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