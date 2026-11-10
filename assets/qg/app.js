
(function(){
"use strict";
const TYPES = {
  comptoir:{lbl:"Comptoir", c:"--t-comptoir"},
  reunion:{lbl:"Réunion", c:"--t-reunion"},
  soutien:{lbl:"Cours de soutien", c:"--t-soutien"},
  meet:{lbl:"Meet and Talk", c:"--t-meet"},
  sortie:{lbl:"Sortie", c:"--t-sortie"},
  autre:{lbl:"Autre", c:"--t-autre"}
};
const STATUTS = {a_faire:"À faire", en_cours:"En cours", fait:"Fait"};
/* Données du club : une collection Firestore par rubrique. Les règles d'accès sont dans outils/qg/firestore.rules. */
const COLLS=["membres","evenements","taches","annonces","presences","preparations"];
const PUBLIC_COLLS=["membres","evenements","annonces","presences","revisions"];   /* visibles par les membres du club */
const roleOf = a => (a&&a.role) || (a&&a.membreId ? "bureau" : "membre");
const OWNER=((window.QG_FIREBASE||{}).proprietaire||"jblucas.denis@audencia.com").toLowerCase();
const S = {
  membres:[], evenements:[], taches:[], annonces:[], presences:[], preparations:[], acces:[], revisions:[], rev:null,
  authUser:null, authView:"login", authMsg:null, authEmail:"", installEvt:null, isAdmin:false, denied:false,
  me:null, user:null, db:null, canWrite:true, live:false, offline:false,
  loaded:{}, tab:"agenda", weekOffset:0, filtre:"actives", names:{}, now:new Date()
};
const $ = (s,r=document)=>r.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const ymd = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseDate = s => { const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||""); return m? new Date(+m[1],+m[2]-1,+m[3]) : null; };
const sod = d => new Date(d.getFullYear(),d.getMonth(),d.getDate());
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const weekStart = d => { const x=sod(d); return addDays(x, -((x.getDay()+6)%7)); };
const at = (d,hm) => { const m=/^(\d{1,2}):(\d{2})/.exec(hm||""); const x=new Date(d); if(m) x.setHours(+m[1],+m[2],0,0); return x; };
const fDay = new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"});
const fShort = new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"});
const fDM = new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long"});
const hm = s => (s||"").replace(":", "h");
const membre = id => S.membres.find(m=>m.id===id);
const myMember = () => S.me ? (S.membres.find(m=>m.id===S.me) || null) : null;
const clean = o => { const c=JSON.parse(JSON.stringify(o)); delete c.id; return c; };

const ICON = {
  pin:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  user:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 3.8-6 7-6s6 2 7 6"/></svg>',
  clock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  repeat:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l3 3-3 3"/><path d="M4 12V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3"/><path d="M20 12v3a3 3 0 0 1-3 3H4"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>'
};

/* ---------- Occurrences ---------- */
function occurrences(from,to){
  const out=[];
  for(const ev of S.evenements){
    const base=parseDate(ev.date); if(!base) continue;
    const dates=[];
    if(ev.repetition==="hebdo"){
      const end=parseDate(ev.jusqua);
      let d=new Date(base);
      if(d<from){ const w=Math.floor((from-d)/(7*864e5)); if(w>1) d=addDays(d,(w-1)*7); }
      let guard=0;
      while(d<=to && (!end||d<=end) && guard++<400){ if(d>=from) dates.push(new Date(d)); d=addDays(d,7); }
    } else if(base>=from && base<=to) dates.push(base);
    for(const d of dates){
      const key=ymd(d), ex=(ev.exceptions||{})[key]||{};
      const debut=ex.debut||ev.debut||"", fin=ex.fin||ev.fin||"";
      const start=at(d,debut||"00:00");
      let end=fin? at(d,fin) : new Date(start.getTime()+2*36e5);
      if(end<=start) end=new Date(end.getTime()+864e5);
      out.push({ev,key,occ:ev.id+"_"+key,date:d,debut,fin,start,end,
        lieu: ex.lieu!=null && ex.lieu!=="" ? ex.lieu : (ev.lieu||""),
        note: ex.note || ev.note || "", annule:!!ex.annule,
        modifie: !!(ex.lieu||ex.debut||ex.fin||ex.note)});
    }
  }
  return out.sort((a,b)=>a.start-b.start);
}
function presentsFor(occ){ return S.presences.filter(p=>p.occ===occ).map(p=>p.uid); }
function amPresent(occ){ return !!S.me && S.presences.some(p=>p.occ===occ && p.uid===S.me); }

function countdown(o){
  const now=S.now;
  if(o.start<=now && now<o.end) return "En cours · fin à "+hm(o.fin|| pad(o.end.getHours())+":"+pad(o.end.getMinutes()));
  let ms=o.start-now; if(ms<0) return "Terminé";
  const min=Math.round(ms/6e4);
  if(min<60) return "Dans "+min+" min";
  const h=Math.floor(min/60), mm=min%60;
  if(h<24) return "Dans "+h+" h"+(mm?" "+pad(mm):"");
  const days=Math.round((sod(o.start)-sod(now))/864e5);
  if(days===1) return "Demain à "+hm(o.debut);
  return "Dans "+days+" jours";
}
function dueInfo(t){
  const d=parseDate(t.echeance); if(!d) return null;
  const days=Math.round((d-sod(S.now))/864e5);
  if(t.statut==="fait") return {txt:fDM.format(d),cls:""};
  if(days<0) return {txt:"En retard · "+fDM.format(d),cls:"warn",late:true};
  if(days===0) return {txt:"Aujourd'hui",cls:"gold"};
  if(days===1) return {txt:"Demain",cls:"gold"};
  if(days<=7) return {txt:"Dans "+days+" j · "+fDM.format(d),cls:"info"};
  return {txt:fDM.format(d),cls:""};
}
const lateTasks = () => S.taches.filter(t=>t.statut!=="fait" && (dueInfo(t)||{}).late);

/* ---------- Personnes : chaque compte est relié à une fiche du bureau ---------- */
function wantProfiles(){}
const personName = id => { const p=S.presences.find(x=>x.uid===id&&x.nom); return p? p.nom : (id===S.me? S.myName : ""); };
const pname = id => { const m=membre(id); return m? m.nom : (personName(id) || (id===S.me?"Toi":"Un membre")); };
const HUES=["#1F3A7A","#8E6A12","#2F7F5F","#7A3E9D","#1F7A8A","#A2481F","#4A5A7A","#7A2E4A"];
function initials(id){
  const m=membre(id), n=(m&&m.nom)||personName(id)||"?", parts=n.split(/[\s-]+/).filter(Boolean);
  const txt=((parts[0]||"?")[0]+((parts[1]||"")[0]||"")).toUpperCase();
  let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0;
  return '<span class="ini" style="background:'+HUES[h%HUES.length]+'" title="'+esc(n)+'">'+esc(txt)+'</span>';
}
function avatars(ids){
  if(!ids.length) return "";
  return '<span class="avs">'+ids.slice(0,4).map(initials).join("")+"</span>";
}

/* ---------- Bandeau ---------- */
function renderNow(){
  const occs=occurrences(addDays(sod(S.now),-1),addDays(sod(S.now),70)).filter(o=>!o.annule && o.end>S.now);
  const cur=occs.find(o=>o.start<=S.now);
  const o=cur||occs[0];
  const box=$("#now");
  if(!loadedAll()){
    box.innerHTML='<div class="eyebrow">Prochain rendez-vous</div><h1>Chargement de l\'agenda…</h1>';
  } else if(!o){
    box.innerHTML='<div class="eyebrow">Prochain rendez-vous</div><h1>Rien de prévu pour l\'instant</h1>'+
      (S.canWrite?'<div class="row"><button class="btn gold" data-act="newEvent">Ajouter un rendez-vous</button></div>':"");
  } else {
    const t=TYPES[o.ev.type]||TYPES.autre, pres=presentsFor(o.occ), resp=membre(o.ev.responsable);
    box.innerHTML='<div class="eyebrow">'+(cur?"En ce moment":"Prochain rendez-vous")+' · '+esc(t.lbl)+'</div>'+
      '<h1>'+esc(o.ev.titre)+'</h1>'+
      '<div class="count">'+esc(countdown(o))+'</div>'+
      '<div class="meta"><span>'+ICON.clock+'<span style="text-transform:capitalize">'+esc(fDay.format(o.date))+'</span>&nbsp;·&nbsp;<span class="mono">'+esc(hm(o.debut))+(o.fin?"–"+esc(hm(o.fin)):"")+'</span></span>'+
      (o.lieu?'<span>'+ICON.pin+esc(o.lieu)+'</span>':'<span>'+ICON.pin+'Lieu à annoncer</span>')+
      (resp?'<span>'+ICON.user+esc(resp.nom)+'</span>':"")+'</div>'+
      '<div class="row">'+presBtn(o)+(pres.length?'<span class="who" style="color:var(--band-muted)">'+avatars(pres)+pres.length+' présent'+(pres.length>1?"s":"")+'</span>':"")+'</div>';
  }
  const today=occurrences(sod(S.now),sod(S.now)).filter(o=>!o.annule);
  const late=lateTasks().length;
  const enCours=S.taches.filter(t=>t.statut==="en_cours").length;
  const pinned=S.annonces.filter(a=>a.epingle).length;
  $("#strip").innerHTML='<span>Aujourd\'hui : <b>'+(today.length||"aucun")+'</b> rendez-vous</span>'+
    (S.bureau?'<span class="sep">·</span><span><b>'+enCours+'</b> tâche'+(enCours>1?"s":"")+' en cours</span><span class="sep">·</span>'+
    '<span><b'+(late?' style="color:#FFB08A"':"")+'>'+late+'</b> en retard</span>':"")+
    (pinned?'<span class="sep">·</span><span><b>'+pinned+'</b> annonce'+(pinned>1?"s":"")+' épinglée'+(pinned>1?"s":"")+'</span>':"");
  const b=$("#lateBadge"); b.hidden=!late||!S.bureau; b.textContent=late;
}
function presBtn(o){
  if(!S.me || !S.db || o.annule || o.end<S.now) return "";
  const on=amPresent(o.occ);
  return '<button class="btn small'+(on?" on":"")+'" data-act="pres" data-occ="'+esc(o.occ)+'">'+(on?"✓ J'y serai":"Je viens")+'</button>';
}

/* ---------- Agenda ---------- */
function renderAgenda(){
  const ws=addDays(weekStart(S.now),S.weekOffset*7), we=addDays(ws,6);
  const occs=occurrences(ws,we);
  const lbl = S.weekOffset===0?"Cette semaine":S.weekOffset===1?"Semaine prochaine":"Du "+fDM.format(ws)+" au "+fDM.format(we);
  let h='<div class="sechead"><h2>Agenda</h2>'+(S.canWrite?'<button class="btn gold small" data-act="newEvent">+ Rendez-vous</button>':"")+'</div>'+
    '<div class="weeknav"><button class="iconbtn" data-act="week" data-d="-1" aria-label="Semaine précédente">'+ICON.left+'</button>'+
    '<div class="lbl">'+esc(lbl)+(S.weekOffset!==0?' <button class="btn ghost small" data-act="week" data-d="0">Revenir à aujourd\'hui</button>':"")+'</div>'+
    '<button class="iconbtn" data-act="week" data-d="1" aria-label="Semaine suivante">'+ICON.right+'</button></div>';
  if(!loadedAll()){ h+='<div class="empty"><b>Chargement…</b>Les rendez-vous du club arrivent.</div>'; return h; }
  if(!occs.length){
    h+='<div class="empty"><b>Semaine libre</b><span>Aucun rendez-vous entre le '+esc(fDM.format(ws))+' et le '+esc(fDM.format(we))+'.</span>'+
      (S.canWrite?'<button class="btn" data-act="newEvent">Ajouter un rendez-vous</button>':"")+'</div>';
    return h;
  }
  const byDay={};
  occs.forEach(o=>{ (byDay[o.key]=byDay[o.key]||[]).push(o); });
  const todayKey=ymd(S.now);
  for(const key of Object.keys(byDay).sort()){
    const d=parseDate(key);
    h+='<section class="day"><div class="dayhead"><b>'+esc(fDay.format(d))+'</b>'+(key===todayKey?'<span class="today">Aujourd\'hui</span>':"")+'</div>';
    for(const o of byDay[key]) h+=evCard(o);
    h+='</section>';
  }
  return h;
}
function evCard(o){
  const t=TYPES[o.ev.type]||TYPES.autre, resp=membre(o.ev.responsable), pres=presentsFor(o.occ);
  const past=o.end<S.now, cur=o.start<=S.now&&S.now<o.end&&!o.annule;
  return '<article class="ev'+(past?" past":"")+(o.annule?" cancel":"")+(cur?" current":"")+'" style="--tc:var('+t.c+')">'+
    '<div class="time">'+esc(hm(o.debut)||"—")+(o.fin?'<small>'+esc(hm(o.fin))+'</small>':"")+'</div>'+
    '<div class="body"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="chip"><i class="sw"></i>'+esc(t.lbl)+'</span>'+
    (o.annule?'<span class="chip warn">Annulé</span>':"")+(cur?'<span class="chip gold">En cours</span>':"")+
    (o.modifie&&!o.annule?'<span class="chip info">Modifié</span>':"")+'</div>'+
    '<div class="title">'+esc(o.ev.titre)+'</div>'+
    '<div class="info"><span>'+ICON.pin+esc(o.lieu||"Lieu à annoncer")+'</span>'+
    (resp?'<span>'+ICON.user+esc(resp.nom)+'</span>':"")+
    (o.ev.repetition==="hebdo"?'<span>'+ICON.repeat+'Chaque semaine</span>':"")+'</div>'+
    (o.note?'<div class="note">'+esc(o.note)+'</div>':"")+
    '<div class="actions">'+presBtn(o)+
    (pres.length?'<span class="who">'+avatars(pres)+pres.length+' présent'+(pres.length>1?"s":"")+'</span>':"")+
    (S.canWrite?'<button class="btn ghost small" style="margin-left:auto" data-act="editOcc" data-ev="'+esc(o.ev.id)+'" data-key="'+o.key+'">Modifier</button>':"")+
    '</div></div></article>';
}

/* ---------- Tâches ---------- */
function renderTaches(){
  const mine=myMember();
  const counts={actives:0,a_faire:0,en_cours:0,fait:0,miennes:0,retard:0};
  S.taches.forEach(t=>{ counts[t.statut]=(counts[t.statut]||0)+1; if(t.statut!=="fait") counts.actives++;
    if(mine&&t.responsable===mine.id&&t.statut!=="fait") counts.miennes++; if((dueInfo(t)||{}).late&&t.statut!=="fait") counts.retard++;
    if(mine&&t.confiePar===mine.id&&t.responsable!==mine.id&&t.statut!=="fait") counts.confiees=(counts.confiees||0)+1; });
  const F=[["actives","À traiter"],["retard","En retard"],["en_cours","En cours"],["a_faire","À faire"],["fait","Faites"]];
  if(mine) F.splice(1,0,["miennes","Les miennes"],["confiees","Que j'ai confiées"]);
  let h='<div class="sechead"><h2>Tâches</h2>'+(S.canWrite?'<button class="btn gold small" data-act="newTask">+ Tâche</button>':"")+'</div>'+
    '<div class="filters" role="group" aria-label="Filtrer les tâches">'+F.map(([k,l])=>'<button class="fchip" data-act="filtre" data-f="'+k+'" aria-pressed="'+(S.filtre===k)+'">'+l+'<span class="n">'+(counts[k]||0)+'</span></button>').join("")+'</div>';
  if(!loadedAll()) return h+'<div class="empty"><b>Chargement…</b></div>';
  let list=S.taches.filter(t=>{
    switch(S.filtre){
      case "actives": return t.statut!=="fait";
      case "miennes": return mine&&t.responsable===mine.id&&t.statut!=="fait";
      case "confiees": return mine&&t.confiePar===mine.id&&t.responsable!==mine.id&&t.statut!=="fait";
      case "retard": return t.statut!=="fait"&&(dueInfo(t)||{}).late;
      default: return t.statut===S.filtre;
    }
  });
  list.sort((a,b)=>(a.echeance||"9999")<(b.echeance||"9999")?-1:(a.echeance||"9999")>(b.echeance||"9999")?1:(a.creeLe||0)-(b.creeLe||0));
  if(S.filtre==="fait") list.reverse();
  if(!list.length){
    const msg={actives:"Tout est fait. Ajoute la prochaine mission du club.",miennes:"Aucune tâche ne t'est attribuée.",confiees:"Tu n'as confié aucune tâche en cours.",retard:"Rien en retard.",a_faire:"Aucune tâche à faire.",en_cours:"Aucune tâche en cours.",fait:"Aucune tâche terminée pour l'instant."}[S.filtre];
    return h+'<div class="empty"><b>Rien ici</b><span>'+esc(msg)+'</span></div>';
  }
  h+='<div class="tasks">';
  for(const t of list){
    const d=dueInfo(t), resp=membre(t.responsable);
    const tickCls=t.statut==="fait"?"ok":t.statut==="en_cours"?"prog":"";
    h+='<div class="task'+(t.statut==="fait"?" done":"")+(d&&d.late?" late":"")+'">'+
      '<button class="tick '+tickCls+'" data-act="cycle" data-id="'+esc(t.id)+'" aria-label="Statut : '+STATUTS[t.statut]+'. Passer au suivant"'+(S.canWrite?"":" disabled")+'>'+ICON.check+'</button>'+
      '<div><div class="ttl">'+esc(t.titre)+'</div><div class="info"><span class="chip">'+STATUTS[t.statut]+'</span>'+
      (d?'<span class="chip '+d.cls+'">'+esc(d.txt)+'</span>':"")+
      (resp?'<span>'+ICON.user+' '+esc(resp.nom)+'</span>':'<span>Sans responsable</span>')+'</div>'+
      (t.note?'<div class="tnote">'+esc(t.note)+'</div>':"")+taskActs(t)+'</div>'+
      (S.canWrite?'<button class="btn ghost small" data-act="editTask" data-id="'+esc(t.id)+'">Modifier</button>':"<span></span>")+'</div>';
  }
  return h+'</div><p class="help">Touche le rond pour passer une tâche de « À faire » à « En cours » puis « Fait ». Pas le temps ? Confie la tâche à un autre membre. Un membre est débordé ? Prends sa tâche avec « Je m\'en charge ».</p>';
}
function taskActs(t){
  const me=myMember(), cp=membre(t.confiePar);
  let out = (cp && t.confiePar!==t.responsable) ? '<div class="tby">Confiée par '+esc(cp.nom.split(" ")[0])+(t.confieLe?' · '+esc(ago(t.confieLe)):"")+'</div>' : "";
  if(!S.canWrite || t.statut==="fait") return out;
  const opts='<option value="">Confier à…</option>'+[...S.membres].filter(m=>m.id!==t.responsable).sort((a,b)=>(a.ordre??99)-(b.ordre??99))
    .map(m=>'<option value="'+esc(m.id)+'">'+esc(m.nom)+(me&&m.id===me.id?" (moi)":"")+'</option>').join("");
  out+='<div class="tacts">'+(me && t.responsable!==me.id?'<button class="btn small" data-act="takeTask" data-id="'+esc(t.id)+'">Je m\'en charge</button>':"")+
    '<select id="assign-'+esc(t.id)+'" aria-label="Confier « '+esc(t.titre)+' » à un membre" data-assign-task="'+esc(t.id)+'">'+opts+'</select></div>';
  return out;
}

/* ---------- Annonces ---------- */
function renderAnnonces(){
  let h='<div class="sechead"><h2>Annonces</h2></div>';
  if(S.canWrite) h+='<form class="compose" id="composeForm"><textarea id="annTxt" placeholder="Une info pour tout le club : lieu du Comptoir, changement d\'horaire, rappel…" maxlength="1200"></textarea>'+
    '<div class="row"><label class="check"><input type="checkbox" id="annPin"> Épingler en haut</label><button class="btn gold small" type="submit">Publier</button></div></form>';
  if(!loadedAll()) return h+'<div class="empty"><b>Chargement…</b></div>';
  const list=[...S.annonces].sort((a,b)=>(b.epingle?1:0)-(a.epingle?1:0)||(b.creeLe||0)-(a.creeLe||0)).slice(0,60);
  if(!list.length) return h+'<div class="empty"><b>Aucune annonce</b><span>Les messages publiés ici sont visibles par tout le club.</span></div>';
  for(const a of list){
    const mine=a.auteur&&a.auteur===S.me;
    h+='<article class="ann'+(a.epingle?" pin":"")+'"><div class="txt">'+esc(a.texte)+'</div><div class="foot">'+
      (a.epingle?'<span class="chip gold">Épinglée</span>':"")+
      (a.auteur&&membre(a.auteur)?'<span class="avs">'+initials(a.auteur)+'</span>':"")+'<span>'+esc(a.auteur?pname(a.auteur):"Le bureau")+'</span><span>·</span><span>'+esc(ago(a.creeLe))+'</span>'+
      (S.canWrite?'<span class="acts"><button class="btn ghost small" data-act="pinAnn" data-id="'+esc(a.id)+'">'+(a.epingle?"Désépingler":"Épingler")+'</button>'+
        ((mine||!a.auteur||S.isOwner)?'<button class="btn ghost small" data-act="delAnn" data-id="'+esc(a.id)+'">Supprimer</button>':"")+'</span>':"")+
      '</div></article>';
  }
  return h;
}
function ago(ms){
  if(!ms) return "";
  const m=Math.round((S.now-ms)/6e4);
  if(m<1) return "à l'instant"; if(m<60) return "il y a "+m+" min";
  const h=Math.round(m/60); if(h<24) return "il y a "+h+" h";
  return "le "+fDM.format(new Date(ms));
}

/* ---------- Bureau ---------- */
function renderBureau(){
  const mine=myMember();
  let h='<div class="sechead"><h2>Bureau</h2>'+(S.canWrite?'<button class="btn gold small" data-act="newMember">+ Membre</button>':"")+'</div>';
  if(!loadedAll()) return h+'<div class="empty"><b>Chargement…</b></div>';
  if(!mine) h+='<div class="notice">Ton adresse n\'est reliée à aucune fiche du bureau : demande à Lucas de la relier dans « Accès au QG ».</div>';
  const list=[...S.membres].sort((a,b)=>(a.ordre??99)-(b.ordre??99)||a.nom.localeCompare(b.nom));
  if(!list.length) return h+'<div class="empty"><b>Aucun membre</b><span>Ajoute les membres du bureau pour pouvoir leur confier des tâches.</span></div>';
  h+='<div class="members">';
  for(const m of list){
    const nb=S.taches.filter(t=>t.responsable===m.id&&t.statut!=="fait").length;
    const isMe=S.me&&m.id===S.me;
    const nAcc=S.acces.filter(x=>x.membreId===m.id).length;
    h+='<div class="mem'+(isMe?" me":"")+'"><div class="rl">'+esc(m.role||"Membre")+'</div><div class="nm">'+esc(m.nom)+(isMe?" · toi":"")+'</div>'+
      (m.surnom?'<div class="sn">« '+esc(m.surnom)+' »</div>':"")+
      '<div class="stats">'+nb+' tâche'+(nb>1?"s":"")+' en cours'+(S.isAdmin?(nAcc?" · accès ouvert":" · pas encore d'accès"):"")+'</div>'+
      (S.canWrite?'<div class="acts"><button class="btn ghost small" data-act="editMember" data-id="'+esc(m.id)+'">Modifier</button></div>':"")+
      '</div>';
  }
  h+='</div>';
  if(S.isAdmin) h+=renderAcces();
  return h;
}

/* ---------- Accès au QG (administrateurs) ---------- */
function renderAcces(){
  const list=[...S.acces].sort((a,b)=>(roleOf(a)===roleOf(b)?0:roleOf(a)==="bureau"?-1:1)||((membre(a.membreId)||{}).ordre??99)-((membre(b.membreId)||{}).ordre??99)||(a.nom||a.id).localeCompare(b.nom||b.id));
  let h='<div class="sechead" style="margin-top:8px"><h2>Accès au QG</h2></div>'+
    '<p class="help">Seules les adresses e-mail de cette liste peuvent entrer, après avoir vérifié leur adresse. Le bureau voit tout le QG ; les membres du club voient l\'agenda, les annonces et la liste du bureau, et peuvent dire « Je viens ». Les administrateurs gèrent cette liste.</p>'+
    '<form class="addacc" id="accForm"><div class="grid2"><div class="field"><label for="acc-mail">Adresse e-mail</label><input id="acc-mail" type="email" required autocomplete="off" placeholder="prenom.nom@audencia.com"></div>'+
    '<div class="field"><label for="acc-role">Type d\'accès</label><select id="acc-role"><option value="membre">Membre du club : agenda et annonces</option><option value="bureau">Bureau : tout le QG</option></select></div></div>'+
    '<div class="field" id="acc-nom-w"><label for="acc-nom">Prénom et nom</label><input id="acc-nom" maxlength="80" autocomplete="off"></div>'+
    '<div class="field" id="acc-mem-w" hidden><label for="acc-mem">Fiche du bureau</label><select id="acc-mem">'+memberOptions(null).replace("— Personne —","Choisir…")+'</select></div>'+
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="check" id="acc-admin-w" hidden><input type="checkbox" id="acc-admin"> Administrateur (gère les accès)</label><button class="btn gold small" type="submit" style="margin-left:auto">Ouvrir l\'accès</button></div></form>';
  h+='<div class="acces">';
  if(!list.length) h+='<div class="empty"><b>Aucun accès</b></div>';
  for(const a of list){
    const m=membre(a.membreId), self=a.id===S.email, owner=a.id===OWNER, bur=roleOf(a)==="bureau";
    const who=bur?(m?m.nom+" · "+(m.role||"Bureau"):"Fiche du bureau introuvable"):(a.nom||"Membre")+" · membre du club";
    h+='<div class="arow"><div><div class="em">'+esc(a.id)+'</div><div class="sub2">'+esc(who)+(a.admin||owner?" · administrateur":"")+(self?" · toi":"")+'</div></div>'+
      (owner?'<span class="chip gold">Président</span>':'<div class="acts">'+(bur?'<button class="btn ghost small" data-act="accAdmin" data-id="'+esc(a.id)+'">'+(a.admin?"Retirer admin":"Rendre admin")+'</button>':"")+
        (self?"":'<button class="btn ghost small" data-act="accDel" data-id="'+esc(a.id)+'">Retirer</button>')+'</div>')+'</div>';
  }
  h+='</div>';
  h+='<div class="sechead" style="margin-top:8px"><h2>Sauvegarde</h2></div><p class="help">Télécharge une copie de toutes les données du QG, ou reprends celles de l\'ancien QG (fichier .json).</p>'+
    '<div class="tools"><button class="btn small" data-act="exportAll">Télécharger une sauvegarde</button>'+
    '<label class="btn small" for="importFile" style="cursor:pointer">Importer un fichier</label><input type="file" id="importFile" accept="application/json,.json" hidden></div>';
  return h;
}

/* ---------- Connexion : réservée aux adresses du bureau ---------- */
function gateState(){
  if(S.noConfig) return "config";
  if(!S.ready) return "loading";
  if(!S.authUser) return S.authView||"login";
  if(!S.authUser.emailVerified) return "verify";
  if(S.denied) return "denied";
  if(!S.db) return "loading";
  return null;
}
const msgBox = () => S.authMsg ? '<div class="'+(S.authMsg.ok?"okmsg":"err")+'" role="alert">'+esc(S.authMsg.t)+'</div>' : "";
function pwField(id,label,ac){
  return '<div class="field"><label for="'+id+'">'+label+'</label><div class="pw"><input id="'+id+'" type="password" required minlength="8" autocomplete="'+ac+'">'+
    '<button type="button" data-auth="showpw" data-for="'+id+'">Afficher</button></div></div>';
}
function renderGate(g){
  const em=esc(S.authEmail||"");
  let h='<div class="auth"><div class="eyebrow">QG du Comptoir · réservé au bureau</div>';
  if(g==="config") return h+'<h2>Appli en cours d\'installation</h2><p class="sub">La connexion n\'est pas encore branchée. Lucas finit la mise en place : reviens bientôt.</p></div>';
  if(g==="loading") return h+'<h2>Connexion…</h2><p class="sub">Vérification de ton accès.</p></div>';
  if(g==="login") return h+'<h2>Connexion</h2>'+msgBox()+
    '<form id="loginForm" novalidate><div class="field"><label for="li-mail">Adresse e-mail</label><input id="li-mail" type="email" required autocomplete="username" value="'+em+'"></div>'+
    pwField("li-pw","Mot de passe","current-password")+'<button class="btn gold" type="submit">Se connecter</button></form>'+
    '<div class="links"><button class="linkbtn" data-auth="view" data-v="signup">Première fois ? Créer mon accès</button><button class="linkbtn" data-auth="view" data-v="reset">Mot de passe oublié</button></div>'+
    '<p class="help">Tu devras te reconnecter à chaque ouverture de l\'appli.</p>'+installHint()+'</div>';
  if(g==="signup") return h+'<h2>Créer mon accès</h2><p class="sub">Utilise l\'adresse e-mail que tu as donnée à Lucas. Tu recevras un lien pour la confirmer.</p>'+msgBox()+
    '<form id="signupForm" novalidate><div class="field"><label for="su-mail">Adresse e-mail</label><input id="su-mail" type="email" required autocomplete="username" value="'+em+'"></div>'+
    pwField("su-pw","Mot de passe (8 caractères minimum)","new-password")+'<button class="btn gold" type="submit">Créer mon accès</button></form>'+
    '<div class="links"><button class="linkbtn" data-auth="view" data-v="login">J\'ai déjà un accès</button></div></div>';
  if(g==="reset") return h+'<h2>Mot de passe oublié</h2><p class="sub">Indique ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.</p>'+msgBox()+
    '<form id="resetForm" novalidate><div class="field"><label for="rs-mail">Adresse e-mail</label><input id="rs-mail" type="email" required autocomplete="username" value="'+em+'"></div>'+
    '<button class="btn gold" type="submit">Recevoir le lien</button></form>'+
    '<div class="links"><button class="linkbtn" data-auth="view" data-v="login">Retour à la connexion</button></div></div>';
  if(g==="verify") return h+'<h2>Confirme ton adresse</h2><p class="sub">Un lien a été envoyé à <b>'+esc(S.authUser.email)+'</b>. Ouvre-le, puis reviens ici. Regarde aussi dans les courriers indésirables.</p>'+msgBox()+
    '<button class="btn gold" data-auth="verified">J\'ai confirmé mon adresse</button>'+
    '<div class="links"><button class="linkbtn" data-auth="resend">Renvoyer le lien</button><button class="linkbtn" data-auth="logout">Changer d\'adresse</button></div></div>';
  if(g==="denied") return h+'<h2>Accès refusé</h2><p class="sub">L\'adresse <b>'+esc(S.authUser.email)+'</b> ne fait pas partie du bureau du Comptoir. Si c\'est une erreur, demande à Lucas d\'ouvrir ton accès, puis reconnecte-toi.</p>'+
    '<button class="btn" data-auth="logout">Se déconnecter</button></div>';
  return h+'</div>';
}
function installHint(){
  if(window.matchMedia && matchMedia("(display-mode: standalone)").matches) return "";
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(S.installEvt) return '<div class="install"><span><b>Installer l\'appli</b> sur cet appareil pour l\'ouvrir comme une application.</span><button class="btn small gold" data-auth="install">Installer</button></div>';
  if(ios) return '<div class="install"><span><b>Installer sur iPhone :</b> touche Partager, puis « Sur l\'écran d\'accueil ».</span></div>';
  return '<div class="install"><span><b>Installer l\'appli :</b> dans le menu du navigateur, choisis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».</span></div>';
}

/* ---------- Rendu global ---------- */
function loadedAll(){ return S.offline || ["membres","evenements","taches","annonces","presences","preparations","revisions"].every(k=>S.loaded[k]); }

/* ---------- Coordination ---------- */
const SUGG = {
  comptoir:["Réserver le bar","Annoncer le lieu sur Instagram","Choisir le thème de révision"],
  reunion:["Envoyer l'ordre du jour","Réserver la salle","Rédiger le compte rendu"],
  soutien:["Confirmer le ou la prof","Récupérer les questions des groupes","Préparer les exercices"],
  meet:["Confirmer l'intervenant","Réserver la salle ou l'amphi","Communiquer l'événement","Préparer le mot d'accueil"],
  sortie:["Réserver le transport","Liste des participants","Budget validé par la trésorerie"],
  autre:["Réserver le lieu","Communiquer l'événement"]
};
const lieuOk = l => !!l && !/annonc|confirm|à définir|a definir/i.test(l);
const prepOf = occ => S.preparations.find(p=>p.id===occ) || null;
function readiness(o){
  const items=(prepOf(o.occ)||{}).items||[];
  const checks=[{auto:true,k:"lieu",t:"Lieu fixé",ok:lieuOk(o.lieu)},{auto:true,k:"resp",t:"Responsable désigné",ok:!!membre(o.ev.responsable)}]
    .concat(items.map((it,i)=>({i,t:it.t,ok:!!it.ok})));
  const done=checks.filter(c=>c.ok).length;
  return {checks,done,total:checks.length,ready:done===checks.length};
}
function upcoming14(){ return occurrences(sod(S.now),addDays(sod(S.now),14)).filter(o=>!o.annule && o.end>S.now); }
function coordAlerts(){
  const unassigned=S.taches.filter(t=>t.statut!=="fait"&&!membre(t.responsable)).length;
  const notReady=upcoming14().filter(o=>!readiness(o).ready).length;
  return {unassigned,notReady,late:lateTasks().length};
}
function briefText(){
  const ws=sod(S.now), we=addDays(ws,7);
  const occs=occurrences(ws,we).filter(o=>o.end>S.now);
  const L=["Le Comptoir · le point du "+fShort.format(S.now),""];
  L.push("Au programme (7 prochains jours) :");
  if(!occs.length) L.push("- Rien de prévu");
  occs.forEach(o=>{
    const resp=membre(o.ev.responsable);
    L.push("- "+fShort.format(o.date)+" · "+hm(o.debut)+(o.fin?"–"+hm(o.fin):"")+" · "+o.ev.titre+(o.annule?" (ANNULÉ)":" · "+(o.lieu||"lieu à annoncer"))+(resp&&!o.annule?" · resp. "+resp.nom:""));
  });
  const late=lateTasks();
  const soon=S.taches.filter(t=>t.statut!=="fait"&&t.echeance&&!((dueInfo(t)||{}).late)&&parseDate(t.echeance)<=we);
  const libre=S.taches.filter(t=>t.statut!=="fait"&&!membre(t.responsable));
  const fmt=t=>"- "+t.titre+(membre(t.responsable)?" ("+membre(t.responsable).nom+")":"")+(t.echeance?" · pour le "+fDM.format(parseDate(t.echeance)):"");
  if(late.length){ L.push("","En retard :"); late.forEach(t=>L.push(fmt(t))); }
  if(soon.length){ L.push("","À rendre cette semaine :"); soon.forEach(t=>L.push(fmt(t))); }
  if(libre.length){ L.push("","Qui s'en charge ?"); libre.forEach(t=>L.push(fmt(t))); }
  L.push("","Tout est à jour sur le QG du Comptoir.");
  return L.join("\n");
}
function renderCoord(){
  const coord=S.membres.find(m=>/coordination/i.test(m.role||""));
  let h='<div class="sechead"><h2>Coordination</h2></div>'+
    '<p class="help">'+(coord?'Espace de pilotage de '+esc(coord.nom)+', responsable coordination : ':"Espace de pilotage : ")+'ce qui reste à préparer, qui fait quoi, et le point à envoyer au club.</p>';
  if(!loadedAll()) return h+'<div class="empty"><b>Chargement…</b></div>';
  const al=coordAlerts();
  h+='<div class="kpis">'+
    '<div class="kpi'+(al.notReady?" alert":" ok")+'"><b>'+al.notReady+'</b><span>rendez-vous pas prêts (14 j)</span></div>'+
    '<div class="kpi'+(al.unassigned?" alert":" ok")+'"><b>'+al.unassigned+'</b><span>tâches sans responsable</span></div>'+
    '<div class="kpi'+(al.late?" alert":" ok")+'"><b>'+al.late+'</b><span>tâches en retard</span></div></div>';

  /* Rendez-vous à préparer */
  const occs=upcoming14();
  h+='<section class="block"><h3>Rendez-vous à préparer · 14 jours</h3>';
  if(!occs.length) h+='<div class="empty"><b>Rien dans les 14 jours</b><span>Ajoute un rendez-vous depuis l\'Agenda.</span></div>';
  occs.forEach(o=>{
    const t=TYPES[o.ev.type]||TYPES.autre, r=readiness(o), pct=Math.round(r.done/r.total*100);
    const existing=((prepOf(o.occ)||{}).items||[]).map(i=>i.t.toLowerCase());
    const sugg=(SUGG[o.ev.type]||SUGG.autre).filter(s=>!existing.includes(s.toLowerCase()));
    h+='<article class="prep" style="--tc:var('+t.c+')"><div class="hd"><div><div class="when">'+esc(fDay.format(o.date))+' · <span class="mono">'+esc(hm(o.debut))+'</span> · '+esc(countdown(o))+'</div>'+
      '<div class="ttl">'+esc(o.ev.titre)+'</div></div>'+
      '<span class="chip '+(r.ready?"":"gold")+'" style="'+(r.ready?"background:var(--ok-soft);color:var(--live)":"")+'">'+(r.ready?"Prêt":r.done+"/"+r.total)+'</span></div>'+
      '<div class="meter'+(r.ready?" full":"")+'"><i style="width:'+pct+'%"></i></div><ul class="cl">';
    r.checks.forEach(c=>{
      if(c.auto){
        h+='<li class="'+(c.ok?"done":"")+'"><span class="box" aria-hidden="true">'+ICON.check+'</span><span class="lbl">'+esc(c.t)+
          (c.k==="lieu"?' <span class="auto">· '+esc(o.lieu||"à annoncer")+'</span>':"")+'</span>';
        if(S.canWrite){
          if(c.k==="lieu") h+='<button class="btn ghost small" data-act="editOcc" data-ev="'+esc(o.ev.id)+'" data-key="'+o.key+'">'+(c.ok?"Changer":"Fixer")+'</button>';
          else h+='<select aria-label="Responsable de '+esc(o.ev.titre)+'" data-assign-ev="'+esc(o.ev.id)+'" style="max-width:150px;border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--paper);font-size:13px">'+memberOptions(o.ev.responsable)+'</select>';
        }
        h+='</li>';
      } else {
        h+='<li class="'+(c.ok?"done":"")+'"><button class="box" data-act="prepToggle" data-occ="'+esc(o.occ)+'" data-i="'+c.i+'" aria-label="'+(c.ok?"Décocher":"Cocher")+' : '+esc(c.t)+'"'+(S.canWrite?"":" disabled")+'>'+ICON.check+'</button><span class="lbl">'+esc(c.t)+'</span>'+
          (S.canWrite?'<button class="x" data-act="prepDel" data-occ="'+esc(o.occ)+'" data-i="'+c.i+'" aria-label="Retirer l\'étape">×</button>':"")+'</li>';
      }
    });
    h+='</ul>';
    if(S.canWrite){
      h+='<form class="addrow prepForm" data-occ="'+esc(o.occ)+'"><input id="add-'+esc(o.occ)+'" maxlength="100" placeholder="Ajouter une étape…" aria-label="Nouvelle étape"><button class="btn small" type="submit">Ajouter</button></form>';
      if(sugg.length) h+='<div class="sugg">'+sugg.map(s=>'<button data-act="prepAdd" data-occ="'+esc(o.occ)+'" data-t="'+esc(s)+'">+ '+esc(s)+'</button>').join("")+'</div>';
    }
    h+='</article>';
  });
  h+='</section>';

  /* Tâches à répartir */
  const libres=S.taches.filter(t=>t.statut!=="fait"&&!membre(t.responsable));
  h+='<section class="block"><h3>Tâches à répartir</h3>';
  if(!libres.length) h+='<div class="empty"><b>Tout est attribué</b><span>Chaque tâche en cours a quelqu\'un pour s\'en charger.</span></div>';
  libres.forEach(t=>{
    const d=dueInfo(t);
    h+='<div class="assign"><div><div class="ttl">'+esc(t.titre)+'</div><div class="sub2">'+(d?esc(d.txt):"Sans échéance")+' · '+STATUTS[t.statut]+'</div></div>'+
      (S.canWrite?'<select aria-label="Attribuer « '+esc(t.titre)+' »" data-assign-task="'+esc(t.id)+'">'+memberOptions(null).replace("— Personne —","Attribuer à…")+'</select>':"")+'</div>';
  });
  h+='</section>';

  /* Charge de l'équipe */
  const occ14=upcoming14();
  const rows=S.membres.map(m=>{
    const act=S.taches.filter(t=>t.responsable===m.id&&t.statut!=="fait");
    const late=act.filter(t=>(dueInfo(t)||{}).late).length;
    const evs=occ14.filter(o=>o.ev.responsable===m.id).length;
    return {m,n:act.length,late,evs};
  }).sort((a,b)=>(b.n+b.evs)-(a.n+a.evs)||a.m.nom.localeCompare(b.m.nom));
  const max=Math.max(1,...rows.map(r=>r.n+r.evs));
  h+='<section class="block"><h3>Charge de l\'équipe</h3><div class="load">';
  if(!rows.length) h+='<span class="help">Ajoute les membres dans l\'onglet Bureau.</span>';
  rows.forEach(r=>{
    h+='<div class="lrow"><div class="nm">'+esc(r.m.nom.split(" ")[0])+'<small>'+esc(r.m.role||"")+'</small></div>'+
      '<div class="bar" title="'+r.n+' tâches, '+r.evs+' rendez-vous"><i class="l" style="width:'+(r.late/max*100)+'%"></i><i style="width:'+((r.n-r.late+r.evs)/max*100)+'%"></i></div>'+
      '<div class="n">'+r.n+' t · '+r.evs+' rdv'+(r.late?' · <span style="color:var(--late)">'+r.late+'!</span>':"")+'</div></div>';
  });
  h+='</div><p class="help">t = tâches en cours, rdv = rendez-vous dont la personne est responsable sur 14 jours. Rouge : en retard.</p></section>';

  /* Point de la semaine */
  h+='<section class="block"><h3>Point de la semaine</h3><div class="brief"><pre id="briefTxt">'+esc(briefText())+'</pre>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn gold small" data-act="copyBrief">Copier le texte</button>'+
    (S.canWrite?'<button class="btn small" data-act="postBrief">Publier dans Annonces</button>':"")+
    '<span class="help">À coller dans le groupe du club.</span></div></div></section>';
  return h;
}
async function savePrep(occ,items){
  const ref=col("preparations").doc(occ);
  return w(ref.set({occ,items,majLe:Date.now()}));
}
let focusSave=null;
function render(){
  S.now=new Date();
  const view=$("#view"), g=gateState();
  $("nav.tabs").hidden=!!g; $("#now").hidden=!!g; $("#strip").hidden=!!g;
  $("#status").classList.toggle("live",S.live);
  $("#statusTxt").textContent = S.offline?"Aperçu hors ligne": S.live?"En direct": S.slow?"Connexion lente…":"Connexion…";
  $("#status").hidden=!!g; $("#logoutBtn").hidden=!!g;
  if(g){
    const gk=g+"|"+(S.authMsg?S.authMsg.t:"")+"|"+(S.installEvt?1:0);
    if(S.lastGate!==gk){
      view.innerHTML=renderGate(g); S.lastGate=gk;
      const f=[...view.querySelectorAll("input")].find(i=>!i.value);
      if(f && !matchMedia("(pointer:coarse)").matches) f.focus();
    }
    return;
  }
  S.lastGate="";
  ["taches","coord"].forEach(t=>{ $("#tab-"+t).hidden=!S.bureau; });
  $("nav.tabs .wrap").style.gridTemplateColumns="repeat("+(S.bureau?6:4)+",1fr)";
  document.body.classList.toggle("protege", protege());
  if(!S.bureau && (S.tab==="taches"||S.tab==="coord")) S.tab="agenda";
  renderNotifBar();
  renderNow();
  const active=document.activeElement;
  const draft = $("#annTxt") ? $("#annTxt").value : null;
  const pinChk = $("#annPin") ? $("#annPin").checked : false;
  const keepFocus = active && active.id==="annTxt";
  const addFocus = active && active.id && active.id.startsWith("add-") ? {id:active.id,v:active.value} : null;
  const keep={}; ["acc-mail","acc-role","acc-nom","acc-mem","acc-admin"].forEach(id=>{ const el=document.getElementById(id); if(el) keep[id]=el.type==="checkbox"?el.checked:el.value; });
  const fid=active&&active.id&&keep.hasOwnProperty(active.id)?active.id:null;
  const vh = S.tab==="agenda"?renderAgenda(): S.tab==="taches"?renderTaches(): S.tab==="annonces"?renderAnnonces(): S.tab==="coord"?renderCoord(): S.tab==="revisions"?renderRevisions(): renderBureau();
  // Une fiche longue n'est pas reconstruite toutes les 30 secondes si rien n'a changé (garde la lecture en place)
  if(!(S.tab==="revisions" && S.lastView===vh && view.childElementCount)) view.innerHTML=vh;
  S.lastView = S.tab==="revisions" ? vh : null;
  if(addFocus){ const el=document.getElementById(addFocus.id); if(el){ el.value=addFocus.v; el.focus(); } }
  Object.keys(keep).forEach(id=>{ const el=document.getElementById(id); if(el){ if(el.type==="checkbox") el.checked=keep[id]; else el.value=keep[id]; } });
  if(fid&&document.getElementById(fid)) document.getElementById(fid).focus();
  syncAccForm();
  if(loadedAll()&&S.bureau){ const al=coordAlerts(), n=al.notReady+al.unassigned, cb=$("#coordBadge"); cb.hidden=!n; cb.textContent=n; }
  if(draft!==null && $("#annTxt")){ $("#annTxt").value=draft; $("#annPin").checked=pinChk; if(keepFocus) $("#annTxt").focus(); }
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===S.tab)));
  const st=$("#status");
  st.classList.toggle("live",S.live);
  $("#statusTxt").textContent = S.offline?"Aperçu hors ligne": S.live?"En direct": S.slow?"Connexion lente…":"Connexion…";
}

