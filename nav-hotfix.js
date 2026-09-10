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
  // Tarife de lansare: clientul plateste de la prima lucrare; meseriasul plateste de la prima deblocare.
  window.clientPostingPrice=function(jobOrBudget){return window.budgetNumber(jobOrBudget)>10000?35:15;};
  window.workerUnlockPrice=function(jobOrBudget){return window.budgetNumber(jobOrBudget)>10000?35:25;};
}

function hideLegacyDemoUi(){
  ['v11-security','v13-online'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.setAttribute('aria-hidden','true')}});
  document.querySelectorAll('#credits .balance-card,#credits .section-card').forEach(el=>{if(/demonstrativ|simulat/i.test(el.textContent||''))el.style.display='none'});
  document.querySelectorAll('.support-head span').forEach(el=>{if(/demo|dispozitiv/i.test(el.textContent||''))el.textContent='Mesajele de suport sunt disponibile din contul tău.'});
}

function show(id){const target=document.getElementById(id);if(!target)return;document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));target.classList.add('active');const drawer=document.getElementById('drawer');if(drawer)drawer.classList.remove('open');window.scrollTo({top:0,behavior:'auto'});if(id==='support'&&typeof renderSupport==='function')try{renderSupport()}catch(e){}}
function hardenPublicUi(){document.querySelectorAll('.admin-link,[data-nav="admin"],[data-nav="adminLogin"]').forEach(el=>{el.style.display='none';el.setAttribute('aria-hidden','true')});['admin','adminLogin'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.classList.remove('active')}});}
function bind(){installBudgetFix();installLaunchPricing();hideLegacyDemoUi();hardenPublicUi();document.querySelectorAll('[data-nav="support"]').forEach(btn=>{btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('support')}});const help=document.getElementById('floatingHelp');if(help)help.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('support')};document.querySelectorAll('[data-nav="workers"]').forEach(btn=>{btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('workers')}});}
document.addEventListener('click',function(e){const support=e.target.closest('[data-nav="support"]');if(support){e.preventDefault();e.stopImmediatePropagation();show('support');return}const admin=e.target.closest('.admin-link,[data-nav="admin"],[data-nav="adminLogin"]');if(admin){e.preventDefault();e.stopImmediatePropagation();return}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();window.addEventListener('load',bind);setTimeout(bind,500);setTimeout(bind,1500);
})();