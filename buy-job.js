// LucrariDeFacut.ro — cumparare lucrare
(function(){
  'use strict';

  function priceFor(job){
    // Pretul trebuie sa vina din configuratia lucrarii / baza de date.
    // Nu inventam o taxa daca unlock_fee lipseste.
    const configured=Number(job?.cost ?? job?.unlock_fee ?? 0);
    return Number.isFinite(configured) && configured>0 ? configured : 0;
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

    // Fluxul real trebuie creat de backend pentru lucrarea si utilizatorul autentificat.
    // Nu folosim Payment Link-ul taxei de postare si nu deblocam telefonul din browser.
    if(typeof window.createJobCheckout==='function'){
      try{
        const result=await window.createJobCheckout(job.id);
        if(result?.url){ window.location.assign(result.url); return; }
      }catch(err){ console.error(err); }
    }
    message('Plata securizată pentru cumpărarea lucrării este în curs de configurare.');
  }

  function installButton(){
    const job=window.selectedJob;
    if(!job) return;
    const phoneLike=[...document.querySelectorAll('button')].find(b=>/deblocheaz|contact|cumpără lucrarea/i.test(b.textContent||''));
    if(!phoneLike) return;
    const price=priceFor(job);
    phoneLike.textContent=price ? `Cumpără lucrarea – ${price} lei` : 'Cumpără lucrarea';
    phoneLike.onclick=goToStripe;
    phoneLike.dataset.ldfPurchase='1';
  }

  document.addEventListener('click',()=>setTimeout(installButton,0),true);
  window.addEventListener('hashchange',()=>setTimeout(installButton,0));
  window.addEventListener('load',()=>setTimeout(installButton,100));
})();