/* ---------- Écritures ---------- */
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
async function w(p,ok){
  try{ await p; if(ok) toast(ok); return true; }
  catch(e){
    const c=e&&e.code;
    if(c==="permission-denied"){ toast("Accès refusé : ton adresse n'est plus autorisée, ou cette action est réservée aux administrateurs."); }
    else if(c==="resource-exhausted") toast("Limite du jour atteinte : réessaie demain ou préviens Lucas.");
    else toast("Pas enregistré : vérifie ta connexion et réessaie.");
    return false;
  }
}
const col = n => S.db.collection(n);

/* ---------- Feuilles ---------- */
function openSheet(html, onMount){
  const root=$("#sheetRoot");
  root.innerHTML='<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true">'+html+'</div></div>';
  $("#scrim").addEventListener("click",e=>{ if(e.target.id==="scrim") closeSheet(); });
  const first=root.querySelector("input,select,textarea,button"); if(first) first.focus();
  if(onMount) onMount(root);
}
function closeSheet(){ $("#sheetRoot").innerHTML=""; }
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && $("#scrim")) closeSheet(); });

const memberOptions = sel => '<option value="">— Personne —</option>'+[...S.membres].sort((a,b)=>(a.ordre??99)-(b.ordre??99)).map(m=>'<option value="'+esc(m.id)+'"'+(m.id===sel?" selected":"")+'>'+esc(m.nom)+(m.role?" · "+esc(m.role):"")+'</option>').join("");
const typeOptions = sel => Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'"'+(k===sel?" selected":"")+'>'+v.lbl+'</option>').join("");

