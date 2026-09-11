// LucrariDeFacut.ro — flux acces lucrare
// Platile sunt puse temporar pe pauza pana la finalizarea procesatorului de plati.
(function(){
  'use strict';

  function formatMoney(value){
    const n=Number(String(value??'').replace(/[^0-9.,]/g,'').replace(',','.'));
    if(!Number.isFinite(n) || n<=0) return value ? String(value) : 'Nespecificat';
    return new Intl.NumberFormat('ro-RO',{maximumFractionDigits:0}).format(n)+' lei';
  }

  function message(text){
    if(typeof window.toast==='function') window.toast(text);
    else alert(text);
  }

  function paymentPaused(){
    message('Plățile vor fi disponibile în curând. Momentan poți folosi celelalte funcții ale platformei.');
  }

  function installVerifiedClient(){
    const detail=document.getElementById('jobDetailCard');
    if(!detail) return;
    const candidates=[...detail.querySelectorAll('.owner-box b, b')];
    const label=candidates.find(el=>/^Client\s*:/i.test((el.textContent||'').trim()));
    if(!label) return;
    label.textContent='Client: ✅ Client verificat';
    label.style.color='#08792f';
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
    box.innerHTML='<div><strong>💰 Buget lucrare:</strong> '+formatMoney(job?.budget)+'</div>'+
      '<div style="margin-top:6px;color:#6a7888"><strong>💳 Plăți:</strong> disponibile în curând</div>';
  }

  function installButton(){
    const job=window.selectedJob;
    if(!job) return;
    installVerifiedClient();
    const button=[...document.querySelectorAll('button')].find(b=>/deblocheaz|contact|cumpără lucrarea|plătește/i.test(b.textContent||''));
    if(!button) return;
    button.textContent='Plăți disponibile în curând';
    button.onclick=paymentPaused;
    button.dataset.ldfPurchase='paused';
    button.style.background='#eef3f8';
    button.style.color='#0b2340';
    installBudget(job,button);
  }

  document.addEventListener('click',()=>setTimeout(installButton,0),true);
  window.addEventListener('hashchange',()=>setTimeout(installButton,0));
  window.addEventListener('load',()=>setTimeout(installButton,100));
})();
