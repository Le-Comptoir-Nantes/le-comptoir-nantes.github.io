#!/usr/bin/env python3
"""Générateur commun : fiches (HTML) + quiz (HTML) à partir d'un module de contenu par cours.
Usage : python3 gen.py <dossier_cours>   (le dossier contient content.py avec COURSE, FICHES, QUIZ)
"""
import json, sys, importlib.util, random, re, html
from pathlib import Path

PALETTE = [  # (encre du bandeau, fond pastel, surligneur)
    ("#d6336c", "#fff0f6", "#ffd1e6"),
    ("#1c7ed6", "#e7f5ff", "#c5e7ff"),
    ("#2b8a3e", "#ebfbee", "#c9f5d3"),
    ("#e8590c", "#fff4e6", "#ffdcb8"),
    ("#7048e8", "#f3f0ff", "#ded5ff"),
    ("#0c8599", "#e3fafc", "#c3f1f7"),
    ("#c2255c", "#fff0f6", "#fcc2d7"),
    ("#5c940d", "#f4fce3", "#d8f5a2"),
]

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kaushan+Script&family=Caveat:wght@500;700&family=Nunito:ital,wght@0,400;0,600;0,800;1,400&display=swap">'

BASE_CSS = r"""
/* Cahier quadrillé : bandeaux manuscrits, une couleur par fiche, encadrés colorés. Thème clair unique (papier). */
:root{
  --paper:#fffef9; --grid:#dfe8f1; --ink:#22262e; --muted:#5b6472; --line:#c9d3df;
  --hl:#fff27a; --def:#1c7ed6; --att:#e03131; --ex:#2b8a3e; --art:#7048e8; --tip:#e8590c; --quiz:#0c8599;
  --f-title:"Kaushan Script","Segoe Script","Brush Script MT",cursive;
  --f-hand:"Caveat","Segoe Print","Comic Sans MS",cursive;
  --f-body:"Nunito","Segoe UI",system-ui,sans-serif;
  color-scheme:light;
}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--f-body);font-size:16px;line-height:1.55;
  background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
  background-size:22px 22px;}
.wrap{max-width:900px;margin:0 auto;padding-block:24px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
h1,h2,h3{text-wrap:balance}
mark{background:linear-gradient(transparent 35%,var(--hl) 35%,var(--hl) 92%,transparent 92%);color:inherit;padding:0 2px}
a{color:#1864ab}
:focus-visible{outline:3px solid #1c7ed6;outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
"""

