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
