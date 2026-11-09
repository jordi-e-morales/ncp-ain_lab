/* NCP-AIN Simulator — single-page app. No build step, works from file://. */
(function () {
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const D = window.NCP_DOMAIN, SYL = window.NCP_SYLLABUS, Q = window.NCP_QUESTIONS || [], C = window.NCP_CONCEPTS || [], LABS = window.NCP_LABS || [];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;

  // ---------------------------------------------------------------- persistence
  const KEY = "ncp-ain-sim-v1";
  const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  store.q = store.q || {};            // qid -> {seen, right, wrong, last}
  store.exams = store.exams || [];    // [{date, score, total, perDomain, minutes}]
  store.labs = store.labs || {};      // labId -> {done: true, date}
  store.flash = store.flash || {};    // card key -> {known}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { } };
  if (store.theme) document.documentElement.dataset.theme = store.theme;
  $("#themeBtn").onclick = () => { const t = document.documentElement.dataset.theme === "light" ? "" : "light"; document.documentElement.dataset.theme = t; store.theme = t; save(); };

  function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
  function recordAnswer(q, ok) { const r = store.q[q.id] = store.q[q.id] || { seen: 0, right: 0, wrong: 0 }; r.seen++; ok ? r.right++ : r.wrong++; r.last = ok ? "right" : "wrong"; r.ts = Date.now(); save(); }
  const isMissed = q => store.q[q.id] && store.q[q.id].last === "wrong";

  // ---------------------------------------------------------------- tabs
  $$("#tabs button").forEach(b => b.onclick = () => showView(b.dataset.view));
  function showView(v) {
    $$("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.view === v));
    $$("section.view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
    ({ dash: renderDash, study: renderStudy, flash: renderFlash, practice: renderPractice, exam: renderExamHome, lab: renderLab, cmds: renderCmds, progress: renderProgress })[v]();
    location.hash = v;
  }

  // ---------------------------------------------------------------- dashboard
  function domainStats(key) { const qs = Q.filter(q => q.domain === key); let seen = 0, right = 0, wrong = 0; qs.forEach(q => { const r = store.q[q.id]; if (r) { seen++; right += r.right; wrong += r.wrong; } }); return { total: qs.length, seen, right, wrong, acc: pct(right, right + wrong) }; }
  function renderDash() {
    const el = $("#view-dash");
    const lastExam = store.exams[store.exams.length - 1];
    const missed = Q.filter(isMissed).length;
    el.innerHTML = `
      <div class="grid" style="grid-template-columns: 2fr 1fr; align-items:start">
        <div>
          <div class="card">
            <h2>Exam blueprint · ${esc(SYL.exam.code)}</h2>
            <p class="muted">${esc(SYL.exam.duration_min)} min · ${esc(SYL.exam.questions)} questions · ${esc(SYL.exam.pass_note)} · ${esc(SYL.exam.price)}</p>
            <div class="weights">
              ${SYL.domains.map(d => { const s = domainStats(d.key); return `<div><div class="row" style="justify-content:space-between"><b><span class="pill" style="background:${d.color}">${d.weight}%</span> ${esc(d.name)}</b><span class="muted">${s.right + s.wrong ? s.acc + "% correct · " : ""}${s.total} questions</span></div><div class="bar" title="${d.weight}% of the exam"><div style="width:${d.weight * 3}%;background:${d.color}"></div></div></div><div></div>`; }).join("")}
            </div>
          </div>
          <div class="card" style="margin-top:14px">
            <h3>How to use this trainer</h3>
            <ol>
              <li><b>Study</b> the concept cards per domain, then drill them as <b>Flashcards</b>.</li>
              <li><b>Practice</b> questions by domain with instant explanations. Items you miss are collected under <em>Weak spots</em>.</li>
              <li>Run the <b>CLI Lab</b>: a stateful virtual fabric (Cumulus NVUE, OpenSM, ib* tools, NetQ, kubectl, Ansible) with ${LABS.length} guided scenarios.</li>
              <li>Take a timed <b>Exam</b> (70 questions, 120 min, weighted like the real blueprint) and review the per-domain report.</li>
            </ol>
            <p class="muted">Your previous practice set: 42/50 (84%). Missed: ECN/CNP signaling, L3VNI consistency, PKey membership by port GUID, pod RDMA resource requests, cl-resource-query, iblinkinfo, Ansible group_vars and play targeting. Those topics are tagged <span class="tag">missed-before</span> and over-weighted in Practice.</p>
          </div>
        </div>
        <div>
          <div class="card"><div class="muted">Question bank</div><div class="kpi">${Q.length}</div><div class="muted">${C.length} concept cards · ${LABS.length} labs</div></div>
          <div class="card" style="margin-top:14px"><div class="muted">Weak spots (last answer wrong)</div><div class="kpi ${missed ? "bad" : "ok"}">${missed}</div><button class="small" id="goWeak" ${missed ? "" : "disabled"}>Drill them</button></div>
          <div class="card" style="margin-top:14px"><div class="muted">Last exam</div><div class="kpi">${lastExam ? pct(lastExam.score, lastExam.total) + "%" : "—"}</div><div class="muted">${lastExam ? `${lastExam.score}/${lastExam.total} · ${new Date(lastExam.date).toLocaleDateString()}` : "No exam yet"}</div><button class="small primary" id="goExam">Start exam</button></div>
          <div class="card" style="margin-top:14px"><div class="muted">Labs completed</div><div class="kpi">${Object.keys(store.labs).length}/${LABS.length}</div><button class="small" id="goLab">Open CLI Lab</button></div>
        </div>
      </div>`;
    $("#goWeak").onclick = () => { showView("practice"); startPractice({ weak: true }); };
    $("#goExam").onclick = () => showView("exam");
    $("#goLab").onclick = () => showView("lab");
  }

  // ---------------------------------------------------------------- study
  let studyDomain = "all";
  function renderStudy() {
    const el = $("#view-study");
    const cards = C.filter(c => studyDomain === "all" || c.domain === studyDomain);
    el.innerHTML = `
      <div class="row" style="margin-bottom:12px">
        <h2 style="margin:0">Concept cards</h2>
        <select id="studyDom">${["all", ...SYL.domains.map(d => d.key)].map(k => `<option value="${k}" ${k === studyDomain ? "selected" : ""}>${k === "all" ? "All domains" : esc(D[k].name)}</option>`).join("")}</select>
        <span class="muted">${cards.length} cards. Click a card to expand. The green line is the one-liner to memorise.</span>
      </div>
      <div class="grid">${cards.map((c, i) => `
        <details class="card">
          <summary><span class="pill" style="background:${D[c.domain].color}">${c.domain}</span> <b>${esc(c.title)}</b><div class="muted" style="margin-top:6px;color:var(--nv)">${esc(c.hook)}</div></summary>
          <p>${esc(c.body)}</p>
          <div class="muted" style="font-size:13px"><b>Self-check</b><ul>${c.qa.map(q => `<li>${esc(q[0])} <details style="display:inline"><summary style="display:inline;color:var(--nv)">answer</summary> ${esc(q[1])}</details></li>`).join("")}</ul></div>
        </details>`).join("")}</div>`;
    $("#studyDom").onchange = e => { studyDomain = e.target.value; renderStudy(); };
  }

  // ---------------------------------------------------------------- flashcards
  let flashDeck = [], flashIdx = 0, flashFront = true, flashDomain = "all";
  function buildDeck() { flashDeck = shuffle(C.filter(c => flashDomain === "all" || c.domain === flashDomain).flatMap(c => c.qa.map((q, i) => ({ key: c.title + "#" + i, domain: c.domain, q: q[0], a: q[1], title: c.title })))).filter(f => !(store.flash[f.key] && store.flash[f.key].known && Math.random() < 0.7)); flashIdx = 0; flashFront = true; }
  function renderFlash() {
    if (!flashDeck.length) buildDeck();
    const el = $("#view-flash"); const f = flashDeck[flashIdx];
    el.innerHTML = `
      <div class="row" style="margin-bottom:12px"><h2 style="margin:0">Flashcards</h2>
        <select id="flashDom">${["all", ...SYL.domains.map(d => d.key)].map(k => `<option value="${k}" ${k === flashDomain ? "selected" : ""}>${k === "all" ? "All domains" : esc(D[k].name)}</option>`).join("")}</select>
        <span class="muted">${flashDeck.length ? `${flashIdx + 1} / ${flashDeck.length}` : ""} · <kbd>space</kbd> flip · <kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>k</kbd> mark known</span></div>
      ${f ? `<div class="card flash" id="flashCard"><div><span class="pill" style="background:${D[f.domain].color}">${f.domain}</span><div style="margin-top:10px">${esc(flashFront ? f.q : f.a)}</div><small>${esc(f.title)} · ${flashFront ? "click to reveal" : "answer"}</small></div></div>
      <div class="row" style="margin-top:12px"><button id="fPrev">← Prev</button><button class="primary" id="fFlip">Flip</button><button id="fNext">Next →</button><button id="fKnown">I know this (show less often)</button><button class="ghost" id="fReset">Reshuffle</button></div>` : `<div class="card">Deck empty. <button id="fReset">Reshuffle</button></div>`}`;
    $("#flashDom").onchange = e => { flashDomain = e.target.value; buildDeck(); renderFlash(); };
    const flip = () => { flashFront = !flashFront; renderFlash(); };
    const next = d => { flashIdx = (flashIdx + d + flashDeck.length) % flashDeck.length; flashFront = true; renderFlash(); };
    if (f) { $("#flashCard").onclick = flip; $("#fFlip").onclick = flip; $("#fNext").onclick = () => next(1); $("#fPrev").onclick = () => next(-1); $("#fKnown").onclick = () => { store.flash[f.key] = { known: true }; save(); next(1); }; }
    $("#fReset").onclick = () => { buildDeck(); renderFlash(); };
  }
  document.addEventListener("keydown", e => { if (!$("#view-flash").classList.contains("active") || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return; if (e.key === " ") { e.preventDefault(); flashFront = !flashFront; renderFlash(); } if (e.key === "ArrowRight") { flashIdx = (flashIdx + 1) % flashDeck.length; flashFront = true; renderFlash(); } if (e.key === "ArrowLeft") { flashIdx = (flashIdx - 1 + flashDeck.length) % flashDeck.length; flashFront = true; renderFlash(); } if (e.key === "k") { store.flash[flashDeck[flashIdx].key] = { known: true }; save(); flashIdx = (flashIdx + 1) % flashDeck.length; flashFront = true; renderFlash(); } });

  // ---------------------------------------------------------------- question rendering (shared)
  function renderQuestion(q, opts) {
    // opts: {sel: Set, reveal: bool, onSelect(i), number, total}
    const multi = !!q.multi; const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
    const letters = "ABCDE";
    return `
      <div class="row muted" style="font-size:13px"><span class="pill" style="background:${D[q.domain].color}">${esc(D[q.domain].name)}</span> <span>${esc(q.topic || "")}</span> ${opts.number ? `<span class="spacer"></span><span>Question ${opts.number}${opts.total ? " / " + opts.total : ""}</span>` : ""}${multi ? '<span class="tag">choose all that apply</span>' : ""}</div>
      <div class="q-stem">${esc(q.q)}</div>
      ${q.options.map((o, i) => { let cls = "opt"; if (opts.sel.has(i)) cls += " sel"; if (opts.reveal) { if (answers.includes(i)) cls += " correct"; else if (opts.sel.has(i)) cls += " wrong"; } return `<div class="${cls}" data-i="${i}"><span class="letter">${letters[i]}</span><span>${esc(o)}</span></div>`; }).join("")}
      ${opts.reveal ? `<div class="explain ${isCorrect(q, opts.sel) ? "" : "bad"}"><b>${isCorrect(q, opts.sel) ? "Correct." : "Not quite."}</b> Answer: ${answers.map(i => letters[i]).join(", ")}.<br>${esc(q.explanation)}${q.distractors ? `<br><span class="muted">${esc(q.distractors)}</span>` : ""}${q.ref ? `<br><span class="muted">Review: ${esc(q.ref)}</span>` : ""}</div>` : ""}`;
  }
  function isCorrect(q, sel) { const answers = Array.isArray(q.answer) ? q.answer : [q.answer]; return answers.length === sel.size && answers.every(a => sel.has(a)); }
  function bindOptions(container, q, state, onChange) {
    $$(".opt", container).forEach(o => o.onclick = () => { if (state.reveal) return; const i = +o.dataset.i; if (q.multi) { state.sel.has(i) ? state.sel.delete(i) : state.sel.add(i); } else { state.sel = new Set([i]); } onChange(); });
  }

  // ---------------------------------------------------------------- practice
  let P = null; // {list, idx, state}
  function renderPractice() {
    const el = $("#view-practice");
    if (!P) {
      const weak = Q.filter(isMissed).length;
      el.innerHTML = `<h2>Practice</h2><p class="muted">Instant feedback after every answer. Pick a domain or drill your weak spots. Questions you have missed before and the topics from your practice-set misses are drawn more often.</p>
        <div class="grid">
          ${SYL.domains.map(d => { const s = domainStats(d.key); return `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(d.name)}</b><span class="pill" style="background:${d.color}">${d.weight}%</span></div><div class="muted" style="margin:6px 0">${s.total} questions · seen ${s.seen} · accuracy ${s.right + s.wrong ? s.acc + "%" : "—"}</div><div class="row"><button class="primary small" data-dom="${d.key}" data-n="10">10 questions</button><button class="small" data-dom="${d.key}" data-n="0">All</button></div></div>`; }).join("")}
          <div class="card"><b>Weak spots</b><div class="muted" style="margin:6px 0">${weak} questions whose last answer was wrong</div><button class="primary small" id="pWeak" ${weak ? "" : "disabled"}>Drill weak spots</button></div>
          <div class="card"><b>Mixed set</b><div class="muted" style="margin:6px 0">20 questions, blueprint-weighted, untimed</div><button class="primary small" id="pMixed">Start</button></div>
          <div class="card"><b>Previously missed on the official practice set</b><div class="muted" style="margin:6px 0">${Q.filter(q => (q.tags || []).includes("missed-before")).length} items tagged missed-before</div><button class="primary small" id="pMB">Drill</button></div>
        </div>`;
      $$("button[data-dom]", el).forEach(b => b.onclick = () => startPractice({ domain: b.dataset.dom, n: +b.dataset.n }));
      $("#pWeak").onclick = () => startPractice({ weak: true });
      $("#pMixed").onclick = () => startPractice({ n: 20 });
      $("#pMB").onclick = () => startPractice({ tag: "missed-before" });
      return;
    }
    const q = P.list[P.idx];
    el.innerHTML = `<div class="row" style="margin-bottom:8px"><button class="ghost small" id="pQuit">← Back to practice menu</button><span class="muted">Correct so far: ${P.right}/${P.answered}</span></div>
      <div class="card" id="pCard">${renderQuestion(q, { sel: P.state.sel, reveal: P.state.reveal, number: P.idx + 1, total: P.list.length })}
      <div class="row" style="margin-top:12px">${P.state.reveal ? `<button class="primary" id="pNext">${P.idx + 1 < P.list.length ? "Next →" : "Finish"}</button>` : `<button class="primary" id="pCheck" ${P.state.sel.size ? "" : "disabled"}>Check answer</button>`}<span class="muted">Difficulty ${"★".repeat(q.difficulty || 2)} · ${(q.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span></div></div>`;
    bindOptions($("#pCard"), q, P.state, renderPractice);
    $("#pQuit").onclick = () => { P = null; renderPractice(); };
    const check = $("#pCheck"); if (check) check.onclick = () => { P.state.reveal = true; const ok = isCorrect(q, P.state.sel); recordAnswer(q, ok); P.answered++; if (ok) P.right++; renderPractice(); };
    const next = $("#pNext"); if (next) next.onclick = () => { if (P.idx + 1 < P.list.length) { P.idx++; P.state = { sel: new Set(), reveal: false }; renderPractice(); } else { toast(`Set finished: ${P.right}/${P.answered}`); P = null; renderPractice(); } };
  }
  function weightedPick(pool, n) {
    // bias toward never-seen, previously-wrong and missed-before items
    const w = q => { const r = store.q[q.id]; let x = 1; if (!r) x += 1; else if (r.last === "wrong") x += 2; if ((q.tags || []).includes("missed-before")) x += 1; return x; };
    const out = []; let rest = pool.slice();
    while (out.length < n && rest.length) { const tot = rest.reduce((a, q) => a + w(q), 0); let r = Math.random() * tot; let k = 0; for (; k < rest.length; k++) { r -= w(rest[k]); if (r <= 0) break; } out.push(rest[Math.min(k, rest.length - 1)]); rest.splice(Math.min(k, rest.length - 1), 1); }
    return out;
  }
  function startPractice(o) {
    let pool = Q;
    if (o.domain) pool = pool.filter(q => q.domain === o.domain);
    if (o.weak) pool = pool.filter(isMissed);
    if (o.tag) pool = pool.filter(q => (q.tags || []).includes(o.tag));
    if (!pool.length) { toast("Nothing to drill here yet."); return; }
    let list;
    if (o.domain || o.weak || o.tag) list = o.n ? weightedPick(pool, o.n) : shuffle(pool);
    else list = sampleWeighted(o.n || 20);
    P = { list, idx: 0, state: { sel: new Set(), reveal: false }, right: 0, answered: 0 };
    showView("practice");
  }
  function sampleWeighted(n) {
    const out = [];
    SYL.domains.forEach(d => { const k = Math.round(n * d.weight / 100); out.push(...weightedPick(Q.filter(q => q.domain === d.key), k)); });
    while (out.length < n) { const extra = weightedPick(Q.filter(q => !out.includes(q)), 1); if (!extra.length) break; out.push(extra[0]); }
    return shuffle(out.slice(0, n));
  }

  // ---------------------------------------------------------------- exam
  let E = null; let examTimer = null;
  function renderExamHome() {
    const el = $("#view-exam");
    if (E && !E.finished) { renderExamQuestion(); return; }
    const hist = store.exams.slice().reverse();
    el.innerHTML = `<h2>Exam simulation</h2>
      <div class="card"><p>Timed, blueprint-weighted, no feedback until the end, flag-and-review, then a per-domain report like the official practice test. 70 questions in 120 minutes mirrors the real exam (70-75 questions, 2 h). Pass line shown at 70%.</p>
        <div class="row"><label>Questions <input id="exN" type="number" value="70" min="10" max="${Q.length}" style="width:80px"></label><label>Minutes <input id="exMin" type="number" value="120" min="5" style="width:80px"></label><button class="primary" id="exStart">Start exam</button></div></div>
      ${hist.length ? `<h3 style="margin-top:16px">History</h3><table><tr><th>Date</th><th>Score</th><th>Result</th>${SYL.domains.map(d => `<th>${d.key}</th>`).join("")}<th>Time</th></tr>${hist.map(h => `<tr><td>${new Date(h.date).toLocaleString()}</td><td>${h.score}/${h.total} (${pct(h.score, h.total)}%)</td><td class="${pct(h.score, h.total) >= 70 ? "ok" : "bad"}">${pct(h.score, h.total) >= 70 ? "PASS" : "FAIL"}</td>${SYL.domains.map(d => `<td>${h.perDomain[d.key] ? h.perDomain[d.key].right + "/" + h.perDomain[d.key].total : "-"}</td>`).join("")}<td>${h.minutes} min</td></tr>`).join("")}</table>` : ""}`;
    $("#exStart").onclick = () => { const n = Math.min(+$("#exN").value || 70, Q.length); const min = +$("#exMin").value || 120; E = { list: sampleWeighted(n), idx: 0, sel: Array.from({ length: n }, () => new Set()), flags: new Set(), start: Date.now(), end: Date.now() + min * 60000, finished: false }; examTimer = setInterval(tick, 1000); renderExamQuestion(); };
  }
  function tick() { if (!E || E.finished) { clearInterval(examTimer); return; } const left = E.end - Date.now(); const t = $("#exTimer"); if (t) { t.textContent = fmt(left); t.classList.toggle("low", left < 5 * 60000); } if (left <= 0) finishExam(); }
  const fmt = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  function renderExamQuestion() {
    const el = $("#view-exam"); const q = E.list[E.idx]; const st = { sel: E.sel[E.idx], reveal: false };
    el.innerHTML = `<div class="row"><span class="timer" id="exTimer">${fmt(E.end - Date.now())}</span><span class="muted">answered ${E.sel.filter(s => s.size).length}/${E.list.length} · flagged ${E.flags.size}</span><span class="spacer"></span><button id="exFlag" class="${E.flags.has(E.idx) ? "primary" : ""} small">⚑ ${E.flags.has(E.idx) ? "Flagged" : "Flag for review"}</button><button class="small" id="exFinish">Finish exam</button></div>
      <div class="qnav">${E.list.map((_, i) => `<button class="${E.sel[i].size ? "done" : ""} ${E.flags.has(i) ? "flag" : ""} ${i === E.idx ? "cur" : ""}" data-i="${i}">${i + 1}</button>`).join("")}</div>
      <div class="card" id="exCard">${renderQuestion(q, { sel: st.sel, reveal: false, number: E.idx + 1, total: E.list.length })}
      <div class="row" style="margin-top:12px"><button id="exPrev" ${E.idx ? "" : "disabled"}>← Previous</button><button class="primary" id="exNext" ${E.idx + 1 < E.list.length ? "" : "disabled"}>Next →</button></div></div>`;
    bindOptions($("#exCard"), q, st, () => { E.sel[E.idx] = st.sel; renderExamQuestion(); });
    $$(".qnav button").forEach(b => b.onclick = () => { E.idx = +b.dataset.i; renderExamQuestion(); });
    $("#exPrev").onclick = () => { E.idx--; renderExamQuestion(); };
    $("#exNext").onclick = () => { E.idx++; renderExamQuestion(); };
    $("#exFlag").onclick = () => { E.flags.has(E.idx) ? E.flags.delete(E.idx) : E.flags.add(E.idx); renderExamQuestion(); };
    $("#exFinish").onclick = () => { const un = E.sel.filter(s => !s.size).length; if (!un || confirm(`${un} unanswered question(s). Finish anyway?`)) finishExam(); };
  }
  function finishExam() {
    clearInterval(examTimer); E.finished = true;
    const per = {}; let score = 0;
    E.list.forEach((q, i) => { const ok = isCorrect(q, E.sel[i]); recordAnswer(q, ok); per[q.domain] = per[q.domain] || { right: 0, total: 0 }; per[q.domain].total++; if (ok) { per[q.domain].right++; score++; } });
    const rec = { date: Date.now(), score, total: E.list.length, perDomain: per, minutes: Math.round((Date.now() - E.start) / 60000) };
    store.exams.push(rec); save();
    const el = $("#view-exam"); const p = pct(score, E.list.length);
    el.innerHTML = `<div class="card"><h2 class="${p >= 70 ? "ok" : "bad"}">${p >= 70 ? "PASS" : "FAIL"} · ${score}/${E.list.length} (${p}%)</h2><p class="muted">Pass line 70% · time used ${rec.minutes} min</p>
      <table><tr><th>Exam topic</th><th>Score</th><th></th><th>Result</th></tr>${SYL.domains.map(d => { const s = per[d.key] || { right: 0, total: 0 }; return `<tr><td>${esc(d.name)}</td><td>${s.right}/${s.total}</td><td style="width:40%"><div class="bar"><div style="width:${pct(s.right, s.total)}%;background:${d.color}"></div></div></td><td class="${pct(s.right, s.total) >= 70 ? "ok" : "bad"}">${s.total ? pct(s.right, s.total) + "%" : "-"}</td></tr>`; }).join("")}</table>
      <div class="row" style="margin-top:12px"><button class="primary" id="exReview">Review answers</button><button id="exHome">Back</button></div></div>`;
    $("#exHome").onclick = () => { E = null; renderExamHome(); };
    $("#exReview").onclick = () => { el.innerHTML = `<div class="row"><button id="exHome2">← Back to results</button><label><input type="checkbox" id="onlyWrong"> only incorrect</label></div><div id="revList"></div>`; const draw = () => { const only = $("#onlyWrong").checked; $("#revList").innerHTML = E.list.map((q, i) => (only && isCorrect(q, E.sel[i])) ? "" : `<div class="card" style="margin-top:12px">${renderQuestion(q, { sel: E.sel[i], reveal: true, number: i + 1, total: E.list.length })}</div>`).join(""); }; draw(); $("#onlyWrong").onchange = draw; $("#exHome2").onclick = () => { E.finished = true; finishView(); }; };
    const finishView = () => { E = null; renderExamHome(); const h = store.exams; if (h.length) { /* re-render with history */ } };
  }

  // ---------------------------------------------------------------- CLI lab
  let L = { st: null, lab: null, out: [] };
  function newSession(lab) { L.lab = lab || null; L.st = SIM.createSession(lab ? { startNode: lab.start, faults: lab.faults } : {}); L.out = []; L.answerOk = false; pushOut(`<span class="muted">${esc(SIM.banner(L.st, L.st.node))}\nType <b>help</b> for the commands available here, <b>topology</b> for the lab map.</span>`); }
  function pushOut(html) { L.out.push(html); }
  function renderLab() {
    const el = $("#view-lab");
    if (!L.st) newSession(null);
    const lab = L.lab;
    el.innerHTML = `
      <div class="row" style="margin-bottom:10px"><h2 style="margin:0">CLI Lab</h2><span class="muted">A stateful virtual fabric: what you <code>nv set</code> changes what <code>nv show</code> and <code>netq</code> report. Jump between nodes with <code>ssh &lt;node&gt;</code>.</span></div>
      <div class="term-wrap">
        <div>
          <div class="row node-pills" style="margin-bottom:6px">${["oob-mgmt-server", "spine01", "spine02", "leaf01", "leaf02", "gpu01", "gpu02", "gpu03", "gpu04", "ufm-server"].map(n => `<button class="${L.st.node === n ? "active" : ""}" data-node="${n}">${n}</button>`).join("")}<span class="spacer"></span><button class="small ghost" id="tClear">clear</button><button class="small ghost" id="tReset">reset fabric</button></div>
          <div class="terminal"><div class="out" id="tOut">${L.out.join("\n")}</div><div class="inline"><span class="prompt">${esc(SIM.prompt(L.st))}</span><input id="tIn" autocomplete="off" spellcheck="false" placeholder="type a command, ↑↓ history, Tab completes a few basics"></div></div>
        </div>
        <div>
          ${lab ? renderLabPanel(lab) : `<div class="card"><h3>Guided labs</h3><p class="muted">Each lab resets the fabric (sometimes with a fault injected), lists tasks and verifies them live.</p>${SYL.domains.map(d => { const ls = LABS.filter(l => l.domain === d.key); return ls.length ? `<div style="margin-top:8px"><b style="color:${d.color}">${esc(d.name)}</b>${ls.map(l => `<div class="row nowrap" style="justify-content:space-between;margin:4px 0"><span>${store.labs[l.id] ? "✅" : "○"} ${esc(l.title)} <span class="muted">· ${l.minutes} min</span></span><button class="small" data-lab="${l.id}">Start</button></div>`).join("")}</div>` : ""; }).join("")}</div>
          <div class="card" style="margin-top:12px"><h3>Free exploration</h3><p class="muted">No lab selected: the fabric is healthy except RoCE is off on the leaves. Try:</p><pre>ssh leaf01
nv show interface
nv set qos roce enable on
nv config diff
nv config apply
nv show qos roce
ssh gpu01
ibstat
iblinkinfo
ibtracert 1 3</pre></div>`}
        </div>
      </div>`;
    const out = $("#tOut"); out.scrollTop = out.scrollHeight;
    const input = $("#tIn"); input.focus();
    let hIdx = L.st.history.length;
    input.onkeydown = e => {
      if (e.key === "Enter") { const line = input.value; input.value = ""; runLine(line); }
      else if (e.key === "ArrowUp") { e.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = L.st.history[hIdx] || ""; }
      else if (e.key === "ArrowDown") { e.preventDefault(); hIdx = Math.min(L.st.history.length, hIdx + 1); input.value = L.st.history[hIdx] || ""; }
      else if (e.key === "Tab") { e.preventDefault(); const v = input.value; const comp = ["nv show interface", "nv show qos roce", "nv config diff", "nv config apply", "nv config save", "nv config history", "nv show vrf default router bgp neighbor", "nv show evpn vni", "nv show nve vxlan", "netq check bgp", "netq check evpn", "netq show wjh-drop", "kubectl get pods -n nvidia-network-operator", "kubectl get nicclusterpolicy -o yaml", "ibdiagnet --pc --pm", "iblinkinfo", "ibnetdiscover", "ibtracert ", "smpquery ND ", "systemctl status opensm", "nvidia-smi topo -m", "cl-resource-query", "ansible-playbook -i ansible/inventory.ini ansible/"].find(c => c.startsWith(v) && c !== v); if (comp) input.value = comp; }
    };
    $$("button[data-node]", el).forEach(b => b.onclick = () => runLine("ssh " + b.dataset.node));
    $("#tClear").onclick = () => { L.out = []; renderLab(); };
    $("#tReset").onclick = () => { newSession(L.lab); renderLab(); };
    $$("button[data-lab]", el).forEach(b => b.onclick = () => { newSession(LABS.find(l => l.id === b.dataset.lab)); renderLab(); });
    const back = $("#labBack"); if (back) back.onclick = () => { newSession(null); renderLab(); };
    const ans = $("#labAnswer"); if (ans) { const check = () => { const ok = lab.question.answer.test(ans.value.trim()); L.answerOk = ok; $("#labAnsFb").innerHTML = ok ? '<span class="ok">✔ correct</span>' : `<span class="bad">✘ not yet</span> <span class="muted">hint: ${esc(lab.question.hint)}</span>`; checkLabDone(); }; $("#labAnsBtn").onclick = check; ans.onkeydown = e => { if (e.key === "Enter") check(); }; }
  }
  function renderLabPanel(lab) {
    const results = lab.tasks.map(t => { try { return !!t.check(L.st); } catch (e) { return false; } });
    const allTasks = results.every(Boolean); const done = allTasks && (!lab.question || L.answerOk);
    return `<div class="card"><div class="row" style="justify-content:space-between"><span class="pill" style="background:${D[lab.domain].color}">${esc(D[lab.domain].name)}</span><button class="small ghost" id="labBack">✕ exit lab</button></div>
      <h3 style="margin-top:8px">${esc(lab.title)}</h3><p>${esc(lab.brief)}</p>
      <ol class="lab-tasks">${lab.tasks.map((t, i) => `<li class="${results[i] ? "done" : ""}">${esc(t.text)}</li>`).join("")}</ol>
      ${lab.question ? `<div style="margin-top:8px"><b>Question:</b> ${esc(lab.question.text)}<div class="row" style="margin-top:6px"><input id="labAnswer" placeholder="your answer" style="flex:1"><button class="small" id="labAnsBtn">Check</button></div><div id="labAnsFb" style="margin-top:4px">${L.answerOk ? '<span class="ok">✔ correct</span>' : ""}</div></div>` : ""}
      ${done ? `<div class="explain" style="margin-top:12px"><b>Lab complete.</b> ${esc(lab.teach)}</div>` : `<details style="margin-top:10px"><summary class="muted">What this lab teaches (spoiler)</summary><p class="muted">${esc(lab.teach)}</p></details>`}
      <div class="muted" style="font-size:12px;margin-top:8px">Tasks verify against the live fabric state or the commands you typed. Faults active: ${Object.entries(L.st.faults).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}.</div></div>`;
  }
  function checkLabDone() { if (!L.lab) return; const ok = L.lab.tasks.every(t => { try { return !!t.check(L.st); } catch { return false; } }) && (!L.lab.question || L.answerOk); if (ok && !store.labs[L.lab.id]) { store.labs[L.lab.id] = { done: true, date: Date.now() }; save(); toast("Lab complete: " + L.lab.title); } renderLab(); }
  function runLine(line) {
    const promptHtml = `<span class="prompt">${esc(SIM.prompt(L.st))}</span><span class="cmd">${esc(line)}</span>`;
    let out;
    try { out = SIM.exec(L.st, line); } catch (e) { out = "simulator error: " + e.message; console.error(e); }
    if (out === "\u0000CLEAR") { L.out = []; renderLab(); return; }
    pushOut(promptHtml + (out ? "\n" + (/(command not found|^Error|^ibwarn|iberror|FAILED|Failed)/m.test(out) ? `<span class="err">${esc(out)}</span>` : esc(out)) : ""));
    if (L.lab) checkLabDone(); else renderLab();
  }

  // ---------------------------------------------------------------- command reference
  const CMDS = [
    ["InfiniBand · host", "ibstat [-d mlx5_0]", "Port State/Physical state/Rate/Base lid/SM lid. First command on any host-side problem. SM lid 0 = no SM."],
    ["InfiniBand · host", "ibv_devinfo [-v]", "HCA capabilities, node GUID, port state, GIDs (with -v)."],
    ["InfiniBand · fabric", "sminfo", "Master SM LID, GUID, priority, state (SMINFO_MASTER). Then smpquery ND <lid> for its name."],
    ["InfiniBand · fabric", "smpquery ND|NI|PI|PKeys|SL2VL|VLArb <lid> [port]", "Read a node's description, node/port info, PKey table, SL→VL table, VL arbitration from the SM-managed attributes."],
    ["InfiniBand · fabric", "ibhosts / ibswitches / ibnodes", "Inventory of HCAs / switches / both."],
    ["InfiniBand · fabric", "iblinkinfo", "Every link of every node: width, speed, state, peer. The node-by-node link report. Spots links negotiated down."],
    ["InfiniBand · fabric", "ibnetdiscover [-p]", "Full topology dump (GUIDs, LIDs, ports). -p = one line per link."],
    ["InfiniBand · fabric", "ibtracert <src_lid> <dst_lid>", "Hop-by-hop path from the LFTs."],
    ["InfiniBand · fabric", "ibroute <switch_lid>", "Dump a switch's Linear Forwarding Table (LID → out port)."],
    ["InfiniBand · fabric", "ibdiagnet [--pc --pm] [--sharp]", "One-shot fabric health report; --pc clears, --pm reads port counters; --sharp validates aggregation trees."],
    ["InfiniBand · fabric", "perfquery [-R] <lid> <port>", "Port counters (SymbolError, LinkDowned, XmitWait, XmitData...). Cumulative: read twice; -R resets."],
    ["InfiniBand · fabric", "ibping -S | -L <lid> | -G <guid>", "Reachability at the IB layer (MADs), no IP needed."],
    ["InfiniBand · fabric", "saquery [-s]", "Query the Subnet Administrator; -s lists SMs."],
    ["InfiniBand · SM", "/etc/opensm/opensm.conf", "sm_priority, routing_engine (minhop|updn|ftree|ar_*), root_guid_file, lmc, adaptive_routing_enable, qos, qos_sl2vl, qos_vlarb_high/low, partition_config_file, qos_policy_file."],
    ["InfiniBand · SM", "/etc/opensm/partitions.conf", "Name=0xKEY[, ipoib] : GUID=full, GUID=limited, ALL=...; Default=0x7fff."],
    ["InfiniBand · SM", "systemctl restart opensm  /  kill -HUP $(pgrep opensm)", "Restart for routing engine changes; HUP re-reads partitions/QoS without re-sweeping."],
    ["Perf", "ib_write_bw / ib_send_bw / ib_read_bw [-d dev] [-S sl] [-p port] [-q n] [-x gid] [--report_gbits] [server]", "RDMA bandwidth; server first, then client with the server address."],
    ["Perf", "ib_write_lat / ib_send_lat", "RDMA latency (small messages, µs)."],
    ["Perf", "all_reduce_perf -b 8 -e 8G -f 2 -g <gpus>", "NCCL collective bus bandwidth vs baseline (CloudAI)."],
    ["Hardware", "mst start; mst status", "Load Mellanox Software Tools and list /dev/mst devices."],
    ["Hardware", "mlxconfig -d /dev/mst/<dev> q | s PARAM=val", "Firmware config: LINK_TYPE_P1 (1 IB, 2 ETH), INTERNAL_CPU_MODEL (1 DPU, 0 NIC), SRIOV_EN, NUM_OF_VFS."],
    ["Hardware", "mlxfwreset -d <dev> reset", "Apply firmware config changes without a reboot."],
    ["Hardware", "mlxlink -d <dev> [-p port] [-m] [-c] [-e] [--pc] [--show_fec]", "Physical layer: module info, counters and raw/effective BER, eye, clear, FEC."],
    ["Hardware", "nvidia-smi topo -m", "GPU↔GPU↔NIC locality: NV#, PIX, PXB, PHB, NODE, SYS."],
    ["Hardware", "rdma link show / ibdev2netdev / show_gids", "RDMA devices and their netdevs; GID table (RoCEv2 GID index)."],
    ["Cumulus · NVUE", "nv set <path> <value> / nv unset <path>", "Stage a change (opens a pending revision)."],
    ["Cumulus · NVUE", "nv config diff [rev1 rev2]", "Pending vs applied (or between revisions)."],
    ["Cumulus · NVUE", "nv config apply [<rev>] [-y]", "Commit pending (creates rev_id). With a rev id: rollback."],
    ["Cumulus · NVUE", "nv config save", "Persist applied to startup (needed unless auto-save is enabled)."],
    ["Cumulus · NVUE", "nv config history / nv config show [-o yaml]", "List revisions / export the applied config."],
    ["Cumulus · NVUE", "nv config patch <file> / nv config replace <file>", "Merge a YAML fragment / replace the whole config with a file (both stage only)."],
    ["Cumulus · NVUE", "nv show interface [swpX [link|qos]] / nv show system [version|wjh] / nv show platform", "Operational state."],
    ["Cumulus · RoCE", "nv set qos roce enable on [mode lossless|lossy]", "Lossless profile: PFC prio 3, ECN TC3, DSCP 26→SP3, CNP prio 6, trust pcp/dscp. Verify: nv show qos roce."],
    ["Cumulus · AR", "nv set router adaptive-routing enable on", "Per-packet adaptive routing on Spectrum."],
    ["Cumulus · BGP", "nv set vrf default router bgp autonomous-system N / router-id / neighbor <ip> remote-as N", "eBGP underlay. Verify nv show vrf default router bgp neighbor."],
    ["Cumulus · EVPN", "nv set bridge domain br_default vlan 10 vni 10010 / nv set nve vxlan source address <lo> / nv set evpn state enabled / nv set vrf RED evpn vni 4001", "L2VNI per VLAN, VTEP source, EVPN on, L3VNI per VRF (same on all leaves). Verify nv show evpn vni, nv show nve vxlan."],
    ["Cumulus · WJH", "nv show system wjh / nv set system wjh channel forwarding trigger l2|l3|tunnel", "On-box drop reasons and channel triggers."],
    ["Cumulus · Linux", "cl-resource-query", "ASIC table usage (MAC, host, routes, ECMP, ACL) vs maximum."],
    ["Cumulus · Linux", "ztp -s | -e | -d", "Zero Touch Provisioning status / enable / disable."],
    ["NetQ", "netq check bgp|evpn|mtu|interfaces|roce", "Fabric-wide validations with per-test pass/fail and details."],
    ["NetQ", "netq show events | wjh-drop | bgp | evpn | interfaces congestion [around <t> | between <t1> and <t2>]", "Telemetry views, time travel."],
    ["Kubernetes", "helm install network-operator nvidia/network-operator -n nvidia-network-operator --create-namespace", "Deploy the Network Operator."],
    ["Kubernetes", "kubectl get nicclusterpolicy -o yaml", "Policy state ready/notReady with per-component appliedStates."],
    ["Kubernetes", "kubectl get pods -n nvidia-network-operator / kubectl logs <pod>", "Driver, device plugin, Multus, IPAM pods."],
    ["Kubernetes", "kubectl describe node <n> | grep rdma", "Allocatable rdma/<resource> extended resource."],
    ["Kubernetes", "pod spec: resources.limits rdma/rdma_shared_device_a: 1 + annotation k8s.v1.cni.cncf.io/networks", "How a pod gets the RDMA device and the secondary network."],
    ["Ansible", "ansible-galaxy collection install nvidia.nvue", "NVUE modules (nvidia.nvue.config, .api, ...)."],
    ["Ansible", "ansible-playbook -i inventory.ini play.yml [--limit leaf] [--check --diff]", "Run/dry-run; hosts: in the play or --limit scopes it; group_vars/host_vars hold variables."],
    ["MLNX-OS", "enable; configure terminal; interface mgmt0 ip address X /24; configuration write", "Initial switch config via console."],
    ["MLNX-OS", "image fetch scp://...; image install <img>; image boot next; show images; reload", "Upgrade sequence: confirm next boot before reload."],
    ["UFM", "Dashboard traffic map (tiers), Top-N, Events, System Health, Cable Validation Tool", "XmitWait = congestion; primary telemetry 30 s; HA pair needs dedicated OOB link."]
  ];
  function renderCmds() {
    const el = $("#view-cmds"); const groups = [...new Set(CMDS.map(c => c[0]))];
    el.innerHTML = `<div class="row" style="margin-bottom:10px"><h2 style="margin:0">Command reference</h2><input id="cmdFilter" placeholder="filter (e.g. roce, pkey, netq)" style="width:260px"></div><div id="cmdList"></div>`;
    const draw = () => { const f = ($("#cmdFilter").value || "").toLowerCase(); $("#cmdList").innerHTML = groups.map(g => { const rows = CMDS.filter(c => c[0] === g && (!f || (c[1] + c[2] + c[0]).toLowerCase().includes(f))); return rows.length ? `<h3 style="margin-top:14px">${esc(g)}</h3><table>${rows.map(c => `<tr><td style="width:42%"><code>${esc(c[1])}</code></td><td>${esc(c[2])}</td></tr>`).join("")}</table>` : ""; }).join(""); };
    draw(); $("#cmdFilter").oninput = draw;
  }

  // ---------------------------------------------------------------- progress
  function renderProgress() {
    const el = $("#view-progress");
    const topics = {}; Q.forEach(q => { const r = store.q[q.id]; if (!r) return; const k = q.domain + "|" + (q.topic || "general"); topics[k] = topics[k] || { right: 0, wrong: 0 }; topics[k].right += r.right; topics[k].wrong += r.wrong; });
    const rows = Object.entries(topics).map(([k, v]) => ({ domain: k.split("|")[0], topic: k.split("|")[1], ...v, acc: pct(v.right, v.right + v.wrong) })).sort((a, b) => a.acc - b.acc);
    el.innerHTML = `<h2>Progress</h2>
      <div class="grid">${SYL.domains.map(d => { const s = domainStats(d.key); return `<div class="card"><b>${esc(d.name)}</b><div class="row" style="justify-content:space-between"><span class="muted">${s.seen}/${s.total} seen</span><span class="${s.acc >= 70 ? "ok" : s.right + s.wrong ? "bad" : "muted"}">${s.right + s.wrong ? s.acc + "%" : "—"}</span></div><div class="bar"><div style="width:${s.acc}%;background:${d.color}"></div></div></div>`; }).join("")}</div>
      <h3 style="margin-top:16px">Topics, weakest first</h3>
      ${rows.length ? `<table><tr><th>Domain</th><th>Topic</th><th>Right</th><th>Wrong</th><th>Accuracy</th></tr>${rows.map(r => `<tr><td>${r.domain}</td><td>${esc(r.topic)}</td><td>${r.right}</td><td>${r.wrong}</td><td class="${r.acc >= 70 ? "ok" : "bad"}">${r.acc}%</td></tr>`).join("")}</table>` : '<p class="muted">Answer some questions first.</p>'}
      <h3 style="margin-top:16px">Labs</h3><table>${LABS.map(l => `<tr><td>${store.labs[l.id] ? "✅" : "○"}</td><td>${esc(l.title)}</td><td class="muted">${store.labs[l.id] ? new Date(store.labs[l.id].date).toLocaleDateString() : ""}</td></tr>`).join("")}</table>
      <div class="row" style="margin-top:16px"><button id="expBtn">Export progress (JSON)</button><button class="ghost" id="rstBtn">Reset all progress</button></div>`;
    $("#expBtn").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 2)], { type: "application/json" })); a.download = "ncp-ain-progress.json"; a.click(); };
    $("#rstBtn").onclick = () => { if (confirm("Delete all saved progress?")) { localStorage.removeItem(KEY); location.reload(); } };
  }

  // ---------------------------------------------------------------- boot
  const start = (location.hash || "#dash").slice(1);
  showView(["dash", "study", "flash", "practice", "exam", "lab", "cmds", "progress"].includes(start) ? start : "dash");
})();
