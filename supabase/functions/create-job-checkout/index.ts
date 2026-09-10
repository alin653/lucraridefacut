import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@16?target=deno'
const cors={'Access-Control-Allow-Origin':'https://alin653.github.io','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
 try{
  const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))throw new Error('Autentificare necesară.')
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,stripeKey=Deno.env.get('STRIPE_SECRET_KEY');if(!stripeKey)throw new Error('Stripe nu este configurat pe server.')
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user},error:userErr}=await userClient.auth.getUser();if(userErr||!user)throw new Error('Sesiune invalidă.')
  const admin=createClient(url,service);const {job_id}=await req.json();if(!job_id)throw new Error('Lucrare invalidă.')
  const {data:profile}=await admin.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='worker'&&profile?.role!=='meseriaș'&&profile?.role!=='meserias')throw new Error('Doar meseriașii pot cumpăra lucrări.')
  const {data:job,error:jobErr}=await admin.from('jobs').select('id,title,status,unlock_fee,max_unlocks').eq('id',job_id).single();if(jobErr||!job||job.status!=='open')throw new Error('Lucrarea nu mai este disponibilă.')
  const amount=Math.round(Number(job.unlock_fee||0)*100);if(amount<=0)throw new Error('Prețul lucrării nu este configurat.')
  const {count}=await admin.from('job_unlocks').select('id',{count:'exact',head:true}).eq('job_id',job_id).eq('status','paid');if((count||0)>=Number(job.max_unlocks||6))throw new Error('Lucrarea a atins limita de meseriași.')
  const {data:existing}=await admin.from('job_unlocks').select('id').eq('job_id',job_id).eq('worker_id',user.id).eq('status','paid').maybeSingle();if(existing)throw new Error('Ai cumpărat deja această lucrare.')
  const stripe=new Stripe(stripeKey,{apiVersion:'2024-06-20'});const session=await stripe.checkout.sessions.create({mode:'payment',line_items:[{price_data:{currency:'ron',unit_amount:amount,product_data:{name:`Cumpărare lucrare: ${job.title||'Lucrare'}`}},quantity:1}],metadata:{job_id:String(job_id),worker_id:user.id,purpose:'job_unlock'},success_url:`https://alin653.github.io/lucraridefacut/?payment=success&job=${encodeURIComponent(job_id)}`,cancel_url:`https://alin653.github.io/lucraridefacut/?payment=cancelled&job=${encodeURIComponent(job_id)}`})
  return new Response(JSON.stringify({url:session.url}),{headers:{...cors,'Content-Type':'application/json'}})
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:'Eroare'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
})
