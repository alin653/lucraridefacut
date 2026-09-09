(function(){
  'use strict';

  function installEvaluationEntry(){
    const evaluation=document.getElementById('v10-evaluare');
    if(!evaluation)return;

    // Evaluarea este un serviciu separat: nu mai apare direct in fluxul normal.
    evaluation.style.display='none';

    const roleGrid=document.querySelector('#auth .role-grid');
    if(!roleGrid||document.getElementById('evaluationEntryBtn'))return;

    roleGrid.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
    const button=document.createElement('button');
    button.type='button';
    button.id='evaluationEntryBtn';
    button.className='role-card';
    button.innerHTML='<span>📋</span><b>Doresc evaluarea lucrării mele</b><small>Solicită o evaluare la fața locului</small>';
    roleGrid.appendChild(button);

    const close=document.createElement('button');
    close.type='button';
    close.className='secondary plain';
    close.style.cssText='width:100%;margin:0 0 12px';
    close.textContent='← Înapoi';
    evaluation.insertBefore(close,evaluation.firstChild);

    button.addEventListener('click',function(){
      evaluation.style.display='block';
      evaluation.scrollIntoView({behavior:'smooth',block:'start'});
    });
    close.addEventListener('click',function(){
      evaluation.style.display='none';
      document.getElementById('auth')?.scrollIntoView({behavior:'smooth',block:'start'});
    });

    const mq=window.matchMedia('(max-width:700px)');
    function responsive(){roleGrid.style.gridTemplateColumns=mq.matches?'1fr':'repeat(3,minmax(0,1fr))';}
    responsive();
    if(mq.addEventListener)mq.addEventListener('change',responsive);else mq.addListener(responsive);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installEvaluationEntry,{once:true});
  else installEvaluationEntry();
})();
