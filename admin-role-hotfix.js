(function(){
'use strict';
let adminState=null;
function getClient(){return window.supabaseClient || (typeof supabaseClient!=='undefined'?supabaseClient:null);}
async function checkAdmin(force){
  if(adminState!==null && !force) return adminState;
  try{
    const c=getClient();if(!c?.auth?.getSession){adminState=false;return false;}
    const {data}=await c.auth.getSession();const u=data?.session?.user;if(!u){adminState=false;return false;}
    const {data:row,error}=await c.from('admin_users').select('user_id').eq('user_id',u.id).maybeSingle();
    adminState=!error && !!row?.user_id;
    return adminState;
  }catch(_e){adminState=false;return false;}
}
function paintAdminBadge(){
  if(!adminState)return;
  document.querySelectorAll('.account-badge').forEach(el=>{el.textContent='🛡️ Administrator';});
  document.querySelectorAll('#profile .profile-card, #profile').forEach(root=>{
    root.querySelectorAll('*').forEach(el=>{
      if(el.children.length===0 && /^(Client|Meseriaș) verificat$/i.test((el.textContent||'').trim())) el.textContent='🛡️ Administrator';
    });
  });
}
async function sync(){adminState=await checkAdmin(true);paintAdminBadge();}

document.addEventListener('submit',async function(e){
  const form=e.target;
  if(!form || form.id!=='jobForm') return;
  if(!(await checkAdmin())) return;
  if(typeof currentUser==='undefined' || !currentUser) return;
  const oldRole=currentUser.role;
  currentUser.role='client';
  setTimeout(()=>{try{if(currentUser)currentUser.role='admin';paintAdminBadge();}catch(_e){}},0);
},true);

document.addEventListener('click',()=>setTimeout(paintAdminBadge,0),true);
window.addEventListener('ldfcloudready',sync);
window.addEventListener('focus',sync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
setTimeout(sync,700);setTimeout(sync,1600);
})();
