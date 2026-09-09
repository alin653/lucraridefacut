from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Registration: keep email auth and collect a real phone number separately.
s=s.replace('<label>Email<input id="registerPhone" type="email" required placeholder="exemplu@email.ro"></label>', '<label>Email<input id="registerPhone" type="email" required placeholder="exemplu@email.ro"></label>\n<label>Număr de telefon<input id="registerRealPhone" type="tel" inputmode="tel" required placeholder="07xx xxx xxx"></label>')

# Add phone to signup data.
s=s.replace("const email=$('#registerPhone').value.trim().toLowerCase();", "const email=$('#registerPhone').value.trim().toLowerCase();\n  const phone=$('#registerRealPhone').value.trim();")
s=s.replace("options:{data:{name,role}}", "options:{data:{name,role,phone}}")

# Separate email from phone in local profile mirror.
s=s.replace("String(x.phone||'').toLowerCase()===email", "String(x.email||x.phone||'').toLowerCase()===email")
s=s.replace("const base={id:authUser.id,name,phone:email,role,status:'activ',verified:!!data.session,reports:0,credits:role==='meseriaș'?0:20,notifPrefs:", "const base={id:authUser.id,name,email,phone,role,status:'activ',verified:!!data.session,reports:0,credits:role==='meseriaș'?0:20,notifPrefs:")
s=s.replace("u={id:a.id,name:meta.name||email.split('@')[0],phone:email,city:'',role:meta.role||'client',status:'activ',verified:true,reports:0,credits:(meta.role==='meseriaș'?0:20)}", "u={id:a.id,name:meta.name||email.split('@')[0],email,phone:meta.phone||'',city:'',role:meta.role||'client',status:'activ',verified:true,reports:0,credits:0}")
s=s.replace("u.id=a.id;u.phone=email;u.verified=true;if(meta.name)u.name=meta.name;if(meta.role)u.role=meta.role;", "u.id=a.id;u.email=email;u.verified=true;if(meta.phone)u.phone=meta.phone;if(meta.name)u.name=meta.name;if(meta.role)u.role=meta.role;")

# Main pricing helpers. Threshold is strictly over 10,000 RON.
anchor="function nav(id){"
helpers="""function budgetNumber(jobOrBudget){const raw=typeof jobOrBudget==='string'?jobOrBudget:(jobOrBudget?.budget||'');const nums=(String(raw).replace(/\\./g,'').match(/\\d+(?:,\\d+)?/g)||[]).map(x=>Number(x.replace(',','.'))).filter(Number.isFinite);return nums.length?Math.max(...nums):0;}\nfunction clientPostingPrice(jobOrBudget){return budgetNumber(jobOrBudget)>10000?35:15;}\nfunction workerUnlockPrice(jobOrBudget){return budgetNumber(jobOrBudget)>10000?35:25;}\nconst MAX_WORKERS_PER_JOB=6;\n"""
if helpers not in s:
    s=s.replace(anchor,helpers+anchor)

# Profile: show email and phone as separate fields; auth verification refers to email.
old_profile=re.compile(r"function renderProfile\(\)\{.*?\nfunction ", re.S)
m=old_profile.search(s)
if m:
    replacement="""function renderProfile(){const box=$('#profileContent');if(!currentUser){box.innerHTML='<div class=\"avatar\">👤</div><h2>Nu ești autentificat</h2><p>Contul este gratuit pentru clienți și meseriași.</p><button class=\"primary big\" id=\"profileCreate\">Creează cont gratuit</button>';$('#profileCreate').onclick=()=>nav('auth');return;}box.innerHTML=`<div class=\"avatar\">${currentUser.role==='meseriaș'?'👷':'👤'}</div><span class=\"account-badge\">${currentUser.role==='meseriaș'?'Meseriaș':'Client'}</span><h2>${currentUser.name}</h2><div class=\"profile-meta\"><p>📧 ${currentUser.email||''}</p><p>📱 ${currentUser.phone||'Telefon necompletat'}</p><p>${currentUser.verified?'✅ Email verificat':'⚠️ Email neverificat'}</p><p>🟢 Cont ${currentUser.status}</p></div><div class=\"profile-actions\">${currentUser.role==='client'?'<button class=\"primary\" id=\"profilePost\">Postează o lucrare</button>':'<button class=\"primary\" id=\"profileJobs\">Vezi lucrările</button><button class=\"secondary plain\" id=\"profileNotifications\">🔔 Notificările mele</button>'}<button class=\"secondary plain\" id=\"logoutBtn\">Ieși din cont</button></div>`;const pp=$('#profilePost');if(pp)pp.onclick=()=>nav('post');const pj=$('#profileJobs');if(pj)pj.onclick=()=>nav('jobs');const pn=$('#profileNotifications');if(pn)pn.onclick=()=>nav('notifications');$('#logoutBtn').onclick=async()=>{await supabaseClient.auth.signOut();currentUser=null;persist();updateNotificationBadge();toast('Ai ieșit din cont');nav('home');};}\nfunction """
    s=s[:m.start()]+replacement+s[m.end():]