function eventSheet(ev){
  const e=ev||{type:"comptoir",date:ymd(S.now),debut:"18:00",fin:"20:00",repetition:"aucune"};
  openSheet('<h3>'+(ev?"Modifier la série":"Nouveau rendez-vous")+'</h3><form id="evForm">'+
    '<div class="field"><label for="f-titre">Titre</label><input id="f-titre" required maxlength="120" value="'+esc(e.titre||"")+'" placeholder="Comptoir du mercredi"></div>'+
    '<div class="grid2"><div class="field"><label for="f-type">Type</label><select id="f-type">'+typeOptions(e.type)+'</select></div>'+
    '<div class="field"><label for="f-date">'+(ev&&ev.repetition==="hebdo"?"Première date":"Date")+'</label><input id="f-date" type="date" required value="'+esc(e.date)+'"></div></div>'+
    '<div class="grid2"><div class="field"><label for="f-debut">Début</label><input id="f-debut" type="time" required value="'+esc(e.debut||"")+'"></div>'+
    '<div class="field"><label for="f-fin">Fin</label><input id="f-fin" type="time" value="'+esc(e.fin||"")+'"></div></div>'+
    '<div class="field"><label for="f-lieu">Lieu</label><input id="f-lieu" maxlength="120" value="'+esc(e.lieu||"")+'" placeholder="Salle du club, bar partenaire…"></div>'+
    '<div class="field"><label for="f-resp">Responsable</label><select id="f-resp">'+memberOptions(e.responsable)+'</select></div>'+
    '<div class="grid2"><div class="field"><label for="f-rep">Répétition</label><select id="f-rep"><option value="aucune">Une seule fois</option><option value="hebdo"'+(e.repetition==="hebdo"?" selected":"")+'>Chaque semaine</option></select></div>'+
    '<div class="field" id="untilWrap"><label for="f-until">Jusqu\'au (facultatif)</label><input id="f-until" type="date" value="'+esc(e.jusqua||"")+'"></div></div>'+
    '<div class="field"><label for="f-note">Note</label><textarea id="f-note" maxlength="600" placeholder="Ce qu\'il faut apporter, le déroulé…">'+esc(e.note||"")+'</textarea></div>'+
    '<div class="bar">'+(ev?'<button type="button" class="btn danger small left" id="delEv">Supprimer la série</button>':"")+
    '<button type="button" class="btn ghost" data-close>Fermer</button><button class="btn gold" type="submit">Enregistrer</button></div></form>',
  root=>{
    const rep=$("#f-rep",root), uw=$("#untilWrap",root); const sync=()=>uw.hidden=rep.value!=="hebdo"; rep.onchange=sync; sync();
    root.querySelector("[data-close]").onclick=closeSheet;
    if(ev) $("#delEv",root).onclick=()=>confirmSheet("Supprimer « "+ev.titre+" » ?", ev.repetition==="hebdo"?"Toutes les dates de cette série disparaîtront de l'agenda.":"Le rendez-vous disparaîtra de l'agenda.","Supprimer",async()=>{ await w(col("evenements").doc(ev.id).delete(),"Rendez-vous supprimé"); });
    $("#evForm",root).onsubmit=async ev2=>{
      ev2.preventDefault();
      const body={ titre:$("#f-titre").value.trim(), type:$("#f-type").value, date:$("#f-date").value, debut:$("#f-debut").value, fin:$("#f-fin").value,
        lieu:$("#f-lieu").value.trim(), responsable:$("#f-resp").value||null, repetition:$("#f-rep").value,
        jusqua:$("#f-rep").value==="hebdo"?($("#f-until").value||null):null, note:$("#f-note").value.trim(), majLe:Date.now() };
      if(!body.titre||!body.date) return;
      closeSheet();
      if(ev){ body.exceptions=ev.exceptions||{}; await w(col("evenements").doc(ev.id).set(Object.assign(clean(ev),body)),"Rendez-vous mis à jour"); }
      else { body.exceptions={}; body.creePar=S.me||null; await w(col("evenements").add(body),"Rendez-vous ajouté"); }
    };
  });
}
function occSheet(ev,key){
  const d=parseDate(key);
  if(ev.repetition!=="hebdo"){ eventSheet(ev); return; }
  const ex=(ev.exceptions||{})[key]||{};
  openSheet('<h3>'+esc(ev.titre)+'</h3><p class="sub" style="text-transform:capitalize">'+esc(fDay.format(d))+'</p>'+
    '<div class="choice"><button type="button" id="chSeries"><b>Modifier toute la série</b><span>Titre, horaires et lieu habituels, responsable, répétition.</span></button></div>'+
    '<form id="occForm"><p class="sub"><b>Changer cette date seulement</b> (ex. le lieu du Comptoir de la semaine)</p>'+
    '<div class="field"><label for="o-lieu">Lieu ce jour-là</label><input id="o-lieu" maxlength="120" value="'+esc(ex.lieu||"")+'" placeholder="'+esc(ev.lieu||"Lieu à annoncer")+'"></div>'+
    '<div class="grid2"><div class="field"><label for="o-debut">Début</label><input id="o-debut" type="time" value="'+esc(ex.debut||ev.debut||"")+'"></div>'+
    '<div class="field"><label for="o-fin">Fin</label><input id="o-fin" type="time" value="'+esc(ex.fin||ev.fin||"")+'"></div></div>'+
    '<div class="field"><label for="o-note">Note pour cette date</label><textarea id="o-note" maxlength="600">'+esc(ex.note||"")+'</textarea></div>'+
    '<label class="check"><input type="checkbox" id="o-annule"'+(ex.annule?" checked":"")+'> Annuler cette date</label>'+
    '<div class="bar">'+(Object.keys(ex).length?'<button type="button" class="btn ghost small left" id="o-reset">Rétablir l\'horaire habituel</button>':"")+
    '<button type="button" class="btn ghost" data-close>Fermer</button><button class="btn gold" type="submit">Enregistrer</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    $("#chSeries",root).onclick=()=>eventSheet(ev);
    const reset=$("#o-reset",root);
    if(reset) reset.onclick=async()=>{ const body=clean(ev); body.exceptions=Object.assign({},body.exceptions); delete body.exceptions[key]; body.majLe=Date.now(); closeSheet(); await w(col("evenements").doc(ev.id).set(body),"Date rétablie"); };
    $("#occForm",root).onsubmit=async e=>{
      e.preventDefault();
      const x={}; const l=$("#o-lieu").value.trim(), db_=$("#o-debut").value, fn=$("#o-fin").value, nt=$("#o-note").value.trim();
      if(l) x.lieu=l; if(db_ && db_!==ev.debut) x.debut=db_; if(fn && fn!==ev.fin) x.fin=fn; if(nt) x.note=nt; if($("#o-annule").checked) x.annule=true;
      const body=clean(ev); body.exceptions=Object.assign({},body.exceptions);
      if(Object.keys(x).length) body.exceptions[key]=x; else delete body.exceptions[key];
      body.majLe=Date.now(); closeSheet();
      await w(col("evenements").doc(ev.id).set(body), x.annule?"Date annulée":"Date mise à jour");
    };
  });
}
function taskSheet(t){
  const e=t||{statut:"a_faire"};
  openSheet('<h3>'+(t?"Modifier la tâche":"Nouvelle tâche")+'</h3><form id="tForm">'+
    '<div class="field"><label for="t-titre">Tâche</label><input id="t-titre" required maxlength="160" value="'+esc(e.titre||"")+'" placeholder="Réserver le bar de mercredi"></div>'+
    '<div class="grid2"><div class="field"><label for="t-resp">Pour qui ?</label><select id="t-resp">'+memberOptions(t?e.responsable:((myMember()||{}).id))+'</select></div>'+
    '<div class="field"><label for="t-ech">Échéance</label><input id="t-ech" type="date" value="'+esc(e.echeance||"")+'"></div></div>'+
    '<div class="field"><label for="t-stat">Statut</label><select id="t-stat">'+Object.entries(STATUTS).map(([k,v])=>'<option value="'+k+'"'+(k===e.statut?" selected":"")+'>'+v+'</option>').join("")+'</select></div>'+
    '<div class="field"><label for="t-note">Détails</label><textarea id="t-note" maxlength="800">'+esc(e.note||"")+'</textarea></div>'+
    '<div class="bar">'+(t?'<button type="button" class="btn danger small left" id="delT">Supprimer</button>':"")+
    '<button type="button" class="btn ghost" data-close>Fermer</button><button class="btn gold" type="submit">Enregistrer</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    if(t) $("#delT",root).onclick=()=>confirmSheet("Supprimer cette tâche ?","« "+t.titre+" » sera retirée pour tout le monde.","Supprimer",async()=>{ await w(col("taches").doc(t.id).delete(),"Tâche supprimée"); });
    $("#tForm",root).onsubmit=async ev=>{
      ev.preventDefault();
      const body={ titre:$("#t-titre").value.trim(), responsable:$("#t-resp").value||null, echeance:$("#t-ech").value||null, statut:$("#t-stat").value, note:$("#t-note").value.trim(), majLe:Date.now() };
      if(!body.titre) return; closeSheet();
      const me=myMember();
      if(body.responsable && (!t || body.responsable!==t.responsable)){
        body.confiePar = me && me.id!==body.responsable ? me.id : null; body.confieLe=Date.now();
      }
      const who=((membre(body.responsable)||{}).nom||"").split(" ")[0], other=me&&body.responsable&&body.responsable!==me.id;
      if(t) await w(col("taches").doc(t.id).set(Object.assign(clean(t),body)),"Tâche mise à jour");
      else { body.creeLe=Date.now(); body.creePar=me?me.id:null; await w(col("taches").add(body), other?"Tâche confiée à "+who:"Tâche ajoutée"); }
    };
  });
}
function memberSheet(m){
  const e=m||{};
  openSheet('<h3>'+(m?"Modifier la fiche":"Nouveau membre")+'</h3><form id="mForm">'+
    '<div class="field"><label for="m-nom">Prénom et nom</label><input id="m-nom" required maxlength="80" value="'+esc(e.nom||"")+'"></div>'+
    '<div class="grid2"><div class="field"><label for="m-role">Rôle</label><input id="m-role" maxlength="60" value="'+esc(e.role||"")+'" placeholder="Responsable événements"></div>'+
    '<div class="field"><label for="m-sn">Surnom</label><input id="m-sn" maxlength="40" value="'+esc(e.surnom||"")+'"></div></div>'+
    '<div class="field"><label for="m-ord">Ordre d\'affichage</label><input id="m-ord" type="number" min="0" max="99" value="'+esc(e.ordre??50)+'"></div>'+
    '<div class="bar">'+(m?'<button type="button" class="btn danger small left" id="delM">Retirer</button>':"")+
    '<button type="button" class="btn ghost" data-close>Fermer</button><button class="btn gold" type="submit">Enregistrer</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    if(m) $("#delM",root).onclick=()=>confirmSheet("Retirer "+m.nom+" ?","Ses tâches resteront, sans responsable.","Retirer",async()=>{ await w(col("membres").doc(m.id).delete(),"Membre retiré"); });
    $("#mForm",root).onsubmit=async ev=>{
      ev.preventDefault();
      const body={ nom:$("#m-nom").value.trim(), role:$("#m-role").value.trim(), surnom:$("#m-sn").value.trim(), ordre:+$("#m-ord").value||50 };
      if(!body.nom) return; closeSheet();
      if(m) await w(col("membres").doc(m.id).set(Object.assign(clean(m),body)),"Fiche mise à jour");
      else await w(col("membres").add(body),"Membre ajouté");
    };
  });
}
function confirmSheet(title,sub,label,fn,cls){
  openSheet('<h3>'+esc(title)+'</h3><p class="sub">'+esc(sub)+'</p><div class="bar"><button class="btn ghost" data-close>Annuler</button><button class="btn '+(cls||"danger")+'" id="okC">'+esc(label)+'</button></div>',
  root=>{ root.querySelector("[data-close]").onclick=closeSheet; $("#okC",root).onclick=async()=>{ closeSheet(); await fn(); }; });
}