FICHE_CSS = r"""
.cover{text-align:center;padding:12px 0 8px}
.cover .eyebrow{font-family:var(--f-hand);font-size:1.5rem;color:var(--muted)}
.cover h1{font-family:var(--f-title);font-weight:400;font-size:clamp(2.2rem,7vw,3.6rem);margin:.1em 0;color:#d6336c;transform:rotate(-1.5deg)}
.cover p{max-width:62ch;margin:.4em auto;color:var(--muted)}
.legend{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:14px 0 4px}
.legend span{font-size:.8rem;font-weight:800;letter-spacing:.04em;padding:3px 10px;border-radius:999px;border:2px solid currentColor;background:#fff}
.toc{background:#fff;border:2px dashed var(--line);border-radius:14px;padding:14px 18px;margin:18px 0 30px}
.toc h2{font-family:var(--f-title);font-weight:400;margin:0 0 6px;font-size:1.7rem}
.toc ol{margin:0;padding-left:0;list-style:none;columns:2;column-gap:28px}
.toc li{break-inside:avoid;margin:3px 0}
.toc a{text-decoration:none;color:var(--ink);border-bottom:2px solid var(--hl)}
@media (max-width:640px){.toc ol{columns:1}}
.fiche{--c:#d6336c;--bg:#fff0f6;--hl:#ffd1e6;background:#fff;border:2px solid var(--c);border-radius:6px 18px 8px 16px;margin:0 0 34px;box-shadow:4px 5px 0 var(--bg);overflow:hidden}
.fiche>header{background:var(--c);color:#fff;padding:12px 18px 10px;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.fiche>header .num{font-family:var(--f-hand);font-size:1.6rem;font-weight:700;background:#fff;color:var(--c);border-radius:999px;padding:0 12px;line-height:1.5}
.fiche>header h2{font-family:var(--f-title);font-weight:400;margin:0;font-size:clamp(1.5rem,4.5vw,2.1rem);flex:1;min-width:0}
.fiche>header .pages{font-family:var(--f-hand);font-size:1.15rem;opacity:.95}
.fiche .body{padding:14px 18px 18px;display:flex;flex-direction:column;gap:12px}
.fiche h3{font-family:var(--f-hand);font-size:1.6rem;margin:6px 0 0;color:var(--c);line-height:1.1}
.fiche h3::after{content:"";display:block;height:6px;width:70px;background:var(--hl);border-radius:4px;margin-top:2px}
.fiche p,.fiche ul,.fiche ol{margin:0}
.fiche ul,.fiche ol{padding-left:1.3em}
.fiche li{margin:3px 0}
.fiche mark{--hl:inherit}
.box{border-left:6px solid var(--k);background:color-mix(in srgb,var(--k) 8%,#fff);border-radius:4px 12px 12px 4px;padding:10px 14px;position:relative}
.box>.lab{font-family:var(--f-hand);font-weight:700;font-size:1.3rem;color:var(--k);display:block;line-height:1.1;margin-bottom:2px}
.box.def{--k:var(--def)} .box.att{--k:var(--att)} .box.ex{--k:var(--ex)} .box.art{--k:var(--art)} .box.tip{--k:var(--tip)} .box.quiz{--k:var(--quiz)} .box.comp{--k:#868e96}
.box.att{border:2px dashed var(--att);border-left-width:6px}
.tbl{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%;font-size:.93rem;background:#fff}
th,td{border:1.5px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left}
th{background:var(--bg);color:var(--c);font-weight:800}
.flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.flow>span{background:var(--bg);border:2px solid var(--c);border-radius:10px;padding:4px 10px;font-weight:700}
.flow>i{font-style:normal;font-weight:800;color:var(--c)}
.vark{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:4px}
@media (max-width:640px){.vark{grid-template-columns:1fr}}
.vark>div{border:2px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff;min-width:0}
.vark>div>b{font-family:var(--f-hand);font-size:1.35rem;display:block;line-height:1.1;margin-bottom:4px}
.vark .V>b{color:#1c7ed6}.vark .A>b{color:#d6336c}.vark .R>b{color:#2b8a3e}.vark .K>b{color:#e8590c}
details{border-top:1px dashed var(--line);margin-top:6px;padding-top:6px}
summary{cursor:pointer;font-weight:800;color:var(--c)}
.say{font-family:var(--f-hand);font-size:1.35rem;line-height:1.25}
.tag{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:1px 8px;background:var(--bg);color:var(--c);border:1.5px solid var(--c)}
.note{font-size:.88rem;color:var(--muted)}
.top{display:inline-block;margin-top:8px;font-size:.85rem}
footer.end{text-align:center;color:var(--muted);font-size:.85rem;margin-top:30px}
"""