# Replace job detail + unlocking with direct RON checkout and max 6 workers.
openjob_re=re.compile(r"function openJob\(id\)\{.*?\nfunction unlockContact\(\)\{.*?\nfunction ", re.S)
m=openjob_re.search(s)
if m:
    replacement="""function openJob(id){selectedJob=jobs.find(j=>j.id===id);const j=selectedJob;if(!j)return;const owner=users.find(u=>String(u.id)===String(j.ownerId));j.max=MAX_WORKERS_PER_JOB;j.unlockedBy=Array.isArray(j.unlockedBy)?j.unlockedBy:[];const own=currentUser?.role==='client'&&String(currentUser.id)===String(j.ownerId);const alreadyUnlocked=currentUser?.role==='meseriaș'&&j.unlockedBy.map(String).includes(String(currentUser.id));const full=j.access>=MAX_WORKERS_PER_JOB&&!alreadyUnlocked;const price=workerUnlockPrice(j);$('#jobDetailCard').innerHTML=`<div class=\"detail-main\"><span class=\"job-cat\">${j.cat}</span> <span class=\"job-status ${j.workflowStatus==='in_lucru'?'in_lucru':j.workflowStatus==='finalizat'?'finalizat':'activ'}\">${workflowLabel(j)}</span><h2>${j.title}</h2><p>📍 ${j.city}</p><h3>Descriere</h3><p>${j.desc}</p><div class=\"info-grid\"><div><span>Buget</span><b>${j.budget}</b></div><div><span>Începere</span><b>${j.start}</b></div></div><div class=\"owner-box\"><b>Client: ${owner?.name||'Client'}</b><p>📱 ${alreadyUnlocked?(owner?.phone||'Telefon indisponibil'):'07•• ••• •••'}</p><button class=\"danger report-btn\" id=\"reportUserBtn\">⚑ Raportează utilizatorul</button></div>${own?`<div class=\"status-controls\"><button class=\"secondary plain\" data-workflow=\"disponibila\">Disponibilă</button><button class=\"secondary plain\" data-workflow=\"in_lucru\">În lucru</button><button class=\"secondary plain\" data-workflow=\"finalizat\">Finalizată</button></div>`:''}</div><aside class=\"detail-actions\"><button class=\"favorite-btn favorite-large ${isSaved(j.id)?'active':''}\" id=\"saveDetailBtn\">${isSaved(j.id)?'❤️ Salvată':'🤍 Salvează lucrarea'}</button>${own?'<button class=\"secondary plain\" id=\"goHistoryBtn\">Vezi istoricul</button>':alreadyUnlocked?`<div class=\"notice\"><b>Contact deblocat</b><br>📱 ${owner?.phone||'Telefon indisponibil'}</div>`:full?'<div class=\"notice\"><b>Limita de 6 meseriași a fost atinsă</b></div>':`<button class=\"good big\" id=\"unlockBtn\">🔓 Deblochează contactul — ${price} RON</button><p class=\"muted\">Plătești o singură dată pentru acces la contact.</p>`}<div class=\"info-box\" style=\"margin-top:12px\"><b>👷 ${Math.min(j.access,MAX_WORKERS_PER_JOB)} din ${MAX_WORKERS_PER_JOB}</b><p>meseriași au accesat această lucrare</p></div></aside>`;nav('jobDetail');$('#saveDetailBtn').onclick=()=>toggleSaved(j.id);const ub=$('#unlockBtn');if(ub)ub.onclick=unlockContact;$('#reportUserBtn').onclick=()=>openReport(owner?.id);$$('[data-workflow]').forEach(b=>b.onclick=()=>{setWorkflowStatus(j.id,b.dataset.workflow);openJob(j.id);});const gh=$('#goHistoryBtn');if(gh)gh.onclick=()=>nav('saved');}\nfunction unlockContact(){if(!currentUser||currentUser.role!=='meseriaș'){toast('Deblocarea este disponibilă pentru conturile de meseriaș.');nav('auth');return;}const j=selectedJob,owner=users.find(u=>String(u.id)===String(j.ownerId));j.unlockedBy=Array.isArray(j.unlockedBy)?j.unlockedBy:[];if(j.unlockedBy.map(String).includes(String(currentUser.id))){openJob(j.id);return;}if((j.access||0)>=MAX_WORKERS_PER_JOB){toast('Limita de 6 meseriași a fost atinsă.');openJob(j.id);return;}const price=workerUnlockPrice(j);openCheckout('Deblocare contact',price,()=>{j.unlockedBy.push(currentUser.id);j.access=Math.min(MAX_WORKERS_PER_JOB,(j.access||0)+1);j.max=MAX_WORKERS_PER_JOB;addTransaction('Deblocare contact',price,'meseriaș',0);persist();openJob(j.id);toast('Contact deblocat cu succes');});}\nfunction """
    s=s[:m.start()]+replacement+s[m.end():]

