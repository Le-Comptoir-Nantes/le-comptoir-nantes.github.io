
(function(){
"use strict";
/* ---------- Langue : français ou anglais (étudiants internationaux) ----------
   Même réglage que le reste du site (lc_lang). Sans réglage : la langue du navigateur.
   tr("texte français","English text") choisit selon la langue ; pl() accorde au pluriel. */
let LANG=(()=>{
  try{ const v=localStorage.getItem("lc_lang"); if(v==="en"||v==="fr") return v; }catch(_){}
  const l=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||"fr"];
  return l.some(x=>/^fr/i.test(x||""))?"fr":"en";
})();
const tr = (fr,en) => LANG==="en"?en:fr;
const pl = (n,fr,frs,en,ens) => LANG==="en"?(n===1?en:ens):(n>1?frs:fr);
const lbl2 = (fr,en,c) => ({fr,en,c,get lbl(){ return tr(this.fr,this.en); }});
const LOADING=()=>tr("Chargement…","Loading…"), EDIT=()=>tr("Modifier","Edit"), CLOSE=()=>tr("Fermer","Close"),
  SAVE=()=>tr("Enregistrer","Save"), DEL=()=>tr("Supprimer","Delete"), NOTHING=()=>tr("Rien ici","Nothing here"),
  START=()=>tr("Début","Start"), END=()=>tr("Fin","End"), REV=()=>tr("Révisions","Revision"),
  REDO=()=>tr("Refaire mes erreurs","Redo my mistakes"), LATER=()=>tr("Plus tard","Later");
const TYPES = {
  comptoir:lbl2("Comptoir","Comptoir","--t-comptoir"),
  reunion:lbl2("Réunion","Meeting","--t-reunion"),
  soutien:lbl2("Cours de soutien","Tutoring session","--t-soutien"),
  meet:lbl2("Meet and Talk","Meet and Talk","--t-meet"),
  sortie:lbl2("Sortie","Outing","--t-sortie"),
  autre:lbl2("Autre","Other","--t-autre")
};
const STATUTS = {}, ETATS = {}, SUGG = {};
let fDay, fShort, fDM;
/* Textes et formats qui dépendent de la langue : recalculés à chaque changement */
function fillLang(){
  const loc=tr("fr-FR","en-GB");
  fDay=new Intl.DateTimeFormat(loc,{weekday:"long",day:"numeric",month:"long"});
  fShort=new Intl.DateTimeFormat(loc,{weekday:"short",day:"numeric",month:"short"});
  fDM=new Intl.DateTimeFormat(loc,{day:"numeric",month:"long"});
  Object.assign(STATUTS, tr({a_faire:"À faire", en_cours:"En cours", fait:"Fait"},{a_faire:"To do", en_cours:"In progress", fait:"Done"}));
  Object.assign(ETATS, tr({nouvelle:"Nouvelle", etude:"À l'étude", retenue:"Retenue", programmee:"Programmée", ecartee:"Écartée"},
    {nouvelle:"New", etude:"Under review", retenue:"Accepted", programmee:"Scheduled", ecartee:"Set aside"}));
  Object.assign(SUGG, tr({
    comptoir:["Réserver le bar","Annoncer le lieu sur Instagram","Choisir le thème de révision"],
    reunion:["Envoyer l'ordre du jour","Réserver la salle","Rédiger le compte rendu"],
    soutien:["Confirmer le ou la prof","Récupérer les questions des groupes","Préparer les exercices"],
    meet:["Confirmer l'intervenant","Réserver la salle ou l'amphi","Communiquer l'événement","Préparer le mot d'accueil"],
    sortie:["Réserver le transport","Liste des participants","Budget validé par la trésorerie"],
    autre:["Réserver le lieu","Communiquer l'événement"]
  },{
    comptoir:["Book the bar","Post the venue on Instagram","Choose the revision topic"],
    reunion:["Send the agenda","Book the room","Write the minutes"],
    soutien:["Confirm the teacher","Collect the groups' questions","Prepare the exercises"],
    meet:["Confirm the speaker","Book the room or lecture hall","Promote the event","Prepare the welcome speech"],
    sortie:["Book transport","List of participants","Budget approved by the treasurer"],
    autre:["Book the venue","Promote the event"]
  }));
}
fillLang();
/* Textes fixes de qg.html : la traduction anglaise est dans l'attribut data-en, le français est gardé dans data-fr */
function applyStatic(){
  document.documentElement.lang=LANG;
  document.title=tr("QG du Comptoir","Le Comptoir HQ");
  document.querySelectorAll("[data-en]").forEach(el=>{
    if(!el.hasAttribute("data-fr")) el.setAttribute("data-fr",el.textContent);
    el.textContent=el.getAttribute(LANG==="en"?"data-en":"data-fr");
  });
  const b=document.getElementById("langBtn");
  if(b){ b.textContent=tr("EN","FR"); b.lang=tr("en","fr"); b.setAttribute("aria-label",tr("EN, switch to English","FR, passer en français")); }
  const nav=document.querySelector("nav.tabs"); if(nav) nav.setAttribute("aria-label",tr("Rubriques","Sections"));
}
applyStatic();
function setLang(l){
  const m=document.querySelector("#view input[type=email]"); if(m&&m.value) S.authEmail=m.value.trim();
  LANG=l; try{ localStorage.setItem("lc_lang",l); }catch(_){}
  fillLang(); applyStatic();
  if(S.auth) S.auth.languageCode=l;
  S.lastGate=""; S.lastView=null; S.authMsg=null;
  render();
  /* Les notifications de cet appareil passent dans la nouvelle langue */
  if(S.db && NOTIF.supported && "Notification" in window && Notification.permission==="granted") enableNotifs(false);
}
/* Données du club : une collection Firestore par rubrique. Les règles d'accès sont dans outils/qg/firestore.rules. */
const COLLS=["membres","evenements","taches","annonces","presences","preparations","idees"];
const PUBLIC_COLLS=["membres","evenements","annonces","presences","revisions","idees"];   /* visibles par les membres du club */
/* Boîte à idées : catégories (couleur du post-it) et étapes de traitement par le bureau */
const CATS = {
  evenement:lbl2("Événement","Event","--pi-jaune"),
  meet:lbl2("Meet and Talk","Meet and Talk","--pi-rose"),
  sortie:lbl2("Sortie","Outing","--pi-bleu"),
  revision:lbl2("Cours et révisions","Classes and revision","--pi-vert"),
  club:lbl2("Vie du club","Club life","--pi-orange"),
  autre:lbl2("Autre","Other","--pi-gris")
};
const roleOf = a => (a&&a.role) || (a&&a.membreId ? "bureau" : "membre");
const OWNER=((window.QG_FIREBASE||{}).proprietaire||"jblucas.denis@audencia.com").toLowerCase();
const S = {
  membres:[], evenements:[], taches:[], annonces:[], presences:[], preparations:[], idees:[], ideesKo:false, ifiltre:"ouvertes", acces:[], revisions:[], rev:null, uid:null,
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
const hm = s => LANG==="en" ? (s||"") : (s||"").replace(":", "h");
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
  if(o.start<=now && now<o.end) return tr("En cours · fin à ","Happening now · ends at ")+hm(o.fin|| pad(o.end.getHours())+":"+pad(o.end.getMinutes()));
  let ms=o.start-now; if(ms<0) return tr("Terminé","Over");
  const min=Math.round(ms/6e4);
  if(min<60) return tr("Dans ","In ")+min+" min";
  const h=Math.floor(min/60), mm=min%60;
  if(h<24) return tr("Dans "+h+" h"+(mm?" "+pad(mm):""), "In "+h+" h"+(mm?" "+pad(mm)+" min":""));
  const days=Math.round((sod(o.start)-sod(now))/864e5);
  if(days===1) return tr("Demain à ","Tomorrow at ")+hm(o.debut);
  return tr("Dans "+days+" jours","In "+days+" days");
}
function dueInfo(tk){
  const d=parseDate(tk.echeance); if(!d) return null;
  const days=Math.round((d-sod(S.now))/864e5);
  if(tk.statut==="fait") return {txt:fDM.format(d),cls:""};
  if(days<0) return {txt:tr("En retard · ","Overdue · ")+fDM.format(d),cls:"warn",late:true};
  if(days===0) return {txt:tr("Aujourd'hui","Today"),cls:"gold"};
  if(days===1) return {txt:tr("Demain","Tomorrow"),cls:"gold"};
  if(days<=7) return {txt:tr("Dans "+days+" j · ","In "+days+" days · ")+fDM.format(d),cls:"info"};
  return {txt:fDM.format(d),cls:""};
}
const lateTasks = () => S.taches.filter(t=>t.statut!=="fait" && (dueInfo(t)||{}).late);

/* ---------- Personnes : chaque compte est relié à une fiche du bureau ---------- */
function wantProfiles(){}
const personName = id => { const p=S.presences.find(x=>x.uid===id&&x.nom); return p? p.nom : (id===S.me? S.myName : ""); };
const pname = id => { const m=membre(id); return m? m.nom : (personName(id) || (id===S.me?tr("Toi","You"):tr("Un membre","A member"))); };
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
  const nextLbl=tr("Prochain rendez-vous","Next event");
  if(!loadedAll()){
    box.innerHTML='<div class="eyebrow">'+nextLbl+'</div><h1>'+tr("Chargement de l'agenda…","Loading the calendar…")+'</h1>';
  } else if(!o){
    box.innerHTML='<div class="eyebrow">'+nextLbl+'</div><h1>'+tr("Rien de prévu pour l'instant","Nothing planned yet")+'</h1>'+
      (S.canWrite?'<div class="row"><button class="btn gold" data-act="newEvent">'+tr("Ajouter un rendez-vous","Add an event")+'</button></div>':"");
  } else {
    const t=TYPES[o.ev.type]||TYPES.autre, pres=presentsFor(o.occ), resp=membre(o.ev.responsable);
    box.innerHTML='<div class="eyebrow">'+(cur?tr("En ce moment","Happening now"):nextLbl)+' · '+esc(t.lbl)+'</div>'+
      '<h1>'+esc(o.ev.titre)+'</h1>'+
      '<div class="count">'+esc(countdown(o))+'</div>'+
      '<div class="meta"><span>'+ICON.clock+'<span style="text-transform:capitalize">'+esc(fDay.format(o.date))+'</span>&nbsp;·&nbsp;<span class="mono">'+esc(hm(o.debut))+(o.fin?"–"+esc(hm(o.fin)):"")+'</span></span>'+
      '<span>'+ICON.pin+esc(o.lieu||tr("Lieu à annoncer","Venue to be announced"))+'</span>'+
      (resp?'<span>'+ICON.user+esc(resp.nom)+'</span>':"")+'</div>'+
      '<div class="row">'+presBtn(o)+(pres.length?'<span class="who" style="color:var(--band-muted)">'+avatars(pres)+presentTxt(pres.length)+'</span>':"")+'</div>';
  }
  const today=occurrences(sod(S.now),sod(S.now)).filter(o=>!o.annule);
  const late=lateTasks().length;
  const enCours=S.taches.filter(t=>t.statut==="en_cours").length;
  const pinned=S.annonces.filter(a=>a.epingle).length;
  $("#strip").innerHTML='<span>'+tr("Aujourd'hui : <b>"+(today.length||"aucun")+"</b> rendez-vous","Today: <b>"+(today.length||"no")+"</b> "+(today.length===1?"event":"events"))+'</span>'+
    (S.bureau?'<span class="sep">·</span><span><b>'+enCours+'</b> '+pl(enCours,"tâche en cours","tâches en cours","task in progress","tasks in progress")+'</span><span class="sep">·</span>'+
    '<span><b'+(late?' style="color:#FFB08A"':"")+'>'+late+'</b> '+tr("en retard","overdue")+'</span>':"")+
    (pinned?'<span class="sep">·</span><span><b>'+pinned+'</b> '+pl(pinned,"annonce épinglée","annonces épinglées","pinned announcement","pinned announcements")+'</span>':"");
  const b=$("#lateBadge"); b.hidden=!late||!S.bureau; b.textContent=late;
}
function presBtn(o){
  if(!S.me || !S.db || o.annule || o.end<S.now) return "";
  const on=amPresent(o.occ);
  return '<button class="btn small'+(on?" on":"")+'" data-act="pres" data-occ="'+esc(o.occ)+'">'+(on?tr("✓ J'y serai","✓ I'll be there"):tr("Je viens","I'm coming"))+'</button>';
}
const presentTxt = n => n+" "+pl(n,"présent","présents","attending","attending");

