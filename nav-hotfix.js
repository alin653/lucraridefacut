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
function hardenPublicUi(){
 document.querySelectorAll('.admin-link,[data-nav="admin"],[data-nav="adminLogin"]').forEach(el=>{el.style.display='none';el.setAttribute('aria-hidden','true')});
 ['admin','adminLogin'].forEach(id=>{const el=document.getElementById(id);if(el){el.style.display='none';el.classList.remove('active')}});
}
function bind(){
 hardenPublicUi();
 document.querySelectorAll('[data-nav="support"]').forEach(btn=>{btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('support')}});
 const help=document.getElementById('floatingHelp');if(help)help.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('support')};
 document.querySelectorAll('[data-nav="workers"]').forEach(btn=>{btn.onclick=function(e){e.preventDefault();e.stopImmediatePropagation();show('workers')}});
}
document.addEventListener('click',function(e){
 const support=e.target.closest('[data-nav="support"]');if(support){e.preventDefault();e.stopImmediatePropagation();show('support');return}
 const admin=e.target.closest('.admin-link,[data-nav="admin"],[data-nav="adminLogin"]');if(admin){e.preventDefault();e.stopImmediatePropagation();return}
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.addEventListener('load',bind);setTimeout(bind,500);setTimeout(bind,1500);
})();