QUIZ_CSS = r"""
.qhead{text-align:center;padding:6px 0 4px}
.qhead .eyebrow{font-family:var(--f-hand);font-size:1.4rem;color:var(--muted)}
.qhead h1{font-family:var(--f-title);font-weight:400;font-size:clamp(2rem,6vw,3rem);margin:.1em 0;color:#1c7ed6;transform:rotate(-1deg)}
.card{background:#fff;border:2px solid #1c7ed6;border-radius:8px 18px 10px 16px;box-shadow:4px 5px 0 #e7f5ff;padding:16px 18px;margin-top:16px}
.card h2{font-family:var(--f-hand);font-size:1.7rem;margin:0 0 6px;color:#1c7ed6}
.parts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px}
@media (max-width:640px){.parts{grid-template-columns:1fr}}
.parts label,.opt-row label{display:flex;gap:8px;align-items:flex-start;cursor:pointer;min-width:0}
.parts small{color:var(--muted)}
.opt-row{display:flex;flex-wrap:wrap;gap:8px 18px;margin:6px 0}
.btn{font:inherit;font-weight:800;border:2px solid #1c7ed6;background:#1c7ed6;color:#fff;border-radius:999px;padding:9px 18px;cursor:pointer}
.btn.ghost{background:#fff;color:#1c7ed6}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.bar{height:12px;border-radius:999px;background:#e9ecef;overflow:hidden;border:1.5px solid var(--line)}
.bar>i{display:block;height:100%;width:0;background:repeating-linear-gradient(45deg,#1c7ed6 0 10px,#4dabf7 10px 20px);transition:width .3s}
.meta{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-weight:800;color:var(--muted);margin:8px 0;font-variant-numeric:tabular-nums}
.part-tag{display:inline-block;font-size:.75rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:2px 10px;border-radius:999px;background:#e7f5ff;color:#1864ab;border:1.5px solid #1c7ed6}
.question{font-size:1.15rem;font-weight:800;margin:10px 0 12px}
.opts{display:flex;flex-direction:column;gap:8px}
.opt{font:inherit;text-align:left;display:flex;gap:10px;align-items:flex-start;background:#fff;border:2px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;color:var(--ink)}
.opt:hover:not(:disabled){border-color:#1c7ed6;background:#f8fbff}
.opt .k{flex:0 0 auto;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:#e7f5ff;color:#1864ab}
.opt.good{border-color:#2b8a3e;background:#ebfbee}.opt.good .k{background:#2b8a3e;color:#fff}
.opt.bad{border-color:#e03131;background:#fff5f5}.opt.bad .k{background:#e03131;color:#fff}
.opt:disabled{cursor:default}
.fb{margin-top:12px;border-radius:12px;padding:10px 14px;border-left:6px solid}
.fb.ok{background:#ebfbee;border-color:#2b8a3e}.fb.ko{background:#fff5f5;border-color:#e03131}
.fb b{font-family:var(--f-hand);font-size:1.35rem}
.big{font-family:var(--f-title);font-size:3rem;color:#1c7ed6;line-height:1;margin:6px 0}
.errs{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.errs div{border:1.5px solid var(--line);border-radius:10px;padding:8px 10px;background:#fff}
.errs .ga{color:#2b8a3e;font-weight:800}
.hint{font-size:.85rem;color:var(--muted)}
"""

def esc(s):
    return html.escape(s, quote=True)

def build_fiches(course, fiches, extra_sections):
    toc = "\n".join(f'<li><a href="#{f["id"]}">{esc(f["num"])} — {esc(f["title"])}</a></li>' for f in fiches + extra_sections)
    parts = []
    for i, f in enumerate(fiches + extra_sections):
        c, bg, hl = PALETTE[i % len(PALETTE)]
        pages = f'<span class="pages">{esc(f["pages"])}</span>' if f.get("pages") else ""
        parts.append(f'''<section class="fiche" id="{f["id"]}" style="--c:{c};--bg:{bg};--hl:{hl}">
<header><span class="num">{esc(f["num"])}</span><h2>{esc(f["title"])}</h2>{pages}</header>
<div class="body">{f["html"]}<a class="top" href="#sommaire">↑ Sommaire</a></div></section>''')
    return f'''<title>{esc(course["fiche_title"])}</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>{BASE_CSS}{FICHE_CSS}</style>
<div class="wrap">
<div class="cover"><div class="eyebrow">{esc(course["eyebrow"])}</div><h1>{esc(course["name"])}</h1><p>{course["intro"]}</p>
<div class="legend"><span style="color:var(--def)">Définition</span><span style="color:var(--att)">Attention</span><span style="color:var(--ex)">Exemple</span><span style="color:var(--art)">Texte / règle</span><span style="color:var(--tip)">Astuce</span><span style="color:var(--quiz)">Quiz</span><span style="color:#868e96">Complément</span></div></div>
<nav class="toc" id="sommaire"><h2>Sommaire</h2><ol>{toc}</ol></nav>
{"".join(parts)}
<footer class="end">{esc(course["footer"])}</footer>
</div>'''