/* ---------- Agenda ---------- */
function renderAgenda(){
  const ws=addDays(weekStart(S.now),S.weekOffset*7), we=addDays(ws,6);
  const occs=occurrences(ws,we);
  const lbl = S.weekOffset===0?tr("Cette semaine","This week"):S.weekOffset===1?tr("Semaine prochaine","Next week"):tr("Du "+fDM.format(ws)+" au "+fDM.format(we),fDM.format(ws)+" to "+fDM.format(we));
  let h='<div class="sechead"><h2>'+tr("Agenda","Calendar")+'</h2>'+(S.canWrite?'<button class="btn gold small" data-act="newEvent">'+tr("+ Rendez-vous","+ Event")+'</button>':"")+'</div>'+
    '<div class="weeknav"><button class="iconbtn" data-act="week" data-d="-1" aria-label="'+tr("Semaine précédente","Previous week")+'">'+ICON.left+'</button>'+
    '<div class="lbl">'+esc(lbl)+(S.weekOffset!==0?' <button class="btn ghost small" data-act="week" data-d="0">'+tr("Revenir à aujourd'hui","Back to today")+'</button>':"")+'</div>'+
    '<button class="iconbtn" data-act="week" data-d="1" aria-label="'+tr("Semaine suivante","Next week")+'">'+ICON.right+'</button></div>';
  if(!loadedAll()){ h+='<div class="empty"><b>'+LOADING()+'</b>'+tr("Les rendez-vous du club arrivent.","The club's events are on their way.")+'</div>'; return h; }
  if(!occs.length){
    h+='<div class="empty"><b>'+tr("Semaine libre","Free week")+'</b><span>'+esc(tr("Aucun rendez-vous entre le "+fDM.format(ws)+" et le "+fDM.format(we)+".","No events between "+fDM.format(ws)+" and "+fDM.format(we)+"."))+'</span>'+
      (S.canWrite?'<button class="btn" data-act="newEvent">'+tr("Ajouter un rendez-vous","Add an event")+'</button>':"")+'</div>';
    return h;
  }
  const byDay={};
  occs.forEach(o=>{ (byDay[o.key]=byDay[o.key]||[]).push(o); });
  const todayKey=ymd(S.now);
  for(const key of Object.keys(byDay).sort()){
    const d=parseDate(key);
    h+='<section class="day"><div class="dayhead"><b>'+esc(fDay.format(d))+'</b>'+(key===todayKey?'<span class="today">'+tr("Aujourd'hui","Today")+'</span>':"")+'</div>';
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
    (o.annule?'<span class="chip warn">'+tr("Annulé","Cancelled")+'</span>':"")+(cur?'<span class="chip gold">'+tr("En cours","Now")+'</span>':"")+
    (o.modifie&&!o.annule?'<span class="chip info">'+tr("Modifié","Changed")+'</span>':"")+'</div>'+
    '<div class="title">'+esc(o.ev.titre)+'</div>'+
    '<div class="info"><span>'+ICON.pin+esc(o.lieu||tr("Lieu à annoncer","Venue to be announced"))+'</span>'+
    (resp?'<span>'+ICON.user+esc(resp.nom)+'</span>':"")+
    (o.ev.repetition==="hebdo"?'<span>'+ICON.repeat+tr("Chaque semaine","Every week")+'</span>':"")+'</div>'+
    (o.note?'<div class="note">'+esc(o.note)+'</div>':"")+
    '<div class="actions">'+presBtn(o)+
    (pres.length?'<span class="who">'+avatars(pres)+presentTxt(pres.length)+'</span>':"")+
    (S.canWrite?'<button class="btn ghost small" style="margin-left:auto" data-act="editOcc" data-ev="'+esc(o.ev.id)+'" data-key="'+o.key+'">'+EDIT()+'</button>':"")+
    '</div></div></article>';
}

/* ---------- Tâches ---------- */
function renderTaches(){
  const mine=myMember();
  const counts={actives:0,a_faire:0,en_cours:0,fait:0,miennes:0,retard:0};
  S.taches.forEach(t=>{ counts[t.statut]=(counts[t.statut]||0)+1; if(t.statut!=="fait") counts.actives++;
    if(mine&&t.responsable===mine.id&&t.statut!=="fait") counts.miennes++; if((dueInfo(t)||{}).late&&t.statut!=="fait") counts.retard++;
    if(mine&&t.confiePar===mine.id&&t.responsable!==mine.id&&t.statut!=="fait") counts.confiees=(counts.confiees||0)+1; });
  const F=[["actives",tr("À traiter","Open")],["retard",tr("En retard","Overdue")],["en_cours",tr("En cours","In progress")],["a_faire",tr("À faire","To do")],["fait",tr("Faites","Done")]];
  if(mine) F.splice(1,0,["miennes",tr("Les miennes","Mine")],["confiees",tr("Que j'ai confiées","Delegated by me")]);
  let h='<div class="sechead"><h2>'+tr("Tâches","Tasks")+'</h2>'+(S.canWrite?'<button class="btn gold small" data-act="newTask">'+tr("+ Tâche","+ Task")+'</button>':"")+'</div>'+
    '<div class="filters" role="group" aria-label="'+tr("Filtrer les tâches","Filter tasks")+'">'+F.map(([k,l])=>'<button class="fchip" data-act="filtre" data-f="'+k+'" aria-pressed="'+(S.filtre===k)+'">'+l+'<span class="n">'+(counts[k]||0)+'</span></button>').join("")+'</div>';
  if(!loadedAll()) return h+'<div class="empty"><b>'+LOADING()+'</b></div>';
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
    const msg=tr({actives:"Tout est fait. Ajoute la prochaine mission du club.",miennes:"Aucune tâche ne t'est attribuée.",confiees:"Tu n'as confié aucune tâche en cours.",retard:"Rien en retard.",a_faire:"Aucune tâche à faire.",en_cours:"Aucune tâche en cours.",fait:"Aucune tâche terminée pour l'instant."},
      {actives:"All done. Add the club's next mission.",miennes:"No task is assigned to you.",confiees:"You haven't delegated any open task.",retard:"Nothing overdue.",a_faire:"No task to do.",en_cours:"No task in progress.",fait:"No completed task yet."})[S.filtre];
    return h+'<div class="empty"><b>'+NOTHING()+'</b><span>'+esc(msg)+'</span></div>';
  }
  h+='<div class="tasks">';
  for(const t of list){
    const d=dueInfo(t), resp=membre(t.responsable);
    const tickCls=t.statut==="fait"?"ok":t.statut==="en_cours"?"prog":"";
    h+='<div class="task'+(t.statut==="fait"?" done":"")+(d&&d.late?" late":"")+'">'+
      '<button class="tick '+tickCls+'" data-act="cycle" data-id="'+esc(t.id)+'" aria-label="'+tr("Statut : "+STATUTS[t.statut]+". Passer au suivant","Status: "+STATUTS[t.statut]+". Move to next")+'"'+(S.canWrite?"":" disabled")+'>'+ICON.check+'</button>'+
      '<div><div class="ttl">'+esc(t.titre)+'</div><div class="info"><span class="chip">'+STATUTS[t.statut]+'</span>'+
      (d?'<span class="chip '+d.cls+'">'+esc(d.txt)+'</span>':"")+
      (resp?'<span>'+ICON.user+' '+esc(resp.nom)+'</span>':'<span>'+tr("Sans responsable","Unassigned")+'</span>')+'</div>'+
      (t.note?'<div class="tnote">'+esc(t.note)+'</div>':"")+taskActs(t)+'</div>'+
      (S.canWrite?'<button class="btn ghost small" data-act="editTask" data-id="'+esc(t.id)+'">'+EDIT()+'</button>':"<span></span>")+'</div>';
  }
  return h+'</div><p class="help">'+tr("Touche le rond pour passer une tâche de « À faire » à « En cours » puis « Fait ». Pas le temps ? Confie la tâche à un autre membre. Un membre est débordé ? Prends sa tâche avec « Je m'en charge ».",
    "Tap the circle to move a task from “To do” to “In progress”, then “Done”. No time? Hand the task to another member. Someone is swamped? Take their task with “I'll take it”.")+'</p>';
}
function taskActs(t){
  const me=myMember(), cp=membre(t.confiePar);
  let out = (cp && t.confiePar!==t.responsable) ? '<div class="tby">'+tr("Confiée par ","Delegated by ")+esc(cp.nom.split(" ")[0])+(t.confieLe?' · '+esc(ago(t.confieLe)):"")+'</div>' : "";
  if(!S.canWrite || t.statut==="fait") return out;
  const opts='<option value="">'+tr("Confier à…","Hand over to…")+'</option>'+[...S.membres].filter(m=>m.id!==t.responsable).sort((a,b)=>(a.ordre??99)-(b.ordre??99))
    .map(m=>'<option value="'+esc(m.id)+'">'+esc(m.nom)+(me&&m.id===me.id?tr(" (moi)"," (me)"):"")+'</option>').join("");
  out+='<div class="tacts">'+(me && t.responsable!==me.id?'<button class="btn small" data-act="takeTask" data-id="'+esc(t.id)+'">'+tr("Je m'en charge","I'll take it")+'</button>':"")+
    '<select id="assign-'+esc(t.id)+'" aria-label="'+esc(tr("Confier « "+t.titre+" » à un membre","Hand “"+t.titre+"” to a member"))+'" data-assign-task="'+esc(t.id)+'">'+opts+'</select></div>';
  return out;
}

/* ---------- Annonces ---------- */
function renderAnnonces(){
  let h='<div class="sechead"><h2>'+tr("Annonces","Announcements")+'</h2></div>';
  if(S.canWrite) h+='<form class="compose" id="composeForm"><textarea id="annTxt" placeholder="'+tr("Une info pour tout le club : lieu du Comptoir, changement d'horaire, rappel…","News for the whole club: Comptoir venue, time change, reminder…")+'" maxlength="1200"></textarea>'+
    '<div class="row"><label class="check"><input type="checkbox" id="annPin"> '+tr("Épingler en haut","Pin to the top")+'</label><button class="btn gold small" type="submit">'+tr("Publier","Post")+'</button></div></form>';
  if(!loadedAll()) return h+'<div class="empty"><b>'+LOADING()+'</b></div>';
  const list=[...S.annonces].sort((a,b)=>(b.epingle?1:0)-(a.epingle?1:0)||(b.creeLe||0)-(a.creeLe||0)).slice(0,60);
  if(!list.length) return h+'<div class="empty"><b>'+tr("Aucune annonce","No announcements")+'</b><span>'+tr("Les messages publiés ici sont visibles par tout le club.","Messages posted here are seen by the whole club.")+'</span></div>';
  for(const a of list){
    const mine=a.auteur&&a.auteur===S.me;
    h+='<article class="ann'+(a.epingle?" pin":"")+'"><div class="txt">'+esc(a.texte)+'</div><div class="foot">'+
      (a.epingle?'<span class="chip gold">'+tr("Épinglée","Pinned")+'</span>':"")+
      (a.auteur&&membre(a.auteur)?'<span class="avs">'+initials(a.auteur)+'</span>':"")+'<span>'+esc(a.auteur?pname(a.auteur):tr("Le bureau","The board"))+'</span><span>·</span><span>'+esc(ago(a.creeLe))+'</span>'+
      (S.canWrite?'<span class="acts"><button class="btn ghost small" data-act="pinAnn" data-id="'+esc(a.id)+'">'+(a.epingle?tr("Désépingler","Unpin"):tr("Épingler","Pin"))+'</button>'+
        ((mine||!a.auteur||S.isOwner)?'<button class="btn ghost small" data-act="delAnn" data-id="'+esc(a.id)+'">'+DEL()+'</button>':"")+'</span>':"")+
      '</div></article>';
  }
  return h;
}
function ago(ms){
  if(!ms) return "";
  const m=Math.round((S.now-ms)/6e4);
  if(m<1) return tr("à l'instant","just now"); if(m<60) return tr("il y a "+m+" min",m+" min ago");
  const h=Math.round(m/60); if(h<24) return tr("il y a "+h+" h",h+" h ago");
  return tr("le ","on ")+fDM.format(new Date(ms));
}