# Posting flow: direct RON fee based on budget; max six workers.
jobform_re=re.compile(r"\$\('#jobForm'\)\.addEventListener\('submit',e=>\{.*?\}\);", re.S)
m=jobform_re.search(s)
if m:
    replacement="""$('#jobForm').addEventListener('submit',e=>{e.preventDefault();if(!currentUser||currentUser.role!=='client'){toast('Trebuie să fii autentificat ca client.');nav('auth');return;}if(!currentUser.phone){toast('Completează numărul de telefon în cont înainte de publicare.');nav('profile');return;}const data={title:$('#jobCategory').value,city:$('#jobCity').value,cat:$('#jobCategory').value,budget:$('#jobBudget').value,start:$('#jobStart').value,desc:$('#jobDescription').value};const postingFee=clientPostingPrice(data.budget);openCheckout('Publicare lucrare',postingFee,()=>{const newJob={id:Date.now(),...data,access:0,max:MAX_WORKERS_PER_JOB,cost:workerUnlockPrice(data.budget),unlockedBy:[],status:'activ',ownerId:currentUser.id,workflowStatus:'disponibila'};jobs.unshift(newJob);addJobHistory(newJob.id,'Lucrarea a fost publicată după plată');notifyMatchingWorkers(newJob);addTransaction('Publicare lucrare',postingFee,'client',0);persist();e.target.reset();toast('Plată reușită. Lucrarea a fost publicată.');nav('jobs');});});"""
    s=s[:m.start()]+replacement+s[m.end():]

# Pricing wording and max defaults.
s=s.replace('🪙 Creditele mele</button><button data-nav="wallet">💳 Plăți & istoric</button>', '💳 Plăți & istoric</button>')
s=s.replace('<span>Telefon verificat</span>', '<span>Date de contact protejate</span>')
s=s.replace('max:5,cost:5', 'max:6,cost:25')
s=s.replace("maxWorkers:5", "maxWorkers:6")
s=s.replace('value="5"></label><label>20 credite', 'value="6"></label><label>20 credite')
s=s.replace('value="5"></label><label class="toggle-row"', 'value="6"></label><label class="toggle-row"')
# Make admin default max 6 even if legacy local settings exist.
s=s.replace("let settings=JSON.parse(localStorage.getItem('ldf_settings')||'null')||{postingPrice:9.99,unlockCost:5,maxWorkers:6", "let settings=JSON.parse(localStorage.getItem('ldf_settings')||'null')||{postingPrice:15,unlockCost:25,maxWorkers:6")

p.write_text(s,encoding='utf-8')
print('patched', len(s))