/* ---------- Actions ---------- */
document.addEventListener("click",async e=>{
  const tabB=e.target.closest("nav.tabs button"); if(tabB){ S.tab=tabB.dataset.tab; try{localStorage.setItem("qg-tab",S.tab)}catch(_){} location.hash=S.tab; render(); window.scrollTo(0,0); return; }
  const aller=e.target.closest(".fdoc [data-aller]");
  if(aller){ const cible=document.querySelector('.fdoc [data-ancre="'+aller.dataset.aller+'"]'); if(cible) cible.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}); return; }
  const b=e.target.closest("[data-act]"); if(!b) return;
  const a=b.dataset.act;
  if(a==="week"){ const d=+b.dataset.d; S.weekOffset = d===0?0:S.weekOffset+d; render(); return; }
  if(a==="filtre"){ S.filtre=b.dataset.f; render(); return; }
  if(a.startsWith("rev") && revAction(a,b)) return;
  if(!S.db) return;
  if(a==="newEvent") return eventSheet();
  if(a==="editOcc"){ const ev=S.evenements.find(x=>x.id===b.dataset.ev); if(ev) occSheet(ev,b.dataset.key); return; }
  if(a==="newTask") return taskSheet();
  if(a==="editTask"){ const t=S.taches.find(x=>x.id===b.dataset.id); if(t) taskSheet(t); return; }
  if(a==="newMember") return memberSheet();
  if(a==="editMember"){ const m=S.membres.find(x=>x.id===b.dataset.id); if(m) memberSheet(m); return; }
  if(a==="pres"){
    if(!S.me) return; const occ=b.dataset.occ; const ref=col("presences").doc(occ+"__"+S.me);
    b.disabled=true;
    if(amPresent(occ)) await w(ref.delete(),"Présence retirée");
    else await w(ref.set({occ,uid:S.me,mail:S.email,nom:S.myName||(membre(S.me)||{}).nom||"",at:Date.now()}),"Noté, tu es attendu·e");
    return;
  }
  if(a==="cycle"){
    const t=S.taches.find(x=>x.id===b.dataset.id); if(!t) return;
    const next={a_faire:"en_cours",en_cours:"fait",fait:"a_faire"}[t.statut]||"a_faire";
    b.disabled=true;
    await w(col("taches").doc(t.id).update({statut:next,majLe:Date.now()}), next==="fait"?"Tâche terminée":null);
    return;
  }
  if(a==="pinAnn"){ const x=S.annonces.find(y=>y.id===b.dataset.id); if(x) await w(col("annonces").doc(x.id).update({epingle:!x.epingle})); return; }
  if(a==="delAnn"){ const x=S.annonces.find(y=>y.id===b.dataset.id); if(x) confirmSheet("Supprimer cette annonce ?","Elle disparaîtra pour tout le club.","Supprimer",async()=>{ await w(col("annonces").doc(x.id).delete(),"Annonce supprimée"); }); return; }
  if(a==="prepToggle"||a==="prepDel"){
    const occ=b.dataset.occ, i=+b.dataset.i, p=prepOf(occ); if(!p) return;
    const items=JSON.parse(JSON.stringify(p.items||[]));
    if(!items[i]) return;
    if(a==="prepToggle") items[i].ok=!items[i].ok; else items.splice(i,1);
    b.disabled=true; await savePrep(occ,items); return;
  }
  if(a==="prepAdd"){
    const occ=b.dataset.occ, p=prepOf(occ);
    const items=JSON.parse(JSON.stringify((p&&p.items)||[])); items.push({t:b.dataset.t,ok:false});
    b.disabled=true; await savePrep(occ,items); return;
  }
  if(a==="copyBrief"){
    const txt=briefText();
    try{ await navigator.clipboard.writeText(txt); toast("Texte copié"); }
    catch(_){ const pre=$("#briefTxt"); if(pre){ const r=document.createRange(); r.selectNodeContents(pre); const s=getSelection(); s.removeAllRanges(); s.addRange(r); } toast("Texte sélectionné : copie-le avec ton téléphone"); }
    return;
  }
  if(a==="postBrief"){ await w(col("annonces").add({texte:briefText(),epingle:false,auteur:S.me||null,creeLe:Date.now()}),"Point publié dans Annonces"); return; }
  if(a==="accAdmin"){ const x=S.acces.find(y=>y.id===b.dataset.id); if(!x||!S.isAdmin) return; b.disabled=true;
    await w(col("acces").doc(x.id).update({admin:!x.admin}), x.admin?"N'est plus administrateur":"Est maintenant administrateur"); return; }
  if(a==="accDel"){ const x=S.acces.find(y=>y.id===b.dataset.id); if(!x||!S.isAdmin) return;
    confirmSheet("Retirer l'accès de "+x.id+" ?","Cette personne ne pourra plus ouvrir le QG. Sa fiche du bureau et ses tâches restent.","Retirer l'accès",async()=>{ await w(col("acces").doc(x.id).delete(),"Accès retiré"); });
    return; }
  if(a==="exportAll"){
    const out={exporteLe:new Date().toISOString()};
    COLLS.forEach(c=>{ out[c]=S[c].map(d=>JSON.parse(JSON.stringify(d))); });
    if(S.isAdmin) out.acces=S.acces.map(d=>JSON.parse(JSON.stringify(d)));
    const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}));
    const l=document.createElement("a"); l.href=url; l.download="qg-comptoir-"+ymd(new Date())+".json"; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000); toast("Sauvegarde téléchargée"); return;
  }
  if(a==="takeTask"){
    const me=myMember(), t=S.taches.find(x=>x.id===b.dataset.id); if(!me||!t) return;
    b.disabled=true;
    await w(col("taches").doc(t.id).update({responsable:me.id,confiePar:null,confieLe:Date.now(),majLe:Date.now()}),"C'est pour toi");
    return;
  }
});
function syncAccForm(){
  const r=$("#acc-role"); if(!r) return; const bur=r.value==="bureau";
  $("#acc-nom-w").hidden=bur; $("#acc-mem-w").hidden=!bur; $("#acc-admin-w").hidden=!bur;
}
document.addEventListener("change",async e=>{
  const el=e.target; if(el.id==="acc-role"){ syncAccForm(); return; }
  if(!S.db) return;
  if(el.id==="importFile"){
    const f=el.files&&el.files[0]; el.value=""; if(!f||!S.isAdmin) return;
    let data; try{ data=JSON.parse(await f.text()); }catch(_){ toast("Fichier illisible : choisis le fichier .json de sauvegarde."); return; }
    const writes=[];
    COLLS.forEach(c=>{ (Array.isArray(data[c])?data[c]:[]).forEach(d=>{
      if(!d||typeof d!=="object"||!d.id||!/^[\w\-.~:@+]{1,200}$/.test(d.id)) return;
      const body=JSON.parse(JSON.stringify(d)); delete body.id; delete body.uid; writes.push([c,d.id,body]); }); });
    if(!writes.length){ toast("Aucune donnée du QG dans ce fichier."); return; }
    confirmSheet("Importer "+writes.length+" éléments ?","Membres, rendez-vous, tâches, annonces et préparations du fichier sont ajoutés. Un élément qui existe déjà est remplacé par celui du fichier.","Importer",async()=>{
      try{
        for(let i=0;i<writes.length;i+=400){ const bt=S.db.batch(); writes.slice(i,i+400).forEach(([c,id,body])=>bt.set(col(c).doc(id),body)); await bt.commit(); }
        toast(writes.length+" éléments importés");
      }catch(err){ await w(Promise.reject(err)); }
    },"gold");
    return;
  }
  if(el.dataset.assignTask){ const id=el.dataset.assignTask, v=el.value; if(!v) return; el.disabled=true;
    const me=myMember(), self=me&&me.id===v;
    await w(col("taches").doc(id).update({responsable:v,confiePar:self?null:(me?me.id:null),confieLe:Date.now(),majLe:Date.now()}),
      self?"C'est pour toi":"Tâche confiée à "+(((membre(v)||{}).nom||"").split(" ")[0])); return; }
  if(el.dataset.assignEv){ const id=el.dataset.assignEv; el.disabled=true;
    await w(col("evenements").doc(id).update({responsable:el.value||null,majLe:Date.now()}),"Responsable mis à jour"); return; }
});
document.addEventListener("submit",async e=>{
  if(["loginForm","signupForm","resetForm"].includes(e.target.id)){ e.preventDefault(); authSubmit(e.target); return; }
  if(e.target.id==="accForm"){
    e.preventDefault(); if(!S.db||!S.isAdmin) return;
    const mail=$("#acc-mail").value.trim().toLowerCase(), role=$("#acc-role").value;
    if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)){ toast("Adresse e-mail invalide."); return; }
    let body, nom;
    if(role==="bureau"){
      const mem=$("#acc-mem").value; if(!membre(mem)){ toast("Choisis la fiche du bureau de cette personne."); return; }
      body={role:"bureau",membreId:mem,admin:$("#acc-admin").checked}; nom=membre(mem).nom;
    } else {
      nom=$("#acc-nom").value.trim(); if(!nom){ toast("Indique le prénom et le nom du membre."); return; }
      body={role:"membre",nom,admin:false};
    }
    Object.assign(body,{ajoutePar:S.me||null,ajouteLe:Date.now()});
    const ok=await w(col("acces").doc(mail).set(body),"Accès ouvert pour "+nom.split(" ")[0]);
    if(ok&&$("#acc-mail")){ $("#acc-mail").value=""; $("#acc-nom").value=""; $("#acc-admin").checked=false; }
    return;
  }
  if(e.target.classList.contains("prepForm")){
    e.preventDefault(); if(!S.db) return;
    const occ=e.target.dataset.occ, inp=e.target.querySelector("input"), t=inp.value.trim(); if(!t) return;
    const p=prepOf(occ), items=JSON.parse(JSON.stringify((p&&p.items)||[])); items.push({t,ok:false});
    inp.value=""; await savePrep(occ,items); return;
  }
  if(e.target.id!=="composeForm") return;
  e.preventDefault();
  const txt=$("#annTxt").value.trim(); if(!txt||!S.db) return;
  const pin=$("#annPin").checked;
  $("#annTxt").value=""; $("#annPin").checked=false;
  const ok=await w(col("annonces").add({texte:txt,epingle:pin,auteur:S.me||null,creeLe:Date.now()}),"Annonce publiée");
  if(!ok && $("#annTxt")) $("#annTxt").value=txt;
});

