// LucrariDeFacut.ro — cumparare lucrare: buton direct catre Stripe Sandbox
(function(){
  'use strict';
  const STRIPE_TEST_LINK='https://buy.stripe.com/test_7sY8wQ8BQ5om7hLaVHbZe00';

  function priceFor(job){
    if(typeof window.workerUnlockPrice==='function') return Number(window.workerUnlockPrice(job))||25;
    const b=Number(job?.budget)||0;
    return b>10000?35:25;
  }

  function goToStripe(){
    const job=window.selectedJob;
    if(!job) return;
    if((job.access||0)>=(job.max||6)){
      if(typeof window.toast==='function') window.toast('Lucrarea a atins limita de 6 meseriași.');
      return;
    }
    // Payment Link este in Sandbox. Deblocarea telefonului NU se face aici;
    // va fi facuta numai dupa confirmarea platii de catre backend/webhook.
    window.location.href=STRIPE_TEST_LINK;
  }

  function installButton(){
    const job=window.selectedJob;
    if(!job) return;
    const phoneLike=[...document.querySelectorAll('button')].find(b=>/deblocheaz|contact/i.test(b.textContent||''));
    if(!phoneLike) return;
    const price=priceFor(job);
    phoneLike.textContent=`Cumpără lucrarea – ${price} lei`;
    phoneLike.onclick=goToStripe;
  }

  document.addEventListener('click',()=>setTimeout(installButton,0),true);
  window.addEventListener('hashchange',()=>setTimeout(installButton,0));
  window.addEventListener('load',()=>setTimeout(installButton,100));
})();
