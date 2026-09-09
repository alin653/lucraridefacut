(function(){
  'use strict';

  function readyClient(){
    return typeof window.supabaseClient !== 'undefined' && window.supabaseClient;
  }

  async function getSession(){
    const client=readyClient();
    if(!client) return null;
    const {data,error}=await client.auth.getSession();
    if(error) throw error;
    return data.session||null;
  }

  async function requireUser(){
    const session=await getSession();
    if(!session?.user) throw new Error('Trebuie să fii autentificat.');
    return session.user;
  }

  async function getMyProfile(){
    const client=readyClient();
    const user=await requireUser();
    const {data,error}=await client.from('profiles').select('id,role,full_name,city,county,bio,created_at,updated_at').eq('id',user.id).single();
    if(error) throw error;
    return data;
  }

  async function updateMyProfile(values){
    const client=readyClient();
    const user=await requireUser();
    const allowed={};
    ['full_name','city','county','bio'].forEach(k=>{ if(values && Object.prototype.hasOwnProperty.call(values,k)) allowed[k]=values[k]; });
    allowed.updated_at=new Date().toISOString();
    const {data,error}=await client.from('profiles').update(allowed).eq('id',user.id).select().single();
    if(error) throw error;
    return data;
  }

  async function setMyPhone(phone){
    const client=readyClient();
    const user=await requireUser();
    const value=String(phone||'').trim();
    if(value.length<7) throw new Error('Numărul de telefon este prea scurt.');
    const {data,error}=await client.from('profile_contacts').upsert({user_id:user.id,phone:value,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();
    if(error) throw error;
    return data;
  }

  async function listOpenJobs(){
    const client=readyClient();
    await requireUser();
    const {data,error}=await client.from('jobs').select('id,client_id,title,description,category,city,county,budget,status,created_at,publish_fee,unlock_fee,max_unlocks').eq('status','open').order('created_at',{ascending:false});
    if(error) throw error;
    return data||[];
  }

  async function createJob(job){
    const client=readyClient();
    const user=await requireUser();
    const profile=await getMyProfile();
    if(profile.role!=='client') throw new Error('Doar conturile de client pot publica lucrări.');
    const payload={
      client_id:user.id,
      title:String(job?.title||'').trim(),
      description:String(job?.description||'').trim(),
      category:job?.category||null,
      city:job?.city||null,
      county:job?.county||null,
      budget:Number(job?.budget||0),
      status:'open'
    };
    if(!payload.title || !payload.description) throw new Error('Titlul și descrierea sunt obligatorii.');
    const {data,error}=await client.from('jobs').insert(payload).select().single();
    if(error) throw error;
    return data;
  }

  async function saveJob(jobId){
    const client=readyClient();
    const user=await requireUser();
    const {data,error}=await client.from('saved_jobs').upsert({user_id:user.id,job_id:jobId},{onConflict:'user_id,job_id'}).select().single();
    if(error) throw error;
    return data;
  }

  async function unsaveJob(jobId){
    const client=readyClient();
    const user=await requireUser();
    const {error}=await client.from('saved_jobs').delete().eq('user_id',user.id).eq('job_id',jobId);
    if(error) throw error;
    return true;
  }

  async function getUnlockedContact(jobId){
    const client=readyClient();
    await requireUser();
    const {data,error}=await client.rpc('get_unlocked_job_contact',{p_job_id:jobId});
    if(error) throw error;
    return Array.isArray(data)?(data[0]||null):data;
  }

  async function sendSupportMessage(threadId,body){
    const client=readyClient();
    const user=await requireUser();
    const text=String(body||'').trim();
    if(!text) throw new Error('Mesajul este gol.');
    const {data,error}=await client.from('support_messages').insert({thread_id:threadId,sender_id:user.id,body:text}).select().single();
    if(error) throw error;
    return data;
  }

  window.LDFCloud={
    getSession,
    getMyProfile,
    updateMyProfile,
    setMyPhone,
    listOpenJobs,
    createJob,
    saveJob,
    unsaveJob,
    getUnlockedContact,
    sendSupportMessage
  };

  window.dispatchEvent(new CustomEvent('ldfcloudready'));
})();