QUIZ_JS = r"""
const DATA = __DATA__;
const PARTS = __PARTS__;
const $ = s => document.querySelector(s);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let run = null;
function buildHome() {
  const box = $('#parts'); box.innerHTML = '';
  PARTS.forEach((p, i) => {
    const n = DATA.filter(q => q.p === p).length;
    const l = document.createElement('label');
    l.innerHTML = `<input type="checkbox" id="part${i}" value="${i}" checked> <span>${p} <small>(${n})</small></span>`;
    box.appendChild(l);
  });
  $('#total').textContent = DATA.length;
}
function selected() { return [...document.querySelectorAll('#parts input:checked')].map(x => PARTS[+x.value]); }
function start(list) {
  const mode = document.querySelector('input[name=mode]:checked').value;
  let qs = list;
  if (!qs) {
    const ps = selected();
    if (!ps.length) { $('#warn').hidden = false; return; }
    $('#warn').hidden = true;
    qs = DATA.filter(q => ps.includes(q.p));
    const n = document.querySelector('input[name=nb]:checked').value;
    if (mode === 'mix') qs = shuffle(qs);
    if (n !== 'all') { const k = +n; if (mode === 'mix') qs = qs.slice(0, k); else { qs = shuffle(qs).slice(0, k); qs.sort((a, b) => a.i - b.i); } }
  } else if (mode === 'mix') qs = shuffle(qs);
  run = { qs, i: 0, score: 0, errors: [], answered: false };
  $('#home').hidden = true; $('#end').hidden = true; $('#play').hidden = false;
  show();
}
function show() {
  const q = run.qs[run.i];
  run.answered = false;
  run.opts = shuffle([{ t: q.a, ok: true }, ...q.w.map(t => ({ t, ok: false }))]);
  $('#ptag').textContent = q.p;
  $('#qtext').textContent = q.q;
  $('#count').textContent = `Question ${run.i + 1} / ${run.qs.length}`;
  $('#score').textContent = `Score : ${run.score}`;
  $('#bar').style.width = (run.i / run.qs.length * 100) + '%';
  const o = $('#opts'); o.innerHTML = '';
  run.opts.forEach((op, k) => {
    const b = document.createElement('button');
    b.className = 'opt'; b.type = 'button'; b.id = 'opt' + k;
    b.innerHTML = `<span class="k">${k + 1}</span><span></span>`;
    b.lastChild.textContent = op.t;
    b.onclick = () => answer(k);
    o.appendChild(b);
  });
  $('#fb').hidden = true; $('#next').hidden = true;
}
function answer(k) {
  if (run.answered) return;
  run.answered = true;
  const q = run.qs[run.i];
  const btns = [...document.querySelectorAll('.opt')];
  btns.forEach((b, j) => { b.disabled = true; if (run.opts[j].ok) b.classList.add('good'); });
  const ok = run.opts[k].ok;
  const fb = $('#fb');
  if (ok) { run.score++; fb.className = 'fb ok'; fb.innerHTML = '<b>Bien joué !</b> '; }
  else { btns[k].classList.add('bad'); run.errors.push(q); fb.className = 'fb ko'; fb.innerHTML = '<b>Raté.</b> La bonne réponse : <strong></strong><br>'; fb.querySelector('strong').textContent = q.a; }
  const ex = document.createElement('span'); ex.textContent = q.e; fb.appendChild(ex);
  fb.hidden = false;
  $('#score').textContent = `Score : ${run.score}`;
  $('#next').hidden = false; $('#next').textContent = run.i + 1 < run.qs.length ? 'Question suivante →' : 'Voir mon résultat';
  $('#next').focus();
}
function next() { if (!run.answered) return; run.i++; if (run.i < run.qs.length) show(); else end(); }
function end() {
  $('#play').hidden = true; $('#end').hidden = false;
  $('#bar').style.width = '100%';
  const n = run.qs.length, pct = Math.round(run.score / n * 100);
  $('#pct').textContent = pct + ' %';
  $('#raw').textContent = `${run.score} bonnes réponses sur ${n}`;
  $('#msg').textContent = pct >= 90 ? 'Excellent, tu maîtrises le cours.' : pct >= 75 ? 'Très bien. Revois les quelques points ratés.' : pct >= 50 ? 'C\'est en route. Relis les fiches des parties ci-dessous puis refais tes erreurs.' : 'Reprends les fiches des parties ci-dessous, puis relance un quiz.';
  const byPart = {};
  run.qs.forEach(q => { byPart[q.p] = byPart[q.p] || { n: 0, e: 0 }; byPart[q.p].n++; });
  run.errors.forEach(q => byPart[q.p].e++);
  const weak = Object.entries(byPart).filter(([p, v]) => v.e / v.n > 0.25).sort((a, b) => b[1].e / b[1].n - a[1].e / a[1].n);
  $('#weak').innerHTML = weak.length ? weak.map(([p, v]) => `<li>${p} : ${v.e} erreur(s) sur ${v.n}</li>`).join('') : '<li>Aucune partie en difficulté.</li>';
  const er = $('#errs'); er.innerHTML = '';
  run.errors.forEach(q => { const d = document.createElement('div'); d.innerHTML = '<div></div><div class="ga"></div><div class="hint"></div>'; d.children[0].textContent = q.q; d.children[1].textContent = '✔ ' + q.a; d.children[2].textContent = q.e; er.appendChild(d); });
  $('#errsTitle').hidden = !run.errors.length;
  $('#redo').disabled = !run.errors.length;
}
document.addEventListener('keydown', e => {
  if ($('#play').hidden) return;
  if (['1', '2', '3', '4'].includes(e.key)) { const b = document.getElementById('opt' + (+e.key - 1)); if (b && !run.answered) answer(+e.key - 1); }
  else if (e.key === 'Enter' && run.answered) { e.preventDefault(); next(); }
});
$('#go').onclick = () => start();
$('#next').onclick = next;
$('#redo').onclick = () => start(run.errors.slice());
$('#new').onclick = () => { $('#end').hidden = true; $('#home').hidden = false; $('#bar').style.width = '0'; };
$('#all').onclick = () => document.querySelectorAll('#parts input').forEach(x => x.checked = true);
$('#none').onclick = () => document.querySelectorAll('#parts input').forEach(x => x.checked = false);
buildHome();
"""

