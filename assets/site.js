const navItems = [
  {label:'Accueil', href:'index.html'},
  {label:'Le club', href:'club.html'},
  {label:'Événements', href:'evenements.html'},
  {label:'Le jeu', href:'jeu.html'},
  {label:'Le bureau', href:'bureau.html'},
  {label:'Partenaires', href:'partenaires.html'},
  {label:'Merch', href:'merch.html'},
  {label:'Rejoindre', href:'rejoindre.html'}
];
const boardMembers = [
  {role:'Présidence', name:'Lucas Denis', bio:'Président · pilote les décisions et la relation avec les partenaires.'},
  {role:'Vice-présidence', name:'Yasmine Martin', bio:'Coordonne les missions de l’équipe et les suivis internes.'},
  {role:'Événements', name:'Noah Girard', bio:'Programme les Comptoirs, les Sorties Terrain et les Meet and Talk.'},
  {role:'Partenariats', name:'Marie Chardon', bio:'Développe les relations avec les structures et les intervenants.'},
  {role:'Trésorerie', name:'Léo Moreau', bio:'Gère les financements, les cotisations et les remboursements.'},
  {role:'Communication', name:'Inès Dupont', bio:'Met en valeur le club sur les réseaux et dans les supports.'}
];
const partnersList = [
  'Nantes Métropole','Audencia','Auberge de Jeunesse','Mairie de Nantes','Caisse d’Épargne','Bureau des Clubs'
];
const eventsList = [
  {type:'Comptoir', title:'Le droit dans la vie de tous les jours', date:'Mercredi 9 octobre', place:'Maison des étudiants', desc:'Un débat sur le droit des contrats, l’entreprise et la vie de tous les jours.'},
  {type:'Meet and Talk', title:'Rencontre avec une dirigeante', date:'Jeudi 17 octobre', place:'City Campus', desc:'Une séance de questions-réponses avec une dirigeante de PME.'},
  {type:'Sortie Terrain', title:'Tribunal de commerce', date:'Samedi 26 octobre', place:'Nantes', desc:'Visite du tribunal et échanges sur les métiers juridiques.'},
  {type:'Conférence', title:'Marketing et influence', date:'Mercredi 13 novembre', place:'Audencia', desc:'Le marketing de marque dans les universités et les réseaux.'},
  {type:'Comptoir', title:'Négociation et prise de parole', date:'Mercredi 20 novembre', place:'Café partenaire', desc:'S’entraîner à la négociation en anglais et en français.'}
];
const merchList = [
  {name:'La veste du Comptoir', tag:'Vêtement', price:'À venir', desc:'Veste universitaire bleu marine et logo du club.'},
  {name:'Le sweat à capuche', tag:'Textile', price:'À venir', desc:'Le classique du club, chaud et confortable.'},
  {name:'La bouteille isotherme', tag:'Accessoire', price:'À venir', desc:'Pour les trajets et les journées longues.'},
  {name:'Le sac à dos', tag:'Utilitaire', price:'À venir', desc:'Un compagnon de cours, de stage et de sorties.'}
];
const topics = [
  'Quel sujet vous ferait voir le public d’un débat ?','Comment convaincre sans imposer ?','Que faut-il retenir d’un contrat ?','Comment défendre une idée à voix haute ?','Quelle décision prend un chef ?'
];

function createHeader() {
  const header = document.getElementById('hd');
  if (!header) return;
  const nav = navItems.map(item => `<a href="${item.href}">${item.label}</a>`).join('');
  header.innerHTML = `
    <div class="wrap">
      <a class="brand" href="index.html"><span class="brand-mark">LC</span><span>Le Comptoir</span></a>
      <nav>${nav}</nav>
      <button class="lang" type="button" data-lang-toggle>FR / EN</button>
    </div>
  `;
  const btn = header.querySelector('[data-lang-toggle]');
  btn.addEventListener('click', () => {
    const current = localStorage.getItem('lc_lang') || 'fr';
    const next = current === 'fr' ? 'en' : 'fr';
    localStorage.setItem('lc_lang', next);
    applyLanguage();
  });
}