/* ---------- Démarrage ---------- */
const VALID=["agenda","taches","annonces","revisions","coord","bureau"];
function readHash(){ const h=(location.hash||"").slice(1); if(VALID.includes(h)) S.tab=h; }
try{ const t=localStorage.getItem("qg-tab"); if(VALID.includes(t)) S.tab=t; }catch(_){}
readHash();
window.addEventListener("hashchange",()=>{ readHash(); render(); });
render();
setInterval(()=>{ if(!$("#scrim")) render(); else renderNow(); },30000);

/* ---------- Révisions : fiches et quiz (consultables uniquement dans l'appli) ---------- */
const REV_KEY = id => "qg-erreurs-"+id;
function revErrors(id){ try{ return JSON.parse(lsGet(REV_KEY(id))||"[]"); }catch(_){ return []; } }
function setRevErrors(id,list){ lsSet(REV_KEY(id), JSON.stringify([...new Set(list)])); }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function filigrane(fixe){
  const who=(S.email||"QG du Comptoir")+" · "+new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short"}).format(new Date());
  return '<div class="filigrane'+(fixe?" fixe":"")+'" aria-hidden="true">'+Array.from({length:fixe?140:60},()=>'<span>'+esc(who)+'</span>').join("")+'</div>';
}
function renderRevisions(){
  const it=S.rev&&S.revisions.find(r=>r.id===S.rev.id);
  if(it) return it.type==="quiz"? renderQuiz(it) : renderFiche(it);
  let h='<div class="sechead"><h2>Révisions</h2></div><p class="help">Fiches et quiz du club, à faire ici : ils ne se téléchargent pas et restent réservés aux inscrits.</p>';
  if(!loadedAll()) return h+'<div class="empty"><b>Chargement…</b></div>';
  if(!S.revisions.length) return h+'<div class="empty"><b>Rien pour l\'instant</b><span>Les fiches et les quiz de chaque cours apparaîtront ici.</span></div>';
  const groups={};
  [...S.revisions].sort((a,b)=>(a.matiere||"").localeCompare(b.matiere||"")||(a.ordre??99)-(b.ordre??99)).forEach(r=>{ (groups[r.matiere||"Autres"]=groups[r.matiere||"Autres"]||[]).push(r); });
  h+='<div class="revlist">';
  for(const [mat,list] of Object.entries(groups)){
    h+='<section class="revgroup"><h3>'+esc(mat)+'</h3>';
    for(const r of list){
      const quiz=r.type==="quiz", n=quiz?(r.questions||[]).length:(r.pages||r.sections||[]).length, err=quiz?revErrors(r.id).length:0;
      h+='<div class="revcard"><div class="ico">'+(quiz?"QCM":"Fiche")+'</div><div><div class="ttl">'+esc(r.titre)+'</div><div class="sub2">'+
        (quiz? n+' questions'+(err?' · '+err+' erreur'+(err>1?"s":"")+' à revoir':"") : esc(r.resume||(n+' fiche'+(n>1?"s":""))))+'</div></div>'+
        '<button class="btn small gold" data-act="revOpen" data-id="'+esc(r.id)+'">'+(quiz?"Commencer":"Ouvrir")+'</button></div>';
    }
    h+='</section>';
  }
  return h+'</div>';
}
function quizPool(it){
  const qs=it.questions||[], st=S.rev;
  return qs.map((q,i)=>i).filter(i=>st.parts.has(qs[i].p));
}
function startQuiz(it, indices){
  const st=S.rev;
  const nb=st.nb==="tout"?indices.length:Math.min(+st.nb,indices.length);
  st.order=shuffle(indices).slice(0,nb).map(i=>({i,opts:shuffle((it.questions[i].o||[]).map((_,k)=>k))}));
  st.pos=0; st.choix=null; st.bons=0; st.rates=[]; st.step="q";
}
function renderQuiz(it){
  const st=S.rev, parts=it.parts||[], qs=it.questions||[];
  const back='<button class="btn ghost small" data-act="revBack">← Révisions</button>';
  let h='<div class="sechead"><h2>'+esc(it.titre)+'</h2>'+back+'</div><div class="quiz">'+filigrane();
  if(st.step==="setup"){
    const counts={}; qs.forEach(q=>counts[q.p]=(counts[q.p]||0)+1);
    const pool=quizPool(it).length, err=revErrors(it.id).filter(i=>i<qs.length);
    h+='<p class="help" style="margin:0">'+esc(it.source||"")+'</p><b>Parties du cours</b><div class="qparts">'+
      (parts.length?parts:[{id:undefined,name:"Tout le cours"}]).map(p=>'<label class="qpart"><input type="checkbox" data-rev-part="'+esc(p.id)+'"'+(st.parts.has(p.id)?" checked":"")+'><span><b>'+esc(p.name)+'</b><small>'+esc(p.sub||"")+' · '+(counts[p.id]||0)+' q.</small></span></label>').join("")+'</div>'+
      '<b>Nombre de questions</b><div class="qseg">'+["10","20","40","tout"].map(v=>'<label><input type="radio" name="revnb" value="'+v+'"'+(st.nb===v?" checked":"")+'> '+(v==="tout"?"Tout ("+pool+")":v)+'</label>').join("")+'</div>'+
      '<div class="row" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" data-act="revStart"'+(pool?"":" disabled")+'>Commencer</button>'+
      (err.length?'<button class="btn" data-act="revErr">Refaire mes erreurs ('+err.length+')</button>':"")+'</div>';
  } else if(st.step==="q"){
    const cur=st.order[st.pos], q=qs[cur.i], part=parts.find(p=>p.id===q.p);
    h+='<div class="qtop"><span>Question <b>'+(st.pos+1)+'/'+st.order.length+'</b>'+(part?' · '+esc(part.name):"")+'</span><span>Score <b>'+st.bons+'</b></span></div>'+
      '<div class="qbar"><i style="width:'+Math.round(st.pos/st.order.length*100)+'%"></i></div>'+
      '<p class="qq">'+esc(q.q)+'</p><div class="qopts">'+cur.opts.map((k,n)=>{
        let cls=""; if(st.choix!==null){ if(k===q.a) cls=" good"; else if(k===st.choix) cls=" bad"; else cls=" dim"; }
        return '<button class="qopt'+cls+'" data-act="revAns" data-k="'+k+'"'+(st.choix!==null?" disabled":"")+'><span class="l">'+"ABCDEF"[n]+'</span><span>'+esc(q.o[k])+'</span></button>';
      }).join("")+'</div>';
    if(st.choix!==null){
      const ok=st.choix===q.a;
      h+='<div class="qfb '+(ok?"ok":"ko")+'"><b>'+(ok?"Bonne réponse":"Raté. Bonne réponse : "+esc(q.o[q.a]))+'</b>'+(q.e?'<span>'+esc(q.e)+'</span>':"")+'</div>'+
        '<div><button class="btn gold" data-act="revNext">'+(st.pos+1<st.order.length?"Question suivante":"Voir mon score")+'</button></div>';
    }
  } else {
    const n=st.order.length, pct=n?Math.round(st.bons/n*100):0;
    h+='<div class="qbig">'+st.bons+'/'+n+'</div><p style="margin:0;font-weight:700">'+pct+' % de bonnes réponses'+(pct>=80?" : excellent !":pct>=50?" : continue comme ça.":" : refais tes erreurs pour progresser.")+'</p>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap">'+(st.rates.length?'<button class="btn gold" data-act="revRedo">Refaire mes erreurs ('+st.rates.length+')</button>':"")+'<button class="btn" data-act="revNew">Nouveau quiz</button></div>';
    if(st.rates.length){
      h+='<b>À revoir</b>'+st.rates.map(i=>{ const q=qs[i]; return '<div class="qmiss"><span class="n">'+esc((parts.find(p=>p.id===q.p)||{}).name||"")+'</span><span>'+esc(q.q)+'</span><span><b>'+esc(q.o[q.a])+'</b></span>'+(q.e?'<span class="qsrc">'+esc(q.e)+'</span>':"")+'</div>'; }).join("");
    }
  }
  return h+'</div>';
}
/* Fiches au format riche : HTML stocké dans Firestore, nettoyé ici par liste blanche
   (balises de mise en forme, classes f-*, quelques styles sans URL, aucun lien, aucun script). */
