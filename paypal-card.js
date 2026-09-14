// LucrariDeFacut.ro — plata directă cu cardul prin PayPal CardFields
(function(){
  'use strict';
  const FN=()=>String(SUPABASE_URL).replace(/\/$/,'')+'/functions/v1';
  let sdkPromise=null, cardFields=null, pendingJob=null;
  function budgetValue(v){const m=String(v||'').replace(/\./g,'').replace(',','.').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):0;}
  function notify(msg){if(typeof toast==='function')toast(msg);else alert(msg);}
  async function getSession(){const {data}=await supabaseClient.auth.getSession();if(!data?.session?.access_token)throw new Error('Autentifică-te din nou.');return data.session;}
  async function call(path,method,body){const s=await getSession();const r=await fetch(FN()+path,{method,headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'Eroare la plată.');return d;}
  async function loadSdk(){
    if(window.paypal?.CardFields)return window.paypal;
    if(sdkPromise)return sdkPromise;
    sdkPromise=(async()=>{const cfg=await call('/create-publish-checkout','GET');await new Promise((ok,fail)=>{const s=document.createElement('script');s.src='https://www.paypal.com/sdk/js?components=card-fields&client-id='+encodeURIComponent(cfg.client_id)+'&currency=EUR&intent=capture';s.setAttribute('data-client-token',cfg.client_token);s.onload=ok;s.onerror=()=>fail(new Error('Nu am putut încărca plata cu cardul.'));document.head.appendChild(s);});if(!window.paypal?.CardFields)throw new Error('Plata cu cardul PayPal nu este disponibilă.');return window.paypal;})();
    return sdkPromise;
  }
  function modal(){
    let m=document.getElementById('ldf-card-modal');if(m)return m;
    m=document.createElement('div');m.id='ldf-card-modal';m.className='ldf-card-hidden';m.innerHTML='<div class="ldf-card-bg"><div class="ldf-card-box"><button id="ldf-card-x">×</button><h2>Plată cu cardul</h2><p>Introdu datele cardului. Nu ai nevoie de cont PayPal.</p><label>Nume pe card</label><div id="ldf-name" class="ldf-field"></div><label>Număr card</label><div id="ldf-number" class="ldf-field"></div><div class="ldf-row"><div><label>Expirare</label><div id="ldf-expiry" class="ldf-field"></div></div><div><label>CVV</label><div id="ldf-cvv" class="ldf-field"></div></div></div><button id="ldf-pay">Plătește cu cardul</button><p id="ldf-pay-status"></p><small>🔒 Plata este procesată securizat de PayPal.</small></div></div>';
    const st=document.createElement('style');st.textContent='.ldf-card-hidden{display:none!important}#ldf-card-modal{position:fixed;inset:0;z-index:9999}.ldf-card-bg{position:absolute;inset:0;background:#0008;display:grid;place-items:center;padding:16px}.ldf-card-box{width:min(480px,100%);background:#fff;border-radius:18px;padding:22px;position:relative;color:#102033}.ldf-card-box>button#ldf-card-x{position:absolute;right:12px;top:8px;border:0;background:none;font-size:30px}.ldf-card-box label{display:block;font-weight:800;margin:12px 0 6px}.ldf-field{height:48px;border:1px solid #cdd6df;border-radius:10px;padding:8px}.ldf-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}#ldf-pay{width:100%;margin-top:18px;min-height:52px;border:0;border-radius:12px;background:#ffbf00;color:#0b2340;font-weight:900;font-size:17px}.ldf-card-box small{display:block;text-align:center;color:#6a7888}';document.head.appendChild(st);document.body.appendChild(m);document.getElementById('ldf-card-x').onclick=()=>close();return m;
  }
  function close(){document.getElementById('ldf-card-modal')?.classList.add('ldf-card-hidden');pendingJob=null;cardFields=null;}
  async function open(job){
    pendingJob=job;const m=modal();m.classList.remove('ldf-card-hidden');document.getElementById('ldf-pay-status').textContent='Se încarcă plata securizată…';
    const pp=await loadSdk();
    cardFields=pp.CardFields({
      createOrder:async()=>{const d=await call('/create-publish-checkout','POST',pendingJob);if(d.free){location.reload();throw new Error('');}return d.order_id;},
      onApprove:async(data)=>{document.getElementById('ldf-pay-status').textContent='Confirmăm plata…';await call('/capture-paypal','POST',{order_id:data.orderID});document.getElementById('ldf-pay-status').textContent='Plată reușită. Lucrarea a fost publicată.';notify('Plată reușită. Lucrarea a fost publicată.');setTimeout(()=>location.href='./?payment=success',700);},
      onError:(err)=>{console.error(err);document.getElementById('ldf-pay-status').textContent='Plata nu a putut fi efectuată. Verifică datele cardului.';}
    });
    if(!cardFields.isEligible())throw new Error('Contul PayPal nu are încă activată plata directă cu cardul.');
    await Promise.all([cardFields.NameField().render('#ldf-name'),cardFields.NumberField().render('#ldf-number'),cardFields.ExpiryField().render('#ldf-expiry'),cardFields.CVVField().render('#ldf-cvv')]);
    document.getElementById('ldf-pay-status').textContent='';
    document.getElementById('ldf-pay').onclick=async()=>{const b=document.getElementById('ldf-pay');b.disabled=true;b.textContent='Se procesează…';try{await cardFields.submit();}catch(e){console.error(e);document.getElementById('ldf-pay-status').textContent=e?.message||'Verifică datele cardului.';}finally{b.disabled=false;b.textContent='Plătește cu cardul';}};
  }
  document.addEventListener('submit',function(e){
    if(e.target?.id!=='jobForm')return;e.preventDefault();e.stopImmediatePropagation();
    try{if(typeof currentUser==='undefined'||!currentUser||currentUser.role!=='client'){notify('Trebuie să fii autentificat ca client.');if(typeof nav==='function')nav('auth');return;}if(!currentUser.phone){notify('Completează numărul de telefon în cont înainte de publicare.');if(typeof nav==='function')nav('profile');return;}const job={title:jobCategory.value,category:jobCategory.value,city:jobCity.value,description:jobDescription.value,budget:budgetValue(jobBudget.value)};if(!job.title||!job.city||!job.description||job.budget<=0){notify('Completează toate câmpurile lucrării.');return;}open(job).catch(err=>{console.error(err);close();notify(err?.message||'Plata cu cardul nu este disponibilă.');});}catch(err){console.error(err);notify('Nu am putut porni plata cu cardul.');}
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',modal,{once:true});else modal();
})();