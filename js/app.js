/* AFO Grade Reporting — clickable demo. Everything runs in the browser; nothing is sent. */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${+m}/${+d}/${y}`; };
const now = () => fmt(TODAY) + ' (now)';
const GRADES = ['A', 'B', 'C', 'D', 'F', 'P'];
const isAdmin = u => u.role === 'owner' || u.role === 'admin';

const state = { user: USERS[0], tab: 'dashboard', inboxCampus: 'ALL', regSeg: 'waiting', repT: 'all', repCampus: 'all', q: '', adminTab: 'users', draft: null };

/* ---------------- transcript status ---------------- */
const T = {
  queued:   { label: 'In today’s queue',   cls: 'queued',   icon: 'fa-clock' },
  waiting:  { label: 'Waiting for transcript', cls: 'sent', icon: 'fa-hourglass-half' },
  partial:  { label: 'Partly on transcript', cls: 'sent',   icon: 'fa-circle-half-stroke' },
  overdue:  { label: 'Not on transcript',  cls: 'flagged',  icon: 'fa-triangle-exclamation' },
  mismatch: { label: 'Transcript differs', cls: 'flagged',  icon: 'fa-not-equal' },
  verified: { label: 'On transcript',      cls: 'posted',   icon: 'fa-circle-check' },
};
const differs = c => c.transcript && (c.transcript.grade !== c.grade || +c.transcript.credits !== +c.credits);
function tStatus(r) {
  if (r.status === 'queued') return { key: 'queued' };
  const n = r.courses.length, found = r.courses.filter(c => c.transcript), age = daysBetween(r.sendDate, TODAY);
  if (found.some(differs)) return { key: 'mismatch', age, found: found.length, n };
  if (found.length === n) {
    const last = found.map(c => c.transcript.on).sort().pop();
    return { key: 'verified', on: last, lag: daysBetween(r.sendDate, last), age, found: n, n };
  }
  if (age > OVERDUE_DAYS) return { key: 'overdue', age, found: found.length, n };
  if (found.length) return { key: 'partial', age, found: found.length, n };
  return { key: 'waiting', age, found: 0, n };
}
function tPill(r) {
  const s = tStatus(r), t = T[s.key];
  let detail = '';
  if (s.key === 'verified') detail = ` · ${fmt(s.on)}`;
  if (s.key === 'partial') detail = ` · ${s.found} of ${s.n}`;
  if (s.key === 'waiting' || s.key === 'overdue') detail = ` · ${s.age} day${s.age === 1 ? '' : 's'}`;
  return `<span class="pill ${t.cls}"><i class="fa-solid ${t.icon}"></i> ${t.label}${detail}</span>` +
    (r.status === 'flagged' ? ` <span class="pill flagged"><i class="fa-solid fa-flag"></i> Flagged</span>` : '') +
    (r.version > 1 ? ` <span class="pill v2">Revised v${r.version}</span>` : '');
}
function courseT(c, r) {
  if (r.status === 'queued') return '<span class="muted">—</span>';
  if (!c.transcript) { const a = daysBetween(r.sendDate, TODAY); return `<span class="${a > OVERDUE_DAYS ? 't-bad' : 't-wait'}"><i class="fa-solid fa-hourglass-half"></i> Not yet · ${a}d</span>`; }
  if (differs(c)) {
    const bits = [];
    if (c.transcript.grade !== c.grade) bits.push(`grade <b>${c.transcript.grade}</b>`);
    if (+c.transcript.credits !== +c.credits) bits.push(`<b>${c.transcript.credits}</b> credits`);
    return `<span class="t-bad"><i class="fa-solid fa-not-equal"></i> Transcript shows ${bits.join(', ')}</span>`;
  }
  return `<span class="t-ok"><i class="fa-solid fa-circle-check"></i> ${fmt(c.transcript.on)} <span class="muted">(${daysBetween(r.sendDate, c.transcript.on)}d)</span></span>`;
}

/* ---------------- shell ---------------- */
function init() {
  const sel = $('#asUser');
  const groups = [['owner', 'Owner'], ['admin', 'AFO admins'], ['registrar', 'Campus registrars']];
  sel.innerHTML = groups.map(([r, l]) => `<optgroup label="${l}">` + USERS.filter(u => u.role === r).map(u => `<option value="${u.id}">${esc(u.name)} — ${ROLES[r].label}${r === 'registrar' ? ', ' + u.campus : ''}</option>`).join('') + '</optgroup>').join('');
  sel.onchange = () => setUser(USERS.find(u => u.id === sel.value));
  $('#modalClose').onclick = closeModal;
  $('#modalBack').onclick = e => { if (e.target.id === 'modalBack') closeModal(); };
  document.onkeydown = e => { if (e.key === 'Escape') closeModal(); };
}
function setUser(u, quiet) {
  state.user = u; state.draft = null; state.q = '';
  state.tab = isAdmin(u) ? 'dashboard' : 'inbox';
  $('#asUser').value = u.id;
  render();
  if (!quiet) toast(`Signed in as ${u.name} (${ROLES[u.role].label}${u.role === 'registrar' ? ', ' + u.campus : ''})`);
}
function tabsFor(u) {
  if (!isAdmin(u)) return [['inbox', 'My campus reports', 'fa-inbox']];
  return [['dashboard', 'Dashboard', 'fa-chart-simple'], ['entry', 'Enter grades', 'fa-pen-to-square'], ['queue', 'Today’s queue', 'fa-clock'],
    ['reports', 'All reports', 'fa-paper-plane'], ['transcript', 'Transcript check', 'fa-list-check'], ['inbox', 'Registrar view', 'fa-inbox'], ['admin', 'Admin', 'fa-gear']];
}
function themeCampus() {
  const u = state.user;
  if (u.role === 'registrar') return u.campus;
  if (state.tab === 'inbox' && state.inboxCampus !== 'ALL') return state.inboxCampus;
  return 'AFO';
}
function applyTheme() {
  const k = themeCampus(), c = CAMPUSES[k], u = state.user;
  document.documentElement.style.setProperty('--accent', c.primary);
  const b = $('#banner');
  b.style.backgroundImage = `url(assets/banners/${c.banner})`;
  b.classList.toggle('has-mascot', !!c.mascot);
  $('#campusName').textContent = c.name;
  $('#bannerSub').textContent = k === 'AFO' ? 'Grade reports for online and credit-recovery courses, district-wide' : `${k} ${c.mascot} · Registrar view`;
  $('#whoBox').innerHTML = `<b>${esc(u.name)}</b><br>${ROLES[u.role].label} · ${esc(u.campus)}`;
}
function render() {
  const u = state.user, tabs = tabsFor(u);
  if (!tabs.some(t => t[0] === state.tab)) state.tab = tabs[0][0];
  applyTheme();
  const sentR = REPORTS.filter(r => r.status !== 'queued');
  const counts = {
    queue: REPORTS.filter(r => r.status === 'queued').length,
    transcript: sentR.filter(r => ['overdue', 'mismatch'].includes(tStatus(r).key)).length,
    reports: REPORTS.filter(r => r.status === 'flagged').length,
    inbox: u.role === 'registrar' ? inboxReports().filter(r => r.status === 'flagged' || tStatus(r).key === 'mismatch' || tStatus(r).key === 'overdue').length : 0,
  };
  $('#tabs').innerHTML = tabs.map(([k, l, i]) => `<button class="${k === state.tab ? 'active' : ''}" data-tab="${k}"><i class="fa-solid ${i}"></i> ${l}${counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</button>`).join('');
  $$('#tabs button').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; state.q = ''; render(); });
  $('#main').innerHTML = '';
  ({ dashboard: viewDashboard, entry: viewEntry, queue: viewQueue, reports: viewReports, transcript: viewTranscript, inbox: viewInbox, admin: viewAdmin })[state.tab]();
}
const registrarFor = k => USERS.filter(x => x.role === 'registrar' && x.campus === k);
function inboxReports() {
  const k = state.user.role === 'registrar' ? state.user.campus : state.inboxCampus;
  const sent = REPORTS.filter(r => r.status !== 'queued');
  return k === 'ALL' ? sent : sent.filter(r => r.home === k);
}
const chip = k => `<span class="chip" style="background:${CAMPUSES[k].primary}">${k}</span>`;
const coursesShort = r => r.courses.map(c => `${c.code} <b>${c.grade}</b>`).join(', ');
function log(what, who) { ACTIVITY.unshift({ at: now(), who: who || state.user.name, what }); }

/* ---------------- report document ---------------- */
function reportDoc(r, withTranscript) {
  const c = CAMPUSES[r.home];
  const rows = r.courses.map((x, i) => {
    const ch = f => (r.changed || []).some(k => k.row === i && k.field === f);
    const was = f => ch(f) && r.previous ? `<span class="was">${esc(r.previous[i][f])}</span>` : '';
    const td = (f, v) => `<td class="${ch(f) ? 'changed' : ''}">${was(f)}${esc(v)}</td>`;
    return `<tr><td><b>${esc(x.code)}</b> ${esc(x.title)}</td>${td('weighted', x.weighted)}${td('grade', x.grade)}${td('credits', x.credits)}${td('completed', fmt(x.completed))}${td('teacher', x.teacher)}${withTranscript ? `<td class="no-print">${courseT(x, r)}</td>` : ''}</tr>`;
  }).join('');
  return `<div class="report-doc" style="--doc-accent:${c.primary}">
    <div class="doc-head"><div><h3>${esc(c.name)} — Grade Report</h3><div class="muted small">Report ${r.id}${r.version > 1 ? ` · Revised (v${r.version}) — replaces earlier version` : ''} · Entered through Agua Fria Online</div></div>${chip(r.home)}</div>
    <div class="doc-grid">
      <div><span class="k">Student ID</span><span class="v mono">${r.studentId}</span></div>
      <div><span class="k">Student name</span><span class="v">${esc(r.studentName)}</span></div>
      <div><span class="k">Home school</span><span class="v">${esc(c.name)}</span></div>
      <div><span class="k">Grade</span><span class="v">${r.grade}</span></div>
      <div><span class="k">School year</span><span class="v">${r.schoolYear}</span></div>
      <div><span class="k">Date of report</span><span class="v">${fmt(r.sendDate)}</span></div>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Course title / #</th><th>Weighted / Not</th><th>Grade</th><th>Credits</th><th>Completed</th><th>Teacher of record</th>${withTranscript ? '<th class="no-print">On transcript?</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="doc-foot"><div><span class="k muted small">COMMENTS</span><div>${esc(r.comments) || '<span class="muted">—</span>'}</div></div><div><span class="k muted small">SIGNATURE</span><div class="signature">Morgan Ellis</div></div></div>
    <div class="muted small" style="margin-top:8px">Submitted by ${esc(r.submittedBy)}</div>
  </div>`;
}

function emailPreview(r) {
  const regs = registrarFor(r.home), sub = USERS.find(u => u.name === r.submittedBy), cc = ROUTING[r.home].cc;
  const subj = `${r.version > 1 ? `REVISED (v${r.version}) — ` : ''}Grade Report — ${r.studentId} ${r.studentName} — ${r.home} — ${fmt(r.sendDate)}`;
  return `<div class="email"><div class="email-head">
      <span class="k">From</span><span>AFO Grade Reporting &lt;no-reply@district.example&gt;</span>
      <span class="k">Reply-To</span><span>${esc(r.submittedBy)} &lt;${sub ? sub.email : 'afo@district.example'}&gt;</span>
      <span class="k">To</span><span>${regs.map(x => `${esc(x.name)} &lt;${x.email}&gt;`).join(', ') || '<i>No registrar set</i>'}</span>
      <span class="k">CC</span><span>${cc.length ? cc.join(', ') : '<span class="muted">none</span>'}</span>
      <span class="k">Subject</span><span><b>${esc(subj)}</b></span></div>
    <div class="email-body">
      ${r.version > 1 ? `<p class="note">This is a <b>corrected report</b>. It replaces the version sent earlier; changed fields are highlighted.</p>` : ''}
      <p>A grade report for <b>${esc(r.studentName)}</b> (${r.studentId}, grade ${r.grade}) was submitted by ${esc(r.submittedBy)}, Agua Fria Online.</p>
      <table class="t" style="margin-bottom:12px"><thead><tr><th>Course</th><th>Grade</th><th>Weighted</th><th>Credits</th><th>Completed</th></tr></thead><tbody>
      ${r.courses.map(c => `<tr><td>${c.code} ${esc(c.title)}</td><td><b>${c.grade}</b></td><td>${c.weighted}</td><td>${c.credits}</td><td>${fmt(c.completed)}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">No need to reply when it’s entered — AFO’s daily transcript check will see it in Synergy automatically.</p>
      <p class="row"><a class="btn primary sm" href="#" onclick="return false"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open report</a></p>
      <div class="attach"><i class="fa-solid fa-file-pdf"></i> ${r.id}_${r.studentId}${r.version > 1 ? '_v' + r.version : ''}.pdf</div>
    </div></div>`;
}

function openReport(id, ctx) {
  const r = REPORTS.find(x => x.id === id), u = state.user, s = tStatus(r);
  let body = `<div class="row" style="margin-bottom:12px">${tPill(r)}<span class="spacer"></span><span class="muted small">Routed to the ${chip(r.home)} registrar</span></div>`;
  if (r.status === 'flagged') body += `<p class="note bad" style="margin-bottom:12px"><b>Registrar flagged this report:</b> ${esc(r.flagNote)}</p>`;
  if (s.key === 'mismatch') body += `<p class="note bad" style="margin-bottom:12px"><b>The transcript doesn’t match this report.</b> Either the registrar entered it differently, or the report was wrong — check the course below and send a correction or a note.</p>`;
  if (s.key === 'overdue') body += `<p class="note bad" style="margin-bottom:12px"><b>Not on the transcript after ${s.age} days.</b> ${isAdmin(u) ? 'Send the registrar a reminder from the Transcript check tab.' : 'Please enter it in Synergy, or flag it if something is wrong.'}</p>`;
  body += reportDoc(r, true);
  body += `<div class="grid cols-2" style="margin-top:16px">
    <div><h3 style="font-size:15px;margin-bottom:8px">History</h3><ul class="history">${r.history.slice().reverse().map(h => `<li><b>${esc(h.action)}</b><br><span class="when">${esc(h.at)} · ${esc(h.by)}</span></li>`).join('')}</ul></div>
    <div><h3 style="font-size:15px;margin-bottom:8px">What the registrar received</h3><button class="btn sm" id="showEmail"><i class="fa-solid fa-envelope"></i> Show email</button><div id="emailSlot" style="margin-top:10px"></div></div></div>`;
  const foot = [`<button class="btn" id="pdfBtn"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>`];
  if (ctx === 'inbox' && r.status !== 'flagged' && s.key !== 'verified') foot.push(`<button class="btn danger" id="flagBtn"><i class="fa-solid fa-flag"></i> Flag a problem</button>`);
  if (isAdmin(u) && r.status !== 'queued') foot.push(`<button class="btn primary" id="corrBtn"><i class="fa-solid fa-pen"></i> Send a correction</button>`);
  if (isAdmin(u) && r.status === 'queued') foot.push(`<button class="btn primary" id="editQ"><i class="fa-solid fa-pen"></i> Edit before it sends</button>`);
  openModal(`${r.studentName} · ${r.id}`, body, foot.join(''));
  $('#showEmail').onclick = () => { $('#emailSlot').innerHTML = emailPreview(r); $('#showEmail').remove(); };
  $('#pdfBtn').onclick = () => window.print();
  if ($('#flagBtn')) $('#flagBtn').onclick = () => flagReport(r);
  if ($('#corrBtn')) $('#corrBtn').onclick = () => correctionForm(r);
  if ($('#editQ')) $('#editQ').onclick = () => { closeModal(); state.draft = { editing: r.id, studentId: r.studentId, comments: r.comments, courses: JSON.parse(JSON.stringify(r.courses)) }; state.tab = 'entry'; render(); };
}

function flagReport(r) {
  $('#modalBody').insertAdjacentHTML('afterbegin', `<div class="card" style="border-color:var(--bad)"><div class="field"><label for="flagNote">What needs fixing? <span class="req">*</span></label><textarea id="flagNote" class="input" rows="3" placeholder="e.g. Course should be English II A, not B"></textarea></div><div class="row" style="margin-top:10px"><span class="muted small">${esc(r.submittedBy)} at AFO gets your note and a link to send a correction.</span><span class="spacer"></span><button class="btn danger" id="flagSave">Send flag</button></div></div>`);
  $('#flagNote').focus();
  $('#flagSave').onclick = () => {
    const note = $('#flagNote').value.trim();
    if (!note) { $('#flagNote').classList.add('invalid'); return; }
    r.status = 'flagged'; r.flagNote = note;
    r.history.push({ at: now(), by: state.user.name, action: 'Flagged: ' + note });
    log(`Flagged ${r.id} back to ${r.submittedBy}`);
    closeModal(); toast(`Flag sent to ${r.submittedBy}`); render();
  };
}

function correctionForm(r) {
  const opt = (arr, v) => arr.map(x => `<option ${x == v ? 'selected' : ''}>${x}</option>`).join('');
  const body = `<p class="muted" style="margin-bottom:12px">Change what was wrong. The registrar gets a <b>REVISED</b> email that replaces the original, with changed fields highlighted. Changed courses go back to “waiting” until the transcript check sees the update.</p>
    ${r.courses.map((c, i) => `<div class="course-row" data-i="${i}">
      <div class="field wide"><span class="lbl">Course</span><select class="input" data-f="code">${COURSES.map(k => `<option value="${k.code}" ${k.code === c.code ? 'selected' : ''}>${k.code} ${esc(k.title)}</option>`).join('')}</select></div>
      <div class="field"><span class="lbl">Weighted</span><select class="input" data-f="weighted">${opt(['Weighted', 'Not Weighted'], c.weighted)}</select></div>
      <div class="field"><span class="lbl">Teacher</span><select class="input" data-f="teacher">${opt(TEACHERS.map(t => t.name), c.teacher)}</select></div>
      <div class="field"><span class="lbl">Grade</span><select class="input" data-f="grade">${opt(GRADES, c.grade)}</select></div>
      <div class="field"><span class="lbl">Credits</span><input class="input" data-f="credits" type="number" step="0.25" min="0" value="${c.credits}"></div>
      <div class="field"><span class="lbl">Completed</span><input class="input" data-f="completed" type="date" value="${c.completed}" max="${TODAY}"></div><div></div>
    </div>`).join('')}
    <div class="field" style="margin-top:12px"><label for="corrWhy">Reason for correction <span class="req">*</span></label><input id="corrWhy" class="input" placeholder="e.g. Wrong grade entered"></div>`;
  openModal(`Correct ${r.id} — ${r.studentName}`, body, `<button class="btn" id="corrCancel">Cancel</button><button class="btn primary" id="corrSend"><i class="fa-solid fa-paper-plane"></i> Send revised report</button>`);
  $('#corrCancel').onclick = () => openReport(r.id);
  $('#corrSend').onclick = () => {
    const why = $('#corrWhy').value.trim();
    if (!why) { $('#corrWhy').classList.add('invalid'); $('#corrWhy').focus(); return; }
    const prev = JSON.parse(JSON.stringify(r.courses)), changed = [];
    $$('#modalBody .course-row').forEach(row => {
      const i = +row.dataset.i;
      row.querySelectorAll('[data-f]').forEach(el => {
        const f = el.dataset.f; let v = el.value; if (f === 'credits') v = +v;
        if (String(r.courses[i][f]) !== String(v)) {
          r.courses[i][f] = v; changed.push({ row: i, field: f });
          if (f === 'code') r.courses[i].title = COURSES.find(k => k.code === v).title;
          r.courses[i].transcript = null;
        }
      });
    });
    if (!changed.length) { toast('Nothing changed yet'); return; }
    r.previous = prev; r.changed = changed; r.version++; r.status = 'sent'; r.flagNote = null; r.sendDate = TODAY;
    r.history.push({ at: now(), by: state.user.name, action: `Correction sent (v${r.version}): ${why}` });
    log(`Sent correction v${r.version} for ${r.id} (${r.home})`);
    toast(`Revised report emailed to the ${r.home} registrar`);
    render(); openReport(r.id);
  };
}

/* ---------------- dashboard ---------------- */
function viewDashboard() {
  const sent = REPORTS.filter(r => r.status !== 'queued');
  const by = k => sent.filter(r => tStatus(r).key === k);
  const verified = by('verified'), overdue = by('overdue'), mismatch = by('mismatch');
  const waiting = sent.filter(r => ['waiting', 'partial'].includes(tStatus(r).key));
  const lags = verified.map(r => tStatus(r).lag);
  const avgLag = lags.length ? (lags.reduce((a, b) => a + b, 0) / lags.length).toFixed(1) : '—';
  const per = HOME_CAMPUSES.map(k => {
    const rs = sent.filter(r => r.home === k), ks = rs.map(r => tStatus(r).key);
    const v = rs.filter(r => tStatus(r).key === 'verified').map(r => tStatus(r).lag);
    return { k, total: rs.length, ok: ks.filter(x => x === 'verified').length, wait: ks.filter(x => x === 'waiting' || x === 'partial').length, bad: ks.filter(x => x === 'overdue' || x === 'mismatch').length, avg: v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '—' };
  });
  const max = Math.max(...per.map(p => p.total), 1);
  const attention = [...mismatch, ...overdue, ...REPORTS.filter(r => r.status === 'flagged')].filter((r, i, a) => a.indexOf(r) === i);
  $('#main').innerHTML = `
    <div class="page-head"><div><h2>Are the grades on transcripts?</h2><p>Every report AFO has sent, checked against Synergy credit history every morning. Last check: <b>${LAST_SCAN}</b>.</p></div>
      <button class="btn" data-go="transcript"><i class="fa-solid fa-list-check"></i> Transcript check details</button></div>
    <div class="grid cols-4" style="margin-bottom:16px">
      <div class="stat accent"><div class="n" style="color:var(--ok)">${verified.length}</div><div class="l">Reports fully on transcript</div></div>
      <div class="stat"><div class="n">${waiting.length}</div><div class="l">Waiting (sent ≤ ${OVERDUE_DAYS} days ago)</div></div>
      <div class="stat"><div class="n" style="color:var(--bad)">${overdue.length + mismatch.length}</div><div class="l">Need attention (${overdue.length} overdue · ${mismatch.length} differ)</div></div>
      <div class="stat"><div class="n">${avgLag}<span style="font-size:16px"> days</span></div><div class="l">Average time from send to transcript</div></div>
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>By home campus</h3>
        <div class="table-wrap"><table class="t"><thead><tr><th>Campus</th><th style="width:45%">Reports</th><th>Avg days to transcript</th></tr></thead><tbody>
        ${per.map(p => `<tr><td>${chip(p.k)}</td><td><div class="bar" style="width:${Math.max(p.total / max * 100, 8)}%">
            <span style="width:${p.ok / Math.max(p.total, 1) * 100}%;background:var(--ok)" title="On transcript ${p.ok}"></span>
            <span style="width:${p.wait / Math.max(p.total, 1) * 100}%;background:#f0b429" title="Waiting ${p.wait}"></span>
            <span style="width:${p.bad / Math.max(p.total, 1) * 100}%;background:var(--bad)" title="Needs attention ${p.bad}"></span></div><span class="small muted">${p.ok}/${p.total} on transcript</span></td>
          <td><b>${p.avg}</b></td></tr>`).join('')}</tbody></table></div>
        <div class="row small muted" style="margin-top:8px"><span><span class="swatch" style="background:var(--ok)"></span>On transcript</span><span><span class="swatch" style="background:#f0b429"></span>Waiting</span><span><span class="swatch" style="background:var(--bad)"></span>Overdue / differs</span></div>
      </div>
      <div class="card"><h3>Needs attention</h3>
        ${attention.length ? `<div class="table-wrap"><table class="t"><tbody>${attention.map(r => `<tr class="click" data-id="${r.id}"><td><b>${esc(r.studentName)}</b><br><span class="small muted">sent ${fmt(r.sendDate)}</span></td><td>${chip(r.home)}</td><td>${tPill(r)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nothing needs attention 🎉</div>'}
      </div>
      <div class="card"><h3>Today</h3>
        <p><b>${REPORTS.filter(r => r.status === 'queued').length}</b> reports in the queue for tomorrow’s 6:00 AM send.</p>
        <p style="margin-top:6px"><b>${SCANS[0].found}</b> courses newly found on transcripts this morning.</p>
        <div class="row" style="margin-top:12px"><button class="btn primary" data-go="entry"><i class="fa-solid fa-pen-to-square"></i> Enter grades</button><button class="btn" data-go="queue">Today’s queue</button></div>
      </div>
      <div class="card"><h3>Recent activity</h3><ul class="history">${ACTIVITY.slice(0, 6).map(a => `<li><b>${esc(a.what)}</b><br><span class="when">${esc(a.at)} · ${esc(a.who)}</span></li>`).join('')}</ul></div>
    </div>`;
  bindRows('reports');
  $$('[data-go]').forEach(b => b.onclick = () => { state.tab = b.dataset.go; render(); });
}
function bindRows(ctx) { $$('#main tr[data-id]').forEach(tr => tr.onclick = e => { if (e.target.closest('button,input')) return; openReport(tr.dataset.id, ctx); }); }

/* ---------------- grade entry ---------------- */
const blankCourse = () => ({ code: '', weighted: '', grade: '', credits: '', teacher: '', completed: TODAY });
function viewEntry() {
  if (!state.draft) state.draft = { studentId: '', comments: '', courses: [blankCourse()] };
  const d = state.draft, sample = STUDENTS.slice(0, 7);
  $('#main').innerHTML = `
    <div class="page-head"><div><h2>${d.editing ? `Edit ${d.editing} before it sends` : 'Enter course completions'}</h2>
      <p>For a student from <b>any</b> campus. The report goes to that student’s home-campus registrar.</p></div></div>
    <div class="card"><h3>Student</h3>
      <div class="student-strip">
        <div class="field"><label for="sid">Student ID <span class="req">*</span></label><input id="sid" class="input mono" inputmode="numeric" value="${esc(d.studentId)}" placeholder="e.g. ${sample[0].id}"></div>
        <div class="field"><span class="lbl">Name</span><div id="sName" class="input ro">—</div></div>
        <div class="field"><span class="lbl">Grade</span><div id="sGrade" class="input ro">—</div></div>
        <div class="field"><span class="lbl">Home campus</span><div id="sHome" class="input ro">—</div></div>
        <div class="field"><span class="lbl">School year</span><div class="input ro">${SCHOOL_YEAR}</div></div>
      </div>
      <div id="sMsg" style="margin-top:8px"></div>
      <div class="small muted" style="margin-top:8px">In the real app these fill in from Synergy. Demo IDs to try: ${sample.map(s => `<a href="#" class="demo-id mono" data-id="${s.id}">${s.id}</a>`).join(' · ')}</div>
    </div>
    <div class="card">
      <div class="row" style="margin-bottom:6px"><h3 style="margin:0">Courses completed</h3><span class="spacer"></span><span class="small muted">Weighting is your call on every row.</span></div>
      <div id="courseRows"></div>
      <button class="btn" id="addCourse" style="margin-top:10px"><i class="fa-solid fa-plus"></i> Add course</button>
      <div class="field" style="margin-top:14px"><label for="cmt">Comments for the registrar (optional)</label><textarea id="cmt" class="input" rows="2">${esc(d.comments)}</textarea></div>
    </div>
    <div class="card"><div class="route-preview" id="routePreview"></div>
      <div class="row" style="margin-top:12px"><span class="small muted">Saved entries go into today’s queue and send at 6:00 AM tomorrow. Courses for the same student on the same day become one report. After it sends, the daily transcript check watches for it in Synergy.</span><span class="spacer"></span>
        <button class="btn" id="clearDraft">Clear</button><button class="btn primary" id="saveDraft"><i class="fa-solid fa-floppy-disk"></i> ${d.editing ? 'Save changes' : 'Save to today’s queue'}</button></div></div>`;
  const lookup = () => {
    d.studentId = $('#sid').value.trim();
    const s = STUDENTS.find(x => x.id === d.studentId);
    $('#sName').textContent = s ? s.name : '—'; $('#sGrade').textContent = s ? s.grade : '—';
    $('#sHome').innerHTML = s ? `${chip(s.home)} ${esc(CAMPUSES[s.home].name)}` : '—';
    $('#sMsg').innerHTML = d.studentId && !s ? `<span class="lookup-bad"><i class="fa-solid fa-circle-xmark"></i> No student with that ID.</span>` : s ? `<span class="lookup-ok"><i class="fa-solid fa-circle-check"></i> Found — routes to the ${s.home} registrar.</span>` : '';
    const el = $('#routePreview');
    if (!s) el.innerHTML = `<i class="fa-solid fa-route muted"></i><span class="muted">Enter a student to see where this report goes.</span>`;
    else { const regs = registrarFor(s.home), cc = ROUTING[s.home].cc; el.innerHTML = `<i class="fa-solid fa-route" style="color:var(--accent)"></i> <span>Will email <b>${regs.map(r => esc(r.name)).join(', ') || 'no registrar set'}</b> (${s.home} registrar)${cc.length ? `, CC ${cc.map(esc).join(', ')}` : ''} from the AFO no-reply address. Replies go to <b>${esc(state.user.name)}</b>.</span>`; }
    return s;
  };
  $('#sid').oninput = lookup;
  $$('.demo-id').forEach(a => a.onclick = e => { e.preventDefault(); $('#sid').value = a.dataset.id; lookup(); });
  $('#cmt').oninput = e => d.comments = e.target.value;
  $('#addCourse').onclick = () => { d.courses.push(blankCourse()); drawRows(); };
  $('#clearDraft').onclick = () => { state.draft = null; render(); };
  $('#saveDraft').onclick = () => saveDraft(lookup());
  drawRows(); lookup();
}
function drawRows() {
  const d = state.draft, opt = (arr, v, ph) => (ph ? `<option value="">${ph}</option>` : '') + arr.map(x => `<option ${x == v ? 'selected' : ''}>${x}</option>`).join('');
  $('#courseRows').innerHTML = d.courses.map((c, i) => `<div class="course-row" data-i="${i}">
    <div class="field wide"><label>Course <span class="req">*</span></label><select class="input" data-f="code"><option value="">Choose a course…</option>${COURSES.filter(k => k.active).map(k => `<option value="${k.code}" ${k.code === c.code ? 'selected' : ''}>${k.code} — ${esc(k.title)}</option>`).join('')}</select></div>
    <div class="field"><label>Weighted <span class="req">*</span></label><select class="input" data-f="weighted">${opt(['Weighted', 'Not Weighted'], c.weighted, 'Choose…')}</select></div>
    <div class="field"><label>Teacher of record <span class="req">*</span></label><select class="input" data-f="teacher">${opt(TEACHERS.filter(t => t.active).map(t => t.name), c.teacher, 'Choose…')}</select></div>
    <div class="field"><label>Grade <span class="req">*</span></label><select class="input" data-f="grade">${opt(GRADES, c.grade, '—')}</select></div>
    <div class="field"><label>Credits</label><input class="input" data-f="credits" type="number" step="0.25" min="0" value="${c.credits}"></div>
    <div class="field"><label>Completed <span class="req">*</span></label><input class="input" data-f="completed" type="date" max="${TODAY}" value="${c.completed}"></div>
    <button class="icon-btn" data-del="${i}" title="Remove course" aria-label="Remove course" ${d.courses.length === 1 ? 'disabled' : ''}><i class="fa-solid fa-trash-can"></i></button></div>`).join('');
  $$('#courseRows [data-f]').forEach(el => el.onchange = el.oninput = () => {
    const i = +el.closest('.course-row').dataset.i, f = el.dataset.f;
    d.courses[i][f] = el.value; el.classList.remove('invalid');
    if (f === 'code') { const k = COURSES.find(x => x.code === el.value); if (k) { d.courses[i].credits = k.credits; el.closest('.course-row').querySelector('[data-f=credits]').value = k.credits; } }
  });
  $$('#courseRows [data-del]').forEach(b => b.onclick = () => { d.courses.splice(+b.dataset.del, 1); drawRows(); });
}
function saveDraft(s) {
  const d = state.draft; let ok = true;
  if (!s) { $('#sid').classList.add('invalid'); ok = false; }
  $$('#courseRows [data-f]').forEach(el => { if (el.dataset.f !== 'credits' && !el.value) { el.classList.add('invalid'); ok = false; } });
  if (!ok) { toast('Fill in the highlighted fields first'); return; }
  const courses = d.courses.map(x => ({ ...x, title: COURSES.find(k => k.code === x.code).title, credits: +x.credits || 0, transcript: null }));
  if (d.editing) {
    const r = REPORTS.find(x => x.id === d.editing); r.courses = courses; r.comments = d.comments;
    r.history.push({ at: now(), by: state.user.name, action: 'Edited in queue' }); toast(`Updated ${r.id}`);
  } else {
    let r = REPORTS.find(x => x.status === 'queued' && x.studentId === s.id);
    if (r) { r.courses.push(...courses); r.history.push({ at: now(), by: state.user.name, action: `Added ${courses.length} course(s)` }); toast(`Added to ${s.name}’s report already in today’s queue`); }
    else {
      REPORTS.push({ id: 'GR-' + (nextId++), program: 'AFO', home: s.home, studentId: s.id, studentName: s.name, grade: s.grade, schoolYear: SCHOOL_YEAR, sendDate: TODAY, submittedBy: state.user.name, comments: d.comments, courses, status: 'queued', version: 1, history: [{ at: now(), by: state.user.name, action: 'Saved to today’s queue' }] });
      toast(`Saved — ${s.name} is in today’s queue`);
    }
  }
  log(`Added ${courses.length} course(s) for ${s.id} (${s.home})`);
  state.draft = null; render();
}

/* ---------------- today's queue ---------------- */
function viewQueue() {
  const rs = REPORTS.filter(r => r.status === 'queued');
  $('#main').innerHTML = `
    <div class="page-head"><div><h2>Today’s queue</h2><p>Everything entered today. It can still be edited or removed. At 6:00 AM tomorrow each report is emailed to its registrar from the AFO no-reply address — not from anyone’s personal account.</p></div>
      ${rs.length ? `<button class="btn primary" id="sendNow"><i class="fa-solid fa-paper-plane"></i> Run the send now (demo)</button>` : ''}</div>
    <div class="card">${rs.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Student</th><th>Home campus</th><th>Courses</th><th>Entered by</th><th>Goes to</th><th></th></tr></thead><tbody>
      ${rs.map(r => `<tr><td><b>${esc(r.studentName)}</b><br><span class="mono muted">${r.studentId}</span></td><td>${chip(r.home)}</td><td class="small">${coursesShort(r)}</td><td class="small">${esc(r.submittedBy)}</td><td class="small">${registrarFor(r.home).map(x => esc(x.name)).join(', ')}</td>
        <td style="white-space:nowrap"><button class="btn sm" data-open="${r.id}">View</button> <button class="btn sm" data-edit="${r.id}">Edit</button> <button class="btn sm danger" data-del="${r.id}" aria-label="Remove"><i class="fa-solid fa-trash-can"></i></button></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty"><i class="fa-regular fa-circle-check" style="font-size:28px"></i><p>Nothing waiting to send.</p></div>`}</div>`;
  $$('[data-open]').forEach(b => b.onclick = () => openReport(b.dataset.open, 'reports'));
  $$('[data-edit]').forEach(b => b.onclick = () => { const r = REPORTS.find(x => x.id === b.dataset.edit); state.draft = { editing: r.id, studentId: r.studentId, comments: r.comments, courses: JSON.parse(JSON.stringify(r.courses)) }; state.tab = 'entry'; render(); });
  $$('[data-del]').forEach(b => b.onclick = () => { if (confirm('Remove this report from today’s queue?')) { REPORTS = REPORTS.filter(r => r.id !== b.dataset.del); toast('Removed from queue'); render(); } });
  if ($('#sendNow')) $('#sendNow').onclick = () => {
    const regs = new Set(rs.map(r => r.home));
    openModal('Morning send — preview', `<p style="margin-bottom:12px">${rs.length} email${rs.length > 1 ? 's' : ''} to ${regs.size} registrar${regs.size > 1 ? 's' : ''}. Here’s the first one:</p>${emailPreview(rs[0])}`,
      `<button class="btn" id="cancelSend">Cancel</button><button class="btn primary" id="doSend"><i class="fa-solid fa-paper-plane"></i> Send ${rs.length} (simulated)</button>`);
    $('#cancelSend').onclick = closeModal;
    $('#doSend').onclick = () => {
      rs.forEach(r => { r.status = 'sent'; r.history.push({ at: now(), by: 'System', action: 'Emailed to registrar' }); });
      log(`Send: ${rs.length} reports emailed to ${regs.size} registrars`, 'System');
      closeModal(); toast(`${rs.length} reports sent (simulated). The transcript check will start watching for them.`); render();
    };
  };
}

/* ---------------- all reports ---------------- */
function viewReports() {
  let rs = REPORTS.filter(r => r.status !== 'queued');
  const flagged = rs.filter(r => r.status === 'flagged');
  if (state.repT === 'flagged') rs = rs.filter(r => r.status === 'flagged');
  else if (state.repT !== 'all') rs = rs.filter(r => tStatus(r).key === state.repT);
  if (state.repCampus !== 'all') rs = rs.filter(r => r.home === state.repCampus);
  if (state.q) { const q = state.q.toLowerCase(); rs = rs.filter(r => r.studentId.includes(q) || r.studentName.toLowerCase().includes(q) || r.courses.some(c => c.code.toLowerCase().includes(q))); }
  rs.sort((a, b) => b.sendDate.localeCompare(a.sendDate));
  const opts = [['all', 'Any status'], ['verified', 'On transcript'], ['waiting', 'Waiting'], ['partial', 'Partly on transcript'], ['overdue', 'Not on transcript (overdue)'], ['mismatch', 'Transcript differs'], ['flagged', 'Flagged by registrar']];
  $('#main').innerHTML = `
    <div class="page-head"><div><h2>All reports</h2><p>Every report AFO has sent, with what the transcript check found. Open one to see exactly what the registrar got, its history, or to send a correction.</p></div></div>
    ${flagged.length ? `<div class="note bad" style="margin-bottom:14px"><b><i class="fa-solid fa-flag"></i> ${flagged.length} report${flagged.length > 1 ? 's' : ''} flagged by a registrar.</b> Open it and choose “Send a correction”.</div>` : ''}
    <div class="filters">
      <input class="input" id="q" placeholder="Search student, ID or course" value="${esc(state.q)}">
      <select class="input" id="fT">${opts.map(([v, l]) => `<option value="${v}" ${v === state.repT ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select class="input" id="fCampus"><option value="all">All home campuses</option>${HOME_CAMPUSES.map(k => `<option ${k === state.repCampus ? 'selected' : ''}>${k}</option>`).join('')}</select>
    </div>
    <div class="card" style="padding:0">${rs.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Sent</th><th>Student</th><th>Home</th><th>Courses</th><th>Entered by</th><th>Transcript</th></tr></thead><tbody>
      ${rs.map(r => `<tr class="click" data-id="${r.id}"><td>${fmt(r.sendDate)}</td><td><b>${esc(r.studentName)}</b><br><span class="mono muted">${r.studentId}</span></td><td>${chip(r.home)}</td><td class="small">${coursesShort(r)}</td><td class="small">${esc(r.submittedBy)}</td><td>${tPill(r)}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">No reports match.</div>'}</div>`;
  $('#q').oninput = e => { state.q = e.target.value; const p = e.target.selectionStart; render(); $('#q').focus(); $('#q').setSelectionRange(p, p); };
  $('#fT').onchange = e => { state.repT = e.target.value; render(); };
  $('#fCampus').onchange = e => { state.repCampus = e.target.value; render(); };
  bindRows('reports');
}

/* ---------------- transcript check ---------------- */
function viewTranscript() {
  const sent = REPORTS.filter(r => r.status !== 'queued');
  const overdue = sent.filter(r => tStatus(r).key === 'overdue');
  const mismatch = sent.filter(r => tStatus(r).key === 'mismatch');
  const byCampus = HOME_CAMPUSES.map(k => ({ k, list: overdue.filter(r => r.home === k) })).filter(x => x.list.length);
  $('#main').innerHTML = `
    <div class="page-head"><div><h2>Transcript check</h2><p>Every morning at 5:00 AM the site reads Synergy credit history for every student with a report that isn’t confirmed yet, and matches each course by <b>student ID + course code</b>, then compares grade and credits. Only grades posted after the report was sent count, so an old F in the same course doesn’t fool it.</p></div>
      <button class="btn primary" id="runScan"><i class="fa-solid fa-rotate"></i> Run the check now (demo)</button></div>
    <div class="grid cols-2">
      <div class="card"><h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--bad)"></i> Not on transcript after ${OVERDUE_DAYS} days</h3>
        ${byCampus.length ? byCampus.map(({ k, list }) => `<div class="row" style="margin:10px 0 4px">${chip(k)} <b>${registrarFor(k).map(r => esc(r.name)).join(', ')}</b><span class="muted small">${list.length} report${list.length > 1 ? 's' : ''}</span><span class="spacer"></span><button class="btn sm" data-remind="${k}"><i class="fa-solid fa-envelope"></i> Send reminder</button></div>
          <table class="t"><tbody>${list.map(r => `<tr class="click" data-id="${r.id}"><td>${esc(r.studentName)} <span class="mono muted small">${r.studentId}</span></td><td class="small">${coursesShort(r)}</td><td class="small" style="color:var(--bad)">${tStatus(r).age} days</td></tr>`).join('')}</tbody></table>`).join('') : '<div class="empty">Nothing overdue 🎉</div>'}
      </div>
      <div class="card"><h3><i class="fa-solid fa-not-equal" style="color:var(--bad)"></i> On transcript, but different</h3>
        ${mismatch.length ? `<table class="t"><tbody>${mismatch.map(r => { const c = r.courses.find(differs); return `<tr class="click" data-id="${r.id}"><td>${esc(r.studentName)}<br>${chip(r.home)}</td><td class="small">${c.code} ${esc(c.title)}</td><td class="small">Report: <b>${c.grade}</b>, ${c.credits} cr<br>Transcript: <b>${c.transcript.grade}</b>, ${c.transcript.credits} cr</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No mismatches.</div>'}
        <p class="small muted" style="margin-top:10px">A mismatch means either the registrar keyed it differently or the report was wrong. Open it to send a correction or a note.</p>
      </div>
      <div class="card"><h3>Daily check log</h3>
        <div class="table-wrap"><table class="t"><thead><tr><th>Ran</th><th>Courses checked</th><th>Newly found</th><th>Mismatches</th><th></th></tr></thead><tbody>
        ${SCANS.map(s => `<tr><td>${s.at}</td><td>${s.checked}</td><td><b>${s.found}</b></td><td>${s.mismatches}</td><td><span class="pill posted"><i class="fa-solid fa-check"></i> OK</span></td></tr>`).join('')}</tbody></table></div>
      </div>
      <div class="card"><h3>How it decides</h3>
        <table class="t"><tbody>
          <tr><td>${tPillFake('verified')}</td><td class="small">Every course found, grade and credits match.</td></tr>
          <tr><td>${tPillFake('partial')}</td><td class="small">Some courses found, others not yet.</td></tr>
          <tr><td>${tPillFake('waiting')}</td><td class="small">Sent ${OVERDUE_DAYS} days ago or less, nothing found yet.</td></tr>
          <tr><td>${tPillFake('overdue')}</td><td class="small">More than ${OVERDUE_DAYS} days and still not on the transcript.</td></tr>
          <tr><td>${tPillFake('mismatch')}</td><td class="small">Found, but the grade or credits on the transcript differ from the report.</td></tr>
        </tbody></table>
        <p class="small muted" style="margin-top:10px">The course list has a “Synergy code” column for any course whose transcript code differs from the AFO code.</p>
      </div>
    </div>`;
  bindRows('reports');
  $$('[data-remind]').forEach(b => b.onclick = () => remind(b.dataset.remind, overdue.filter(r => r.home === b.dataset.remind)));
  $('#runScan').onclick = runScan;
}
const tPillFake = k => `<span class="pill ${T[k].cls}"><i class="fa-solid ${T[k].icon}"></i> ${T[k].label}</span>`;

function runScan() {
  let found = 0;
  REPORTS.filter(r => r.status !== 'queued' && r.sendDate < TODAY).forEach(r => {
    let n = 0;
    r.courses.forEach(c => { if (!c.transcript && Math.random() < 0.45) { c.transcript = { found: true, on: TODAY, grade: c.grade, credits: c.credits }; n++; } });
    if (n) { found += n; r.history.push({ at: now(), by: 'Transcript check', action: `${n} more course${n > 1 ? 's' : ''} found on transcript` }); }
  });
  SCANS.unshift({ at: now(), checked: REPORTS.flatMap(r => r.courses).filter(c => !c.transcript || c.transcript.on === TODAY).length, found, mismatches: REPORTS.filter(r => r.status !== 'queued' && tStatus(r).key === 'mismatch').length, ok: true });
  log(`Checked Synergy credit history: ${found} courses newly found`, 'Transcript check');
  toast(`Transcript check done — ${found} courses newly found on transcripts`);
  render();
}

function remind(k, list) {
  const regs = registrarFor(k);
  openModal(`Reminder to the ${k} registrar`, `<div class="email"><div class="email-head">
    <span class="k">From</span><span>AFO Grade Reporting &lt;no-reply@district.example&gt;</span>
    <span class="k">Reply-To</span><span>${esc(state.user.name)} &lt;${state.user.email}&gt;</span>
    <span class="k">To</span><span>${regs.map(x => `${esc(x.name)} &lt;${x.email}&gt;`).join(', ')}</span>
    <span class="k">Subject</span><span><b>${list.length} AFO grade report${list.length > 1 ? 's' : ''} not on transcripts yet</b></span></div>
    <div class="email-body"><p>Hi ${esc(regs[0] ? regs[0].name.split(' ')[0] : '')},</p><p>These grade reports were sent more than ${OVERDUE_DAYS} days ago and our daily check doesn’t see them in Synergy yet:</p>
    <table class="t" style="margin-bottom:12px"><thead><tr><th>Student</th><th>Courses</th><th>Sent</th></tr></thead><tbody>${list.map(r => `<tr><td>${esc(r.studentName)} (${r.studentId})</td><td>${r.courses.filter(c => !c.transcript).map(c => `${c.code} ${c.grade}`).join(', ')}</td><td>${fmt(r.sendDate)}</td></tr>`).join('')}</tbody></table>
    <p>If something on a report is wrong, use “Flag a problem” on the report and we’ll send a correction.</p><p>Thanks!</p></div></div>`,
    `<button class="btn" id="rmCancel">Cancel</button><button class="btn primary" id="rmSend"><i class="fa-solid fa-paper-plane"></i> Send (simulated)</button>`);
  $('#rmCancel').onclick = closeModal;
  $('#rmSend').onclick = () => { list.forEach(r => r.history.push({ at: now(), by: state.user.name, action: 'Reminder sent to registrar' })); log(`Sent ${k} registrar a reminder about ${list.length} report(s)`); closeModal(); toast('Reminder sent (simulated)'); };
}

/* ---------------- registrar view ---------------- */
function viewInbox() {
  const u = state.user, reg = u.role === 'registrar', k = reg ? u.campus : state.inboxCampus, all = k === 'ALL';
  let rs = inboxReports();
  const seg = r => { const s = tStatus(r).key; if (r.status === 'flagged' || s === 'mismatch' || s === 'overdue') return 'attention'; if (s === 'verified') return 'done'; return 'waiting'; };
  const counts = { waiting: 0, attention: 0, done: 0, all: rs.length }; rs.forEach(r => counts[seg(r)]++);
  if (state.regSeg !== 'all') rs = rs.filter(r => seg(r) === state.regSeg);
  if (state.q) { const q = state.q.toLowerCase(); rs = rs.filter(r => r.studentId.includes(q) || r.studentName.toLowerCase().includes(q)); }
  rs.sort((a, b) => b.sendDate.localeCompare(a.sendDate) || a.studentName.localeCompare(b.studentName));
  const byDay = {}; rs.forEach(r => (byDay[r.sendDate] = byDay[r.sendDate] || []).push(r));
  const segs = [['waiting', 'Not on transcript yet'], ['attention', 'Needs attention'], ['done', 'On transcript'], ['all', 'All']];
  $('#main').innerHTML = `
    <div class="page-head"><div><h2>${all ? 'Registrar view — all campuses' : `${k} grade reports from AFO`}</h2>
      <p>${reg ? `You still get each report by email with the PDF. This page lets you look back and search. <b>No need to mark anything done</b> — once you enter a grade in Synergy, the next morning’s check moves it to “On transcript” on its own.` : 'See exactly what each registrar sees. Pick a campus to switch to their view and theme.'}</p></div>
      ${reg ? '' : `<label class="field" style="min-width:220px"><span class="lbl">Campus</span><select class="input" id="inboxCampus"><option value="ALL">All campuses</option>${HOME_CAMPUSES.map(c => `<option value="${c}" ${c === k ? 'selected' : ''}>${c} — ${esc(CAMPUSES[c].name)}</option>`).join('')}</select></label>`}</div>
    <div class="filters">
      <div class="seg">${segs.map(([s, l]) => `<button data-seg="${s}" class="${state.regSeg === s ? 'active' : ''}">${l} (${counts[s]})</button>`).join('')}</div>
      <input class="input" id="q" placeholder="Find a student by name or ID" value="${esc(state.q)}">
    </div>
    ${Object.keys(byDay).length ? Object.entries(byDay).map(([day, list]) => `
      <div class="card" style="padding:0">
        <div class="row" style="padding:12px 16px;border-bottom:1px solid var(--line)"><b>Sent ${new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</b><span class="muted small">${list.length} report${list.length > 1 ? 's' : ''}</span></div>
        <div class="table-wrap"><table class="t"><tbody>
        ${list.map(r => `<tr class="click" data-id="${r.id}"><td><b>${esc(r.studentName)}</b><br><span class="mono muted">${r.studentId}</span> · Gr ${r.grade}</td>${all ? `<td>${chip(r.home)}</td>` : ''}
          <td class="small">${r.courses.map(c => `<div class="crs-line"><span>${c.code} ${esc(c.title)} — <b>${c.grade}</b> (${c.weighted === 'Weighted' ? 'W' : 'NW'}, ${c.credits})</span> ${courseT(c, r)}</div>`).join('')}</td>
          <td>${tPill(r)}</td></tr>`).join('')}
        </tbody></table></div></div>`).join('') : `<div class="card empty">${state.regSeg === 'waiting' ? 'Everything sent to you is on transcripts. 🎉' : 'Nothing here.'}</div>`}`;
  $$('[data-seg]').forEach(b => b.onclick = () => { state.regSeg = b.dataset.seg; render(); });
  if ($('#inboxCampus')) $('#inboxCampus').onchange = e => { state.inboxCampus = e.target.value; render(); };
  $('#q').oninput = e => { state.q = e.target.value; const p = e.target.selectionStart; render(); $('#q').focus(); $('#q').setSelectionRange(p, p); };
  bindRows('inbox');
}

/* ---------------- admin ---------------- */
function viewAdmin() {
  const tabs = [['users', 'Users & roles'], ['campuses', 'Campuses & routing'], ['courses', 'Course list'], ['teachers', 'Teachers'], ['activity', 'Activity log']];
  $('#main').innerHTML = `<div class="page-head"><div><h2>Admin</h2><p>Everyone at AFO is an admin. Only the owner can add, change or remove other admins.</p></div></div>
    <div class="filters"><div class="seg">${tabs.map(([k, l]) => `<button data-at="${k}" class="${state.adminTab === k ? 'active' : ''}">${l}</button>`).join('')}</div></div><div id="adminBody"></div>`;
  $$('[data-at]').forEach(b => b.onclick = () => { state.adminTab = b.dataset.at; render(); });
  ({ users: adminUsers, campuses: adminCampuses, courses: adminCourses, teachers: adminTeachers, activity: adminActivity })[state.adminTab]();
}
function adminUsers() {
  const me = state.user, locked = u => u.role === 'owner' || (u.role === 'admin' && me.role !== 'owner');
  const roleOpts = u => Object.entries(ROLES).filter(([k]) => k !== 'owner' || u.role === 'owner').map(([k, r]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${r.label}</option>`).join('');
  $('#adminBody').innerHTML = `<div class="card" style="padding:0"><div class="row" style="padding:14px 16px"><b>${USERS.length} people</b><span class="spacer"></span><button class="btn primary sm" id="addUser"><i class="fa-solid fa-user-plus"></i> Add person</button></div>
    <div class="table-wrap"><table class="t"><thead><tr><th>Name</th><th>Email (district sign-in)</th><th>Role</th><th>Campus</th><th>Can do</th><th></th></tr></thead><tbody>
    ${USERS.map(u => `<tr><td><b>${esc(u.name)}</b></td><td class="small">${esc(u.email)}</td>
      <td><select class="input" data-role="${u.id}" ${locked(u) ? 'disabled title="Only the owner can change admins"' : ''}>${roleOpts(u)}</select></td>
      <td><select class="input" data-campus="${u.id}" ${locked(u) || u.role !== 'registrar' ? 'disabled' : ''}>${Object.keys(CAMPUSES).map(k => `<option ${k === u.campus ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
      <td class="small muted">${ROLES[u.role].desc}</td>
      <td>${locked(u) || u.id === me.id ? '' : `<button class="icon-btn" data-rm="${u.id}" aria-label="Remove ${esc(u.name)}"><i class="fa-solid fa-user-minus"></i></button>`}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  const rerender = () => { init(); setUser(me, true); state.tab = 'admin'; render(); };
  $$('[data-role]').forEach(s => s.onchange = () => {
    const u = USERS.find(x => x.id === s.dataset.role);
    if (s.value === 'admin' && me.role !== 'owner') { toast('Only the owner can make someone an admin'); s.value = u.role; return; }
    u.role = s.value; u.campus = s.value === 'registrar' ? (u.campus === 'AFO' ? 'AFHS' : u.campus) : 'AFO';
    log(`Changed ${u.name} to ${ROLES[u.role].label}`); toast(`${u.name} is now ${ROLES[u.role].label}`); rerender();
  });
  $$('[data-campus]').forEach(s => s.onchange = () => { const u = USERS.find(x => x.id === s.dataset.campus); u.campus = s.value; log(`Moved ${u.name} to ${u.campus}`); toast(`${u.name} → ${u.campus}`); rerender(); });
  $$('[data-rm]').forEach(b => b.onclick = () => { const u = USERS.find(x => x.id === b.dataset.rm); if (confirm(`Remove ${u.name}? They lose access right away.`)) { USERS = USERS.filter(x => x !== u); log(`Removed ${u.name}`); rerender(); } });
  $('#addUser').onclick = () => {
    openModal('Add a person', `<div class="grid cols-2">
      <div class="field"><label for="nuName">Name</label><input id="nuName" class="input"></div>
      <div class="field"><label for="nuEmail">District email</label><input id="nuEmail" class="input" placeholder="name@district.example"></div>
      <div class="field"><label for="nuRole">Role</label><select id="nuRole" class="input">${Object.entries(ROLES).filter(([k]) => k !== 'owner' && (k !== 'admin' || me.role === 'owner')).map(([k, r]) => `<option value="${k}">${r.label} — ${r.desc}</option>`).join('')}</select></div>
      <div class="field"><label for="nuCampus">Campus (registrars)</label><select id="nuCampus" class="input">${HOME_CAMPUSES.map(k => `<option>${k}</option>`).join('')}</select></div></div>
      <p class="small muted" style="margin-top:10px">They sign in with their district Google account — no passwords to manage.</p>`,
      `<button class="btn" id="nuCancel">Cancel</button><button class="btn primary" id="nuSave">Add</button>`);
    $('#nuCancel').onclick = closeModal;
    $('#nuSave').onclick = () => {
      const name = $('#nuName').value.trim(), email = $('#nuEmail').value.trim();
      if (!name || !email) { toast('Name and email are required'); return; }
      const role = $('#nuRole').value;
      USERS.push({ id: 'u' + Date.now(), name, email, role, campus: role === 'registrar' ? $('#nuCampus').value : 'AFO' });
      log(`Added ${name} as ${ROLES[role].label}`); closeModal(); rerender(); toast(`${name} added`);
    };
  };
}
function adminCampuses() {
  $('#adminBody').innerHTML = `<div class="grid cols-2">${HOME_CAMPUSES.map(k => {
    const c = CAMPUSES[k], regs = registrarFor(k);
    return `<div class="theme-card"><div class="img" style="background-image:url(assets/banners/${c.banner})"><span>${k}</span></div><div class="body">
      <div class="row"><b>${esc(c.name)}</b><span class="spacer"></span><span><span class="swatch" style="background:${c.primary}"></span><span class="mono">${c.primary}</span></span></div>
      <div style="margin-top:6px"><span class="muted">Registrar:</span> ${regs.map(r => esc(r.name)).join(', ') || '<span style="color:var(--bad)">none set</span>'}</div>
      <div class="field" style="margin-top:6px"><label for="cc-${k}">CC on every report</label><input class="input" id="cc-${k}" data-cc="${k}" value="${esc(ROUTING[k].cc.join(', '))}" placeholder="none"></div>
    </div></div>`;
  }).join('')}</div>`;
  $$('[data-cc]').forEach(i => i.onchange = () => { ROUTING[i.dataset.cc].cc = i.value.split(',').map(s => s.trim()).filter(Boolean); log(`Changed ${i.dataset.cc} CC list`); toast(`${i.dataset.cc} CC list saved`); });
}
function adminCourses() {
  $('#adminBody').innerHTML = `<div class="card"><h3>Add a course</h3><div class="row">
      <input class="input" id="ncCode" placeholder="AFO code, e.g. CRMA43A" style="max-width:190px">
      <input class="input" id="ncTitle" placeholder="Title, e.g. Geometry A-CR" style="max-width:300px">
      <input class="input" id="ncSyn" placeholder="Synergy code (if different)" style="max-width:200px">
      <input class="input" id="ncCred" type="number" step="0.25" value="0.5" style="max-width:90px" aria-label="Credits">
      <button class="btn primary" id="ncAdd">Add</button></div></div>
    <div class="card" style="padding:0"><div class="table-wrap"><table class="t"><thead><tr><th>AFO code</th><th>Title</th><th>Synergy code (transcript match)</th><th>Default credits</th><th>Shown in entry list</th></tr></thead><tbody>
    ${COURSES.map((c, i) => `<tr><td class="mono">${c.code}</td><td>${esc(c.title)}</td><td><input class="input mono" data-syn="${i}" value="${esc(c.synergy)}" style="max-width:160px"></td><td>${c.credits}</td><td><input type="checkbox" data-ca="${i}" ${c.active ? 'checked' : ''} aria-label="Active"></td></tr>`).join('')}
    </tbody></table></div></div>`;
  $('#ncAdd').onclick = () => { const code = $('#ncCode').value.trim().toUpperCase(), title = $('#ncTitle').value.trim(); if (!code || !title) return toast('Code and title are required'); COURSES.unshift({ code, title, synergy: $('#ncSyn').value.trim().toUpperCase() || code, credits: +$('#ncCred').value || 0.5, active: true }); log(`Added course ${code}`); render(); toast(`${code} added`); };
  $$('[data-ca]').forEach(x => x.onchange = () => { COURSES[+x.dataset.ca].active = x.checked; toast('Saved'); });
  $$('[data-syn]').forEach(x => x.onchange = () => { COURSES[+x.dataset.syn].synergy = x.value.trim().toUpperCase(); toast('Synergy code saved'); });
}
function adminTeachers() {
  $('#adminBody').innerHTML = `<div class="card"><h3>Add a teacher of record</h3><div class="row"><input class="input" id="ntName" placeholder="Full name" style="max-width:300px"><button class="btn primary" id="ntAdd">Add</button></div>
    <p class="small muted" style="margin-top:8px">One spelling per teacher, picked from a list — no more “Kim” vs “Kimberly”.</p></div>
    <div class="card" style="padding:0"><div class="table-wrap"><table class="t"><thead><tr><th>Teacher</th><th>Courses reported (demo data)</th><th>Active</th></tr></thead><tbody>
    ${TEACHERS.map((t, i) => `<tr><td>${esc(t.name)}</td><td>${REPORTS.reduce((n, r) => n + r.courses.filter(c => c.teacher === t.name).length, 0)}</td><td><input type="checkbox" data-ta="${i}" ${t.active ? 'checked' : ''} aria-label="Active"></td></tr>`).join('')}
    </tbody></table></div></div>`;
  $('#ntAdd').onclick = () => { const n = $('#ntName').value.trim(); if (!n) return; TEACHERS.push({ id: 't' + Date.now(), name: n, active: true }); log(`Added teacher ${n}`); render(); toast(`${n} added`); };
  $$('[data-ta]').forEach(x => x.onchange = () => { TEACHERS[+x.dataset.ta].active = x.checked; toast('Saved'); });
}
function adminActivity() {
  $('#adminBody').innerHTML = `<div class="card"><p class="muted small" style="margin-bottom:12px">Every action is stamped with the signed-in person — no more emails that look like they came from whoever set up the trigger.</p>
    <ul class="history">${ACTIVITY.map(a => `<li><b>${esc(a.what)}</b><br><span class="when">${esc(a.at)} · ${esc(a.who)}</span></li>`).join('')}</ul></div>`;
}

/* ---------------- modal + toast ---------------- */
function openModal(title, body, foot = '') { $('#modalTitle').textContent = title; $('#modalBody').innerHTML = body; $('#modalFoot').innerHTML = foot; $('#modalBack').hidden = false; }
function closeModal() { $('#modalBack').hidden = true; }
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }

init();
setUser(USERS[0], true);
