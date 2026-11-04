(() => {
"use strict";
// SF-kit 1.0 — shared design tokens and card base class. The same file ships in every SF-* card repository (keep them identical).
// Visual language: the palette and HUD frame of SF-Cards (https://github.com/khrom06/SF-Cards), so cards from different repos sit side by side.
const SF_VARS_DARK = `--sf-cyan:#00e5ff; --sf-amber:#ffb300; --sf-red:#ff3355; --sf-green:#2bff88; --sf-grey:#5b6b7d; --sf-text:#cfefff; --sf-dim:#7fa3bd;
    --sf-cyan-rgb:0 229 255; --sf-amber-rgb:255 179 0; --sf-red-rgb:255 51 85; --sf-green-rgb:43 255 136; --sf-fg-rgb:255 255 255; --sf-strong:#fff;
    --sf-bg0:#0d2440; --sf-bg1:#06101d; --sf-bg2:#03080f; --sf-on-accent:#03080f; --sf-violet:#b388ff; --sf-violet-rgb:179 136 255;`;
const SF_VARS_LIGHT = `--sf-cyan:#00798f; --sf-amber:#a85f00; --sf-red:#c8173d; --sf-green:#08783f; --sf-grey:#52687a; --sf-text:#1c3a4e; --sf-dim:#37536a;
    --sf-cyan-rgb:0 121 143; --sf-amber-rgb:168 95 0; --sf-red-rgb:200 23 61; --sf-green-rgb:8 120 63; --sf-fg-rgb:4 40 62; --sf-strong:#04141f;
    --sf-bg0:#fbfdff; --sf-bg1:#eef5fb; --sf-bg2:#e2edf6; --sf-on-accent:#fff; --sf-violet:#6a3bc4; --sf-violet-rgb:106 59 196;`;

const SF_BASE_CSS = `
  :host { display:block; ${SF_VARS_DARK} }
  :host([theme="light"]) { ${SF_VARS_LIGHT} }
  * { box-sizing:border-box; }
  .hud { position:relative; overflow:hidden; border-radius:14px; padding:16px 18px 18px; color:var(--sf-text);
    background: radial-gradient(ellipse at 50% -20%, var(--sf-bg0) 0%, var(--sf-bg1) 60%, var(--sf-bg2) 100%);
    border:1px solid rgb(var(--sf-cyan-rgb) / .22); font-family:'B612 Mono', ui-monospace, monospace; font-size:13px;
    box-shadow: inset 0 0 40px rgb(var(--sf-cyan-rgb) / .06), 0 0 22px rgb(var(--sf-cyan-rgb) / .07); }
  .hud::after { content:""; position:absolute; inset:0; pointer-events:none;
    background: repeating-linear-gradient(0deg, rgb(var(--sf-fg-rgb) / .022) 0 1px, transparent 1px 3px); }
  .c { position:absolute; width:14px; height:14px; border-color:var(--sf-cyan); border-style:solid; opacity:.8; }
  .c.tl { top:6px; left:6px; border-width:2px 0 0 2px; } .c.tr { top:6px; right:6px; border-width:2px 2px 0 0; }
  .c.bl { bottom:6px; left:6px; border-width:0 0 2px 2px; } .c.br { bottom:6px; right:6px; border-width:0 2px 2px 0; }
  .head { display:flex; align-items:center; gap:10px; margin-bottom:14px; font-family:Orbitron, ui-sans-serif, sans-serif; font-weight:700;
    font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:var(--sf-cyan); }
  .head .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .head .tag { font-size:10px; letter-spacing:.12em; padding:2px 8px; border-radius:20px; border:1px solid currentColor; }
  .tag.ok { color:var(--sf-green); } .tag.warn { color:var(--sf-amber); } .tag.bad { color:var(--sf-red); }
  .empty { padding:18px 6px; text-align:center; color:var(--sf-dim); letter-spacing:.08em; }
  .err { color:var(--sf-red); padding:10px; border:1px dashed var(--sf-red); border-radius:8px; }
  [data-act] { cursor:pointer; }
  [data-act]:focus-visible, button:focus-visible, input:focus-visible { outline:2px solid var(--sf-cyan); outline-offset:2px; border-radius:6px; }
  button { font:inherit; color:inherit; background:rgb(var(--sf-cyan-rgb) / .1); border:1px solid rgb(var(--sf-cyan-rgb) / .35);
    border-radius:8px; padding:6px 12px; cursor:pointer; }
  button:hover { background:rgb(var(--sf-cyan-rgb) / .2); }
  @media (pointer: coarse) { button, .row { min-height:40px; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; } }
`;

const sfEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sfNum = (v, d = NaN) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const sfLang = (hass) => String((hass && (hass.locale?.language || hass.language)) || "en").slice(0, 2).toLowerCase();
// Translation lookup with English fallback: sfT(dict, lang, key, {n: 3}) replaces {n}.
const sfT = (dict, lang, key, vars) => {
  let s = (dict[lang] && dict[lang][key]) ?? (dict.en && dict.en[key]) ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
  return s;
};
// Human duration from seconds: "45 s", "12 min", "3 h 05", "2 d 4 h".
const sfAge = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return "–";
  if (sec < 90) return Math.round(sec) + " s";
  const m = Math.floor(sec / 60); if (m < 90) return m + " min";
  const h = Math.floor(m / 60); if (h < 48) return h + " h " + String(m % 60).padStart(2, "0");
  return Math.floor(h / 24) + " d " + (h % 24) + " h";
};
const sfName = (st, id) => (st && st.attributes && st.attributes.friendly_name) || id;
const sfMoreInfo = (el, entityId) => el.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));