def build_quiz(course, quiz):
    parts = []
    for q in quiz:
        if q["p"] not in parts:
            parts.append(q["p"])
    data = [{"i": i, "p": q["p"], "q": q["q"], "a": q["a"], "w": q["w"], "e": q["e"]} for i, q in enumerate(quiz)]
    js = QUIZ_JS.replace("__DATA__", json.dumps(data, ensure_ascii=False)).replace("__PARTS__", json.dumps(parts, ensure_ascii=False))
    return f'''<title>{esc(course["quiz_title"])}</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>{BASE_CSS}{QUIZ_CSS}</style>
<div class="wrap">
<div class="qhead"><div class="eyebrow">{esc(course["eyebrow"])} · QCM</div><h1>{esc(course["name"])}</h1></div>
<div class="bar" aria-hidden="true"><i id="bar"></i></div>
<section class="card" id="home">
<h2>Prépare ton quiz</h2>
<p><span id="total"></span> questions sur tout le cours. Choisis les parties, le nombre de questions et l'ordre.</p>
<div class="btns" style="margin:6px 0"><button class="btn ghost" type="button" id="all">Tout cocher</button><button class="btn ghost" type="button" id="none">Tout décocher</button></div>
<div class="parts" id="parts"></div>
<p id="warn" class="hint" hidden>Coche au moins une partie.</p>
<h2 style="margin-top:12px">Nombre de questions</h2>
<div class="opt-row"><label><input type="radio" name="nb" id="nb20" value="20" checked> 20</label><label><input type="radio" name="nb" id="nb50" value="50"> 50</label><label><input type="radio" name="nb" id="nball" value="all"> Toutes</label></div>
<h2>Ordre</h2>
<div class="opt-row"><label><input type="radio" name="mode" id="mix" value="mix" checked> Mélangé</label><label><input type="radio" name="mode" id="ord" value="ord"> Dans l'ordre du cours</label></div>
<div class="btns"><button class="btn" type="button" id="go">Commencer</button></div>
<p class="hint">Raccourcis : touches 1 à 4 pour répondre, Entrée pour continuer.</p>
</section>
<section class="card" id="play" hidden>
<div class="meta"><span id="count"></span><span id="score"></span></div>
<span class="part-tag" id="ptag"></span>
<p class="question" id="qtext"></p>
<div class="opts" id="opts"></div>
<div id="fb" class="fb" hidden></div>
<div class="btns"><button class="btn" type="button" id="next" hidden>Question suivante →</button></div>
</section>
<section class="card" id="end" hidden>
<h2>Résultat</h2>
<div class="big" id="pct"></div>
<p><strong id="raw"></strong></p>
<p id="msg"></p>
<h2>Parties à revoir</h2>
<ul id="weak"></ul>
<h2 id="errsTitle">Mes erreurs</h2>
<div class="errs" id="errs"></div>
<div class="btns"><button class="btn" type="button" id="redo">Refaire seulement mes erreurs</button><button class="btn ghost" type="button" id="new">Nouveau quiz</button></div>
</section>
<p class="hint" style="text-align:center;margin-top:18px">{esc(course["footer"])}</p>
</div>
<script>{js}</script>'''