const NET_TAGS=new Set("b strong i em u s small sup sub br p span div section nav h1 h2 h3 h4 h5 h6 ul ol li mark blockquote table thead tbody tfoot tr th td caption button hr".split(" "));
const NET_STYLE=/^(--tc|width|background|color|font-size|margin-top)\s*:\s*[-a-z0-9#%.,() ]+$/i;
const netCache=new Map();
function nettoie(html){
  const src=new DOMParser().parseFromString("<body>"+html+"</body>","text/html").body;
  const out=document.implementation.createHTMLDocument("").body;
  const copie=(from,to)=>{
    for(const n of [...from.childNodes]){
      if(n.nodeType===3){ to.appendChild(out.ownerDocument.createTextNode(n.nodeValue)); continue; }
      if(n.nodeType!==1) continue;
      const tag=n.tagName.toLowerCase(); if(!NET_TAGS.has(tag)) continue;
      const el=out.ownerDocument.createElement(tag);
      const cls=(n.getAttribute("class")||"").split(/\s+/).filter(c=>/^f-[a-z0-9-]+$/.test(c));
      if(cls.length) el.setAttribute("class",cls.join(" "));
      const st=(n.getAttribute("style")||"").split(";").map(d=>d.trim()).filter(d=>d && NET_STYLE.test(d) && !/url|expression|\\/i.test(d));
      if(st.length) el.setAttribute("style",st.join(";"));
      const al=n.getAttribute("data-aller"); if(al && /^[a-z0-9-]+$/.test(al)) el.setAttribute("data-aller",al);
      if(tag==="button") el.setAttribute("type","button");
      to.appendChild(el); copie(n,el);
    }
  };
  copie(src,out);
  return out.innerHTML;
}
function ficheRiche(it){
  const key=it.id+"|"+(it.majLe||"")+"|"+(it.pages||[]).length;
  if(!netCache.has(key)){
    netCache.clear();
    netCache.set(key,(it.pages||[]).map(p=>{
      const c=String(p.c||"blue").split(/\s+/).filter(x=>/^[a-z]+$/.test(x)).map(x=>"f-"+x).join(" ");
      const a=/^[a-z0-9-]+$/.test(p.a||"")?p.a:"";
      return '<section class="f-sheet '+c+'" data-ancre="'+a+'">'+nettoie(p.h||"")+'</section>';
    }).join(""));
  }
  return netCache.get(key);
}
function renderFiche(it){
  if(it.format==="riche"){
    return '<div class="sechead"><h2>'+esc(it.titre)+'</h2><button class="btn ghost small" data-act="revBack">← Révisions</button></div>'+
      (it.source?'<p class="help">'+esc(it.source)+'</p>':"")+
      filigrane(true)+'<div class="fdoc">'+ficheRiche(it)+'</div>';
  }
  let h='<div class="sechead"><h2>'+esc(it.titre)+'</h2><button class="btn ghost small" data-act="revBack">← Révisions</button></div><div class="quiz fiche">'+filigrane();
  (it.sections||[]).forEach(s=>{
    h+='<section style="display:flex;flex-direction:column;gap:8px">'+(s.titre?'<h3 class="qq" style="font-size:20px">'+esc(s.titre)+'</h3>':"");
    (s.blocs||[]).forEach(b=>{
      if(b.t==="p") h+='<p style="margin:0">'+esc(b.v)+'</p>';
      else if(b.t==="liste") h+='<ul style="margin:0;padding-left:20px">'+(b.v||[]).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>';
      else if(b.t==="encadre") h+='<div class="qfb '+(b.style==="attention"?"ko":"ok")+'"><b>'+esc(b.titre||"")+'</b><span>'+esc(b.v)+'</span></div>';
      else if(b.t==="tableau") h+='<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:14px;min-width:100%">'+(b.v||[]).map((r,ri)=>'<tr>'+r.map(c=>(ri?'<td':'<th')+' style="border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top">'+esc(c)+(ri?'</td>':'</th>')).join("")+'</tr>').join("")+'</table></div>';
    });
    h+='</section>';
  });
  return h+'</div>';
}
function revAction(a,b){
  const it=S.rev&&S.revisions.find(r=>r.id===S.rev.id);
  if(a==="revOpen"){ const r=S.revisions.find(x=>x.id===b.dataset.id); if(!r) return true;
    S.rev={id:r.id,step:"setup",nb:"20",parts:new Set((r.parts||[]).map(p=>p.id).concat((r.parts||[]).length?[]:[undefined]))}; render(); window.scrollTo(0,0); return true; }
  if(a==="revBack"){ S.rev=null; render(); window.scrollTo(0,0); return true; }
  if(!it) return false;
  if(a==="revStart"){ startQuiz(it, quizPool(it)); render(); window.scrollTo(0,0); return true; }
  if(a==="revErr"){ const err=revErrors(it.id).filter(i=>i<(it.questions||[]).length); S.rev.nb="tout"; startQuiz(it, err); render(); window.scrollTo(0,0); return true; }
  if(a==="revAns"){ if(S.rev.choix!==null) return true; const k=+b.dataset.k, cur=S.rev.order[S.rev.pos], q=it.questions[cur.i];
    S.rev.choix=k; const errs=revErrors(it.id);
    if(k===q.a){ S.rev.bons++; setRevErrors(it.id, errs.filter(i=>i!==cur.i)); } else { S.rev.rates.push(cur.i); setRevErrors(it.id, errs.concat([cur.i])); }
    render(); return true; }
  if(a==="revNext"){ S.rev.pos++; S.rev.choix=null; if(S.rev.pos>=S.rev.order.length) S.rev.step="fin"; render(); window.scrollTo(0,0); return true; }
  if(a==="revRedo"){ S.rev.nb="tout"; startQuiz(it, S.rev.rates.slice()); render(); window.scrollTo(0,0); return true; }
  if(a==="revNew"){ S.rev.step="setup"; render(); window.scrollTo(0,0); return true; }
  return false;
}
document.addEventListener("change",e=>{
  const el=e.target;
  if(el.dataset && "revPart" in el.dataset && S.rev){ const id=el.dataset.revPart==="undefined"?undefined:el.dataset.revPart; if(el.checked) S.rev.parts.add(id); else S.rev.parts.delete(id); render(); }
  else if(el.name==="revnb" && S.rev){ S.rev.nb=el.value; render(); }
});

/* Protection du contenu : écran noir dès qu'on quitte l'appli, pas de copie, pas d'impression */
const protege = () => S.tab==="revisions" && !!S.db;
let voileTimer=null;
function voile(on, ms){
  const v=$("#voile"); if(!v) return;
  clearTimeout(voileTimer);
  if(on && protege()){ v.hidden=false; if(ms) voileTimer=setTimeout(()=>{ if(document.visibilityState==="visible"&&document.hasFocus()) v.hidden=true; },ms); }
  else if(!on) v.hidden=true;
}
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState!=="visible") voile(true); else setTimeout(()=>voile(false),150); });
window.addEventListener("blur",()=>voile(true));
window.addEventListener("pagehide",()=>voile(true));
window.addEventListener("focus",()=>setTimeout(()=>voile(false),150));
["contextmenu","copy","cut","dragstart","selectstart"].forEach(ev=>document.addEventListener(ev,e=>{ if(protege() && !e.target.closest("input,textarea")) e.preventDefault(); }));
document.addEventListener("keydown",e=>{
  if(!protege()) return;
  const k=(e.key||"").toLowerCase();
  if(k==="printscreen"||k==="meta"||k==="os"||(e.metaKey&&e.shiftKey)||((e.ctrlKey||e.metaKey)&&["p","s"].includes(k))){
    if(k==="p"||k==="s") e.preventDefault();
    voile(true,1500);
  }
});
document.addEventListener("keyup",e=>{
  if(protege() && (e.key||"").toLowerCase()==="printscreen"){ voile(true,1500); try{ navigator.clipboard.writeText("Contenu protégé : QG du Comptoir").catch(()=>{}); }catch(_){} }
});
window.addEventListener("beforeprint",()=>voile(true,3000));