// Base class. Subclasses provide: normalize(config) -> config, signature() -> string (cheap; the card re-renders only when it changes),
// body() -> html string, title(), tag() (optional {cls,text}), css (optional), onAct(el, ev) for [data-act] clicks, tick (ms, optional timer).
// Re-rendering never loops: it happens on (a) a new signature, (b) setConfig, (c) the optional timer, nothing else.
class SFCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: "open" }); this._cfg = null; this._hass = null; this._sig = null; this._timer = null;
    this.shadowRoot.addEventListener("click", (ev) => { const el = ev.target.closest && ev.target.closest("[data-act]"); if (el && this.onAct) this.onAct(el, ev); });
    this.shadowRoot.addEventListener("keydown", (ev) => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches("[data-act][role=button]")) { ev.preventDefault(); ev.target.click(); } });
  }
  setConfig(c) { if (!c || typeof c !== "object") throw new Error("Invalid configuration"); this._cfg = this.normalize(c); this._sig = null; this._draw(); }
  set hass(h) { this._hass = h; if (!this._cfg) return; const s = this.signature(); if (s !== this._sig) { this._sig = s; this._draw(); } }
  get hass() { return this._hass; }
  connectedCallback() { if (this.tick && !this._timer) this._timer = setInterval(() => this._draw(), this.tick); }
  disconnectedCallback() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  getCardSize() { return 3; }
  _theme() { const t = this._cfg && this._cfg.theme; if (t === "light" || t === "dark") return t; return this._hass && this._hass.themes && this._hass.themes.darkMode === false ? "light" : "dark"; }
  _draw() {
    if (!this._cfg) return;
    const root = this.shadowRoot, ae = root.activeElement;
    const keep = ae && ae.id ? { id: ae.id, value: ae.value, s: ae.selectionStart, e: ae.selectionEnd } : null;
    this.setAttribute("theme", this._theme());
    let inner;
    try {
      const tag = this.tag ? this.tag() : null, ttl = this.title() || "";
      inner = `<div class="hud"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
        ${ttl || tag ? `<div class="head"><span class="grow">${sfEsc(ttl)}</span>${tag ? `<span class="tag ${tag.cls}">${sfEsc(tag.text)}</span>` : ""}</div>` : ""}${this.body()}</div>`;
    } catch (e) { inner = `<div class="hud"><div class="err">${sfEsc(this.constructor.name)}: ${sfEsc(e && e.message)}</div></div>`; }
    root.innerHTML = `<style>${SF_BASE_CSS}${this.css || ""}</style>${inner}`;
    if (keep) { const n = root.getElementById(keep.id); if (n) { if (n.value !== undefined && n.tagName === "INPUT" && n.type !== "range") n.value = keep.value; n.focus(); try { n.setSelectionRange(keep.s, keep.e); } catch (e) { /* not a text input */ } } }
  }
}
const sfRegister = (tag, cls, name, description) => {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === tag)) window.customCards.push({ type: tag, name, description, preview: false });
};
// Pure logic: turns Home Assistant logbook entries into "who did it" rows. No DOM, no network.
// A logbook entry carries the *context* of the state change: the user id of whoever called a service, the automation that ran,
// the service name, the entity whose change caused it... or nothing at all when the device itself reported (a physical switch, a sensor).
function trOrigin(e, users) {
  const ev = e.context_event_type || "", dom = e.context_domain || "";
  if (ev === "automation_triggered") return { kind: "automation", label: e.context_name || e.context_entity_id_name || e.context_entity_id || "automation", detail: e.context_message || "" };
  if (e.context_user_id) {
    const who = (users && users[e.context_user_id]) || "";
    return { kind: "user", label: who || "user", detail: e.context_service ? (dom ? dom + "." : "") + e.context_service : "", unknown: !who };
  }
  if (dom === "script" || ev === "script_started") return { kind: "automation", label: e.context_name || e.context_entity_id_name || e.context_entity_id || "script", detail: e.context_message || "" };
  if (ev === "call_service") return { kind: "service", label: (dom ? dom + "." : "") + (e.context_service || "service"), detail: "" };
  if (ev === "state_changed" && (e.context_entity_id || e.context_entity_id_name)) return { kind: "entity", label: e.context_entity_id_name || e.context_entity_id, detail: e.context_message || "" };
  return { kind: "device", label: "", detail: e.source || "" };
}

