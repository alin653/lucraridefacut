import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={
  'Access-Control-Allow-Origin':'https://alin653.github.io',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})

async function paypalAccessToken(){
  const id=Deno.env.get('PAYPAL_CLIENT_ID'),secret=Deno.env.get('PAYPAL_CLIENT_SECRET')
  if(!id||!secret) throw new Error('PayPal nu este configurat pe server.')
  const r=await fetch('https://api-m.paypal.com/v1/oauth2/token',{
    method:'POST',
    headers:{Authorization:`Basic ${btoa(`${id}:${secret}`)}`,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  })
  const d=await r.json().catch(()=>({}))
  if(!r.ok||!d?.access_token) throw new Error('Nu am putut autentifica PayPal.')
  return d.access_token
}

async function createOrder(amount:number,title:string,customId:string,returnUrl:string,cancelUrl:string){
  const token=await paypalAccessToken()
  const r=await fetch('https://api-m.paypal.com/v2/checkout/orders',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','PayPal-Request-Id':crypto.randomUUID()},
    body:JSON.stringify({
      intent:'CAPTURE',
      payment_method_preference:'IMMEDIATE_PAYMENT_REQUIRED',
      purchase_units:[{custom_id:customId,description:title.slice(0,127),amount:{currency_code:'EUR',value:amount.toFixed(2)}}],
      payment_source:{paypal:{experience_context:{landing_page:'GUEST_CHECKOUT',user_action:'PAY_NOW',return_url:returnUrl,cancel_url:cancelUrl}}}
    })
  })
  const d=await r.json().catch(()=>({}))
  if(!r.ok) throw new Error(d?.details?.[0]?.description||d?.message||'PayPal nu a putut crea plata.')
  const approve=(d?.links||[]).find((l:any)=>l.rel==='payer-action'||l.rel==='approve')?.href
  if(!approve) throw new Error('PayPal nu a returnat pagina de plată.')
  return {id:String(d.id),url:String(approve)}
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
  let stage='start'
  try{
    const auth=req.headers.get('Authorization')||''
    if(!auth.startsWith('Bearer ')) throw new Error('Autentificare necesară.')
    const token=auth.slice(7)
    const url=Deno.env.get('SUPABASE_URL')!
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!
    const admin=createClient(url,service)

    stage='auth'
    const {data:{user},error:userErr}=await admin.auth.getUser(token)
    if(userErr||!user) throw new Error('Sesiune invalidă. Deloghează-te și autentifică-te din nou.')

    stage='role'
    const userClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}}})
    const {data:profile,error:profileErr}=await userClient.from('profiles').select('role').eq('id',user.id).maybeSingle()
    if(profileErr) throw new Error(`Nu am putut verifica rolul contului: ${profileErr.message}`)
    const role=String(profile?.role||user.app_metadata?.role||'').trim().toLowerCase()
    const isAdmin=role==='admin',isClient=role==='client'
    if(!isClient&&!isAdmin) throw new Error('Doar clienții pot publica lucrări.')

    stage='payload'
    const b=await req.json()
    const title=String(b.title||b.category||'Lucrare').trim()
    const description=String(b.description||'').trim()
    const budget=Number(b.budget||0)
    if(!description||budget<=0) throw new Error('Completează descrierea și bugetul.')
    const feeRon=isAdmin?0:(budget>10000?35:15)
    const unlockFee=budget>10000?35:25

    stage='job'
    const {data:job,error:jobErr}=await admin.from('jobs').insert({
      client_id:user.id,
      title,
      description,
      category:b.category||'Alte lucrări',
      city:b.city||null,
      county:b.county||null,
      budget,
      status:'open',
      payment_status:isAdmin?'paid':'pending',
      publish_fee:feeRon,
      unlock_fee:unlockFee,
      max_unlocks:6
    }).select('id,title').single()
    if(jobErr||!job) throw new Error(jobErr?.message||'Nu am putut pregăti lucrarea.')

    if(isAdmin) return json({free:true,job_id:job.id})

    stage='paypal'
    try{
      const base='https://alin653.github.io/lucraridefacut/'
      const eur=Number((feeRon/5).toFixed(2))
      const o=await createOrder(
        eur,
        `Publicare lucrare: ${title}`,
        `job_publish|${job.id}|${user.id}`,
        `${base}?paypal=return&purpose=job_publish&job=${encodeURIComponent(job.id)}`,
        `${base}?paypal=cancelled&purpose=job_publish&job=${encodeURIComponent(job.id)}`
      )
      return json({url:o.url,order_id:o.id,job_id:job.id})
    }catch(e){
      await admin.from('jobs').delete().eq('id',job.id).eq('payment_status','pending')
      throw e
    }
  }catch(e){
    return json({error:e instanceof Error?e.message:'Eroare',stage},200)
  }
})