/* ---------- Connexion (Firebase) ---------- */
let unsubs=[], dataTimer=null;
function stopData(){
  unsubs.forEach(u=>{ try{u();}catch(_){} }); unsubs=[]; clearTimeout(dataTimer);
  S.db=null; S.loaded={}; S.live=false; S.slow=false; COLLS.forEach(c=>S[c]=[]); S.acces=[]; S.revisions=[]; S.rev=null;
  S.me=null; S.email=null; S.myName=""; S.bureau=false; S.isAdmin=false; S.isOwner=false; S.canWrite=false; S.denied=false;
}
function startData(fs){
  const fresh={};
  dataTimer=setTimeout(()=>{ if(!S.live){ S.slow=true; render(); } },10000);
  if(!S.bureau) ["taches","preparations"].forEach(c=>{ S.loaded[c]=true; fresh[c]=true; });
  COLLS.filter(c=>S.bureau||PUBLIC_COLLS.includes(c)).concat(["revisions"],S.isAdmin?["acces"]:[]).forEach(name=>{
    unsubs.push(fs.collection(name).onSnapshot(snap=>{
      S[name]=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
      S.loaded[name]=true;
      if(!snap.metadata.fromCache) fresh[name]=true;
      if(COLLS.every(k=>fresh[k])){ S.live=true; S.slow=false; clearTimeout(dataTimer); }
      render();
    },err=>{
      S.loaded[name]=true; S.live=false;
      if(err&&err.code==="permission-denied" && name!=="acces"){ stopData(); S.denied=true; }
      render();
    }));
  });
}
async function enter(u){
  stopData();
  if(!u||!u.emailVerified){ render(); return; }
  const fs=firebase.firestore(), mail=(u.email||"").toLowerCase();
  try{
    await u.getIdToken(true);
    let acc=null;
    try{ const snap=await fs.collection("acces").doc(mail).get(); acc=snap.exists?snap.data():null; }
    catch(e){ if(e.code!=="permission-denied") throw e; }
    if(!acc && mail===OWNER){ acc={role:"bureau",membreId:"lucas",admin:true,ajouteLe:Date.now()}; await fs.collection("acces").doc(mail).set(acc); }
    if(S.authUser!==u) return;
    if(!acc){ S.denied=true; render(); return; }
    S.email=mail; S.bureau=roleOf(acc)==="bureau"||mail===OWNER;
    S.me=S.bureau?(acc.membreId||null):"e:"+mail; S.myName=S.bureau?"":(acc.nom||"");
    S.isAdmin=S.bureau&&(!!acc.admin||mail===OWNER); S.isOwner=S.isAdmin; S.canWrite=S.bureau; S.db=fs;
    render(); startData(fs); enableNotifs(false);
  }catch(e){
    S.authMsg={t:"Impossible de vérifier ton accès : vérifie ta connexion internet, puis reconnecte-toi."};
    try{ await S.auth.signOut(); }catch(_){}
    render();
  }
}
const AUTH_ERR={
  "auth/invalid-credential":"Adresse ou mot de passe incorrect.","auth/wrong-password":"Adresse ou mot de passe incorrect.",
  "auth/user-not-found":"Adresse ou mot de passe incorrect.","auth/invalid-login-credentials":"Adresse ou mot de passe incorrect.",
  "auth/invalid-email":"Adresse e-mail invalide.","auth/missing-password":"Indique ton mot de passe.",
  "auth/email-already-in-use":"Un accès existe déjà avec cette adresse : connecte-toi, ou utilise « Mot de passe oublié ».",
  "auth/weak-password":"Mot de passe trop court : 8 caractères minimum.",
  "auth/too-many-requests":"Trop d'essais d'affilée. Attends quelques minutes avant de réessayer.",
  "auth/network-request-failed":"Pas de connexion internet. Vérifie ton réseau et réessaie.",
  "auth/user-disabled":"Ce compte a été désactivé. Contacte Lucas."
};
const authErr = e => ({t:AUTH_ERR[e&&e.code]||"La connexion a échoué. Réessaie dans un instant."});
const backUrl = () => ({url:location.origin+location.pathname});
async function authSubmit(form){
  const btn=form.querySelector("button[type=submit]"), q=s=>form.querySelector(s);
  const mail=(q("input[type=email]").value||"").trim(), pwEl=q("input[type=password],input[data-pw]"), pw=pwEl?pwEl.value:"";
  S.authEmail=mail;
  if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)){ S.authMsg={t:"Indique une adresse e-mail valide."}; render(); return; }
  if(form.id!=="resetForm" && pw.length<8){ S.authMsg={t:form.id==="signupForm"?"Choisis un mot de passe d'au moins 8 caractères.":"Indique ton mot de passe."}; render(); return; }
  btn.disabled=true; const label=btn.textContent; btn.textContent="Un instant…";
  try{
    await S.persist;
    if(form.id==="loginForm"){ await S.auth.signInWithEmailAndPassword(mail,pw); S.authMsg=null; }
    else if(form.id==="signupForm"){ const cr=await S.auth.createUserWithEmailAndPassword(mail,pw); S.authMsg=null; await cr.user.sendEmailVerification(backUrl()); }
    else { await S.auth.sendPasswordResetEmail(mail,backUrl()); S.authView="login"; S.authMsg={ok:true,t:"Si cette adresse a un accès, un lien pour changer le mot de passe vient d'y être envoyé."}; render(); }
  }catch(e){ S.authMsg=authErr(e); render(); }
  finally{ if(document.body.contains(btn)){ btn.disabled=false; btn.textContent=label; } }
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-auth]"); if(!b) return;
  const a=b.dataset.auth;
  if(a==="view"){ const m=$("#view input[type=email]"); if(m) S.authEmail=m.value.trim(); S.authView=b.dataset.v; S.authMsg=null; render(); return; }
  if(a==="showpw"){ const i=document.getElementById(b.dataset.for); if(!i) return; const show=i.type==="password"; i.type=show?"text":"password"; i.toggleAttribute("data-pw",show); b.textContent=show?"Masquer":"Afficher"; return; }
  if(a==="logout"){ S.authView="login"; S.authMsg=null; try{ await S.auth.signOut(); }catch(_){} return; }
  if(a==="install"&&S.installEvt){ const ev=S.installEvt; S.installEvt=null; try{ await ev.prompt(); }catch(_){} render(); return; }
  if(!S.authUser) return;
  if(a==="notifOn"){ b.disabled=true; await enableNotifs(true); return; }
  if(a==="notifHide"){ lsSet(b.dataset.k,"1"); renderNotifBar(); return; }
  if(a==="resend"){ b.disabled=true;
    try{ await S.authUser.sendEmailVerification(backUrl()); S.authMsg={ok:true,t:"Lien renvoyé à "+S.authUser.email+"."}; }catch(err){ S.authMsg=authErr(err); }
    render(); return; }
  if(a==="verified"){ b.disabled=true;
    try{ await S.authUser.reload(); }catch(_){}
    const u=S.auth.currentUser; S.authUser=u;
    if(u&&u.emailVerified){ S.authMsg=null; S.lastGate=""; await enter(u); }
    else { S.authMsg={t:"Ton adresse n'est pas encore confirmée. Ouvre le lien reçu par e-mail, puis réessaie."}; render(); }
    return; }
});
$("#logoutBtn").addEventListener("click",async()=>{ S.authView="login"; S.authMsg=null; try{ await S.auth.signOut(); }catch(_){} });
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); S.installEvt=e; S.lastGate=""; render(); });

