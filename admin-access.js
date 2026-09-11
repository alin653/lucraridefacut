(function(){
'use strict';

const ADMIN_SCREEN_ID='admin';

function getClient(){return window.supabaseClient || (typeof supabaseClient!=='undefined'?supabaseClient:null);}
function hideAdmin(){
  document.querySelectorAll('[data-owner-admin]').forEach(el=>el.remove());
  const admin=document.getElementById(ADMIN_SCREEN_ID);if(admin){admin.classList.remove('active');admin.style.display='none';admin.setAttribute('aria-hidden','true');}
  const legacy=document.getElementById('adminLogin');if(legacy){legacy.classList.remove('active');legacy.style.display='none';legacy.setAttribute('aria-hidden','true');}
}
function showScreen(id){
  const target=document.getElementById(id);if(!target)return;
  document.querySelectorAll('.screen').forEach(el=>{el.classList.remove('active');el.style.removeProperty('display')});
  target.classList.add('active');target.style.setProperty('display','block','important');target.removeAttribute('aria-hidden');
  document.getElementById('drawer')?.classList.remove('open');
  try{if(typeof window.renderAdmin==='function')window.renderAdmin();}catch(e){console.warn('Admin render',e)}
  window.scrollTo({top:0,behavior:'auto'});
}
async function isAdmin(){
  try{
    const client=getClient();if(!client?.auth?.getSession)return false;
    const {data}=await client.auth.getSession();const user=data?.session?.user;if(!user)return false;
    const {data:row,error}=await client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    if(error)return false;
    return row?.user_id===user.id;
  }catch(_e){return false;}
}
function addAdminButton(){
  const drawer=document.getElementById('drawer');if(!drawer||drawer.querySelector('[data-owner-admin]'))return;
  const hr=document.createElement('hr');hr.setAttribute('data-owner-admin','1');
  const btn=document.createElement('button');btn.type='button';btn.setAttribute('data-owner-admin','1');btn.innerHTML='🛡️ Panou administrator';
  btn.style.cssText='color:#0b2340;background:#fff8db;font-weight:900';
  btn.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(await isAdmin())showScreen(ADMIN_SCREEN_ID);else hideAdmin();});
  drawer.appendChild(hr);drawer.appendChild(btn);
}
async function sync(){
  if(await isAdmin()){
    const admin=document.getElementById(ADMIN_SCREEN_ID);if(admin){admin.style.removeProperty('display');admin.removeAttribute('aria-hidden');}
    addAdminButton();
  }else hideAdmin();
}

document.addEventListener('click',async function(e){
  const adminTarget=e.target.closest?.('[data-nav="admin"],[data-nav="adminLogin"],.admin-link');
  if(!adminTarget)return;
  if(!(await isAdmin())){e.preventDefault();e.stopImmediatePropagation();hideAdmin();}
},true);

window.addEventListener('ldfcloudready',sync);
window.addEventListener('focus',sync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
setTimeout(sync,800);setTimeout(sync,1800);
})();
