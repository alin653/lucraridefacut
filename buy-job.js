// LucrariDeFacut.ro — cumparare lucrare
(function(){
  'use strict';

  function priceFor(job){
    const configured=Number(job?.cost ?? job?.unlock_fee ?? 0);
    return Number.isFinite(configured) && configured>0 ? configured : 0;
  }

  function formatMoney(value){
    const n=Number(value||0);
    if(!Number.isFinite(n) || n<=0) return 'Nespecificat';
    return new Intl.NumberFormat('ro-RO',{maximumFractionDigits:0}).format(n)+' lei';
  }

  function message(text){
    if(typeof window.toast==='function') window.toast(text);
    else alert(text);
  }

  async function goToStripe(){
    const job=window.selectedJob;
    if(!job) return;
    if((job.access||0)>=(job.max||6)) return message('Lucrarea a atins limita de 6 meseriași.');

    const price=priceFor(job);
    if(!price) return message('Plata acestei lucrări nu este configurată încă.');

    if(typeof window.createJobCheckout==='function'){
      try{
        const result=await window.createJobCheckout(job.id);
        if(result?.url){ window.location.assign(result.url); return; }
      }catch(err){ console.error(err); }
    }
    message('Plata securizată pentru cumpărarea lucrării este în curs de configurare.');
  }

  function installBudget(job,anchor){
    if(!anchor) return;
    let box=document.getElementById('ldf-job-pricing');
    if(!box){
      box=document.createElement('div');
      box.id='ldf-job-pricing';
      box.style.cssText='margin:0 0 14px;padding:14px 16px;border:1px solid #dbe3ea;border-radius:14px;background:#f7f9fb;font-size:16px;line-height:1.45';
      anchor.parentNode.insertBefore(box,anchor);
    }
    const accessPrice=priceFor(job);
    box.innerHTML='<div><strong>💰 Buget lucrare:</strong> '+formatMoney(job?.budget)+'</div>'+
      (accessPrice?'<div style="margin-top:6px"><strong>🔓 Taxă acces meseriaș:</strong> '+formatMoney(accessPrice)+'</div>':'');
  }

  function installButton(){
    const job=window.selectedJob;
    if(!job) return;
    const phoneLike=[...document.querySelectorAll('button')].find(b=>/deblocheaz|contact|cumpără lucrarea/i.test(b.textContent||''));
    if(!phoneLike) return;
    const price=priceFor(job);
    phoneLike.textContent=price ? `Cumpără lucrarea – ${formatMoney(price)}` : 'Cumpără lucrarea';
    phoneLike.onclick=goToStripe;
    phoneLike.dataset.ldfPurchase='1';
    installBudget(job,phoneLike);
  }

  document.addEventListener('click',()=>setTimeout(installButton,0),true);
  window.addEventListener('hashchange',()=>setTimeout(installButton,0));
  window.addEventListener('load',()=>setTimeout(installButton,100));
})();
