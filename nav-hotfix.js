(function(){
'use strict';

function installBudgetFix(){
  window.budgetNumber=function(jobOrBudget){
    if(typeof jobOrBudget==='number') return Number.isFinite(jobOrBudget)?jobOrBudget:0;
    const raw=typeof jobOrBudget==='string'?jobOrBudget:(jobOrBudget&&jobOrBudget.budget!=null?jobOrBudget.budget:'');
    if(typeof raw==='number') return Number.isFinite(raw)?raw:0;
    const nums=(String(raw).replace(/\./g,'').match(/\d+(?:,\d+)?/g)||[]).map(x=>Number(x.replace(',','.'))).filter(Number.isFinite);
    return nums.length?Math.max(...nums):0;
  };
  window.formatBudget=function(jobOrBudget){
    const n=window.budgetNumber(jobOrBudget);if(n)return new Intl.NumberFormat('ro-RO').format(n)+' lei';
    const raw=typeof jobOrBudget==='string'?jobOrBudget:(jobOrBudget&&jobOrBudget.budget!=null?jobOrBudget.budget:'');return raw!==''?String(raw):'Buget nespecificat';
  };
  if(typeof window.renderJobs==='function')try{window.renderJobs()}catch(_e){}
}

function installLaunchPricing(){
  window.clientPostingPrice=function(jobOrBudget){return window.budgetNumber(jobOrBudget)>10000?35:15;};
  window.workerUnlockPrice=function(jobOrBudget){return window.budgetNumber(jobOrBudget)>10000?35:25;};
}

function cleanLaunchUi(){
  ['v11-security','v13-online'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.setAttribute('aria-hidden','true')}});
  document.querySelectorAll('.support-head span').forEach(el=>{if(/demo|dispozitiv/i.test(el.textContent||''))el.textContent='Mesajele de suport sunt disponibile din contul tău.'});
  document.querySelectorAll('[data-nav="credits"]').forEach(btn=>{btn.innerHTML='🧾 Istoric';});
  const wallet=document.getElementById('wallet');
  if(wallet){
    const subtitle=wallet.querySelector('.page-head .muted');
    if(subtitle)subtitle.textContent='Plățile sunt momentan în curs de activare. Aici va apărea istoricul tranzacțiilor.';
  }
}

function runRenderer(id){
  try{
    if(id==='support'&&typeof window.renderSupport==='function')window.renderSupport();
    if(id==='workers'&&typeof window.renderWorkers==='function')window.renderWorkers();
    if(id==='wallet'&&typeof window.renderWallet==='function')window.renderWallet();
  }catch(e){console.warn('LDF render '+id,e);}
}

function show(id){
  const target=document.getElementById(id);
  if(!target)return;
  document.querySelectorAll('.screen').forEach(el=>{el.classList.remove('active');el.style.removeProperty('display');});
  target.classList.add('active');
  target.style.setProperty('display','block','important');
  const drawer=document.getElementById('drawer');if(drawer)drawer.classList.remove('open');
  runRenderer(id);
  window.scrollTo({top:0,behavior:'auto'});
}

function hardenPublicUi(){document.querySelectorAll('.admin-link,[data-nav="admin"],[data-nav="adminLogin"]').forEach(el=>{el.style.display='none';el.setAttribute('aria-hidden','true')});['admin','adminLogin'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.classList.remove('active')}});}

function routeClick(e,id){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();show(id);}

function bind(){
  installBudgetFix();installLaunchPricing();cleanLaunchUi();hardenPublicUi();
  document.querySelectorAll('[data-nav="support"]').forEach(btn=>{btn.onclick=e=>routeClick(e,'support')});
  document.querySelectorAll('[data-nav="workers"]').forEach(btn=>{btn.onclick=e=>routeClick(e,'workers')});
  document.querySelectorAll('[data-nav="credits"]').forEach(btn=>{btn.onclick=e=>routeClick(e,'wallet')});
  const help=document.getElementById('floatingHelp');if(help)help.onclick=e=>routeClick(e,'support');
}

document.addEventListener('click',function(e){
  const support=e.target.closest?.('[data-nav="support"],#floatingHelp');if(support){routeClick(e,'support');return;}
  const workers=e.target.closest?.('[data-nav="workers"]');if(workers){routeClick(e,'workers');return;}
  const credits=e.target.closest?.('[data-nav="credits"]');if(credits){routeClick(e,'wallet');return;}
  const admin=e.target.closest?.('.admin-link,[data-nav="admin"],[data-nav="adminLogin"]');if(admin){e.preventDefault();e.stopImmediatePropagation();return;}
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.addEventListener('load',bind);setTimeout(bind,500);setTimeout(bind,1500);
})();
