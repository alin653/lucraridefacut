import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'https://alin653.github.io',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})

async function paypalAccessToken(){
  const clientId=Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret=Deno.env.get('PAYPAL_CLIENT_SECRET')
  if(!clientId||!clientSecret) throw new Error('PayPal nu este configurat pe server.')
  const basic=btoa(`${clientId}:${clientSecret}`)
  const r=await fetch('https://api-m.paypal.com/v1/oauth2/token',{
    method:'POST',
    headers:{Authorization:`Basic ${basic}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  })
  const data=await r.json().catch(()=>({}))
  if(!r.ok||!data?.access_token) throw new Error('Nu am putut autentifica PayPal.')
  return data.access_token as string
}

async function getOrder(orderId:string,token:string){
  const r=await fetch(`https://api-m.paypal.com/v2/checkout/orders/${encodeURIComponent(orderId)}`,{headers:{Authorization:`Bearer ${token}`}})
  const data=await r.json().catch(()=>({}))
  if(!r.ok) throw new Error(data?.message||'Nu am putut verifica plata PayPal.')
  return data
}

async function captureOrder(orderId:string,token:string){
  const r=await fetch(`https://api-m.paypal.com/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':`capture-${orderId}`},
    body:'{}'
  })
  const data=await r.json().catch(()=>({}))
  if(!r.ok) throw new Error(data?.message||'Nu am putut confirma plata PayPal.')
  return data
}

function parseCustomId(value:unknown){
  const parts=String(value||'').split('|')
  if(parts.length!==3) throw new Error('Referință PayPal invalidă.')
  return {purpose:parts[0],jobId:parts[1],userId:parts[2]}
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
  try{
    const auth=req.headers.get('Authorization')||''
    if(!auth.startsWith('Bearer ')) throw new Error('Autentificare necesară.')
    const accessToken=auth.slice(7)
    const {order_id}=await req.json()
    if(!order_id) throw new Error('Comandă PayPal invalidă.')

    const url=Deno.env.get('SUPABASE_URL')!
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin=createClient(url,service)
    const {data:{user},error:userErr}=await admin.auth.getUser(accessToken)
    if(userErr||!user) throw new Error('Sesiune invalidă.')

    const paypalToken=await paypalAccessToken()
    let order=await getOrder(String(order_id),paypalToken)
    const unit=order?.purchase_units?.[0]
    const ref=parseCustomId(unit?.custom_id)
    if(ref.userId!==user.id) throw new Error('Plata nu aparține acestui cont.')

    if(order.status!=='COMPLETED') order=await captureOrder(String(order_id),paypalToken)
    if(order.status!=='COMPLETED') throw new Error('Plata PayPal nu este finalizată.')

    const completedUnit=order?.purchase_units?.[0]||unit
    const paidValue=Number(completedUnit?.payments?.captures?.[0]?.amount?.value||completedUnit?.amount?.value||0)
    const currency=String(completedUnit?.payments?.captures?.[0]?.amount?.currency_code||completedUnit?.amount?.currency_code||'')
    if(currency!=='RON') throw new Error('Monedă PayPal invalidă.')

    if(ref.purpose==='job_publish'){
      const {data:job,error:jobErr}=await admin.from('jobs').select('id,client_id,publish_fee,payment_status').eq('id',ref.jobId).single()
      if(jobErr||!job||job.client_id!==user.id) throw new Error('Lucrarea nu a fost găsită.')
      if(Math.abs(Number(job.publish_fee||0)-paidValue)>0.001) throw new Error('Suma PayPal nu corespunde taxei de publicare.')
      if(job.payment_status!=='paid'){
        const {error}=await admin.from('jobs').update({payment_status:'paid'}).eq('id',ref.jobId).eq('client_id',user.id)
        if(error) throw new Error('Plata a fost confirmată, dar lucrarea nu a putut fi activată.')
      }
      return json({ok:true,purpose:'job_publish',job_id:ref.jobId})
    }

    if(ref.purpose==='job_unlock'){
      const {data:job,error:jobErr}=await admin.from('jobs').select('id,status,unlock_fee,max_unlocks,payment_status').eq('id',ref.jobId).single()
      if(jobErr||!job||job.status!=='open'||job.payment_status!=='paid') throw new Error('Lucrarea nu mai este disponibilă.')
      if(Math.abs(Number(job.unlock_fee||0)-paidValue)>0.001) throw new Error('Suma PayPal nu corespunde taxei de acces.')

      const {data:existing}=await admin.from('job_unlocks').select('id,status').eq('job_id',ref.jobId).eq('worker_id',user.id).maybeSingle()
      if(existing?.status==='paid') return json({ok:true,purpose:'job_unlock',job_id:ref.jobId,already:true})

      const {count}=await admin.from('job_unlocks').select('id',{count:'exact',head:true}).eq('job_id',ref.jobId).eq('status','paid')
      if((count||0)>=Number(job.max_unlocks||6)) throw new Error('Lucrarea a atins limita de meseriași.')

      const payload={job_id:ref.jobId,worker_id:user.id,amount:paidValue,status:'paid',provider_reference:String(order_id),paid_at:new Date().toISOString()}
      const result=existing
        ? await admin.from('job_unlocks').update(payload).eq('id',existing.id)
        : await admin.from('job_unlocks').insert(payload)
      if(result.error) throw new Error('Plata a fost confirmată, dar accesul nu a putut fi salvat.')
      return json({ok:true,purpose:'job_unlock',job_id:ref.jobId})
    }

    throw new Error('Tip de plată PayPal necunoscut.')
  }catch(e){
    return json({error:e instanceof Error?e.message:'Eroare'},200)
  }
})