// Logbook timestamps are epoch seconds (float); accept milliseconds and ISO strings too.
function trWhen(w) {
  if (typeof w === "number") return w > 1e12 ? w : w * 1000;
  const t = Date.parse(w); return Number.isFinite(t) ? t : NaN;
}

// Map user id -> display name, from person entities (always readable) merged with an optional admin listing.
function trUsers(states, extra) {
  const out = Object.assign({}, extra || {});
  for (const id of Object.keys(states || {})) {
    if (id.startsWith("person.")) { const a = states[id].attributes || {}; if (a.user_id) out[a.user_id] = a.friendly_name || id; }
  }
  return out;
}

const TR_GROUPS = { all: null, people: ["user"], automations: ["automation", "entity"], devices: ["device", "service"] };

// entries -> rows (newest first), filtered by group, capped.
function trRows(entries, { users, group = "all", limit = 12, entities = null, names = {} }) {
  const keep = TR_GROUPS[group] || null, rows = [];
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || !e.entity_id) continue;
    if (entities && !entities.has(e.entity_id)) continue;
    const t = trWhen(e.when); if (!Number.isFinite(t)) continue;
    const o = trOrigin(e, users);
    if (keep && !keep.includes(o.kind)) continue;
    rows.push({ t, id: e.entity_id, name: e.name || names[e.entity_id] || e.entity_id, what: e.message || e.state || "", origin: o });
  }
  rows.sort((a, b) => b.t - a.t);
  return rows.slice(0, limit);
}
const TR_I18N = {
  en: { title: "Who did that?", all: "All", people: "People", automations: "Automations", devices: "Devices", none: "No change in the last {h} h", loading: "Loading…",
        err: "Could not read the logbook", device: "the device itself", user: "someone", ago: "{age} ago", via: "via" },
  fr: { title: "Qui a fait ça ?", all: "Tout", people: "Personnes", automations: "Automatisations", devices: "Appareils", none: "Aucun changement ces {h} dernières heures", loading: "Chargement…",
        err: "Journal illisible", device: "l'appareil lui-même", user: "quelqu'un", ago: "il y a {age}", via: "via" },
  de: { title: "Wer war das?", all: "Alle", people: "Personen", automations: "Automationen", devices: "Geräte", none: "Keine Änderung in den letzten {h} h", loading: "Lädt…",
        err: "Logbuch nicht lesbar", device: "das Gerät selbst", user: "jemand", ago: "vor {age}", via: "über" },
  es: { title: "¿Quién lo hizo?", all: "Todo", people: "Personas", automations: "Automatizaciones", devices: "Dispositivos", none: "Sin cambios en las últimas {h} h", loading: "Cargando…",
        err: "No se puede leer el registro", device: "el propio dispositivo", user: "alguien", ago: "hace {age}", via: "vía" },
};
const TR_MIN_INTERVAL = 15000;   // never query the logbook more often than this, however many state changes arrive