/* ---------- Bureau ---------- */
function renderBureau(){
  const mine=myMember();
  let h='<div class="sechead"><h2>'+tr("Bureau","Board")+'</h2>'+(S.canWrite?'<button class="btn gold small" data-act="newMember">'+tr("+ Membre","+ Member")+'</button>':"")+'</div>';
  if(!loadedAll()) return h+'<div class="empty"><b>'+LOADING()+'</b></div>';
  if(!mine && S.bureau) h+='<div class="notice">'+tr("Ton adresse n'est reliée à aucune fiche du bureau : demande à Lucas de la relier dans « Accès au QG ».","Your address isn't linked to a board profile yet: ask Lucas to link it in “HQ access”.")+'</div>';
  const list=[...S.membres].sort((a,b)=>(a.ordre??99)-(b.ordre??99)||a.nom.localeCompare(b.nom));
  if(!list.length) return h+'<div class="empty"><b>'+tr("Aucun membre","No members")+'</b><span>'+tr("Ajoute les membres du bureau pour pouvoir leur confier des tâches.","Add the board members so you can assign them tasks.")+'</span></div>';
  h+='<div class="members">';
  for(const m of list){
    const nb=S.taches.filter(t=>t.responsable===m.id&&t.statut!=="fait").length;
    const isMe=S.me&&m.id===S.me;
    const nAcc=S.acces.filter(x=>x.membreId===m.id).length;
    h+='<div class="mem'+(isMe?" me":"")+'"><div class="rl">'+esc(m.role||tr("Membre","Member"))+'</div><div class="nm">'+esc(m.nom)+(isMe?tr(" · toi"," · you"):"")+'</div>'+
      (m.surnom?'<div class="sn">'+tr("« ","“")+esc(m.surnom)+tr(" »","”")+'</div>':"")+
      (S.bureau?'<div class="stats">'+nb+' '+pl(nb,"tâche en cours","tâches en cours","task in progress","tasks in progress")+(S.isAdmin?(nAcc?tr(" · accès ouvert"," · has access"):tr(" · pas encore d'accès"," · no access yet")):"")+'</div>':"")+
      (S.canWrite?'<div class="acts"><button class="btn ghost small" data-act="editMember" data-id="'+esc(m.id)+'">'+EDIT()+'</button></div>':"")+
      '</div>';
  }
  h+='</div>';
  if(S.isAdmin) h+=renderAcces();
  return h;
}

/* ---------- Accès au QG (administrateurs) ---------- */
function renderAcces(){
  const list=[...S.acces].sort((a,b)=>(roleOf(a)===roleOf(b)?0:roleOf(a)==="bureau"?-1:1)||((membre(a.membreId)||{}).ordre??99)-((membre(b.membreId)||{}).ordre??99)||(a.nom||a.id).localeCompare(b.nom||b.id));
  let h='<div class="sechead" style="margin-top:8px"><h2>'+tr("Accès au QG","HQ access")+'</h2></div>'+
    '<p class="help">'+tr("Seules les adresses e-mail de cette liste peuvent entrer, après avoir vérifié leur adresse. Le bureau voit tout le QG ; les membres du club voient l'agenda, les annonces, les révisions et la liste du bureau, disent « Je viens » et proposent des idées. Les administrateurs gèrent cette liste.",
      "Only the e-mail addresses on this list can get in, once they have verified them. The board sees the whole HQ; club members see the calendar, announcements, revision and the board list, can say “I'm coming” and suggest ideas. Admins manage this list.")+'</p>'+
    '<form class="addacc" id="accForm"><div class="grid2"><div class="field"><label for="acc-mail">'+MAIL()+'</label><input id="acc-mail" type="email" required autocomplete="off" placeholder="'+tr("prenom.nom@audencia.com","firstname.lastname@audencia.com")+'"></div>'+
    '<div class="field"><label for="acc-role">'+tr("Type d'accès","Access type")+'</label><select id="acc-role"><option value="membre">'+tr("Membre du club : agenda, annonces, idées","Club member: calendar, announcements, ideas")+'</option><option value="bureau">'+tr("Bureau : tout le QG","Board: the whole HQ")+'</option></select></div></div>'+
    '<div class="field" id="acc-nom-w"><label for="acc-nom">'+tr("Prénom et nom","First and last name")+'</label><input id="acc-nom" maxlength="80" autocomplete="off"></div>'+
    '<div class="field" id="acc-mem-w" hidden><label for="acc-mem">'+tr("Fiche du bureau","Board profile")+'</label><select id="acc-mem">'+memberOptions(null,tr("Choisir…","Choose…"))+'</select></div>'+
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="check" id="acc-admin-w" hidden><input type="checkbox" id="acc-admin"> '+tr("Administrateur (gère les accès)","Admin (manages access)")+'</label><button class="btn gold small" type="submit" style="margin-left:auto">'+tr("Ouvrir l'accès","Grant access")+'</button></div></form>';
  h+='<div class="acces">';
  if(!list.length) h+='<div class="empty"><b>'+tr("Aucun accès","No access yet")+'</b></div>';
  for(const a of list){
    const m=membre(a.membreId), self=a.id===S.email, owner=a.id===OWNER, bur=roleOf(a)==="bureau";
    const who=bur?(m?m.nom+" · "+(m.role||tr("Bureau","Board")):tr("Fiche du bureau introuvable","Board profile not found")):(a.nom||tr("Membre","Member"))+tr(" · membre du club"," · club member");
    h+='<div class="arow"><div><div class="em">'+esc(a.id)+'</div><div class="sub2">'+esc(who)+(a.admin||owner?tr(" · administrateur"," · admin"):"")+(self?tr(" · toi"," · you"):"")+'</div></div>'+
      (owner?'<span class="chip gold">'+tr("Président","President")+'</span>':'<div class="acts">'+(bur?'<button class="btn ghost small" data-act="accAdmin" data-id="'+esc(a.id)+'">'+(a.admin?tr("Retirer admin","Remove admin"):tr("Rendre admin","Make admin"))+'</button>':"")+
        (self?"":'<button class="btn ghost small" data-act="accDel" data-id="'+esc(a.id)+'">'+tr("Retirer","Remove")+'</button>')+'</div>')+'</div>';
  }
  h+='</div>';
  h+='<div class="sechead" style="margin-top:8px"><h2>'+tr("Sauvegarde","Backup")+'</h2></div><p class="help">'+tr("Télécharge une copie de toutes les données du QG, ou reprends celles de l'ancien QG (fichier .json).","Download a copy of all HQ data, or bring back data from the old HQ (.json file).")+'</p>'+
    '<div class="tools"><button class="btn small" data-act="exportAll">'+tr("Télécharger une sauvegarde","Download a backup")+'</button>'+
    '<label class="btn small" for="importFile" style="cursor:pointer">'+tr("Importer un fichier","Import a file")+'</label><input type="file" id="importFile" accept="application/json,.json" hidden></div>';
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
const MAIL=()=>tr("Adresse e-mail","E-mail address");
function pwField(id,label,ac){
  return '<div class="field"><label for="'+id+'">'+label+'</label><div class="pw"><input id="'+id+'" type="password" required minlength="8" autocomplete="'+ac+'">'+
    '<button type="button" data-auth="showpw" data-for="'+id+'">'+tr("Afficher","Show")+'</button></div></div>';
}
function renderGate(g){
  const em=esc(S.authEmail||"");
  const mailField=id=>'<div class="field"><label for="'+id+'">'+MAIL()+'</label><input id="'+id+'" type="email" required autocomplete="username" value="'+em+'"></div>';
  let h='<div class="auth"><div class="eyebrow">'+tr("QG du Comptoir · réservé aux inscrits","Le Comptoir HQ · members only")+'</div>';
  if(g==="config") return h+'<h2>'+tr("Appli en cours d'installation","App being set up")+'</h2><p class="sub">'+tr("La connexion n'est pas encore branchée. Lucas finit la mise en place : reviens bientôt.","Sign-in isn't connected yet. Lucas is finishing the setup: come back soon.")+'</p></div>';
  if(g==="loading") return h+'<h2>'+tr("Connexion…","Signing in…")+'</h2><p class="sub">'+tr("Vérification de ton accès.","Checking your access.")+'</p></div>';
  if(g==="login") return h+'<h2>'+tr("Connexion","Sign in")+'</h2>'+msgBox()+
    '<form id="loginForm" novalidate>'+mailField("li-mail")+
    pwField("li-pw",tr("Mot de passe","Password"),"current-password")+'<button class="btn gold" type="submit">'+tr("Se connecter","Sign in")+'</button></form>'+
    '<div class="links"><button class="linkbtn" data-auth="view" data-v="signup">'+tr("Première fois ? Créer mon accès","First time? Create my access")+'</button><button class="linkbtn" data-auth="view" data-v="reset">'+tr("Mot de passe oublié","Forgot password")+'</button></div>'+
    '<p class="help">'+tr("Tu devras te reconnecter à chaque ouverture de l'appli.","You'll need to sign in again each time you open the app.")+'</p>'+installHint()+'</div>';
  if(g==="signup") return h+'<h2>'+tr("Créer mon accès","Create my access")+'</h2><p class="sub">'+tr("Utilise l'adresse e-mail que tu as donnée à Lucas. Tu recevras un lien pour la confirmer.","Use the e-mail address you gave Lucas. You'll get a link to confirm it.")+'</p>'+msgBox()+
    '<form id="signupForm" novalidate>'+mailField("su-mail")+
    pwField("su-pw",tr("Mot de passe (8 caractères minimum)","Password (at least 8 characters)"),"new-password")+'<button class="btn gold" type="submit">'+tr("Créer mon accès","Create my access")+'</button></form>'+
    '<div class="links"><button class="linkbtn" data-auth="view" data-v="login">'+tr("J'ai déjà un accès","I already have access")+'</button></div></div>';
  if(g==="reset") return h+'<h2>'+tr("Mot de passe oublié","Forgot password")+'</h2><p class="sub">'+tr("Indique ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.","Enter your address: you'll get a link to choose a new password.")+'</p>'+msgBox()+
    '<form id="resetForm" novalidate>'+mailField("rs-mail")+
    '<button class="btn gold" type="submit">'+tr("Recevoir le lien","Send me the link")+'</button></form>'+
    '<div class="links"><button class="linkbtn" data-auth="view" data-v="login">'+tr("Retour à la connexion","Back to sign in")+'</button></div></div>';
  if(g==="verify") return h+'<h2>'+tr("Confirme ton adresse","Confirm your address")+'</h2><p class="sub">'+tr("Un lien a été envoyé à <b>"+esc(S.authUser.email)+"</b>. Ouvre-le, puis reviens ici. Regarde aussi dans les courriers indésirables.","A link was sent to <b>"+esc(S.authUser.email)+"</b>. Open it, then come back here. Check your spam folder too.")+'</p>'+msgBox()+
    '<button class="btn gold" data-auth="verified">'+tr("J'ai confirmé mon adresse","I've confirmed my address")+'</button>'+
    '<div class="links"><button class="linkbtn" data-auth="resend">'+tr("Renvoyer le lien","Resend the link")+'</button><button class="linkbtn" data-auth="logout">'+tr("Changer d'adresse","Use another address")+'</button></div></div>';
  if(g==="denied") return h+'<h2>'+tr("Accès refusé","Access denied")+'</h2><p class="sub">'+tr("L'adresse <b>"+esc(S.authUser.email)+"</b> n'a pas d'accès au QG du Comptoir. Si c'est une erreur, demande à Lucas d'ouvrir ton accès, puis reconnecte-toi.","The address <b>"+esc(S.authUser.email)+"</b> has no access to Le Comptoir HQ. If this is a mistake, ask Lucas to grant you access, then sign in again.")+'</p>'+
    '<button class="btn" data-auth="logout">'+tr("Se déconnecter","Sign out")+'</button></div>';
  return h+'</div>';
}
function installHint(){
  if(window.matchMedia && matchMedia("(display-mode: standalone)").matches) return "";
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(S.installEvt) return '<div class="install"><span>'+tr("<b>Installer l'appli</b> sur cet appareil pour l'ouvrir comme une application.","<b>Install the app</b> on this device to open it like any other app.")+'</span><button class="btn small gold" data-auth="install">'+tr("Installer","Install")+'</button></div>';
  if(ios) return '<div class="install"><span>'+tr("<b>Installer sur iPhone :</b> touche Partager, puis « Sur l'écran d'accueil ».","<b>Install on iPhone:</b> tap Share, then “Add to Home Screen”.")+'</span></div>';
  return '<div class="install"><span>'+tr("<b>Installer l'appli :</b> dans le menu du navigateur, choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ».","<b>Install the app:</b> in the browser menu, choose “Install app” or “Add to Home screen”.")+'</span></div>';
}

/* ---------- Rendu global ---------- */
function loadedAll(){ return S.offline || ["membres","evenements","taches","annonces","presences","preparations","revisions","idees"].every(k=>S.loaded[k]); }

/* ---------- Boîte à idées ---------- */
const myName = () => S.bureau ? ((myMember()||{}).nom||"") : (S.myName||"");
const canEditIdee = i => S.bureau || (!!S.uid && i.auteurUid===S.uid);
function renderIdees(){
  const nb={ouvertes:0,nouvelle:0,retenues:0,ecartee:0,miennes:0};
  S.idees.forEach(i=>{ const e=i.statut||"nouvelle";
    if(e!=="ecartee") nb.ouvertes++; if(e==="nouvelle") nb.nouvelle++; if(e==="retenue"||e==="programmee") nb.retenues++; if(e==="ecartee") nb.ecartee++;
    if(S.uid&&i.auteurUid===S.uid) nb.miennes++; });
  const F=[["ouvertes",tr("En cours","Open")],["nouvelle",tr("Nouvelles","New")],["retenues",tr("Retenues","Accepted")],["miennes",tr("Les miennes","Mine")],["ecartee",tr("Écartées","Set aside")]];
  let h='<div class="sechead"><h2>'+tr("Boîte à idées","Idea box")+'</h2>'+(S.ideesKo?"":'<button class="btn gold small" data-act="newIdee">'+tr("+ Idée","+ Idea")+'</button>')+'</div>'+
    '<p class="help">'+tr("Un événement, un intervenant, une sortie, une idée pour le club ? Colle un post-it. Tout le club le voit et peut le soutenir ; le bureau le traite et répond ici.",
      "An event, a speaker, an outing, an idea for the club? Stick a post-it. The whole club sees it and can back it; the board reviews it and replies here.")+'</p>';
  if(S.ideesKo) return h+'<div class="empty"><b>'+tr("Boîte à idées bientôt ouverte","Idea box opening soon")+'</b><span>'+tr("Elle sera disponible dès que Lucas aura activé son accès.","It will be available as soon as Lucas turns it on.")+'</span></div>';
  if(!loadedAll()) return h+'<div class="empty"><b>'+LOADING()+'</b></div>';
  h+='<div class="filters" role="group" aria-label="'+tr("Filtrer les idées","Filter ideas")+'">'+F.map(([k,l])=>'<button class="fchip" data-act="ifiltre" data-f="'+k+'" aria-pressed="'+(S.ifiltre===k)+'">'+l+'<span class="n">'+nb[k]+'</span></button>').join("")+'</div>';
  const list=S.idees.filter(i=>{ const e=i.statut||"nouvelle";
    switch(S.ifiltre){ case "nouvelle": return e==="nouvelle"; case "retenues": return e==="retenue"||e==="programmee";
      case "ecartee": return e==="ecartee"; case "miennes": return !!S.uid&&i.auteurUid===S.uid; default: return e!=="ecartee"; } })
    .sort((a,b)=>((b.soutiens||[]).length-(a.soutiens||[]).length)||(b.creeLe||0)-(a.creeLe||0));
  h+='<div class="board">';
  if(S.ifiltre==="ouvertes"||S.ifiltre==="miennes") h+='<button class="postit vide" data-act="newIdee"><span class="pi-plus-ico" aria-hidden="true">+</span><span class="pi-ttl">'+tr("Coller une idée","Stick an idea")+'</span><span class="pi-txt">'+tr("Titre, deux lignes d'explication : ça suffit.","A title and two lines of explanation: that's enough.")+'</span></button>';
  for(const i of list){
    const c=CATS[i.categorie]||CATS.autre, e=i.statut||"nouvelle", sout=i.soutiens||[], moi=!!S.uid&&sout.includes(S.uid), mine=!!S.uid&&i.auteurUid===S.uid;
    h+='<article class="postit'+(e==="ecartee"?" off":"")+'" style="--pc:var('+c.c+')">'+
      '<div class="pi-top"><span class="pi-cat">'+esc(c.lbl)+'</span><span class="pi-etat e-'+e+'">'+esc(ETATS[e]||ETATS.nouvelle)+'</span></div>'+
      '<h3 class="pi-ttl">'+esc(i.titre)+'</h3>'+
      (i.detail?'<p class="pi-txt">'+esc(i.detail)+'</p>':"")+
      (i.noteBureau?'<div class="pi-rep"><b>'+tr("Le bureau :","The board:")+'</b> '+esc(i.noteBureau)+'</div>':"")+
      '<div class="pi-foot"><span class="pi-who">'+esc(mine?tr("Toi","You"):(i.nom||tr("Un membre","A member")))+' · '+esc(ago(i.creeLe))+'</span>'+
      '<button class="pi-sout'+(moi?" on":"")+'" data-act="ideeSout" data-id="'+esc(i.id)+'" aria-pressed="'+moi+'" aria-label="'+(moi?tr("Retirer mon soutien","Withdraw my support"):tr("Soutenir cette idée","Back this idea"))+' ('+sout.length+')">'+(moi?tr("✓ Soutenue","✓ Backed"):"+1")+'<span class="n">'+sout.length+'</span></button></div>'+
      (canEditIdee(i)?'<div class="pi-acts">'+(S.bureau?'<button class="btn small" data-act="ideeTraiter" data-id="'+esc(i.id)+'">'+tr("Traiter","Review")+'</button>':"")+
        '<button class="btn ghost small" data-act="ideeEdit" data-id="'+esc(i.id)+'">'+EDIT()+'</button></div>':"")+
      '</article>';
  }
  h+='</div>';
  if(!list.length && S.ifiltre!=="ouvertes" && S.ifiltre!=="miennes") h+='<div class="empty"><b>'+NOTHING()+'</b><span>'+tr("Aucune idée dans cette catégorie.","No ideas in this category.")+'</span></div>';
  return h+'<p class="help">'+tr("« +1 » : tu soutiens l'idée (un seul par personne, tu peux le retirer). Les idées les plus soutenues remontent en haut.","“+1”: you back the idea (one per person, you can take it back). The most backed ideas rise to the top.")+'</p>';
}
function ideeSheet(i){
  const e=i||{categorie:"evenement"};
  openSheet('<h3>'+(i?tr("Modifier l'idée","Edit the idea"):tr("Nouvelle idée","New idea"))+'</h3><form id="iForm">'+
    '<div class="field"><label for="i-titre">'+tr("Ton idée","Your idea")+'</label><input id="i-titre" required maxlength="120" value="'+esc(e.titre||"")+'" placeholder="'+tr("Une soirée jeux de société au Comptoir","A board-game night at the Comptoir")+'"></div>'+
    '<div class="field"><label for="i-cat">'+tr("Catégorie","Category")+'</label><select id="i-cat">'+Object.entries(CATS).map(([k,v])=>'<option value="'+k+'"'+(k===e.categorie?" selected":"")+'>'+v.lbl+'</option>').join("")+'</select></div>'+
    '<div class="field"><label for="i-det">'+tr("En deux mots (facultatif)","In a few words (optional)")+'</label><textarea id="i-det" maxlength="800" placeholder="'+tr("Pourquoi c'est une bonne idée, qui pourrait venir, quand…","Why it's a good idea, who could come, when…")+'">'+esc(e.detail||"")+'</textarea></div>'+
    '<div class="bar">'+(i?'<button type="button" class="btn danger small left" id="delI">'+tr("Retirer le post-it","Remove the post-it")+'</button>':"")+
    '<button type="button" class="btn ghost" data-close>'+CLOSE()+'</button><button class="btn gold" type="submit">'+(i?SAVE():tr("Coller le post-it","Stick the post-it"))+'</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    if(i) $("#delI",root).onclick=()=>confirmSheet(tr("Retirer cette idée ?","Remove this idea?"),tr("« "+i.titre+" » disparaîtra de la boîte à idées pour tout le club.","“"+i.titre+"” will disappear from the idea box for the whole club."),tr("Retirer","Remove"),async()=>{ await w(col("idees").doc(i.id).delete(),tr("Idée retirée","Idea removed")); });
    $("#iForm",root).onsubmit=async ev=>{
      ev.preventDefault();
      const body={titre:$("#i-titre").value.trim(), categorie:$("#i-cat").value, detail:$("#i-det").value.trim(), majLe:Date.now()};
      if(!body.titre) return; closeSheet();
      if(i) await w(col("idees").doc(i.id).update(body),tr("Idée mise à jour","Idea updated"));
      else await w(col("idees").add(Object.assign(body,{statut:"nouvelle",auteurUid:S.uid,nom:myName(),soutiens:[],creeLe:Date.now()})),tr("Post-it collé : merci pour l'idée !","Post-it stuck: thanks for the idea!"));
    };
  });
}
function ideeTraiterSheet(i){
  const e=i.statut||"nouvelle", ns=(i.soutiens||[]).length;
  openSheet('<h3>'+tr("Traiter l'idée","Review the idea")+'</h3><p class="sub"><b>'+esc(i.titre)+'</b>'+(i.nom?tr(" · proposée par "," · suggested by ")+esc(i.nom):"")+' · '+ns+' '+pl(ns,"soutien","soutiens","supporter","supporters")+'</p>'+
    '<form id="itForm"><div class="field"><label for="it-etat">'+tr("Où en est l'idée ?","Where does the idea stand?")+'</label><select id="it-etat">'+Object.entries(ETATS).map(([k,v])=>'<option value="'+k+'"'+(k===e?" selected":"")+'>'+v+'</option>').join("")+'</select></div>'+
    '<div class="field"><label for="it-rep">'+tr("Réponse du bureau (visible par tout le club)","Board reply (seen by the whole club)")+'</label><textarea id="it-rep" maxlength="600" placeholder="'+tr("Retenue pour mars : Félice s'en occupe.","Accepted for March: Félice is on it.")+'">'+esc(i.noteBureau||"")+'</textarea></div>'+
    '<div class="choice"><button type="button" id="itTask"><b>'+tr("Créer une tâche","Create a task")+'</b><span>'+tr("Confier à un membre du bureau l'étude ou la préparation de l'idée.","Ask a board member to look into or prepare the idea.")+'</span></button>'+
    '<button type="button" id="itEv"><b>'+tr("Mettre à l'agenda","Add to the calendar")+'</b><span>'+tr("Créer le rendez-vous à partir de l'idée.","Create the event from the idea.")+'</span></button></div>'+
    '<div class="bar"><button type="button" class="btn ghost" data-close>'+CLOSE()+'</button><button class="btn gold" type="submit">'+SAVE()+'</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    const save=async(msg,force)=>{ const statut=force||$("#it-etat",root).value, noteBureau=$("#it-rep",root).value.trim();
      closeSheet(); const body={statut,majLe:Date.now()}; if(noteBureau) body.noteBureau=noteBureau; else body.noteBureau=firebase.firestore.FieldValue.delete();
      return w(col("idees").doc(i.id).update(body),msg); };
    $("#itForm",root).onsubmit=async ev=>{ ev.preventDefault(); await save(tr("Idée mise à jour","Idea updated")); };
    $("#itTask",root).onclick=async()=>{ const cur=$("#it-etat",root).value; await save(null, cur==="nouvelle"?"etude":cur);
      taskSheet(null,{titre:tr("Idée : ","Idea: ")+i.titre,note:(i.detail||"")+(i.nom?tr("\nProposée par "+i.nom+" dans la boîte à idées.","\nSuggested by "+i.nom+" in the idea box."):"")}); };
    $("#itEv",root).onclick=async()=>{ const cur=$("#it-etat",root).value; await save(null, ["nouvelle","etude","retenue"].includes(cur)?"programmee":cur);
      eventSheet(null,{titre:i.titre,type:i.categorie==="meet"?"meet":i.categorie==="sortie"?"sortie":i.categorie==="revision"?"soutien":"autre",note:i.detail||""}); };
  });
}

