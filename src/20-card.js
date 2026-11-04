const TR_I18N = {
  en: { title: "Who did that?", all: "All", people: "People", automations: "Automations", devices: "Devices", none: "No change in the last {h} h", loading: "Loading…",
        err: "Could not read the logbook", device: "the device itself", user: "someone", ago: "{age} ago", via: "via" },
  fr: { title: "Qui a fait ça ?", all: "Tout", people: "Personnes", automations: "Automatisations", devices: "Appareils", none: "Aucun changement ces {h} dernières heures", loading: "Chargement…",
        err: "Journal illisible", device: "l'appareil lui-même", user: "quelqu'un", ago: "il y a {age}", via: "via" },
  de: { title: "Wer war das?", all: "Alle", people: "Personen", automations: "Automationen", devices: "Geräte", none: "Keine Änderung in den letzten {h} h", loading: "Lädt…",
        err: "Logbuch nicht lesbar", device: "das Gerät selbst", user: "jemand", ago: "vor {age}", via: "über" },
  es: { title: "¿Quién lo hizo?", all: "Todo", people: "Personas", automations: "Automatizaciones", devices: "Dispositivos", none: "Sin cambios en las últimas {h} h", loading: "Cargando…",
        err: "No se puede leer el registro", device: "el propio dispositivo", user: "alguien", ago: "hace {age}", via: "vía" },
  nl: {"title": "Wie deed dat?", "all": "Alles", "people": "Personen", "automations": "Automatiseringen", "devices": "Apparaten", "none": "Geen wijziging in de afgelopen {h} u", "loading": "Laden…", "err": "Logboek niet leesbaar", "device": "het apparaat zelf", "user": "iemand", "ago": "{age} geleden", "via": "via"},
  it: {"title": "Chi l'ha fatto?", "all": "Tutto", "people": "Persone", "automations": "Automazioni", "devices": "Dispositivi", "none": "Nessuna modifica nelle ultime {h} h", "loading": "Caricamento…", "err": "Registro illeggibile", "device": "il dispositivo stesso", "user": "qualcuno", "ago": "{age} fa", "via": "tramite"},
  pt: {"title": "Quem fez isto?", "all": "Tudo", "people": "Pessoas", "automations": "Automações", "devices": "Dispositivos", "none": "Sem alterações nas últimas {h} h", "loading": "A carregar…", "err": "Registo ilegível", "device": "o próprio dispositivo", "user": "alguém", "ago": "há {age}", "via": "via"},
  pl: {"title": "Kto to zrobił?", "all": "Wszystko", "people": "Osoby", "automations": "Automatyzacje", "devices": "Urządzenia", "none": "Brak zmian w ostatnich {h} h", "loading": "Ładowanie…", "err": "Nie można odczytać dziennika", "device": "samo urządzenie", "user": "ktoś", "ago": "{age} temu", "via": "przez"},
  ru: {"title": "Кто это сделал?", "all": "Все", "people": "Люди", "automations": "Автоматизации", "devices": "Устройства", "none": "Нет изменений за последние {h} ч", "loading": "Загрузка…", "err": "Не удалось прочитать журнал", "device": "само устройство", "user": "кто-то", "ago": "{age} назад", "via": "через"},
  zh: {"title": "是谁做的？", "all": "全部", "people": "人员", "automations": "自动化", "devices": "设备", "none": "过去 {h} 小时内没有变化", "loading": "加载中…", "err": "无法读取日志", "device": "设备自身", "user": "某人", "ago": "{age}前", "via": "通过"},
  ar: {"title": "من فعل ذلك؟", "all": "الكل", "people": "الأشخاص", "automations": "الأتمتة", "devices": "الأجهزة", "none": "لا تغييرات خلال آخر {h} ساعة", "loading": "جارٍ التحميل…", "err": "تعذّرت قراءة السجل", "device": "الجهاز نفسه", "user": "شخص ما", "ago": "منذ {age}", "via": "عبر"},
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
  title() { return this._cfg.title || sfT(TR_I18N, this._lang(), "title"); }
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
    const L = this._lang(), t = (k, v) => sfT(TR_I18N, L, k, v), c = this._cfg;
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
window.__sfTrace = { i18n: TR_I18N, origin: trOrigin, rows: trRows, users: trUsers, when: trWhen };   // exposed for the test page only
