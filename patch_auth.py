from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')
start_marker = "$('#registerForm').addEventListener('submit'"
end_marker = "\n\nfunction renderProfile()"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start == -1 or end == -1:
    print('Auth block not found or already patched; nothing to do.')
    raise SystemExit(0)

new = r'''$('#registerForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#registerPhone').value.trim().toLowerCase();
  const password=$('#registerPassword').value;
  const role=$('#registerRole').value==='worker'?'meseriaș':'client';
  const name=$('#registerName').value.trim();
  if(!role||!name||!email||!password){toast('Completează toate câmpurile.');return;}
  const btn=e.submitter; if(btn){btn.disabled=true;btn.textContent='Se creează contul...';}
  try{
    const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{name,role}}});
    if(error) throw error;
    const authUser=data.user;
    if(!authUser){toast('Nu am putut crea contul. Încearcă din nou.');return;}
    let u=users.find(x=>String(x.id)===String(authUser.id)||String(x.phone||'').toLowerCase()===email);
    const base={id:authUser.id,name,phone:email,role,status:'activ',verified:!!data.session,reports:0,credits:role==='meseriaș'?0:20,notifPrefs:role==='meseriaș'?{enabled:true,city:'',category:'Toate categoriile'}:undefined};
    if(u) Object.assign(u,base); else {u=base;users.push(u);}
    persist();
    if(data.session){currentUser=u;credits=u.role==='meseriaș'?u.credits:20;persist();updateCredits();updateNotificationBadge();toast('Cont creat cu succes');nav(u.role==='meseriaș'?'jobs':'profile');}
    else {toast('Cont creat. Verifică emailul pentru confirmare.');nav('login');}
  }catch(err){toast(err?.message||'Eroare la crearea contului.');}
  finally{if(btn){btn.disabled=false;btn.textContent='Creează cont';}}
});

$('#verifyBtn').onclick=()=>{toast('Verificarea contului se face acum prin email.');nav('login');};

$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=$('#loginPhone').value.trim().toLowerCase();
  const password=$('#loginPassword').value;
  const btn=e.submitter; if(btn){btn.disabled=true;btn.textContent='Se autentifică...';}
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error) throw error;
    const a=data.user,meta=a?.user_metadata||{};
    let u=users.find(x=>String(x.id)===String(a.id)||String(x.phone||'').toLowerCase()===email);
    if(!u){u={id:a.id,name:meta.name||email.split('@')[0],phone:email,city:'',role:meta.role||'client',status:'activ',verified:true,reports:0,credits:(meta.role==='meseriaș'?0:20)};users.push(u);}
    else {u.id=a.id;u.phone=email;u.verified=true;if(meta.name)u.name=meta.name;if(meta.role)u.role=meta.role;}
    if(u.status!=='activ'){await supabaseClient.auth.signOut();toast('Acest cont este suspendat sau blocat.');return;}
    currentUser=u;credits=u.role==='meseriaș'?u.credits:20;persist();updateCredits();updateNotificationBadge();toast('Autentificare reușită');nav('profile');
  }catch(err){toast(err?.message||'Email sau parolă incorectă.');}
  finally{if(btn){btn.disabled=false;btn.textContent='Intră în cont';}}
});

(async function restoreSupabaseSession(){
  try{
    const {data}=await supabaseClient.auth.getSession();
    const a=data?.session?.user;
    if(!a){currentUser=null;persist();updateNotificationBadge();return;}
    const email=(a.email||'').toLowerCase(),meta=a.user_metadata||{};
    let u=users.find(x=>String(x.id)===String(a.id)||String(x.phone||'').toLowerCase()===email);
    if(!u){u={id:a.id,name:meta.name||email.split('@')[0],phone:email,city:'',role:meta.role||'client',status:'activ',verified:true,reports:0,credits:(meta.role==='meseriaș'?0:20)};users.push(u);}
    else {u.id=a.id;u.phone=email;u.verified=true;if(meta.name)u.name=meta.name;if(meta.role)u.role=meta.role;}
    currentUser=u;credits=u.role==='meseriaș'?u.credits:20;persist();updateCredits();updateNotificationBadge();
  }catch(_){ }
})();'''

text = text[:start] + new + text[end:]
text = text.replace('În această versiune, conturile sunt salvate doar pe dispozitivul tău.','Autentificarea contului este securizată prin Supabase.')
text = text.replace("$('#logoutBtn').onclick=()=>{currentUser=null;persist();updateNotificationBadge();toast('Ai ieșit din cont');nav('home');};", "$('#logoutBtn').onclick=async()=>{await supabaseClient.auth.signOut();currentUser=null;persist();updateNotificationBadge();toast('Ai ieșit din cont');nav('home');};")
p.write_text(text, encoding='utf-8')
print('Patched index.html')
