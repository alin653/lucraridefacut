// LucrariDeFacut.ro — persistenta lucrarilor in Supabase
(function(){
  'use strict';

  function budgetNumber(value){
    if(typeof window.budgetNumber === 'function') return window.budgetNumber(value);
    if(typeof value === 'number') return value;
    const nums=String(value||'').replace(/\./g,'').replace(/,/g,'.').match(/\d+(?:\.\d+)?/g);
    return nums && nums.length ? Math.max(...nums.map(Number).filter(Number.isFinite)) : 0;
  }

  function priceForBudget(budget, low, high){
    return budget > 10000 ? high : low;
  }

  function dbJobToUi(row){
    const budget=Number(row.budget||0);
    const statusMap={open:'disponibila',assigned:'in_lucru',completed:'finalizat',cancelled:'finalizat'};
    return {
      id:row.id,title:row.title,city:row.city||'',county:row.county||'',cat:row.category||'',category:row.category||'',budget,
      start:'Negociabil',desc:row.description||'',access:Number(row.unlock_count||0),max:Number(row.max_unlocks||6),
      cost:Number(row.unlock_fee||priceForBudget(budget,25,35)),status:row.status==='cancelled'?'ascuns':'activ',ownerId:row.client_id,
      workflowStatus:statusMap[row.status]||'disponibila',unlockedBy:[],publishFee:Number(row.publish_fee||0),
      paymentStatus:row.payment_status||'pending',createdAt:row.created_at
    };
  }

  async function loadJobsFromSupabase(){
    if(!window.supabaseClient) return [];
    const {data,error}=await window.supabaseClient.from('jobs')
      .select('id,client_id,title,description,category,city,county,budget,status,created_at,publish_fee,unlock_fee,payment_status,max_unlocks')
      .neq('status','cancelled').order('created_at',{ascending:false});
    if(error){ console.error('Supabase jobs load:',error); return []; }
    return (data||[]).map(dbJobToUi);
  }

  async function isFirstJobForClient(clientId){
    const {count,error}=await window.supabaseClient.from('jobs').select('id',{count:'exact',head:true}).eq('client_id',clientId);
    if(error) throw error;
    return Number(count||0)===0;
  }

  async function createJobInSupabase(input){
    if(!window.supabaseClient) throw new Error('Conexiunea Supabase nu este disponibila.');
    const {data:authData,error:authError}=await window.supabaseClient.auth.getUser();
    if(authError || !authData?.user) throw new Error('Trebuie sa fii autentificat pentru a publica o lucrare.');
    const budget=budgetNumber(input.budget);
    if(!budget || budget<=0) throw new Error('Introdu un buget valid.');
    const firstJob=await isFirstJobForClient(authData.user.id);
    const payload={
      client_id:authData.user.id,title:String(input.title||input.category||'Lucrare').trim(),description:String(input.desc||input.description||'').trim(),
      category:String(input.cat||input.category||'').trim()||null,city:String(input.city||'').trim()||null,county:String(input.county||'').trim()||null,budget,
      status:'open',publish_fee:firstJob?0:priceForBudget(budget,15,35),unlock_fee:priceForBudget(budget,25,35),max_unlocks:6,
      payment_status:firstJob?'paid':'pending'
    };
    if(!payload.description) throw new Error('Descrierea lucrarii este obligatorie.');
    const {data,error}=await window.supabaseClient.from('jobs').insert(payload).select().single();
    if(error) throw error;
    return dbJobToUi(data);
  }

  async function refreshJobs(){
    try{
      const cloudJobs=await loadJobsFromSupabase();
      if(typeof jobs!=='undefined' && Array.isArray(jobs)){
        jobs.splice(0,jobs.length,...cloudJobs);if(typeof persist==='function') persist();if(typeof renderJobs==='function') renderJobs();
      }
      return cloudJobs;
    }catch(err){console.error('Initializare lucrari cloud:',err);return [];}
  }

  window.LDFSupabaseJobs={loadJobs:loadJobsFromSupabase,createJob:createJobInSupabase,mapJob:dbJobToUi,refreshJobs,isFirstJobForClient};
  window.addEventListener('load',refreshJobs);
})();