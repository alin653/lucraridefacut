(function(){
'use strict';
let adminState=null;
function getClient(){return window.supabaseClient || (typeof supabaseClient!=='undefined'?supabaseClient:null);}
async function checkAdmin(force){
  if(adminState!==null && !force) return adminState;
  try{
    const c=getClient();if(!c?.auth?.getSession){adminState=false;return false;}
    const {data}=await c.auth.getSession();const u=data?.session?.user;if(!u){adminState=false;return false;}
    const {data:profile,error:profileErr}=await c.from('profiles').select('role').eq('id',u.id).maybeSingle();
    if(!profileErr && profile?.role==='admin'){adminState=true;return true;}
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
async function sync(){
  adminState=await checkAdmin(true);
  if(adminState && typeof currentUser!=='undefined' && currentUser){currentUser.role='admin';}
  paintAdminBadge();
}
async function publishAsAdmin(form){
  try{
    if(typeof currentUser==='undefined'||!currentUser){if(typeof toast==='function')toast('Autentifică-te din nou.');return;}
    if(!currentUser.phone){if(typeof toast==='function')toast('Completează numărul de telefon în cont înainte de publicare.');if(typeof nav==='function')nav('profile');return;}
    const data={title:document.querySelector('#jobCategory').value,city:document.querySelector('#jobCity').value,cat:document.querySelector('#jobCategory').value,budget:document.querySelector('#jobBudget').value,start:document.querySelector('#jobStart').value,desc:document.querySelector('#jobDescription').value};
    const oldRole=currentUser.role;currentUser.role='client';
    let newJob;
    if(window.LDFSupabaseJobs?.createJob)newJob=await window.LDFSupabaseJobs.createJob(data);
    else newJob={id:Date.now(),...data,access:0,max:(typeof MAX_WORKERS_PER_JOB!=='undefined'?MAX_WORKERS_PER_JOB:6),cost:(typeof workerUnlockPrice==='function'?workerUnlockPrice(data.budget):0),unlockedBy:[],status:'activ',ownerId:currentUser.id,workflowStatus:'disponibila'};
    currentUser.role=oldRole||'admin';
    if(typeof jobs!=='undefined')jobs.unshift(newJob);
    if(typeof addJobHistory==='function')addJobHistory(newJob.id,'Lucrarea a fost publicată de administrator');
    if(typeof notifyMatchingWorkers==='function')notifyMatchingWorkers(newJob);
    if(typeof persist==='function')persist();
    form.reset();if(typeof toast==='function')toast('Lucrarea a fost publicată gratuit cu succes.');if(typeof nav==='function')nav('jobs');if(typeof renderJobs==='function')renderJobs();paintAdminBadge();
  }catch(err){try{if(typeof currentUser!=='undefined'&&currentUser)currentUser.role='admin';}catch(_e){}console.error(err);if(typeof toast==='function')toast(err?.message||'Nu am putut publica lucrarea.');}
}
document.addEventListener('submit',async function(e){
  const form=e.target;if(!form||form.id!=='jobForm')return;
  const isOwner=adminState===true || await checkAdmin(true);if(!isOwner)return;
  e.preventDefault();e.stopImmediatePropagation();publishAsAdmin(form);
},true);
document.addEventListener('click',()=>setTimeout(paintAdminBadge,0),true);
window.addEventListener('ldfcloudready',sync);window.addEventListener('focus',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
setTimeout(sync,300);setTimeout(sync,900);setTimeout(sync,1800);
})();