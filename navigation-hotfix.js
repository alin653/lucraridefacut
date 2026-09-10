(function(){
  'use strict';
  function closeDrawer(){const d=document.getElementById('drawer');if(d)d.classList.remove('open');}
  function showScreen(id){
    const target=document.getElementById(id);if(!target)return false;
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
    target.classList.add('active');closeDrawer();window.scrollTo({top:0,behavior:'smooth'});
    if(id==='support'&&typeof window.renderSupport==='function'){try{window.renderSupport();}catch(_e){}}
    return true;
  }
  document.addEventListener('click',function(e){
    const el=e.target.closest?.('[data-nav="support"],#floatingHelp');
    if(!el)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    showScreen('support');
  },true);
  window.__ldfShowScreen=showScreen;
})();