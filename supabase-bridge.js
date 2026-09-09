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

      if(typeof jobs!=='undefined'){
        const localOnly=jobs.filter(j=>!j.cloud && typeof j.id==='number');
        jobs=[...remoteJobs.map(cloudToLocalJob),...localOnly];
      }

      if(typeof savedJobs!=='undefined'){
        const mine=remoteSaved.map(x=>({userId:session.user.id,jobId:x.job_id,savedAt:x.created_at,cloud:true}));
        const others=savedJobs.filter(x=>String(x.userId)!==String(session.user.id));
        savedJobs=[...mine,...others];
      }

      if(typeof currentUser!=='undefined' && currentUser){
        currentUser.id=session.user.id;
        currentUser.name=profile.full_name||currentUser.name;
        currentUser.city=profile.city||currentUser.city||'';
        currentUser.county=profile.county||currentUser.county||'';
        currentUser.about=profile.bio||currentUser.about||'';
        currentUser.role=profile.role==='worker'?'meseriaș':'client';
        currentUser.email=session.user.email||currentUser.email||'';
        currentUser.phone=phone||'';
      }

      if(typeof persist==='function') persist();
      if(typeof renderJobs==='function') renderJobs();
      if(typeof renderProfile==='function') renderProfile();
    }catch(err){
      console.warn('LDF cloud sync:',err);
    }
  }

  async function cloudToggleSaved(id){
    if(typeof currentUser==='undefined' || !currentUser){
      if(typeof toast==='function') toast('Autentifică-te pentru a salva lucrarea.');
      if(typeof nav==='function') nav('auth');
      return;
    }
    const existing=(typeof savedJobs!=='undefined'?savedJobs:[]).find(x=>String(x.userId)===String(currentUser.id)&&String(x.jobId)===String(id));
    try{
      if(existing){
        await cloud().unsaveJob(id);
        savedJobs=savedJobs.filter(x=>!(String(x.userId)===String(currentUser.id)&&String(x.jobId)===String(id)));
        if(typeof toast==='function') toast('Lucrarea a fost scoasă din Salvate');
      }else{
        await cloud().saveJob(id);
        savedJobs.unshift({userId:currentUser.id,jobId:id,savedAt:new Date().toLocaleString('ro-RO'),cloud:true});
        if(typeof toast==='function') toast('Lucrarea a fost salvată');
      }
      if(typeof persist==='function') persist();
      if(typeof renderJobs==='function') renderJobs();
      if(typeof selectedJob!=='undefined' && selectedJob?.id===id && typeof openJob==='function') openJob(id);
    }catch(err){
      if(typeof toast==='function') toast('Nu am putut salva lucrarea online.');
      console.error(err);
    }
  }

  function installSaveOverride(){
    const original=window.toggleSaved;
    if(typeof original!=='function') return;
    window.toggleSaved=function(id){
      const job=(typeof jobs!=='undefined'?jobs:[]).find(j=>String(j.id)===String(id));
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
        if(typeof currentUser==='undefined'||!currentUser||currentUser.role!=='client'){
          if(typeof toast==='function') toast('Trebuie să fii autentificat ca client.');
          if(typeof nav==='function') nav('auth');
          return;
        }
        const phone=await cloud().getMyPhone().catch(()=>currentUser.phone||'');
        if(!phone){
          if(typeof toast==='function') toast('Completează numărul de telefon în cont înainte de publicare.');
          if(typeof nav==='function') nav('profile');
          return;
        }
        const data={
          title:document.getElementById('jobCategory')?.value||'Lucrare',
          category:document.getElementById('jobCategory')?.value||null,
          city:document.getElementById('jobCity')?.value||null,
          budget:money(document.getElementById('jobBudget')?.value),
          description:document.getElementById('jobDescription')?.value||''
        };
        const postingFee=typeof clientPostingPrice==='function'?clientPostingPrice(data.budget):15;
        const publish=async()=>{
          try{
            const saved=await cloud().createJob(data);
            const mapped=cloudToLocalJob(saved);
            jobs.unshift(mapped);
            if(typeof addJobHistory==='function') addJobHistory(mapped.id,'Lucrarea a fost publicată după plata de test');
            if(typeof addTransaction==='function') addTransaction('Publicare lucrare',postingFee,'client',0);
            if(typeof persist==='function') persist();
            form.reset();
            if(typeof toast==='function') toast('Plată de test reușită. Lucrarea a fost salvată online.');
            if(typeof nav==='function') nav('jobs');
            if(typeof renderJobs==='function') renderJobs();
          }catch(err){
            if(typeof toast==='function') toast('Nu am putut publica lucrarea online.');
            console.error(err);
          }
        };
        if(typeof openCheckout==='function') openCheckout('Publicare lucrare',postingFee,publish);
        else await publish();
      })();
    },true);
  }

  function installProfileEditor(){
    const original=window.renderProfile;
    if(typeof original!=='function' || original.__ldfCloudWrapped) return;
    const wrapped=function(){
      original();
      if(typeof currentUser==='undefined'||!currentUser||!cloud()) return;
      const box=document.getElementById('profileContent');
      if(!box || document.getElementById('cloudProfileEdit')) return;
      const panel=document.createElement('div');
      panel.id='cloudProfileEdit';
      panel.className='profile-meta';
      panel.style.marginTop='14px';
      panel.innerHTML=`<p><b>Actualizează datele contului</b></p>
        <label>Nume<input id="cloudProfileName" value="${String(currentUser.name||'').replace(/"/g,'&quot;')}" placeholder="Nume"></label>
        <label>Oraș<input id="cloudProfileCity" value="${String(currentUser.city||'').replace(/"/g,'&quot;')}" placeholder="Oraș"></label>
        <label>Telefon<input id="cloudProfilePhone" value="${String(currentUser.phone||'').replace(/"/g,'&quot;')}" placeholder="07xx xxx xxx"></label>
        <button class="primary" id="cloudProfileSave" type="button" style="margin-top:12px;width:100%">Salvează datele</button>`;
      box.appendChild(panel);
      document.getElementById('cloudProfileSave').onclick=async()=>{
        const btn=document.getElementById('cloudProfileSave');
        btn.disabled=true;
        try{
          const name=document.getElementById('cloudProfileName').value.trim();
          const city=document.getElementById('cloudProfileCity').value.trim();
          const phone=document.getElementById('cloudProfilePhone').value.trim();
          if(!name){ if(typeof toast==='function') toast('Completează numele.'); return; }
          if(!phone){ if(typeof toast==='function') toast('Completează numărul de telefon.'); return; }
          await Promise.all([
            cloud().updateMyProfile({full_name:name,city}),
            cloud().setMyPhone(phone)
          ]);
          currentUser.name=name;
          currentUser.city=city;
          currentUser.phone=phone;
          if(typeof persist==='function') persist();
          if(typeof toast==='function') toast('Datele contului au fost salvate online.');
          wrapped();
        }catch(err){
          if(typeof toast==='function') toast('Nu am putut salva datele contului.');
          console.error(err);
        }finally{ btn.disabled=false; }
      };
    };
    wrapped.__ldfCloudWrapped=true;
    window.renderProfile=wrapped;
  }

  function install(){
    installSaveOverride();
    installJobFormOverride();
    installProfileEditor();
    syncCloudState();
  }

  window.addEventListener('ldfcloudready',install,{once:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});
  else setTimeout(install,0);
})();