/* ---------- Notifications (annonces, rendez-vous, rappels) ---------- */
const NOTIF={supported:false,checked:false};
const lsGet = k => { try{ return localStorage.getItem(k); }catch(_){ return null; } };
const lsSet = (k,v) => { try{ localStorage.setItem(k,v); }catch(_){} };
async function notifSupport(){
  try{ return "serviceWorker" in navigator && "Notification" in window && !!(window.firebase&&firebase.messaging) && await firebase.messaging.isSupported(); }
  catch(_){ return false; }
}
function renderNotifBar(){
  const el=$("#notifBar"); if(!el) return;
  let h="";
  if(S.db && NOTIF.checked){
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent), standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
    if(!NOTIF.supported){
      if(ios && !standalone && !lsGet("qg-notif-ios")) h='<span><b>Notifications :</b> sur iPhone, installe d\'abord l\'appli (Partager, puis « Sur l\'écran d\'accueil ») et ouvre-la depuis son icône.</span><button class="linkbtn" data-auth="notifHide" data-k="qg-notif-ios">Plus tard</button>';
    } else if(Notification.permission==="default" && !lsGet("qg-notif-plustard")){
      h='<span><b>Notifications</b> : nouvelles annonces, rendez-vous ajoutés ou modifiés, et un rappel 2 h avant chaque rendez-vous.</span><span class="nb-acts"><button class="btn small gold" data-auth="notifOn">Activer</button><button class="linkbtn" data-auth="notifHide" data-k="qg-notif-plustard">Plus tard</button></span>';
    }
  }
  el.innerHTML=h; $("#notifWrap").hidden=!h;
}
function waitActive(reg){
  if(reg.active) return Promise.resolve(reg);
  const sw=reg.installing||reg.waiting;
  return new Promise(res=>{ if(!sw) return res(reg); sw.addEventListener("statechange",()=>{ if(sw.state==="activated") res(reg); }); });
}
async function enableNotifs(ask){
  if(!NOTIF.checked){ NOTIF.supported=await notifSupport(); NOTIF.checked=true; }
  if(!NOTIF.supported||!S.db||!S.email){ renderNotifBar(); return; }
  try{
    if(ask){
      const p=await Notification.requestPermission();
      if(p!=="granted"){ toast(p==="denied"?"Notifications refusées : tu peux les autoriser dans les réglages du navigateur.":"Notifications pas activées."); renderNotifBar(); return; }
    }
    if(Notification.permission!=="granted"){ renderNotifBar(); return; }
    const reg=await waitActive(await navigator.serviceWorker.register("assets/qg/sw.js",{scope:"assets/qg/"}));
    const tok=await firebase.messaging().getToken({vapidKey:window.QG_FIREBASE.vapidKey,serviceWorkerRegistration:reg});
    if(tok){
      const ua=navigator.userAgent, app=/iphone|ipad|ipod/i.test(ua)?"iPhone":/android/i.test(ua)?"Android":"Ordinateur";
      await S.db.collection("jetons").doc(tok).set({mail:S.email,appareil:app,majLe:Date.now()});
      if(ask) toast("Notifications activées sur cet appareil");
    }
  }catch(e){ if(ask) toast("Impossible d'activer les notifications sur cet appareil. Réessaie depuis l'appli installée."); }
  renderNotifBar();
}

(function init(){
  const cfg=window.QG_FIREBASE;
  if(!window.firebase||!cfg||!cfg.apiKey){ S.noConfig=true; S.ready=true; render(); return; }
  firebase.initializeApp(cfg);
  S.auth=firebase.auth(); S.auth.languageCode="fr";
  S.persist=S.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(()=>{});
  S.auth.onAuthStateChanged(u=>{ S.authUser=u; S.ready=true; S.lastGate=""; enter(u); });
})();
})();
