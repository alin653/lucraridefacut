import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@16?target=deno'

Deno.serve(async(req)=>{
  const stripeKey=Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret=Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if(!stripeKey||!webhookSecret) return new Response('Stripe not configured',{status:500})
  const stripe=new Stripe(stripeKey,{apiVersion:'2024-06-20'})
  const body=await req.text()
  const sig=req.headers.get('stripe-signature')||''
  let event:Stripe.Event
  try{event=await stripe.webhooks.constructEventAsync(body,sig,webhookSecret)}catch(_){return new Response('Invalid signature',{status:400})}

  if(event.type==='checkout.session.completed'){
    const session=event.data.object as Stripe.Checkout.Session
    if(session.payment_status==='paid'&&session.metadata?.purpose==='job_unlock'){
      const jobId=session.metadata.job_id, workerId=session.metadata.worker_id
      const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const {data:job}=await admin.from('jobs').select('max_unlocks').eq('id',jobId).single()
      const {count}=await admin.from('job_unlocks').select('id',{count:'exact',head:true}).eq('job_id',jobId).eq('payment_status','paid')
      if((count||0)<Number(job?.max_unlocks||6)){
        await admin.from('job_unlocks').upsert({job_id:jobId,worker_id:workerId,payment_status:'paid',stripe_session_id:session.id,amount_paid:Number(session.amount_total||0)/100,paid_at:new Date().toISOString()},{onConflict:'job_id,worker_id'})
      }
    }
  }
  return new Response('ok',{status:200})
})
