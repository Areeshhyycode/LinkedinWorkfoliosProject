// ---- state ----
let prospects = [];
let filter = "todo";

// ---- helpers ----
const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function api(path, opts) {
  const r = await fetch(path, opts);
  if (r.status === 401) { location.href = "/login"; return null; }
  return r.json();
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  location.href = "/login";
}

// ---- load + render ----
async function load() {
  const [list, stats] = await Promise.all([
    api("/api/prospects"),
    api("/api/stats"),
  ]);
  if (!list) return;
  prospects = list;
  renderStats(stats);
  render();
}

function renderStats(s) {
  const cells = [
    { l: "Total", n: s.total },
    { l: "Sent", n: s.sent + s.accepted + s.messaged + s.replied },
    { l: "Accepted", n: s.accepted + s.messaged + s.replied, hl: true },
    { l: "Messaged", n: s.messaged + s.replied },
    { l: "Accept %", n: s.acceptRate + "%", hl: true },
  ];
  document.getElementById("stats").innerHTML = cells
    .map((c) => `<div class="stat ${c.hl ? "hl" : ""}"><div class="n">${c.n}</div><div class="l">${c.l}</div></div>`)
    .join("");
}

// tab -> kaunse status dikhane hain
const FILTERS = {
  todo: (p) => p.status === "new",
  waiting: (p) => p.status === "sent",
  accepted: (p) => p.status === "accepted",
  done: (p) => p.status === "messaged" || p.status === "replied",
  all: () => true,
};

function render() {
  const items = prospects.filter(FILTERS[filter]);
  // "Aaj ka kaam" tab pe sirf 5 dikhao (daily batch)
  const shown = filter === "todo" ? items.slice(0, 5) : items;
  const el = document.getElementById("list");

  if (!shown.length) {
    el.innerHTML = `<div class="empty">Yahan kuch nahi. ${
      filter === "todo" ? "Upar se naye prospects laao 🔍" : ""
    }</div>`;
    return;
  }
  el.innerHTML = shown.map((p, i) => card(p, i)).join("");
}

function card(p, i) {
  const first = (p.name || "there").split(/\s+/)[0];
  return `
  <div class="card">
    <div class="top">
      <span class="num">${i + 1}</span>
      <div>
        <div class="name">${esc(p.name)}</div>
        <div class="headline">${esc(p.headline || p.skill || "")}</div>
      </div>
      <span class="badge b-${p.status}">${p.status}</span>
    </div>

    <a class="open" href="${esc(p.url)}" target="_blank" rel="noopener">🔗 LinkedIn profile kholo →</a>

    ${p.status === "new" || p.status === "sent" ? draftBlock("1️⃣ Connection NOTE (copy → profile pe 'Add a note')", p.note, p.id + "n") : ""}
    ${p.status === "accepted" ? draftBlock("2️⃣ Ab ye MESSAGE bhejo", p.message, p.id + "m") : ""}
    ${p.status === "messaged" || p.status === "replied" ? draftBlock("Bheja gaya message", p.message, p.id + "m") : ""}

    <div class="actions">${actions(p)}</div>
  </div>`;
}

function draftBlock(label, text, id) {
  return `<div class="draftlabel">${label}</div>
    <div class="draftbox"><pre id="${id}">${esc(text)}</pre>
    <button class="copy" onclick="copyText('${id}', this)">Copy</button></div>`;
}

function actions(p) {
  switch (p.status) {
    case "new":
      return `<button class="primary" onclick="setStatus('${p.id}','sent')">✓ Connection bhej diya</button>
              <button class="soft" onclick="setStatus('${p.id}','skipped')">Skip</button>`;
    case "sent":
      return `<button class="good" onclick="setStatus('${p.id}','accepted')">✅ Accept ho gaya</button>
              <span class="muted" style="align-self:center">— jab woh accept kare, tab dabao</span>`;
    case "accepted":
      return `<button class="primary" onclick="setStatus('${p.id}','messaged')">📨 Message bhej diya</button>`;
    case "messaged":
      return `<button class="good" onclick="setStatus('${p.id}','replied')">💬 Reply aaya</button>`;
    case "replied":
      return `<span class="muted">🎉 Reply mil gaya — ab deal close karo!</span>`;
    default:
      return `<button class="soft" onclick="setStatus('${p.id}','new')">Wapas active karo</button>`;
  }
}

// ---- actions ----
async function setStatus(id, status) {
  await api("/api/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  await load();
}

function copyText(id, btn) {
  navigator.clipboard.writeText(document.getElementById(id).innerText);
  const t = btn.innerText;
  btn.innerText = "Copied ✓";
  setTimeout(() => (btn.innerText = t), 1200);
}

async function find() {
  const btn = document.getElementById("findBtn");
  const msg = document.getElementById("findMsg");
  const skill = document.getElementById("skill").value.trim();
  const count = document.getElementById("count").value;
  btn.disabled = true;
  msg.textContent = "Dhoondh raha hoon + AI drafts bana raha hoon...";
  try {
    const r = await api("/api/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, count }),
    });
    msg.textContent = r.error
      ? "Error: " + r.error
      : `✅ ${r.added} naye add hue${r.note ? " — " + r.note : ""}`;
    filter = "todo";
    syncTabs();
    await load();
  } finally {
    btn.disabled = false;
  }
}

// ---- tabs ----
function syncTabs() {
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.f === filter)
  );
}
document.getElementById("tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (!t) return;
  filter = t.dataset.f;
  syncTabs();
  render();
});

load();
