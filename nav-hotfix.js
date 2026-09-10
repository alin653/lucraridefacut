(function(){
'use strict';
function show(id){
 const target=document.getElementById(id); if(!target)return;
 document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
 target.classList.add('active');
 const drawer=document.getElementById('drawer'); if(drawer)drawer.classList.remove('open');
 window.scrollTo({top:0,behavior:'auto'});
 if(id==='support'&&typeof renderSupport==='function')try{renderSupport()}catch(e){}
}
function bind(){
 document.querySelectorAll('[data-nav="support"]').forEach(btn=>{btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('support')}});
 const help=document.getElementById('floatingHelp');if(help)help.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('support')};
 document.querySelectorAll('[data-nav="workers"]').forEach(btn=>{btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('workers')}});
}
document.addEventListener('click',function(e){const b=e.target.closest('[data-nav="support"]');if(b){e.preventDefault();e.stopImmediatePropagation();show('support')}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.addEventListener('load',bind);setTimeout(bind,500);setTimeout(bind,1500);
})();