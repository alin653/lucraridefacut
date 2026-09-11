// Loader separat pentru fluxul de acces la lucrare.
(function(){
  if(document.querySelector('script[data-ldf-buy-job]')) return;
  const s=document.createElement('script');
  s.src='buy-job.js?v=20260911-1';
  s.defer=true;
  s.dataset.ldfBuyJob='1';
  document.head.appendChild(s);
})();