def validate(quiz):
    probs = []
    seen = set()
    pos = re.compile(r"\b(r[ée]ponse|option|proposition|choix)\s*[A-D1-4]\b|\b[A-D]\)\s", re.I)
    for i, q in enumerate(quiz):
        opts = [q["a"]] + q["w"]
        if len(q["w"]) != 3: probs.append(f"Q{i}: {len(q['w'])} mauvaises réponses")
        if len(set(o.strip().lower() for o in opts)) != 4: probs.append(f"Q{i}: propositions non distinctes")
        if pos.search(q["e"]): probs.append(f"Q{i}: explication cite une position")
        if q["q"] in seen: probs.append(f"Q{i}: intitulé en double")
        seen.add(q["q"])
        if not q["e"].strip(): probs.append(f"Q{i}: explication vide")
    return probs

if __name__ == "__main__":
    d = Path(sys.argv[1])
    spec = importlib.util.spec_from_file_location("content", d / "content.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    probs = validate(m.QUIZ)
    from collections import Counter
    print("Questions :", len(m.QUIZ), dict(Counter(q["p"] for q in m.QUIZ)))
    print("Problèmes :", probs or "aucun")
    (d / "fiches.html").write_text(build_fiches(m.COURSE, m.FICHES, getattr(m, "END", [])), encoding="utf-8")
    (d / "quiz.html").write_text(build_quiz(m.COURSE, m.QUIZ), encoding="utf-8")
    print("Écrit :", d / "fiches.html", d / "quiz.html")