/* ---------- Coordination ---------- */
const lieuOk = l => !!l && !/annonc|confirm|à définir|a definir|tbc|tba|to be/i.test(l);
const prepOf = occ => S.preparations.find(p=>p.id===occ) || null;
function readiness(o){
  const items=(prepOf(o.occ)||{}).items||[];
  const checks=[{auto:true,k:"lieu",t:tr("Lieu fixé","Venue set"),ok:lieuOk(o.lieu)},{auto:true,k:"resp",t:tr("Responsable désigné","Person in charge named"),ok:!!membre(o.ev.responsable)}]
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
  const L=[tr("Le Comptoir · le point du ","Le Comptoir · update for ")+fShort.format(S.now),""];
  L.push(tr("Au programme (7 prochains jours) :","Coming up (next 7 days):"));
  if(!occs.length) L.push(tr("- Rien de prévu","- Nothing planned"));
  occs.forEach(o=>{
    const resp=membre(o.ev.responsable);
    L.push("- "+fShort.format(o.date)+" · "+hm(o.debut)+(o.fin?"–"+hm(o.fin):"")+" · "+o.ev.titre+(o.annule?tr(" (ANNULÉ)"," (CANCELLED)"):" · "+(o.lieu||tr("lieu à annoncer","venue TBA")))+(resp&&!o.annule?tr(" · resp. "," · lead: ")+resp.nom:""));
  });
  const late=lateTasks();
  const soon=S.taches.filter(t=>t.statut!=="fait"&&t.echeance&&!((dueInfo(t)||{}).late)&&parseDate(t.echeance)<=we);
  const libre=S.taches.filter(t=>t.statut!=="fait"&&!membre(t.responsable));
  const fmt=t=>"- "+t.titre+(membre(t.responsable)?" ("+membre(t.responsable).nom+")":"")+(t.echeance?tr(" · pour le "," · due ")+fDM.format(parseDate(t.echeance)):"");
  if(late.length){ L.push("",tr("En retard :","Overdue:")); late.forEach(t=>L.push(fmt(t))); }
  if(soon.length){ L.push("",tr("À rendre cette semaine :","Due this week:")); soon.forEach(t=>L.push(fmt(t))); }
  if(libre.length){ L.push("",tr("Qui s'en charge ?","Who can take these?")); libre.forEach(t=>L.push(fmt(t))); }
  L.push("",tr("Tout est à jour sur le QG du Comptoir.","Everything is up to date on Le Comptoir HQ."));
  return L.join("\n");
}
function renderCoord(){
  const coord=S.membres.find(m=>/coordination/i.test(m.role||""));
  let h='<div class="sechead"><h2>'+tr("Coordination","Coordination")+'</h2></div>'+
    '<p class="help">'+(coord?tr("Espace de pilotage de "+esc(coord.nom)+", responsable coordination : ","Control room of "+esc(coord.nom)+", coordination lead: "):tr("Espace de pilotage : ","Control room: "))+tr("ce qui reste à préparer, qui fait quoi, et le point à envoyer au club.","what's left to prepare, who does what, and the update to send to the club.")+'</p>';
  if(!loadedAll()) return h+'<div class="empty"><b>'+LOADING()+'</b></div>';
  const al=coordAlerts();
  h+='<div class="kpis">'+
    '<div class="kpi'+(al.notReady?" alert":" ok")+'"><b>'+al.notReady+'</b><span>'+tr("rendez-vous pas prêts (14 j)","events not ready (14 days)")+'</span></div>'+
    '<div class="kpi'+(al.unassigned?" alert":" ok")+'"><b>'+al.unassigned+'</b><span>'+tr("tâches sans responsable","unassigned tasks")+'</span></div>'+
    '<div class="kpi'+(al.late?" alert":" ok")+'"><b>'+al.late+'</b><span>'+tr("tâches en retard","overdue tasks")+'</span></div></div>';

  /* Rendez-vous à préparer */
  const occs=upcoming14();
  h+='<section class="block"><h3>'+tr("Rendez-vous à préparer · 14 jours","Events to prepare · 14 days")+'</h3>';
  if(!occs.length) h+='<div class="empty"><b>'+tr("Rien dans les 14 jours","Nothing in the next 14 days")+'</b><span>'+tr("Ajoute un rendez-vous depuis l'Agenda.","Add an event from the Calendar.")+'</span></div>';
  occs.forEach(o=>{
    const t=TYPES[o.ev.type]||TYPES.autre, r=readiness(o), pct=Math.round(r.done/r.total*100);
    const existing=((prepOf(o.occ)||{}).items||[]).map(i=>i.t.toLowerCase());
    const sugg=(SUGG[o.ev.type]||SUGG.autre).filter(s=>!existing.includes(s.toLowerCase()));
    h+='<article class="prep" style="--tc:var('+t.c+')"><div class="hd"><div><div class="when">'+esc(fDay.format(o.date))+' · <span class="mono">'+esc(hm(o.debut))+'</span> · '+esc(countdown(o))+'</div>'+
      '<div class="ttl">'+esc(o.ev.titre)+'</div></div>'+
      '<span class="chip '+(r.ready?"":"gold")+'" style="'+(r.ready?"background:var(--ok-soft);color:var(--live)":"")+'">'+(r.ready?tr("Prêt","Ready"):r.done+"/"+r.total)+'</span></div>'+
      '<div class="meter'+(r.ready?" full":"")+'"><i style="width:'+pct+'%"></i></div><ul class="cl">';
    r.checks.forEach(c=>{
      if(c.auto){
        h+='<li class="'+(c.ok?"done":"")+'"><span class="box" aria-hidden="true">'+ICON.check+'</span><span class="lbl">'+esc(c.t)+
          (c.k==="lieu"?' <span class="auto">· '+esc(o.lieu||tr("à annoncer","TBA"))+'</span>':"")+'</span>';
        if(S.canWrite){
          if(c.k==="lieu") h+='<button class="btn ghost small" data-act="editOcc" data-ev="'+esc(o.ev.id)+'" data-key="'+o.key+'">'+(c.ok?tr("Changer","Change"):tr("Fixer","Set"))+'</button>';
          else h+='<select aria-label="'+esc(tr("Responsable de ","Person in charge of ")+o.ev.titre)+'" data-assign-ev="'+esc(o.ev.id)+'" style="max-width:150px;border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--paper);font-size:13px">'+memberOptions(o.ev.responsable)+'</select>';
        }
        h+='</li>';
      } else {
        h+='<li class="'+(c.ok?"done":"")+'"><button class="box" data-act="prepToggle" data-occ="'+esc(o.occ)+'" data-i="'+c.i+'" aria-label="'+(c.ok?tr("Décocher","Untick"):tr("Cocher","Tick"))+tr(" : ",": ")+esc(c.t)+'"'+(S.canWrite?"":" disabled")+'>'+ICON.check+'</button><span class="lbl">'+esc(c.t)+'</span>'+
          (S.canWrite?'<button class="x" data-act="prepDel" data-occ="'+esc(o.occ)+'" data-i="'+c.i+'" aria-label="'+tr("Retirer l'étape","Remove the step")+'">×</button>':"")+'</li>';
      }
    });
    h+='</ul>';
    if(S.canWrite){
      h+='<form class="addrow prepForm" data-occ="'+esc(o.occ)+'"><input id="add-'+esc(o.occ)+'" maxlength="100" placeholder="'+tr("Ajouter une étape…","Add a step…")+'" aria-label="'+tr("Nouvelle étape","New step")+'"><button class="btn small" type="submit">'+tr("Ajouter","Add")+'</button></form>';
      if(sugg.length) h+='<div class="sugg">'+sugg.map(s=>'<button data-act="prepAdd" data-occ="'+esc(o.occ)+'" data-t="'+esc(s)+'">+ '+esc(s)+'</button>').join("")+'</div>';
    }
    h+='</article>';
  });
  h+='</section>';

  /* Tâches à répartir */
  const libres=S.taches.filter(t=>t.statut!=="fait"&&!membre(t.responsable));
  h+='<section class="block"><h3>'+tr("Tâches à répartir","Tasks to hand out")+'</h3>';
  if(!libres.length) h+='<div class="empty"><b>'+tr("Tout est attribué","Everything is assigned")+'</b><span>'+tr("Chaque tâche en cours a quelqu'un pour s'en charger.","Every open task has someone on it.")+'</span></div>';
  libres.forEach(t=>{
    const d=dueInfo(t);
    h+='<div class="assign"><div><div class="ttl">'+esc(t.titre)+'</div><div class="sub2">'+(d?esc(d.txt):tr("Sans échéance","No deadline"))+' · '+STATUTS[t.statut]+'</div></div>'+
      (S.canWrite?'<select aria-label="'+esc(tr("Attribuer « "+t.titre+" »","Assign “"+t.titre+"”"))+'" data-assign-task="'+esc(t.id)+'">'+memberOptions(null,tr("Attribuer à…","Assign to…"))+'</select>':"")+'</div>';
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
  h+='<section class="block"><h3>'+tr("Charge de l'équipe","Team workload")+'</h3><div class="load">';
  if(!rows.length) h+='<span class="help">'+tr("Ajoute les membres dans l'onglet Bureau.","Add members in the Board tab.")+'</span>';
  rows.forEach(r=>{
    h+='<div class="lrow"><div class="nm">'+esc(r.m.nom.split(" ")[0])+'<small>'+esc(r.m.role||"")+'</small></div>'+
      '<div class="bar" title="'+tr(r.n+" tâches, "+r.evs+" rendez-vous",r.n+" tasks, "+r.evs+" events")+'"><i class="l" style="width:'+(r.late/max*100)+'%"></i><i style="width:'+((r.n-r.late+r.evs)/max*100)+'%"></i></div>'+
      '<div class="n">'+r.n+' t · '+r.evs+' '+tr("rdv","ev")+(r.late?' · <span style="color:var(--late)">'+r.late+'!</span>':"")+'</div></div>';
  });
  h+='</div><p class="help">'+tr("t = tâches en cours, rdv = rendez-vous dont la personne est responsable sur 14 jours. Rouge : en retard.","t = open tasks, ev = events the person leads over 14 days. Red: overdue.")+'</p></section>';

  /* Point de la semaine */
  h+='<section class="block"><h3>'+tr("Point de la semaine","Weekly update")+'</h3><div class="brief"><pre id="briefTxt">'+esc(briefText())+'</pre>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn gold small" data-act="copyBrief">'+tr("Copier le texte","Copy the text")+'</button>'+
    (S.canWrite?'<button class="btn small" data-act="postBrief">'+tr("Publier dans Annonces","Post to Announcements")+'</button>':"")+
    '<span class="help">'+tr("À coller dans le groupe du club.","To paste into the club's group chat.")+'</span></div></div></section>';
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
  $("#statusTxt").textContent = statusTxt();
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
  $("nav.tabs .wrap").style.gridTemplateColumns="repeat("+(S.bureau?7:5)+",1fr)";
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
  const vh = S.tab==="agenda"?renderAgenda(): S.tab==="taches"?renderTaches(): S.tab==="annonces"?renderAnnonces(): S.tab==="coord"?renderCoord(): S.tab==="revisions"?renderRevisions(): S.tab==="idees"?renderIdees(): renderBureau();
  // Une fiche longue n'est pas reconstruite toutes les 30 secondes si rien n'a changé (garde la lecture en place)
  if(!(S.tab==="revisions" && S.lastView===vh && view.childElementCount)) view.innerHTML=vh;
  S.lastView = S.tab==="revisions" ? vh : null;
  if(addFocus){ const el=document.getElementById(addFocus.id); if(el){ el.value=addFocus.v; el.focus(); } }
  Object.keys(keep).forEach(id=>{ const el=document.getElementById(id); if(el){ if(el.type==="checkbox") el.checked=keep[id]; else el.value=keep[id]; } });
  if(fid&&document.getElementById(fid)) document.getElementById(fid).focus();
  syncAccForm();
  if(loadedAll()&&S.bureau){ const al=coordAlerts(), n=al.notReady+al.unassigned, cb=$("#coordBadge"); cb.hidden=!n; cb.textContent=n; }
  { const ni=S.bureau?S.idees.filter(i=>(i.statut||"nouvelle")==="nouvelle").length:0, ib=$("#ideeBadge"); if(ib){ ib.hidden=!ni; ib.textContent=ni; } }
  if(draft!==null && $("#annTxt")){ $("#annTxt").value=draft; $("#annPin").checked=pinChk; if(keepFocus) $("#annTxt").focus(); }
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===S.tab)));
  const st=$("#status");
  st.classList.toggle("live",S.live);
  $("#statusTxt").textContent = statusTxt();
}
const statusTxt = () => S.offline?tr("Aperçu hors ligne","Offline preview"): S.live?tr("En direct","Live"): S.slow?tr("Connexion lente…","Slow connection…"):tr("Connexion…","Connecting…");

