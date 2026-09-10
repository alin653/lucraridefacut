// Loader separat pentru fluxul Cumpara lucrarea.
// Poate fi inclus in pagina fara sa modifice restul aplicatiei.
(function(){
  if(document.querySelector('script[data-ldf-buy-job]')) return;
  const s=document.createElement('script');
  s.src='buy-job.js?v=3';
  s.defer=true;
  s.dataset.ldfBuyJob='1';
  document.head.appendChild(s);
})();
