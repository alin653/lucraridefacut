// LucrariDeFacut.ro — persistenta lucrarilor in Supabase
// Acest modul pastreaza compatibilitatea cu interfata existenta si muta datele reale in cloud.
(function(){
  'use strict';

  function budgetNumber(value){
    if(typeof window.budgetNumber === 'function') return window.budgetNumber(value);
    if(typeof value === 'number') return value;
    const nums=String(value||'').replace(/\./g,'').replace(/,/g,'.').match(/\d+(?:\.\d+)?/g);
    return nums && nums.length ? Math.max(...nums.map(Number).filter(Number.isFinite)) : 0;
  }

  function dbJobToUi(row){
    const statusMap={open:'disponibila',assigned:'in_lucru',completed:'finalizat',cancelled:'finalizat'};
    return {
      id:row.id,
      title:row.title,
      city:row.city||'',
      cat:row.category||'',
      category:row.category||'',
      budget:Number(row.budget||0),
      start:'Negociabil',
      desc:row.description||'',
      access:0,
      max:Number(row.max_unlocks||6),
      cost:Number(row.unlock_fee||0),
      status:row.status==='cancelled'?'ascuns':'activ',
      ownerId:row.client_id,
      workflowStatus:statusMap[row.status]||'disponibila',
      unlockedBy:[],
      publishFee:Number(row.publish_fee||0),
      paymentStatus:row.payment_status||'pending',
      createdAt:row.created_at
    };
  }

  async function loadJobsFromSupabase(){
    if(!window.supabaseClient) return [];
    const {data,error}=await window.supabaseClient
      .from('jobs')
      .select('id,client_id,title,description,category,city,county,budget,status,created_at,publish_fee,unlock_fee,payment_status,max_unlocks')
      .order('created_at',{ascending:false});
    if(error){ console.error('Supabase jobs load:',error); return []; }
    return (data||[]).map(dbJobToUi);
  }

  async function createJobInSupabase(input){
    if(!window.supabaseClient) throw new Error('Conexiunea Supabase nu este disponibila.');
    const {data:authData,error:authError}=await window.supabaseClient.auth.getUser();
    if(authError || !authData?.user) throw new Error('Trebuie sa fii autentificat pentru a publica o lucrare.');

    const budget=budgetNumber(input.budget);
    if(!budget || budget<=0) throw new Error('Introdu un buget valid.');

    const payload={
      client_id:authData.user.id,
      title:String(input.title||input.category||'Lucrare').trim(),
      description:String(input.desc||input.description||'').trim(),
      category:String(input.cat||input.category||'').trim()||null,
      city:String(input.city||'').trim()||null,
      budget,
      status:'open',
      // Plata din interfata actuala este inca demo; nu o marcam ca plata reala.
      payment_status:'pending'
    };
    if(!payload.description) throw new Error('Descrierea lucrarii este obligatorie.');

    const {data,error}=await window.supabaseClient.from('jobs').insert(payload).select().single();
    if(error) throw error;
    return dbJobToUi(data);
  }

  window.LDFSupabaseJobs={loadJobs:loadJobsFromSupabase,createJob:createJobInSupabase,mapJob:dbJobToUi};

  // Incarca lucrarile cloud dupa restaurarea sesiunii, fara a bloca pagina.
  window.addEventListener('load',async()=>{
    try{
      const {data}=await window.supabaseClient.auth.getSession();
      if(!data?.session) return;
      const cloudJobs=await loadJobsFromSupabase();
      if(cloudJobs.length && Array.isArray(window.jobs)){
        window.jobs.splice(0,window.jobs.length,...cloudJobs);
        if(typeof window.renderJobs==='function') window.renderJobs();
      }
    }catch(err){ console.error('Initializare lucrari cloud:',err); }
  });
})();