/* ---------- Écritures ---------- */
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
async function w(p,ok){
  try{ await p; if(ok) toast(ok); return true; }
  catch(e){
    const c=e&&e.code;
    if(c==="permission-denied"){ toast(tr("Accès refusé : ton adresse n'est plus autorisée, ou cette action est réservée aux administrateurs.","Access denied: your address is no longer allowed, or this action is for admins only.")); }
    else if(c==="resource-exhausted") toast(tr("Limite du jour atteinte : réessaie demain ou préviens Lucas.","Daily limit reached: try again tomorrow or tell Lucas."));
    else toast(tr("Pas enregistré : vérifie ta connexion et réessaie.","Not saved: check your connection and try again."));
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

const memberOptions = (sel,vide) => '<option value="">'+esc(vide||tr("— Personne —","— Nobody —"))+'</option>'+[...S.membres].sort((a,b)=>(a.ordre??99)-(b.ordre??99)).map(m=>'<option value="'+esc(m.id)+'"'+(m.id===sel?" selected":"")+'>'+esc(m.nom)+(m.role?" · "+esc(m.role):"")+'</option>').join("");
const typeOptions = sel => Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'"'+(k===sel?" selected":"")+'>'+v.lbl+'</option>').join("");

function eventSheet(ev,pre){
  const e=ev||Object.assign({type:"comptoir",date:ymd(S.now),debut:"18:00",fin:"20:00",repetition:"aucune"},pre||{});
  openSheet('<h3>'+(ev?tr("Modifier la série","Edit the series"):tr("Nouveau rendez-vous","New event"))+'</h3><form id="evForm">'+
    '<div class="field"><label for="f-titre">'+tr("Titre","Title")+'</label><input id="f-titre" required maxlength="120" value="'+esc(e.titre||"")+'" placeholder="'+tr("Comptoir du mercredi","Wednesday Comptoir")+'"></div>'+
    '<div class="grid2"><div class="field"><label for="f-type">Type</label><select id="f-type">'+typeOptions(e.type)+'</select></div>'+
    '<div class="field"><label for="f-date">'+(ev&&ev.repetition==="hebdo"?tr("Première date","First date"):"Date")+'</label><input id="f-date" type="date" required value="'+esc(e.date)+'"></div></div>'+
    '<div class="grid2"><div class="field"><label for="f-debut">'+START()+'</label><input id="f-debut" type="time" required value="'+esc(e.debut||"")+'"></div>'+
    '<div class="field"><label for="f-fin">'+END()+'</label><input id="f-fin" type="time" value="'+esc(e.fin||"")+'"></div></div>'+
    '<div class="field"><label for="f-lieu">'+tr("Lieu","Venue")+'</label><input id="f-lieu" maxlength="120" value="'+esc(e.lieu||"")+'" placeholder="'+tr("Salle du club, bar partenaire…","Club room, partner bar…")+'"></div>'+
    '<div class="field"><label for="f-resp">'+tr("Responsable","Person in charge")+'</label><select id="f-resp">'+memberOptions(e.responsable)+'</select></div>'+
    '<div class="grid2"><div class="field"><label for="f-rep">'+tr("Répétition","Repeat")+'</label><select id="f-rep"><option value="aucune">'+tr("Une seule fois","Just once")+'</option><option value="hebdo"'+(e.repetition==="hebdo"?" selected":"")+'>'+tr("Chaque semaine","Every week")+'</option></select></div>'+
    '<div class="field" id="untilWrap"><label for="f-until">'+tr("Jusqu'au (facultatif)","Until (optional)")+'</label><input id="f-until" type="date" value="'+esc(e.jusqua||"")+'"></div></div>'+
    '<div class="field"><label for="f-note">Note</label><textarea id="f-note" maxlength="600" placeholder="'+tr("Ce qu'il faut apporter, le déroulé…","What to bring, the programme…")+'">'+esc(e.note||"")+'</textarea></div>'+
    '<div class="bar">'+(ev?'<button type="button" class="btn danger small left" id="delEv">'+tr("Supprimer la série","Delete the series")+'</button>':"")+
    '<button type="button" class="btn ghost" data-close>'+CLOSE()+'</button><button class="btn gold" type="submit">'+SAVE()+'</button></div></form>',
  root=>{
    const rep=$("#f-rep",root), uw=$("#untilWrap",root); const sync=()=>uw.hidden=rep.value!=="hebdo"; rep.onchange=sync; sync();
    root.querySelector("[data-close]").onclick=closeSheet;
    if(ev) $("#delEv",root).onclick=()=>confirmSheet(tr("Supprimer « "+ev.titre+" » ?","Delete “"+ev.titre+"”?"), ev.repetition==="hebdo"?tr("Toutes les dates de cette série disparaîtront de l'agenda.","Every date in this series will disappear from the calendar."):tr("Le rendez-vous disparaîtra de l'agenda.","The event will disappear from the calendar."),DEL(),async()=>{ await w(col("evenements").doc(ev.id).delete(),tr("Rendez-vous supprimé","Event deleted")); });
    $("#evForm",root).onsubmit=async ev2=>{
      ev2.preventDefault();
      const body={ titre:$("#f-titre").value.trim(), type:$("#f-type").value, date:$("#f-date").value, debut:$("#f-debut").value, fin:$("#f-fin").value,
        lieu:$("#f-lieu").value.trim(), responsable:$("#f-resp").value||null, repetition:$("#f-rep").value,
        jusqua:$("#f-rep").value==="hebdo"?($("#f-until").value||null):null, note:$("#f-note").value.trim(), majLe:Date.now() };
      if(!body.titre||!body.date) return;
      closeSheet();
      if(ev){ body.exceptions=ev.exceptions||{}; await w(col("evenements").doc(ev.id).set(Object.assign(clean(ev),body)),tr("Rendez-vous mis à jour","Event updated")); }
      else { body.exceptions={}; body.creePar=S.me||null; await w(col("evenements").add(body),tr("Rendez-vous ajouté","Event added")); }
    };
  });
}
function occSheet(ev,key){
  const d=parseDate(key);
  if(ev.repetition!=="hebdo"){ eventSheet(ev); return; }
  const ex=(ev.exceptions||{})[key]||{};
  openSheet('<h3>'+esc(ev.titre)+'</h3><p class="sub" style="text-transform:capitalize">'+esc(fDay.format(d))+'</p>'+
    '<div class="choice"><button type="button" id="chSeries"><b>'+tr("Modifier toute la série","Edit the whole series")+'</b><span>'+tr("Titre, horaires et lieu habituels, responsable, répétition.","Title, usual times and venue, person in charge, repeat.")+'</span></button></div>'+
    '<form id="occForm"><p class="sub">'+tr("<b>Changer cette date seulement</b> (ex. le lieu du Comptoir de la semaine)","<b>Change this date only</b> (e.g. this week's Comptoir venue)")+'</p>'+
    '<div class="field"><label for="o-lieu">'+tr("Lieu ce jour-là","Venue on that day")+'</label><input id="o-lieu" maxlength="120" value="'+esc(ex.lieu||"")+'" placeholder="'+esc(ev.lieu||tr("Lieu à annoncer","Venue to be announced"))+'"></div>'+
    '<div class="grid2"><div class="field"><label for="o-debut">'+START()+'</label><input id="o-debut" type="time" value="'+esc(ex.debut||ev.debut||"")+'"></div>'+
    '<div class="field"><label for="o-fin">'+END()+'</label><input id="o-fin" type="time" value="'+esc(ex.fin||ev.fin||"")+'"></div></div>'+
    '<div class="field"><label for="o-note">'+tr("Note pour cette date","Note for this date")+'</label><textarea id="o-note" maxlength="600">'+esc(ex.note||"")+'</textarea></div>'+
    '<label class="check"><input type="checkbox" id="o-annule"'+(ex.annule?" checked":"")+'> '+tr("Annuler cette date","Cancel this date")+'</label>'+
    '<div class="bar">'+(Object.keys(ex).length?'<button type="button" class="btn ghost small left" id="o-reset">'+tr("Rétablir l'horaire habituel","Restore the usual schedule")+'</button>':"")+
    '<button type="button" class="btn ghost" data-close>'+CLOSE()+'</button><button class="btn gold" type="submit">'+SAVE()+'</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    $("#chSeries",root).onclick=()=>eventSheet(ev);
    const reset=$("#o-reset",root);
    if(reset) reset.onclick=async()=>{ const body=clean(ev); body.exceptions=Object.assign({},body.exceptions); delete body.exceptions[key]; body.majLe=Date.now(); closeSheet(); await w(col("evenements").doc(ev.id).set(body),tr("Date rétablie","Date restored")); };
    $("#occForm",root).onsubmit=async e=>{
      e.preventDefault();
      const x={}; const l=$("#o-lieu").value.trim(), db_=$("#o-debut").value, fn=$("#o-fin").value, nt=$("#o-note").value.trim();
      if(l) x.lieu=l; if(db_ && db_!==ev.debut) x.debut=db_; if(fn && fn!==ev.fin) x.fin=fn; if(nt) x.note=nt; if($("#o-annule").checked) x.annule=true;
      const body=clean(ev); body.exceptions=Object.assign({},body.exceptions);
      if(Object.keys(x).length) body.exceptions[key]=x; else delete body.exceptions[key];
      body.majLe=Date.now(); closeSheet();
      await w(col("evenements").doc(ev.id).set(body), x.annule?tr("Date annulée","Date cancelled"):tr("Date mise à jour","Date updated"));
    };
  });
}
function taskSheet(t,pre){
  const e=t||Object.assign({statut:"a_faire"},pre||{});
  openSheet('<h3>'+(t?tr("Modifier la tâche","Edit the task"):tr("Nouvelle tâche","New task"))+'</h3><form id="tForm">'+
    '<div class="field"><label for="t-titre">'+tr("Tâche","Task")+'</label><input id="t-titre" required maxlength="160" value="'+esc(e.titre||"")+'" placeholder="'+tr("Réserver le bar de mercredi","Book the bar for Wednesday")+'"></div>'+
    '<div class="grid2"><div class="field"><label for="t-resp">'+tr("Pour qui ?","For whom?")+'</label><select id="t-resp">'+memberOptions(t?e.responsable:((myMember()||{}).id))+'</select></div>'+
    '<div class="field"><label for="t-ech">'+tr("Échéance","Deadline")+'</label><input id="t-ech" type="date" value="'+esc(e.echeance||"")+'"></div></div>'+
    '<div class="field"><label for="t-stat">'+tr("Statut","Status")+'</label><select id="t-stat">'+Object.entries(STATUTS).map(([k,v])=>'<option value="'+k+'"'+(k===e.statut?" selected":"")+'>'+v+'</option>').join("")+'</select></div>'+
    '<div class="field"><label for="t-note">'+tr("Détails","Details")+'</label><textarea id="t-note" maxlength="800">'+esc(e.note||"")+'</textarea></div>'+
    '<div class="bar">'+(t?'<button type="button" class="btn danger small left" id="delT">'+DEL()+'</button>':"")+
    '<button type="button" class="btn ghost" data-close>'+CLOSE()+'</button><button class="btn gold" type="submit">'+SAVE()+'</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    if(t) $("#delT",root).onclick=()=>confirmSheet(tr("Supprimer cette tâche ?","Delete this task?"),tr("« "+t.titre+" » sera retirée pour tout le monde.","“"+t.titre+"” will be removed for everyone."),DEL(),async()=>{ await w(col("taches").doc(t.id).delete(),tr("Tâche supprimée","Task deleted")); });
    $("#tForm",root).onsubmit=async ev=>{
      ev.preventDefault();
      const body={ titre:$("#t-titre").value.trim(), responsable:$("#t-resp").value||null, echeance:$("#t-ech").value||null, statut:$("#t-stat").value, note:$("#t-note").value.trim(), majLe:Date.now() };
      if(!body.titre) return; closeSheet();
      const me=myMember();
      if(body.responsable && (!t || body.responsable!==t.responsable)){
        body.confiePar = me && me.id!==body.responsable ? me.id : null; body.confieLe=Date.now();
      }
      const who=((membre(body.responsable)||{}).nom||"").split(" ")[0], other=me&&body.responsable&&body.responsable!==me.id;
      if(t) await w(col("taches").doc(t.id).set(Object.assign(clean(t),body)),tr("Tâche mise à jour","Task updated"));
      else { body.creeLe=Date.now(); body.creePar=me?me.id:null; await w(col("taches").add(body), other?tr("Tâche confiée à ","Task handed to ")+who:tr("Tâche ajoutée","Task added")); }
    };
  });
}
function memberSheet(m){
  const e=m||{};
  openSheet('<h3>'+(m?tr("Modifier la fiche","Edit the profile"):tr("Nouveau membre","New member"))+'</h3><form id="mForm">'+
    '<div class="field"><label for="m-nom">'+tr("Prénom et nom","First and last name")+'</label><input id="m-nom" required maxlength="80" value="'+esc(e.nom||"")+'"></div>'+
    '<div class="grid2"><div class="field"><label for="m-role">'+tr("Rôle","Role")+'</label><input id="m-role" maxlength="60" value="'+esc(e.role||"")+'" placeholder="'+tr("Responsable événements","Events lead")+'"></div>'+
    '<div class="field"><label for="m-sn">'+tr("Surnom","Nickname")+'</label><input id="m-sn" maxlength="40" value="'+esc(e.surnom||"")+'"></div></div>'+
    '<div class="field"><label for="m-ord">'+tr("Ordre d'affichage","Display order")+'</label><input id="m-ord" type="number" min="0" max="99" value="'+esc(e.ordre??50)+'"></div>'+
    '<div class="bar">'+(m?'<button type="button" class="btn danger small left" id="delM">'+tr("Retirer","Remove")+'</button>':"")+
    '<button type="button" class="btn ghost" data-close>'+CLOSE()+'</button><button class="btn gold" type="submit">'+SAVE()+'</button></div></form>',
  root=>{
    root.querySelector("[data-close]").onclick=closeSheet;
    if(m) $("#delM",root).onclick=()=>confirmSheet(tr("Retirer "+m.nom+" ?","Remove "+m.nom+"?"),tr("Ses tâches resteront, sans responsable.","Their tasks will stay, unassigned."),tr("Retirer","Remove"),async()=>{ await w(col("membres").doc(m.id).delete(),tr("Membre retiré","Member removed")); });
    $("#mForm",root).onsubmit=async ev=>{
      ev.preventDefault();
      const body={ nom:$("#m-nom").value.trim(), role:$("#m-role").value.trim(), surnom:$("#m-sn").value.trim(), ordre:+$("#m-ord").value||50 };
      if(!body.nom) return; closeSheet();
      if(m) await w(col("membres").doc(m.id).set(Object.assign(clean(m),body)),tr("Fiche mise à jour","Profile updated"));
      else await w(col("membres").add(body),tr("Membre ajouté","Member added"));
    };
  });
}
function confirmSheet(title,sub,label,fn,cls){
  openSheet('<h3>'+esc(title)+'</h3><p class="sub">'+esc(sub)+'</p><div class="bar"><button class="btn ghost" data-close>'+tr("Annuler","Cancel")+'</button><button class="btn '+(cls||"danger")+'" id="okC">'+esc(label)+'</button></div>',
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
  if(a==="ifiltre"){ S.ifiltre=b.dataset.f; render(); return; }
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
    if(amPresent(occ)) await w(ref.delete(),tr("Présence retirée","Attendance removed"));
    else await w(ref.set({occ,uid:S.me,mail:S.email,nom:S.myName||(membre(S.me)||{}).nom||"",at:Date.now()}),tr("Noté, tu es attendu·e","Noted, see you there"));
    return;
  }
  if(a==="cycle"){
    const t=S.taches.find(x=>x.id===b.dataset.id); if(!t) return;
    const next={a_faire:"en_cours",en_cours:"fait",fait:"a_faire"}[t.statut]||"a_faire";
    b.disabled=true;
    await w(col("taches").doc(t.id).update({statut:next,majLe:Date.now()}), next==="fait"?tr("Tâche terminée","Task done"):null);
    return;
  }
  if(a==="newIdee"){ if(S.ideesKo) return; return ideeSheet(); }
  if(a==="ideeEdit"){ const i=S.idees.find(x=>x.id===b.dataset.id); if(i&&canEditIdee(i)) ideeSheet(i); return; }
  if(a==="ideeTraiter"){ const i=S.idees.find(x=>x.id===b.dataset.id); if(i&&S.bureau) ideeTraiterSheet(i); return; }
  if(a==="ideeSout"){ const i=S.idees.find(x=>x.id===b.dataset.id); if(!i||!S.uid) return; b.disabled=true;
    const on=(i.soutiens||[]).includes(S.uid), FV=firebase.firestore.FieldValue;
    await w(col("idees").doc(i.id).update({soutiens:on?FV.arrayRemove(S.uid):FV.arrayUnion(S.uid)}), on?tr("Soutien retiré","Support withdrawn"):tr("Tu soutiens cette idée","You back this idea")); return; }
  if(a==="pinAnn"){ const x=S.annonces.find(y=>y.id===b.dataset.id); if(x) await w(col("annonces").doc(x.id).update({epingle:!x.epingle})); return; }
  if(a==="delAnn"){ const x=S.annonces.find(y=>y.id===b.dataset.id); if(x) confirmSheet(tr("Supprimer cette annonce ?","Delete this announcement?"),tr("Elle disparaîtra pour tout le club.","It will disappear for the whole club."),DEL(),async()=>{ await w(col("annonces").doc(x.id).delete(),tr("Annonce supprimée","Announcement deleted")); }); return; }
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
    try{ await navigator.clipboard.writeText(txt); toast(tr("Texte copié","Text copied")); }
    catch(_){ const pre=$("#briefTxt"); if(pre){ const r=document.createRange(); r.selectNodeContents(pre); const s=getSelection(); s.removeAllRanges(); s.addRange(r); } toast(tr("Texte sélectionné : copie-le avec ton téléphone","Text selected: copy it with your phone")); }
    return;
  }
  if(a==="postBrief"){ await w(col("annonces").add({texte:briefText(),epingle:false,auteur:S.me||null,creeLe:Date.now()}),tr("Point publié dans Annonces","Update posted to Announcements")); return; }
  if(a==="accAdmin"){ const x=S.acces.find(y=>y.id===b.dataset.id); if(!x||!S.isAdmin) return; b.disabled=true;
    await w(col("acces").doc(x.id).update({admin:!x.admin}), x.admin?tr("N'est plus administrateur","No longer an admin"):tr("Est maintenant administrateur","Now an admin")); return; }
  if(a==="accDel"){ const x=S.acces.find(y=>y.id===b.dataset.id); if(!x||!S.isAdmin) return;
    confirmSheet(tr("Retirer l'accès de "+x.id+" ?","Remove access for "+x.id+"?"),tr("Cette personne ne pourra plus ouvrir le QG. Sa fiche du bureau et ses tâches restent.","This person will no longer be able to open the HQ. Their board profile and tasks remain."),tr("Retirer l'accès","Remove access"),async()=>{ await w(col("acces").doc(x.id).delete(),tr("Accès retiré","Access removed")); });
    return; }
  if(a==="exportAll"){
    const out={exporteLe:new Date().toISOString()};
    COLLS.forEach(c=>{ out[c]=S[c].map(d=>JSON.parse(JSON.stringify(d))); });
    if(S.isAdmin) out.acces=S.acces.map(d=>JSON.parse(JSON.stringify(d)));
    const url=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}));
    const l=document.createElement("a"); l.href=url; l.download="qg-comptoir-"+ymd(new Date())+".json"; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000); toast(tr("Sauvegarde téléchargée","Backup downloaded")); return;
  }
  if(a==="takeTask"){
    const me=myMember(), t=S.taches.find(x=>x.id===b.dataset.id); if(!me||!t) return;
    b.disabled=true;
    await w(col("taches").doc(t.id).update({responsable:me.id,confiePar:null,confieLe:Date.now(),majLe:Date.now()}),tr("C'est pour toi","It's yours"));
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
    let data; try{ data=JSON.parse(await f.text()); }catch(_){ toast(tr("Fichier illisible : choisis le fichier .json de sauvegarde.","Unreadable file: choose the .json backup file.")); return; }
    const writes=[];
    COLLS.forEach(c=>{ (Array.isArray(data[c])?data[c]:[]).forEach(d=>{
      if(!d||typeof d!=="object"||!d.id||!/^[\w\-.~:@+]{1,200}$/.test(d.id)) return;
      const body=JSON.parse(JSON.stringify(d)); delete body.id; delete body.uid; writes.push([c,d.id,body]); }); });
    if(!writes.length){ toast(tr("Aucune donnée du QG dans ce fichier.","No HQ data in this file.")); return; }
    confirmSheet(tr("Importer "+writes.length+" éléments ?","Import "+writes.length+" items?"),tr("Membres, rendez-vous, tâches, annonces et préparations du fichier sont ajoutés. Un élément qui existe déjà est remplacé par celui du fichier.","Members, events, tasks, announcements and preparations from the file are added. An item that already exists is replaced by the file's version."),tr("Importer","Import"),async()=>{
      try{
        for(let i=0;i<writes.length;i+=400){ const bt=S.db.batch(); writes.slice(i,i+400).forEach(([c,id,body])=>bt.set(col(c).doc(id),body)); await bt.commit(); }
        toast(writes.length+tr(" éléments importés"," items imported"));
      }catch(err){ await w(Promise.reject(err)); }
    },"gold");
    return;
  }
  if(el.dataset.assignTask){ const id=el.dataset.assignTask, v=el.value; if(!v) return; el.disabled=true;
    const me=myMember(), self=me&&me.id===v;
    await w(col("taches").doc(id).update({responsable:v,confiePar:self?null:(me?me.id:null),confieLe:Date.now(),majLe:Date.now()}),
      self?tr("C'est pour toi","It's yours"):tr("Tâche confiée à ","Task handed to ")+(((membre(v)||{}).nom||"").split(" ")[0])); return; }
  if(el.dataset.assignEv){ const id=el.dataset.assignEv; el.disabled=true;
    await w(col("evenements").doc(id).update({responsable:el.value||null,majLe:Date.now()}),tr("Responsable mis à jour","Person in charge updated")); return; }
});
document.addEventListener("submit",async e=>{
  if(["loginForm","signupForm","resetForm"].includes(e.target.id)){ e.preventDefault(); authSubmit(e.target); return; }
  if(e.target.id==="accForm"){
    e.preventDefault(); if(!S.db||!S.isAdmin) return;
    const mail=$("#acc-mail").value.trim().toLowerCase(), role=$("#acc-role").value;
    if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)){ toast(tr("Adresse e-mail invalide.","Invalid e-mail address.")); return; }
    let body, nom;
    if(role==="bureau"){
      const mem=$("#acc-mem").value; if(!membre(mem)){ toast(tr("Choisis la fiche du bureau de cette personne.","Choose this person's board profile.")); return; }
      body={role:"bureau",membreId:mem,admin:$("#acc-admin").checked}; nom=membre(mem).nom;
    } else {
      nom=$("#acc-nom").value.trim(); if(!nom){ toast(tr("Indique le prénom et le nom du membre.","Enter the member's first and last name.")); return; }
      body={role:"membre",nom,admin:false};
    }
    Object.assign(body,{ajoutePar:S.me||null,ajouteLe:Date.now()});
    const ok=await w(col("acces").doc(mail).set(body),tr("Accès ouvert pour ","Access granted to ")+nom.split(" ")[0]);
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
  const ok=await w(col("annonces").add({texte:txt,epingle:pin,auteur:S.me||null,creeLe:Date.now()}),tr("Annonce publiée","Announcement posted"));
  if(!ok && $("#annTxt")) $("#annTxt").value=txt;
});

