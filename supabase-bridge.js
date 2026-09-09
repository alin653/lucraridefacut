(function(){
  'use strict';

  const cloud=()=>window.LDFCloud;
  const money=n=>Number(String(n??0).replace(/[^0-9.,-]/g,'').replace(',','.'))||0;

  function cloudToLocalJob(j){
    return {
      id:j.id,
      title:j.title,
      city:j.city||'',
      cat:j.category||'Altele',
      budget:money(j.budget),
      start:'De stabilit',
      desc:j.description||'',
      access:0,
      max:j.max_unlocks||6,
      cost:j.unlock_fee||25,
      status:'activ',
      ownerId:j.client_id,
      workflowStatus:j.status==='completed'?'finalizat':j.status==='assigned'?'in_lucru':'disponibila',
      cloud:true
    };
  }

  async function syncCloudState(){
    if(!cloud()) return;
    try{
      const session=await cloud().getSession();
      if(!session?.user) return;
      const [remoteJobs,remoteSaved,profile,phone]=await Promise.all([
        cloud().listOpenJobs(),
        cloud().listSavedJobs(),
        cloud().getMyProfile(),
        cloud().getMyPhone().catch(()=>''),
      ]);

      if(typeof window.jobs!=='undefined'){
        const localOnly=window.jobs.filter(j=>!j.cloud && typeof j.id==='number');
        window.jobs=[...remoteJobs.map(cloudToLocalJob),...localOnly];
      }

      if(typeof window.savedJobs!=='undefined'){
        const mine=remoteSaved.map(x=>({userId:session.user.id,jobId:x.job_id,savedAt:x.created_at,cloud:true}));
        const others=window.savedJobs.filter(x=>String(x.userId)!==String(session.user.id));
        window.savedJobs=[...mine,...others];
      }

      if(typeof window.currentUser!=='undefined' && window.currentUser){
        window.currentUser.id=session.user.id;
        window.currentUser.name=profile.full_name||window.currentUser.name;
        window.currentUser.city=profile.city||window.currentUser.city||'';
        window.currentUser.role=profile.role==='worker'?'meseriaș':'client';
        if(phone) window.currentUser.phone=phone;
      }

      if(typeof window.persist==='function') window.persist();
      if(typeof window.renderJobs==='function') window.renderJobs();
      if(typeof window.renderProfile==='function') window.renderProfile();
    }catch(err){
      console.warn('LDF cloud sync:',err);
    }
  }

  async function cloudToggleSaved(id){
    if(!window.currentUser){
      if(typeof window.toast==='function') window.toast('Autentifică-te pentru a salva lucrarea.');
      if(typeof window.nav==='function') window.nav('auth');
      return;
    }
    const existing=window.savedJobs?.find(x=>String(x.userId)===String(window.currentUser.id)&&String(x.jobId)===String(id));
    try{
      if(existing){
        await cloud().unsaveJob(id);
        window.savedJobs=window.savedJobs.filter(x=>!(String(x.userId)===String(window.currentUser.id)&&String(x.jobId)===String(id)));
        window.toast?.('Lucrarea a fost scoasă din Salvate');
      }else{
        await cloud().saveJob(id);
        window.savedJobs.unshift({userId:window.currentUser.id,jobId:id,savedAt:new Date().toLocaleString('ro-RO'),cloud:true});
        window.toast?.('Lucrarea a fost salvată');
      }
      window.persist?.();
      window.renderJobs?.();
      if(window.selectedJob?.id===id) window.openJob?.(id);
    }catch(err){
      window.toast?.('Nu am putut salva lucrarea online.');
      console.error(err);
    }
  }

  function installSaveOverride(){
    const original=window.toggleSaved;
    if(typeof original!=='function') return;
    window.toggleSaved=function(id){
      const job=window.jobs?.find(j=>String(j.id)===String(id));
      if(job?.cloud && cloud()) return cloudToggleSaved(id);
      return original(id);
    };
  }

  function installJobFormOverride(){
    const form=document.getElementById('jobForm');
    if(!form || form.dataset.cloudBound==='1') return;
    form.dataset.cloudBound='1';
    form.addEventListener('submit',function(e){
      if(!cloud()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      (async()=>{
        if(!window.currentUser||window.currentUser.role!=='client'){
          window.toast?.('Trebuie să fii autentificat ca client.');
          window.nav?.('auth');
          return;
        }
        const phone=await cloud().getMyPhone().catch(()=>window.currentUser.phone||'');
        if(!phone){
          window.toast?.('Completează numărul de telefon în cont înainte de publicare.');
          window.nav?.('profile');
          return;
        }
        const data={
          title:document.getElementById('jobCategory')?.value||'Lucrare',
          category:document.getElementById('jobCategory')?.value||null,
          city:document.getElementById('jobCity')?.value||null,
          budget:money(document.getElementById('jobBudget')?.value),
          description:document.getElementById('jobDescription')?.value||''
        };
        const postingFee=typeof window.clientPostingPrice==='function'?window.clientPostingPrice(data.budget):15;
        const publish=async()=>{
          try{
            const saved=await cloud().createJob(data);
            const mapped=cloudToLocalJob(saved);
            window.jobs.unshift(mapped);
            window.addJobHistory?.(mapped.id,'Lucrarea a fost publicată după plata de test');
            window.addTransaction?.('Publicare lucrare',postingFee,'client',0);
            window.persist?.();
            form.reset();
            window.toast?.('Plată de test reușită. Lucrarea a fost salvată online.');
            window.nav?.('jobs');
            window.renderJobs?.();
          }catch(err){
            window.toast?.('Nu am putut publica lucrarea online.');
            console.error(err);
          }
        };
        if(typeof window.openCheckout==='function') window.openCheckout('Publicare lucrare',postingFee,publish);
        else await publish();
      })();
    },true);
  }

  function install(){
    installSaveOverride();
    installJobFormOverride();
    syncCloudState();
  }

  window.addEventListener('ldfcloudready',install,{once:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
})();
