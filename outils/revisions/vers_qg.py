#!/usr/bin/env python3
"""Convertit les fiches et le quiz d'un cours (content.py) au format de l'onglet Révisions du QG du Comptoir.
Fiches : document {type:'fiche', format:'riche', pages:[{c, a, h}]} avec les classes f-* de assets/qg/qg.css.
Quiz : document {type:'quiz', parts:[{id,name,sub}], questions:[{p,q,o,a,e}]}.
Usage : python3 torich.py <dossier_cours> <prefixe_id> <matiere> <ordre>  -> <dossier>/qg-fiches.json, qg-quiz.json
"""
import json, sys, re, importlib.util, time
from html.parser import HTMLParser
from html import escape
from pathlib import Path

BOX = {"def": "f-def", "att": "f-warn", "ex": "f-ex", "art": "f-art", "tip": "f-tip", "quiz": "f-quiz", "comp": "f-comp"}
VK = {"V": "f-vk f-v", "A": "f-vk f-a", "R": "f-vk f-r", "K": "f-vk f-k3"}
COLORS = ["blue", "teal", "coral", "green", "orange", "violet", "pink"]
ALLOWED = set("b strong i em u s small sup sub br p span div section h2 h3 h4 h5 ul ol li mark blockquote table thead tbody tr th td button".split())


class Conv(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []; self.stack = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs); cls = (a.get("class") or "").split(); new = []
        parent = self.stack[-1][1] if self.stack else []
        if tag == "div" and "box" in cls:
            new = ["f-box"] + [BOX[c] for c in cls if c in BOX]
        elif tag == "span" and "lab" in cls:
            new = ["f-tag"]
        elif tag == "div" and "tbl" in cls:
            new = ["f-tbl"]
        elif tag == "div" and "flow" in cls:
            new = ["f-flow"]
        elif tag == "div" and "vark" in cls:
            new = ["f-vark"]
        elif tag == "div" and any(c in VK for c in cls):
            new = VK[[c for c in cls if c in VK][0]].split()
        elif tag == "span" and "say" in cls:
            new = ["f-say"]
        elif tag == "h3":
            new = ["f-sec"]
        elif tag == "span" and "f-flow" in parent:
            new = ["f-chip"]
        elif tag == "i" and "f-flow" in parent:
            tag = "span"; new = ["f-arr"]
        if tag == "p" and "note" in cls:
            self.stack.append(("p", [], True)); self.out.append("<p><small>"); return
        if tag not in ALLOWED:
            self.stack.append((None, [], False)); return
        attr = (' class="%s"' % " ".join(new)) if new else ""
        st = a.get("style")
        if st and re.match(r"^\s*color\s*:\s*#[0-9a-fA-F]{3,6}\s*;?\s*$", st):
            attr += ' style="%s"' % st.strip().rstrip(";")
        if tag == "br":
            self.out.append("<br>"); return
        self.stack.append((tag, new, False)); self.out.append("<%s%s>" % (tag, attr))

    def handle_endtag(self, tag):
        if tag == "br" or not self.stack:
            return
        t, _, note = self.stack.pop()
        if note:
            self.out.append("</small></p>")
        elif t:
            self.out.append("</%s>" % t)

    def handle_data(self, d):
        self.out.append(escape(d, quote=False))


def conv(h):
    c = Conv(); c.feed(h); c.close(); return "".join(c.out)


def banner(num, title, pages):
    return ('<div class="f-banner"><span class="f-num">%s</span><div><h2 class="f-q">%s</h2>%s</div></div>'
            % (escape(num), escape(title), ('<div class="f-sub">%s</div>' % escape(pages)) if pages else ""))


if __name__ == "__main__":
    d = Path(sys.argv[1]); pref, matiere, ordre = sys.argv[2], sys.argv[3], int(sys.argv[4])
    spec = importlib.util.spec_from_file_location("content", d / "content.py")
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    allf = m.FICHES + getattr(m, "END", [])
    toc = "".join('<button type="button" data-aller="%s" style="--tc:var(--%s)"><span>%s</span>%s</button>'
                  % (f["id"], COLORS[(i + 1) % len(COLORS)], escape(f["num"]), escape(f["title"])) for i, f in enumerate(allf))
    pages = [{"c": "blue", "a": "sommaire", "h": '<div class="f-cover"><div class="f-script">%s</div></div><p class="f-lead">%s</p><h3 class="f-sec">Sommaire</h3><div class="f-toc">%s</div>'
              % (escape(m.COURSE["name"]), conv(m.COURSE["intro"]), toc)}]
    for i, f in enumerate(allf):
        pages.append({"c": COLORS[(i + 1) % len(COLORS)], "a": f["id"],
                      "h": banner(f["num"], f["title"], f.get("pages")) + conv(f["html"]) + '<button type="button" class="f-back" data-aller="sommaire">↑ Sommaire</button>'})
    now = int(time.time() * 1000)
    fiches = {"type": "fiche", "format": "riche", "titre": "Fiches : " + m.COURSE["name"], "matiere": matiere, "ordre": ordre,
              "source": m.COURSE["footer"], "resume": "%d fiches + mémo, corrigés, méthode, planning" % len(m.FICHES), "pages": pages, "majLe": now}
    parts, ids = [], {}
    for q in m.QUIZ:
        if q["p"] not in ids:
            ids[q["p"]] = "p%d" % len(ids); parts.append({"id": ids[q["p"]], "name": q["p"], "sub": ""})
    for p in parts:
        p["sub"] = "%d questions" % sum(1 for q in m.QUIZ if ids[q["p"]] == p["id"])
    questions = [{"p": ids[q["p"]], "q": q["q"], "o": [q["a"]] + q["w"], "a": 0, "e": q["e"]} for q in m.QUIZ]
    quiz = {"type": "quiz", "titre": "Quiz : " + m.COURSE["name"], "matiere": matiere, "ordre": ordre + 1,
            "source": "%d questions sur tout le cours. Les propositions sont mélangées à chaque partie." % len(questions),
            "parts": parts, "questions": questions, "majLe": now}
    (d / "qg-fiches.json").write_text(json.dumps({"id": pref + "-fiches", "doc": fiches}, ensure_ascii=False), encoding="utf-8")
    (d / "qg-quiz.json").write_text(json.dumps({"id": pref + "-quiz", "doc": quiz}, ensure_ascii=False), encoding="utf-8")
    print("pages", len(pages), "questions", len(questions), "parties", len(parts))
    print("tailles", len(json.dumps(fiches, ensure_ascii=False)), len(json.dumps(quiz, ensure_ascii=False)))