function createFooter() {
  const footer = document.getElementById('ft');
  if (!footer) return;
  footer.innerHTML = `
    <div class="wrap" style="padding:26px 0 42px; color:var(--muted); display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;">
      <div>© Le Comptoir · Club étudiant d’Audencia</div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;">
        <a href="mentions.html">Mentions légales</a>
        <a href="confidentialite.html">Confidentialité</a>
        <a href="conditions.html">Conditions</a>
      </div>
    </div>
  `;
}

function renderBoard() {
  const el = document.getElementById('board');
  if (!el) return;
  el.innerHTML = boardMembers.map(member => `
    <article class="board-card">
      <div class="role">${member.role}</div>
      <h4>${member.name}</h4>
      <p class="bio">${member.bio}</p>
    </article>
  `).join('');
}

function renderRoster() {
  const el = document.getElementById('roster');
  if (!el) return;
  el.innerHTML = boardMembers.slice(0,4).map(member => `<li><b>${member.name}</b><span>${member.role}</span></li>`).join('');
}

function renderPartners() {
  const el = document.getElementById('partners');
  if (!el) return;
  el.innerHTML = '<div class="board">'+partnersList.map(p => `<article class="partner-card board-card"><h4>${p}</h4><p class="bio">Partenaire du club pour les Comptoirs, les Meet and Talk et les sorties terrain.</p></article>`).join('')+'</div>';
}

function renderProducts() {
  const el = document.getElementById('products');
  if (!el) return;
  el.innerHTML = merchList.map(product => `
    <article class="product-card">
      <span class="tag">${product.tag}</span>
      <h4>${product.name}</h4>
      <p>${product.desc}</p>
      <strong>${product.price}</strong>
    </article>
  `).join('');
}

function renderEvents() {
  const el = document.getElementById('events');
  if (!el) return;
  const limit = Number(el.dataset.limit || 0);
  const data = limit ? eventsList.slice(0, limit) : eventsList;
  el.innerHTML = data.map(event => `
    <article class="ticket-card">
      <div class="meta"><span>${event.type}</span><span>${event.date}</span></div>
      <h4>${event.title}</h4>
      <div class="soft">${event.place}</div>
      <p>${event.desc}</p>
    </article>
  `).join('');

  const filters = document.getElementById('filters');
  if (!filters) return;
  const types = ['Tous', ...new Set(eventsList.map(e => e.type))];
  filters.innerHTML = types.map((type, idx) => `<button class="chip ${idx===0?'active':''}" type="button" data-filter="${type}">${type}</button>`).join('');
  filters.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
    const type = chip.dataset.filter;
    filters.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    const visible = type === 'Tous' ? eventsList : eventsList.filter(e => e.type === type);
    el.innerHTML = visible.map(event => `
      <article class="ticket-card">
        <div class="meta"><span>${event.type}</span><span>${event.date}</span></div>
        <h4>${event.title}</h4>
        <div class="soft">${event.place}</div>
        <p>${event.desc}</p>
      </article>
    `).join('');
  }));
}

function hookForms() {
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const msg = form.querySelector('.msg');
      if (msg) msg.textContent = 'Merci, votre message a bien été pris en compte.';
      form.reset();
    });
  });
}

function applyLanguage() {
  const lang = localStorage.getItem('lc_lang') || 'fr';
  document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
  document.querySelectorAll('[data-en]').forEach(node => {
    const text = node.getAttribute('data-en');
    if (lang === 'en' && text) {
      if (node.tagName === 'Q') node.textContent = text;
      else if (node.tagName === 'A' || node.tagName === 'SPAN' || node.tagName === 'BUTTON' || node.tagName === 'LI' || node.tagName === 'P' || node.tagName === 'H1' || node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'B') node.textContent = text;
    }
  });
}

function drawTopic() {
  const el = document.getElementById('topic');
  if (!el) return;
  if (!document.getElementById('draw')) return;
  const q = el.querySelector('q');
  const btn = document.getElementById('draw');
  btn.addEventListener('click', () => {
    const item = topics[Math.floor(Math.random() * topics.length)];
    q.textContent = item;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  createHeader();
  createFooter();
  renderBoard();
  renderRoster();
  renderPartners();
  renderProducts();
  renderEvents();
  hookForms();
  drawTopic();
  applyLanguage();
});
