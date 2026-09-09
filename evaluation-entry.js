(function(){
  'use strict';

  function installEvaluationEntry(){
    const evaluation=document.getElementById('v10-evaluare');
    if(!evaluation)return;

    evaluation.style.display='none';

    function openEvaluation(){
      evaluation.style.display='block';
      evaluation.scrollIntoView({behavior:'smooth',block:'start'});
    }
    function closeEvaluation(){
      evaluation.style.display='none';
      document.getElementById('home')?.scrollIntoView({behavior:'smooth',block:'start'});
    }

    if(!document.getElementById('evaluationCloseBtn')){
      const close=document.createElement('button');
      close.type='button';
      close.id='evaluationCloseBtn';
      close.className='secondary plain';
      close.style.cssText='width:100%;margin:0 0 12px';
      close.textContent='← Înapoi';
      close.addEventListener('click',closeEvaluation);
      evaluation.insertBefore(close,evaluation.firstChild);
    }

    const heroCopy=document.querySelector('#home .hero-copy') || document.querySelector('.hero-copy');
    if(heroCopy && !document.getElementById('evaluationHomeBtn')){
      const homeBtn=document.createElement('button');
      homeBtn.type='button';
      homeBtn.id='evaluationHomeBtn';
      homeBtn.className='secondary big';
      homeBtn.style.cssText='margin-top:12px;background:#fff;color:#0b2340;border:2px solid #ffbf00';
      homeBtn.innerHTML='📋 Doresc evaluarea lucrării mele';
      homeBtn.addEventListener('click',openEvaluation);
      heroCopy.appendChild(homeBtn);
    }

    const roleGrid=document.querySelector('#auth .role-grid');
    if(roleGrid && !document.getElementById('evaluationEntryBtn')){
      roleGrid.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
      const button=document.createElement('button');
      button.type='button';
      button.id='evaluationEntryBtn';
      button.className='role-card';
      button.innerHTML='<span>📋</span><b>Doresc evaluarea lucrării mele</b><small>Solicită o evaluare la fața locului</small>';
      button.addEventListener('click',openEvaluation);
      roleGrid.appendChild(button);

      const mq=window.matchMedia('(max-width:700px)');
      function responsive(){roleGrid.style.gridTemplateColumns=mq.matches?'1fr':'repeat(3,minmax(0,1fr))';}
      responsive();
      if(mq.addEventListener)mq.addEventListener('change',responsive);else mq.addListener(responsive);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installEvaluationEntry,{once:true});
  else installEvaluationEntry();
})();