/* ---------- Démarrage ---------- */
const VALID=["agenda","taches","annonces","idees","revisions","coord","bureau"];
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
  const who=(S.email||"QG du Comptoir")+" · "+new Intl.DateTimeFormat(tr("fr-FR","en-GB"),{day:"numeric",month:"short"}).format(new Date());
  return '<div class="filigrane'+(fixe?" fixe":"")+'" aria-hidden="true">'+Array.from({length:fixe?140:60},()=>'<span>'+esc(who)+'</span>').join("")+'</div>';
}
function renderRevisions(){
  const it=S.rev&&S.revisions.find(r=>r.id===S.rev.id);
  if(it) return it.type==="quiz"? renderQuiz(it) : renderFiche(it);
  let h='<div class="sechead"><h2>'+REV()+'</h2></div><p class="help">'+tr("Fiches et quiz du club, à faire ici : ils ne se téléchargent pas et restent réservés aux inscrits.","The club's revision sheets and quizzes, to use here: they can't be downloaded and are for members only. The courses are taught in French, so most of the content is in French.")+'</p>';
  if(!loadedAll()) return h+'<div class="empty"><b>'+LOADING()+'</b></div>';
  if(!S.revisions.length) return h+'<div class="empty"><b>'+tr("Rien pour l'instant","Nothing yet")+'</b><span>'+tr("Les fiches et les quiz de chaque cours apparaîtront ici.","Each course's sheets and quizzes will appear here.")+'</span></div>';
  const groups={};
  [...S.revisions].sort((a,b)=>(a.matiere||"").localeCompare(b.matiere||"")||(a.ordre??99)-(b.ordre??99)).forEach(r=>{ (groups[r.matiere||tr("Autres","Other")]=groups[r.matiere||tr("Autres","Other")]||[]).push(r); });
  h+='<div class="revlist">';
  for(const [mat,list] of Object.entries(groups)){
    h+='<section class="revgroup"><h3>'+esc(mat)+'</h3>';
    for(const r of list){
      const quiz=r.type==="quiz", n=quiz?(r.questions||[]).length:(r.pages||r.sections||[]).length, err=quiz?revErrors(r.id).length:0;
      h+='<div class="revcard"><div class="ico">'+(quiz?tr("QCM","Quiz"):tr("Fiche","Sheet"))+'</div><div><div class="ttl">'+esc(r.titre)+'</div><div class="sub2">'+
        (quiz? n+' questions'+(err?' · '+err+' '+pl(err,"erreur à revoir","erreurs à revoir","mistake to review","mistakes to review"):"") : esc(r.resume||(n+' '+pl(n,"fiche","fiches","sheet","sheets"))))+'</div></div>'+
        '<button class="btn small gold" data-act="revOpen" data-id="'+esc(r.id)+'">'+(quiz?tr("Commencer","Start"):tr("Ouvrir","Open"))+'</button></div>';
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
  const back='<button class="btn ghost small" data-act="revBack">← '+REV()+'</button>';
  let h='<div class="sechead"><h2>'+esc(it.titre)+'</h2>'+back+'</div><div class="quiz">'+filigrane();
  if(st.step==="setup"){
    const counts={}; qs.forEach(q=>counts[q.p]=(counts[q.p]||0)+1);
    const pool=quizPool(it).length, err=revErrors(it.id).filter(i=>i<qs.length);
    h+='<p class="help" style="margin:0">'+esc(it.source||"")+'</p><b>'+tr("Parties du cours","Course parts")+'</b><div class="qparts">'+
      (parts.length?parts:[{id:undefined,name:tr("Tout le cours","Whole course")}]).map(p=>'<label class="qpart"><input type="checkbox" data-rev-part="'+esc(p.id)+'"'+(st.parts.has(p.id)?" checked":"")+'><span><b>'+esc(p.name)+'</b><small>'+esc(p.sub||"")+' · '+(counts[p.id]||0)+' q.</small></span></label>').join("")+'</div>'+
      '<b>'+tr("Nombre de questions","Number of questions")+'</b><div class="qseg">'+["10","20","40","tout"].map(v=>'<label><input type="radio" name="revnb" value="'+v+'"'+(st.nb===v?" checked":"")+'> '+(v==="tout"?tr("Tout","All")+" ("+pool+")":v)+'</label>').join("")+'</div>'+
      '<div class="row" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" data-act="revStart"'+(pool?"":" disabled")+'>'+tr("Commencer","Start")+'</button>'+
      (err.length?'<button class="btn" data-act="revErr">'+REDO()+' ('+err.length+')</button>':"")+'</div>';
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
      h+='<div class="qfb '+(ok?"ok":"ko")+'"><b>'+(ok?tr("Bonne réponse","Correct"):tr("Raté. Bonne réponse : ","Not quite. The right answer: ")+esc(q.o[q.a]))+'</b>'+(q.e?'<span>'+esc(q.e)+'</span>':"")+'</div>'+
        '<div><button class="btn gold" data-act="revNext">'+(st.pos+1<st.order.length?tr("Question suivante","Next question"):tr("Voir mon score","See my score"))+'</button></div>';
    }
  } else {
    const n=st.order.length, pct=n?Math.round(st.bons/n*100):0;
    h+='<div class="qbig">'+st.bons+'/'+n+'</div><p style="margin:0;font-weight:700">'+tr(pct+" % de bonnes réponses"+(pct>=80?" : excellent !":pct>=50?" : continue comme ça.":" : refais tes erreurs pour progresser."),pct+"% correct"+(pct>=80?": excellent!":pct>=50?": keep it up.":": redo your mistakes to improve."))+'</p>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap">'+(st.rates.length?'<button class="btn gold" data-act="revRedo">'+REDO()+' ('+st.rates.length+')</button>':"")+'<button class="btn" data-act="revNew">'+tr("Nouveau quiz","New quiz")+'</button></div>';
    if(st.rates.length){
      h+='<b>'+tr("À revoir","To review")+'</b>'+st.rates.map(i=>{ const q=qs[i]; return '<div class="qmiss"><span class="n">'+esc((parts.find(p=>p.id===q.p)||{}).name||"")+'</span><span>'+esc(q.q)+'</span><span><b>'+esc(q.o[q.a])+'</b></span>'+(q.e?'<span class="qsrc">'+esc(q.e)+'</span>':"")+'</div>'; }).join("");
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
    return '<div class="sechead"><h2>'+esc(it.titre)+'</h2><button class="btn ghost small" data-act="revBack">← '+REV()+'</button></div>'+
      (it.source?'<p class="help">'+esc(it.source)+'</p>':"")+
      filigrane(true)+'<div class="fdoc">'+ficheRiche(it)+'</div>';
  }
  let h='<div class="sechead"><h2>'+esc(it.titre)+'</h2><button class="btn ghost small" data-act="revBack">← '+REV()+'</button></div><div class="quiz fiche">'+filigrane();
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
  if(protege() && (e.key||"").toLowerCase()==="printscreen"){ voile(true,1500); try{ navigator.clipboard.writeText(tr("Contenu protégé : QG du Comptoir","Protected content: Le Comptoir HQ")).catch(()=>{}); }catch(_){} }
});
window.addEventListener("beforeprint",()=>voile(true,3000));

/* ---------- Connexion (Firebase) ---------- */
let unsubs=[], dataTimer=null;
function stopData(){
  unsubs.forEach(u=>{ try{u();}catch(_){} }); unsubs=[]; clearTimeout(dataTimer);
  S.db=null; S.loaded={}; S.live=false; S.slow=false; COLLS.forEach(c=>S[c]=[]); S.acces=[]; S.revisions=[]; S.rev=null; S.ideesKo=false; S.uid=null;
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
      if(name==="idees"){ S.ideesKo=true; fresh.idees=true; if(COLLS.every(k=>fresh[k])){ S.live=true; S.slow=false; clearTimeout(dataTimer); } }   /* boîte à idées pas encore autorisée : le reste du QG marche */
      else if(err&&err.code==="permission-denied" && name!=="acces"){ stopData(); S.denied=true; }
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
    S.email=mail; S.uid=u.uid; S.bureau=roleOf(acc)==="bureau"||mail===OWNER;
    S.me=S.bureau?(acc.membreId||null):"e:"+mail; S.myName=S.bureau?"":(acc.nom||"");
    S.isAdmin=S.bureau&&(!!acc.admin||mail===OWNER); S.isOwner=S.isAdmin; S.canWrite=S.bureau; S.db=fs;
    render(); startData(fs); enableNotifs(false);
  }catch(e){
    S.authMsg={t:tr("Impossible de vérifier ton accès : vérifie ta connexion internet, puis reconnecte-toi.","Couldn't check your access: check your internet connection, then sign in again.")};
    try{ await S.auth.signOut(); }catch(_){}
    render();
  }
}
const AUTH_ERR=()=>tr({
  "auth/invalid-credential":"Adresse ou mot de passe incorrect.","auth/wrong-password":"Adresse ou mot de passe incorrect.",
  "auth/user-not-found":"Adresse ou mot de passe incorrect.","auth/invalid-login-credentials":"Adresse ou mot de passe incorrect.",
  "auth/invalid-email":"Adresse e-mail invalide.","auth/missing-password":"Indique ton mot de passe.",
  "auth/email-already-in-use":"Un accès existe déjà avec cette adresse : connecte-toi, ou utilise « Mot de passe oublié ».",
  "auth/weak-password":"Mot de passe trop court : 8 caractères minimum.",
  "auth/too-many-requests":"Trop d'essais d'affilée. Attends quelques minutes avant de réessayer.",
  "auth/network-request-failed":"Pas de connexion internet. Vérifie ton réseau et réessaie.",
  "auth/user-disabled":"Ce compte a été désactivé. Contacte Lucas."
},{
  "auth/invalid-credential":"Wrong address or password.","auth/wrong-password":"Wrong address or password.",
  "auth/user-not-found":"Wrong address or password.","auth/invalid-login-credentials":"Wrong address or password.",
  "auth/invalid-email":"Invalid e-mail address.","auth/missing-password":"Enter your password.",
  "auth/email-already-in-use":"An access already exists for this address: sign in, or use “Forgot password”.",
  "auth/weak-password":"Password too short: 8 characters minimum.",
  "auth/too-many-requests":"Too many attempts in a row. Wait a few minutes before trying again.",
  "auth/network-request-failed":"No internet connection. Check your network and try again.",
  "auth/user-disabled":"This account has been disabled. Contact Lucas."
});
const authErr = e => ({t:AUTH_ERR()[e&&e.code]||tr("La connexion a échoué. Réessaie dans un instant.","Sign-in failed. Try again in a moment.")});
const backUrl = () => ({url:location.origin+location.pathname});
async function authSubmit(form){
  const btn=form.querySelector("button[type=submit]"), q=s=>form.querySelector(s);
  const mail=(q("input[type=email]").value||"").trim(), pwEl=q("input[type=password],input[data-pw]"), pw=pwEl?pwEl.value:"";
  S.authEmail=mail;
  if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail)){ S.authMsg={t:tr("Indique une adresse e-mail valide.","Enter a valid e-mail address.")}; render(); return; }
  if(form.id!=="resetForm" && pw.length<8){ S.authMsg={t:form.id==="signupForm"?tr("Choisis un mot de passe d'au moins 8 caractères.","Choose a password of at least 8 characters."):tr("Indique ton mot de passe.","Enter your password.")}; render(); return; }
  btn.disabled=true; const label=btn.textContent; btn.textContent=tr("Un instant…","One moment…");
  try{
    await S.persist;
    if(form.id==="loginForm"){ await S.auth.signInWithEmailAndPassword(mail,pw); S.authMsg=null; }
    else if(form.id==="signupForm"){ const cr=await S.auth.createUserWithEmailAndPassword(mail,pw); S.authMsg=null; await cr.user.sendEmailVerification(backUrl()); }
    else { await S.auth.sendPasswordResetEmail(mail,backUrl()); S.authView="login"; S.authMsg={ok:true,t:tr("Si cette adresse a un accès, un lien pour changer le mot de passe vient d'y être envoyé.","If this address has access, a link to change the password has just been sent to it.")}; render(); }
  }catch(e){ S.authMsg=authErr(e); render(); }
  finally{ if(document.body.contains(btn)){ btn.disabled=false; btn.textContent=label; } }
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-auth]"); if(!b) return;
  const a=b.dataset.auth;
  if(a==="view"){ const m=$("#view input[type=email]"); if(m) S.authEmail=m.value.trim(); S.authView=b.dataset.v; S.authMsg=null; render(); return; }
  if(a==="showpw"){ const i=document.getElementById(b.dataset.for); if(!i) return; const show=i.type==="password"; i.type=show?"text":"password"; i.toggleAttribute("data-pw",show); b.textContent=show?tr("Masquer","Hide"):tr("Afficher","Show"); return; }
  if(a==="logout"){ S.authView="login"; S.authMsg=null; try{ await S.auth.signOut(); }catch(_){} return; }
  if(a==="install"&&S.installEvt){ const ev=S.installEvt; S.installEvt=null; try{ await ev.prompt(); }catch(_){} render(); return; }
  if(!S.authUser) return;
  if(a==="notifOn"){ b.disabled=true; await enableNotifs(true); return; }
  if(a==="notifHide"){ lsSet(b.dataset.k,"1"); renderNotifBar(); return; }
  if(a==="resend"){ b.disabled=true;
    try{ await S.authUser.sendEmailVerification(backUrl()); S.authMsg={ok:true,t:tr("Lien renvoyé à ","Link sent again to ")+S.authUser.email+"."}; }catch(err){ S.authMsg=authErr(err); }
    render(); return; }
  if(a==="verified"){ b.disabled=true;
    try{ await S.authUser.reload(); }catch(_){}
    const u=S.auth.currentUser; S.authUser=u;
    if(u&&u.emailVerified){ S.authMsg=null; S.lastGate=""; await enter(u); }
    else { S.authMsg={t:tr("Ton adresse n'est pas encore confirmée. Ouvre le lien reçu par e-mail, puis réessaie.","Your address isn't confirmed yet. Open the link in the e-mail, then try again.")}; render(); }
    return; }
});
$("#langBtn").addEventListener("click",()=>setLang(LANG==="en"?"fr":"en"));
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
      if(ios && !standalone && !lsGet("qg-notif-ios")) h='<span>'+tr("<b>Notifications :</b> sur iPhone, installe d'abord l'appli (Partager, puis « Sur l'écran d'accueil ») et ouvre-la depuis son icône.","<b>Notifications:</b> on iPhone, first install the app (Share, then “Add to Home Screen”) and open it from its icon.")+'</span><button class="linkbtn" data-auth="notifHide" data-k="qg-notif-ios">'+LATER()+'</button>';
    } else if(Notification.permission==="default" && !lsGet("qg-notif-plustard")){
      h='<span>'+tr("<b>Notifications</b> : nouvelles annonces, rendez-vous ajoutés ou modifiés, et un rappel 2 h avant chaque rendez-vous.","<b>Notifications</b>: new announcements, events added or changed, and a reminder 2 hours before each event.")+'</span><span class="nb-acts"><button class="btn small gold" data-auth="notifOn">'+tr("Activer","Turn on")+'</button><button class="linkbtn" data-auth="notifHide" data-k="qg-notif-plustard">'+LATER()+'</button></span>';
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
      if(p!=="granted"){ toast(p==="denied"?tr("Notifications refusées : tu peux les autoriser dans les réglages du navigateur.","Notifications blocked: you can allow them in your browser settings."):tr("Notifications pas activées.","Notifications not turned on.")); renderNotifBar(); return; }
    }
    if(Notification.permission!=="granted"){ renderNotifBar(); return; }
    const reg=await waitActive(await navigator.serviceWorker.register("assets/qg/sw.js",{scope:"assets/qg/"}));
    const tok=await firebase.messaging().getToken({vapidKey:window.QG_FIREBASE.vapidKey,serviceWorkerRegistration:reg});
    if(tok){
      const ua=navigator.userAgent, app=/iphone|ipad|ipod/i.test(ua)?"iPhone":/android/i.test(ua)?"Android":"Ordinateur";
      await S.db.collection("jetons").doc(tok).set({mail:S.email,appareil:app,langue:LANG,majLe:Date.now()});
      if(ask) toast(tr("Notifications activées sur cet appareil","Notifications on for this device"));
    }
  }catch(e){ if(ask) toast(tr("Impossible d'activer les notifications sur cet appareil. Réessaie depuis l'appli installée.","Couldn't turn on notifications on this device. Try again from the installed app.")); }
  renderNotifBar();
}

(function init(){
  const cfg=window.QG_FIREBASE;
  if(!window.firebase||!cfg||!cfg.apiKey){ S.noConfig=true; S.ready=true; render(); return; }
  firebase.initializeApp(cfg);
  S.auth=firebase.auth(); S.auth.languageCode=LANG;
  S.persist=S.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(()=>{});
  S.auth.onAuthStateChanged(u=>{ S.authUser=u; S.ready=true; S.lastGate=""; enter(u); });
})();
})();