class SFTraceCard extends SFCard {
  static getStubConfig() { return { entities: [], hours: 24 }; }
  normalize(c) {
    const list = [].concat(c.entities || [], c.entity || []).filter((x) => typeof x === "string");
    this._group = "all"; this._events = []; this._error = false; this._inflight = false; this._dirty = true; this._last = 0; this._extraUsers = null; this._adminTried = false;
    return { ...c, entities: list, hours: Math.min(168, Math.max(1, sfNum(c.hours, 24))), limit: Math.max(1, Math.min(50, Math.round(sfNum(c.limit, 12)))) };
  }
  get tick() { return 15000; }
  signature() {
    const st = this._hass ? this._hass.states : {};
    const s = this._cfg.entities.map((id) => id + ":" + (st[id] ? st[id].last_changed : "-")).join("|") + this._theme();
    if (s !== this._trSig) { this._trSig = s; this._dirty = true; }   // a watched entity changed -> logbook is worth re-reading (throttled)
    return s;
  }
  title() { return this._cfg.title || sfT(TR_I18N, sfLang(this._hass), "title"); }
  _draw() { this._maybeFetch(); super._draw(); }
  _maybeFetch() {
    if (!this._cfg || !this._hass || this._inflight || !this._dirty || !this._cfg.entities.length) return;
    if (Date.now() - this._last < TR_MIN_INTERVAL) return;
    this._inflight = true; this._dirty = false; this._last = Date.now();
    const end = new Date(), start = new Date(end.getTime() - this._cfg.hours * 3600e3);
    const h = this._hass;
    const users = !this._adminTried && h.callWS ? (this._adminTried = true, Promise.resolve().then(() => h.callWS({ type: "config/auth/list" })).then((l) => { const m = {}; for (const u of l || []) m[u.id] = u.name; this._extraUsers = m; }).catch(() => {})) : Promise.resolve();
    users.then(() => h.callWS({ type: "logbook/get_events", start_time: start.toISOString(), end_time: end.toISOString(), entity_ids: this._cfg.entities }))
      .then((ev) => { this._events = Array.isArray(ev) ? ev : []; this._error = false; })
      .catch(() => { this._error = true; })
      .finally(() => { this._inflight = false; super._draw(); });
  }
  get css() { return `
    .flt { display:flex; flex-wrap:wrap; gap:6px; margin:-4px 0 10px; } .flt button { font-size:11px; padding:3px 10px; border-radius:20px; }
    .flt button.on { background:rgb(var(--sf-cyan-rgb) / .28); border-color:var(--sf-cyan); color:var(--sf-strong); }
    .row { display:grid; grid-template-columns:minmax(76px,max-content) 1fr auto; gap:4px 10px; align-items:center; padding:8px 4px; border-top:1px solid rgb(var(--sf-cyan-rgb) / .12); }
    .row:first-of-type { border-top:0; } .row:hover { background:rgb(var(--sf-cyan-rgb) / .06); }
    .t { color:var(--sf-dim); font-size:11px; line-height:1.2; white-space:nowrap; } .t b { display:block; color:var(--sf-text); font-weight:400; font-size:12px; }
    .nm { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--sf-strong); } .nm small { color:var(--sf-dim); margin-left:6px; }
    .who { font-size:11px; padding:2px 9px; border-radius:20px; border:1px solid currentColor; white-space:nowrap; max-width:46vw; overflow:hidden; text-overflow:ellipsis; }
    .who.user { color:var(--sf-cyan); } .who.automation, .who.entity { color:var(--sf-amber); } .who.service { color:var(--sf-violet); } .who.device { color:var(--sf-grey); }
    .det { grid-column:2 / 4; color:var(--sf-dim); font-size:10.5px; line-height:1.6; margin-top:-2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }`; }
  body() {
    const L = sfLang(this._hass), t = (k, v) => sfT(TR_I18N, L, k, v), c = this._cfg;
    if (!c.entities.length) return `<div class="empty">entities: [ … ]</div>`;
    const users = trUsers(this._hass ? this._hass.states : {}, this._extraUsers);
    const names = {}; for (const id of c.entities) { const s = this._hass && this._hass.states[id]; if (s) names[id] = sfName(s, id); }
    const rows = trRows(this._events, { users, group: this._group, limit: c.limit, entities: new Set(c.entities), names });
    const now = Date.now();
    let h = `<div class="flt">${["all", "people", "automations", "devices"].map((g) => `<button data-act="grp" data-g="${g}" class="${this._group === g ? "on" : ""}" aria-pressed="${this._group === g}">${sfEsc(t(g))}</button>`).join("")}</div>`;
    if (this._error) h += `<div class="err">${sfEsc(t("err"))}</div>`;
    if (!rows.length) return h + `<div class="empty">${sfEsc(this._inflight && !this._events.length ? t("loading") : t("none", { h: c.hours }))}</div>`;
    for (const r of rows) {
      const o = r.origin, d = new Date(r.t);
      const label = o.kind === "device" ? t("device") : o.kind === "user" && o.unknown ? t("user") : o.label;
      const hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      h += `<div class="row" data-act="info" data-id="${sfEsc(r.id)}" role="button" tabindex="0">
        <span class="t"><b>${hh}</b>${sfEsc(t("ago", { age: sfAge((now - r.t) / 1000) }))}</span>
        <span class="nm">${sfEsc(r.name)}<small>${sfEsc(r.what)}</small></span><span class="who ${o.kind}" title="${sfEsc(o.detail)}">${sfEsc(label)}</span>
        ${o.detail ? `<span class="det">${o.kind === "user" ? sfEsc(t("via")) + " " : ""}${sfEsc(o.detail)}</span>` : ""}</div>`;
    }
    return h;
  }
  onAct(el) {
    if (el.dataset.act === "info") sfMoreInfo(this, el.dataset.id);
    else if (el.dataset.act === "grp") { this._group = el.dataset.g; super._draw(); }
  }
}
sfRegister("sf-trace-card", SFTraceCard, "SF Trace", "Shows who or what changed an entity: a person, an automation, a service call, or the device itself.");
window.__sfTrace = { origin: trOrigin, rows: trRows, users: trUsers, when: trWhen };   // exposed for the test page only

})();
