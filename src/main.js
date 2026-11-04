import "./style.css";
import {
  ABILITIES, AUGURS, ARMOR, WEAPONS, CLASSES, SPECIALIST_SUBS, CLASS_ORDER, SUB_ORDER, DEITIES, UNHOLY, PATRONS,
  BLASTER_SPELLS, GNOME_SPELLS, SPECIES, SPECIES_CLASSES, XP_THRESHOLDS, OCCUPATIONS, abilityMod, speciesFromOccupation,
} from "./data.js";
import {
  blankCharacter, randomZeroLevel, newWeapon, derive, displayClassName, effectiveLevel, luckDie, weaponTrainedGuess, uid, hitDie,
} from "./rules.js";
import * as R from "./rolls.js";
import { execute, applyLuckBurn } from "./rolls.js";
import { signed, rollDie } from "./dice.js";
import * as S from "./store.js";

/* ============================================================
   State
   ============================================================ */
const params = new URLSearchParams(location.search);
const app = {
  player: { id: "local", name: "You", role: "GM", color: "#c0392b" },
  room: { combat: false, crowdDC: 14 },
  view: "roster",
  ref: null, // {kind:'token'|'local', id}
  char: null,
  lastSaved: "",
  roster: [],
  selection: [],
  selectionItems: [],
  log: S.logGet(),
  next: { mod: 0, shift: 0 },
  visibility: S.lsGet("xcc-visibility", "public"),
  tab: S.lsGet("xcc-tab", "core"),
  lastCard: null,
  popoverItem: params.get("item"),
  pendingRemote: null,
  sizeWarned: false,
};

const $app = document.getElementById("app");

/* ============================================================
   Utilities
   ============================================================ */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const opt = (value, label, sel) => `<option value="${esc(value)}"${String(value) === String(sel) ? " selected" : ""}>${esc(label)}</option>`;
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null) o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}
function normalize(c) {
  const b = blankCharacter();
  const out = { ...b, ...c };
  out.abil = { ...b.abil, ...(c.abil || {}) };
  for (const k of Object.keys(b.abil)) out.abil[k] = { ...b.abil[k], ...(out.abil[k] || {}) };
  out.hp = { ...b.hp, ...(c.hp || {}) };
  out.opts = { ...(c.opts || {}) };
  out.weapons = Array.isArray(c.weapons) ? c.weapons : [];
  out.spells = Array.isArray(c.spells) ? c.spells : [];
  out.mojoIncoming = Array.isArray(c.mojoIncoming) ? c.mojoIncoming : [];
  if (!out.id) out.id = uid();
  return out;
}

/* ============================================================
   Saving & loading
   ============================================================ */
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}
async function saveNow() {
  clearTimeout(saveTimer);
  if (!app.char || !app.ref) return;
  const json = JSON.stringify(app.char);
  if (json === app.lastSaved) return;
  if (json.length > 15000 && !app.sizeWarned) {
    app.sizeWarned = true;
    toast("This sheet is getting large; Owlbear limits token data to about 16 kB. Trim long notes.");
  }
  try {
    if (app.ref.kind === "token") await S.saveToToken(app.ref.id, app.char);
    else S.librarySave(app.char);
    app.lastSaved = json;
  } catch (e) {
    console.error(e);
    toast("Couldn't save to the token. Do you have permission to edit it?");
  }
}

async function openSheet(ref) {
  await saveNow();
  let data = null;
  if (ref.kind === "token") data = await S.tokenSheet(ref.id);
  else data = (S.lsGet(S.LIB_KEY, {}) || {})[ref.id];
  if (!data) {
    toast("That sheet couldn't be found.");
    return;
  }
  app.ref = ref;
  app.char = normalize(data);
  app.lastSaved = JSON.stringify(data);
  app.view = "sheet";
  app.lastCard = null;
  render();
}

async function refreshRoster() {
  const scene = await S.sceneList().catch(() => []);
  const local = S.libraryList();
  app.roster = [...scene, ...local];
  app.selection = await S.selectedTokenIds().catch(() => []);
  app.selectionItems = await S.getItemsByIds(app.selection).catch(() => []);
}

async function onSceneChange() {
  await refreshRoster();
  if (app.view === "sheet" && app.ref && app.ref.kind === "token") {
    const fresh = app.roster.find((r) => r.ref.kind === "token" && r.ref.id === app.ref.id);
    if (!fresh) {
      toast("This token was removed from the scene.");
      app.view = "roster";
      app.ref = null;
      app.char = null;
      render();
      return;
    }
    const json = JSON.stringify(fresh.data);
    if (json !== app.lastSaved && json !== JSON.stringify(app.char)) {
      const focused = document.activeElement && $app.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (focused) app.pendingRemote = fresh.data;
      else {
        app.char = normalize(fresh.data);
        app.lastSaved = json;
        renderSheetBody();
      }
    }
    return;
  }
  if (app.view === "roster") render();
}

/* ============================================================
   Rolling
   ============================================================ */
function rollMeta() {
  return {
    char: app.char ? app.char.name : "",
    charId: app.char ? app.char.id : "",
    player: app.player.name,
    playerId: app.player.id,
    color: app.player.color,
  };
}

async function doRoll(spec, extra = {}) {
  if (!spec) return;
  const c = app.char;
  const ctx = { mod: app.next.mod, shift: app.next.shift };
  app.next = { mod: 0, shift: 0 };
  let mojoNote = null;
  if (spec.mojo && c && c.mojoIncoming.length) {
    ctx.mojo = c.mojoIncoming.reduce((a, m) => a + (Number(m.n) || 0), 0);
    mojoNote = c.mojoIncoming.map((m) => `${m.n} from ${m.from}`).join(", ");
    c.mojoIncoming = [];
    scheduleSave();
  }
  const res = execute(spec, ctx);
  if (mojoNote) res.notes.push(`Mojo given: ${mojoNote}.`);
  const card = {
    id: uid(),
    ...rollMeta(),
    title: res.title,
    kind: res.kind,
    total: res.total,
    nat: res.nat,
    die: res.die,
    parts: res.parts,
    tags: res.tags,
    notes: res.notes,
    visibility: app.visibility,
    time: Date.now(),
  };
  app.lastCard = { card, res, spec, extra };
  pushCard(card);

  // Auto-applied follow-ups (e.g. disapproval when the table says "Fail")
  for (const f of res.follow || []) if (f.auto) await applyAction(f, true);

  await combatAutomation(res);
  renderSheetBody();
}

function pushCard(card) {
  app.log = S.logPush(card);
  S.broadcastRoll(card).catch(() => {});
}

async function combatAutomation(res) {
  const c = app.char;
  if (!c || !app.room.combat || !res.mojoEligible || res.die !== 20) return;
  if (res.nat === 20) {
    let gain = 1;
    let label = "+1 Mojo for the natural 20";
    if (c.cls === "gnome" && (res.kind === "attack" || res.kind === "spell") && effectiveLevel(c) > 0) {
      const d = derive(c);
      const sides = parseInt(d.row.mascot.replace(/^1d/, ""), 10);
      gain = rollDie(sides);
      label = `Team Mascot: +${gain} Mojo (${d.row.mascot})`;
    }
    c.mojo = (Number(c.mojo) || 0) + gain;
    scheduleSave();
    toast(label);
  } else if (res.nat === 1) {
    await wipeMojo(`${c.name} rolled a natural 1`);
  }
}

async function wipeMojo(reason) {
  const ids = app.roster.filter((r) => r.ref.kind === "token").map((r) => r.ref.id);
  const gnomeBonus = (s) => (s.cls === "gnome" && (Number(s.level) || 0) > 0 ? 1 : 0);
  if (app.char) app.char.mojo = gnomeBonus(app.char);
  try {
    await S.updateTokenSheets(ids.filter((id) => !(app.ref && app.ref.kind === "token" && app.ref.id === id)), (s) => {
      s.mojo = gnomeBonus(s);
      return s;
    });
  } catch {
    toast("Couldn't reset everyone's Mojo — the GM can use Wipe Mojo on the roster.");
  }
  scheduleSave();
  const card = { id: uid(), ...rollMeta(), title: "Mojo wiped!", total: 0, parts: [reason], tags: ["MOJO → 0"], notes: ["Everyone's Mojo drops to 0 (gnomes keep 1 as team mascot)."], visibility: "public", time: Date.now(), kind: "info" };
  pushCard(card);
  S.notify(`Mojo wiped: ${reason}`, "WARNING");
}

async function applyAction(f, silent) {
  const c = app.char;
  if (!c) return;
  switch (f.action) {
    case "fame":
      c.fame = (Number(c.fame) || 0) + f.n;
      if (c.cls === "halfelf" && effectiveLevel(c) > 0) c.mojo = (Number(c.mojo) || 0) + f.n;
      toast(`+${f.n} Fame${c.cls === "halfelf" ? ` and +${f.n} Mojo` : ""}`);
      break;
    case "disapproval":
      c.disapproval = (Number(c.disapproval) || 1) + f.n;
      if (!silent) toast(`Disapproval range is now 1–${c.disapproval}`);
      break;
    case "mojo":
      c.mojo = (Number(c.mojo) || 0) + f.n;
      toast(`+${f.n} Mojo`);
      break;
    case "addhp":
      c.hp.max = (Number(c.hp.max) || 0) + f.n;
      c.hp.cur = (Number(c.hp.cur) || 0) + f.n;
      toast(`Max HP is now ${c.hp.max}`);
      break;
    case "spellLost": {
      const s = c.spells.find((x) => x.id === f.spellId);
      if (s) s.lost = true;
      break;
    }
  }
  scheduleSave();
  if (!silent) renderSheetBody();
}

async function burnLuck(points) {
  const lc = app.lastCard;
  const c = app.char;
  if (!lc || !c) return;
  points = Math.max(1, Math.min(Number(points) || 1, Number(c.abil.lck.cur) || 0));
  if (!points || c.abil.lck.cur <= 0) {
    toast("No Luck left to burn.");
    return;
  }
  applyLuckBurn(lc.res, points, c, lc.res.luck || {});
  c.abil.lck.cur -= points;
  Object.assign(lc.card, { total: lc.res.total, parts: lc.res.parts });
  lc.card.notes = [...lc.card.notes.filter((n) => !/^Burned/.test(n)), `Burned ${lc.res.luckBurned} Luck.`];
  pushCard(lc.card);
  scheduleSave();
  renderSheetBody();
}

/* Jammer: give Mojo after someone else's roll */
async function jammerAmend(cardId, n) {
  const c = app.char;
  if (!c || c.cls !== "jammer") return;
  n = Math.max(1, Math.min(Number(n) || 1, Number(c.mojo) || 0));
  if (!n) return toast("No Mojo to give.");
  c.mojo -= n;
  scheduleSave();
  const msg = { type: "amend", cardId, n, from: c.name, id: uid() };
  applyAmend(msg);
  S.OBR.isAvailable && S.OBR.broadcast.sendMessage(S.ROLL_CHANNEL, msg, { destination: "ALL" }).catch(() => {});
  renderSheetBody();
}
const appliedAmends = new Set();
function applyAmend(msg) {
  if (appliedAmends.has(msg.id)) return;
  appliedAmends.add(msg.id);
  const card = app.log.find((x) => x.id === msg.cardId);
  if (!card) return;
  card.total += msg.n;
  card.parts = [...card.parts, `+${msg.n} Mojo (${msg.from})`];
  app.log = S.logPush(card);
  if (app.lastCard && app.lastCard.card.id === msg.cardId) {
    app.lastCard.res.total += msg.n;
    app.lastCard.card = card;
  }
}

/* ============================================================
   Rendering: shell
   ============================================================ */
function render() {
  if (app.view === "sheet" && app.char) renderSheet();
  else renderRoster();
}

function header(title, extra = "") {
  return `<header class="top">
    ${app.view === "sheet" && !app.popoverItem ? `<button class="icon-btn" data-act="back" title="All characters">‹</button>` : ""}
    <div class="title">${title}</div>
    ${extra}
    ${windowControls()}
  </header>`;
}

function windowControls() {
  if (!S.inOwlbear()) return "";
  const prefs = S.popPrefs();
  const size = app.popoverItem ? prefs.size : prefs.actionSize;
  const sizeBtn = `<button class="icon-btn txt" data-act="win-size" title="Change size (small / medium / large)">${size}</button>`;
  if (!app.popoverItem) return sizeBtn;
  return `${sizeBtn}
    <button class="icon-btn" data-act="win-side" title="Move to the ${prefs.side === "left" ? "right" : "left"} side of the screen">${prefs.side === "left" ? "⇥" : "⇤"}</button>
    <button class="icon-btn" data-act="win-min" title="${app.minimised ? "Restore" : "Minimise"}">${app.minimised ? "▢" : "▁"}</button>
    <button class="icon-btn" data-act="close" title="Close">✕</button>`;
}

/* ---------------- Roster / party view ---------------- */
function renderRoster() {
  const gm = app.player.role === "GM";
  const inObr = S.inOwlbear();
  const sel = app.selectionItems.filter((i) => i.layer === "CHARACTER");
  const selNoSheet = sel.length === 1 && !(sel[0].metadata || {})[S.SHEET_KEY] ? sel[0] : null;
  const scene = app.roster.filter((r) => r.ref.kind === "token");
  const local = app.roster.filter((r) => r.ref.kind === "local");

  const card = (r) => {
    const c = normalize(r.data);
    const d = derive(c);
    const hpPct = Math.max(0, Math.min(100, (Number(c.hp.cur) / Math.max(1, Number(c.hp.max))) * 100));
    return `<div class="party-card" data-open="${r.ref.kind}:${esc(r.ref.id)}">
      <div class="pc-top">
        ${r.image ? `<img src="${esc(r.image)}" alt="" class="pc-img">` : `<div class="pc-img ph">${esc((c.name || "?").slice(0, 1))}</div>`}
        <div class="pc-name"><b>${esc(c.name)}</b><span>${esc(displayClassName(c))}${d.lvl ? ` ${d.lvl}` : ""}${c.player ? ` · ${esc(c.player)}` : ""}${r.ref.kind === "local" ? ` · <i>library</i>` : ""}</span></div>
      </div>
      <div class="hpbar"><i style="width:${hpPct}%"></i><span>${esc(c.hp.cur)}/${esc(c.hp.max)} HP</span></div>
      <div class="pc-stats"><span>AC <b>${d.ac}</b></span><span>Mojo <b>${esc(c.mojo)}</b></span><span>Luck <b>${esc(c.abil.lck.cur)}</b></span><span>Fame <b>${esc(c.fame)}</b></span></div>
    </div>`;
  };

  $app.innerHTML = `
    ${header("Xcrawl Classics")}
    <div class="scroll">
      ${inObr ? `<section class="panel combat-bar ${app.room.combat ? "on" : ""}">
        <div><b>${app.room.combat ? "IN COMBAT" : "Not in combat"}</b><small>${app.room.combat ? "Natural 20s earn Mojo; natural 1s wipe it." : "Mojo automation is paused."}</small></div>
        ${gm ? `<button class="btn ${app.room.combat ? "" : "primary"}" data-act="combat">${app.room.combat ? "End combat" : "Start combat"}</button>` : ""}
      </section>` : ""}
      ${gm && scene.length ? `<section class="row gap wrap">
        <button class="btn" data-act="encounter">Encounter won: +1 Mojo all</button>
        <button class="btn" data-act="wipe">Wipe Mojo</button>
        <label class="inline">Crowd DC <input type="number" class="num" data-room="crowdDC" value="${esc(app.room.crowdDC)}"></label>
      </section>` : ""}
      ${selNoSheet ? `<section class="panel hint"><span>Selected token: <b>${esc(selNoSheet.name)}</b></span><button class="btn primary" data-act="add-to-token" data-id="${esc(selNoSheet.id)}">Add sheet</button></section>` : ""}
      <h3>${inObr ? "In this scene" : "Characters"}</h3>
      ${inObr ? (scene.length ? `<div class="party">${scene.map(card).join("")}</div>` : `<p class="muted">No tokens have sheets yet. Right-click a character token and choose <b>Add Xcrawl sheet</b>, or attach one from your library.</p>`) : ""}
      <h3>My library <small class="muted">(this browser only)</small></h3>
      ${local.length ? `<div class="party">${local.map(card).join("")}</div>` : `<p class="muted">Nothing here yet.</p>`}
      <section class="row gap wrap">
        <button class="btn primary" data-act="new-zero">Roll a 0-level crawler</button>
        <button class="btn" data-act="new-funnel">Roll 4 for the funnel</button>
        <button class="btn" data-act="new-blank">Blank sheet</button>
        <label class="btn file">Import JSON<input type="file" accept=".json,application/json" data-act="import" hidden></label>
      </section>
      ${renderLog(12)}
      <p class="foot muted">Rules from the Xcrawl Classics RPG corebook. ${inObr ? `<label class="inline"><input type="checkbox" data-pref="notify" ${S.lsGet("xcc-notify", true) ? "checked" : ""}> Pop-up notifications for others' rolls</label>` : "Running outside Owlbear: sheets save to this browser."}</p>
    </div>`;
}

/* ---------------- Sheet ---------------- */
const TABS = [
  ["core", "Core"],
  ["combat", "Combat"],
  ["class", "Class"],
  ["magic", "Magic"],
  ["gear", "Gear"],
  ["log", "Log"],
];

function renderSheet() {
  $app.innerHTML = `${header(`<input class="name-input" data-bind="name" value="${esc(app.char.name)}" aria-label="Character name">`, `<button class="icon-btn" data-act="menu" title="More">⋯</button>`)}
    <div id="vitals"></div>
    <nav class="tabs" id="tabs"></nav>
    <div class="scroll" id="body"></div>
    <div id="lastroll"></div>`;
  renderSheetBody();
}

function renderSheetBody() {
  const c = app.char;
  if (!c || app.view !== "sheet") return;
  const focus = rememberFocus();
  const d = derive(c);
  const hasMagic = !!d.caster || c.spells.length || (c.cls === "specialist" && d.skills.some((s) => s.key === "scroll"));
  const tabs = TABS.filter(([k]) => k !== "magic" || hasMagic);
  if (!tabs.find(([k]) => k === app.tab)) app.tab = "core";
  const nameInput = $app.querySelector(".name-input");
  if (nameInput && document.activeElement !== nameInput) nameInput.value = c.name;
  document.getElementById("vitals").innerHTML = renderVitals(c, d);
  document.getElementById("tabs").innerHTML = tabs.map(([k, l]) => `<button class="tab ${app.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("");
  const body = document.getElementById("body");
  const scrollTop = body.scrollTop;
  body.innerHTML = { core: tabCore, combat: tabCombat, class: tabClass, magic: tabMagic, gear: tabGear, log: () => renderLog(60, true) }[app.tab](c, d);
  body.scrollTop = scrollTop;
  document.getElementById("lastroll").innerHTML = renderLastRoll();
  restoreFocus(focus);
}

function rememberFocus() {
  const el = document.activeElement;
  if (!el || !$app.contains(el) || !el.dataset) return null;
  return { bind: el.dataset.bind, start: el.selectionStart, end: el.selectionEnd };
}
function restoreFocus(f) {
  if (!f || !f.bind) return;
  const el = $app.querySelector(`[data-bind="${CSS.escape(f.bind)}"]`);
  if (el && el !== document.activeElement) {
    el.focus();
    try { if (f.start != null) el.setSelectionRange(f.start, f.end); } catch { /* number inputs */ }
  }
}

function renderVitals(c, d) {
  const hpPct = Math.max(0, Math.min(100, (Number(c.hp.cur) / Math.max(1, Number(c.hp.max))) * 100));
  const inc = c.mojoIncoming.reduce((a, m) => a + (Number(m.n) || 0), 0);
  return `<div class="vitals">
    <div class="v hp">
      <label>HP</label>
      <div class="hpwrap"><button class="mini" data-act="hp" data-n="-1">−</button>
        <input type="number" class="num big" data-bind="hp.cur" value="${esc(c.hp.cur)}"><span class="slash">/</span><input type="number" class="num" data-bind="hp.max" value="${esc(c.hp.max)}">
        <button class="mini" data-act="hp" data-n="1">+</button></div>
      <div class="hpbar thin"><i style="width:${hpPct}%"></i></div>
    </div>
    <div class="v"><label>AC</label><b class="stat">${d.ac}</b></div>
    <div class="v"><label>Init</label><button class="stat roll" data-roll="init">${signed(d.init)}</button></div>
    <div class="v"><label>Speed</label><b class="stat sm">${d.speed}'</b></div>
    <div class="v mojo"><label>Mojo</label><div class="row tight"><button class="mini" data-act="mojo" data-n="-1">−</button><b class="stat">${esc(c.mojo)}</b><button class="mini" data-act="mojo" data-n="1">+</button></div><button class="link" data-act="give">give</button></div>
    <div class="v"><label>Luck</label><b class="stat sm">${esc(c.abil.lck.cur)}<small>/${esc(c.abil.lck.max)}</small></b></div>
    <div class="v"><label>Fame</label><b class="stat sm">${esc(c.fame)}<small> ${d.fame.label}</small></b></div>
  </div>
  ${inc ? `<div class="banner">+${inc} Mojo from teammates will be added to your next attack, spell, skill or ability roll.</div>` : ""}
  <div class="nextroll">
    <span>Next roll</span>
    <button class="mini" data-act="nextmod" data-n="-1">−</button><b>${signed(app.next.mod)}</b><button class="mini" data-act="nextmod" data-n="1">+</button>
    <button class="mini wide" data-act="nextshift" data-n="-1">−1d</button><b>${app.next.shift ? signed(app.next.shift) + "d" : "d±0"}</b><button class="mini wide" data-act="nextshift" data-n="1">+1d</button>
    <select data-act="visibility" aria-label="Who sees rolls">${opt("public", "Everyone sees", app.visibility)}${opt("gm", "GM only", app.visibility)}${opt("self", "Only me", app.visibility)}</select>
  </div>`;
}

function renderLastRoll() {
  const lc = app.lastCard;
  if (!lc) return "";
  const { card, res } = lc;
  const c = app.char;
  const canLuck = c && Number(c.abil.lck.cur) > 0 && !["luck", "hp", "info"].includes(card.kind);
  const ld = c ? luckDie(c) : null;
  const follow = (res.follow || []).filter((f) => !f.auto);
  return `<div class="lastroll">
    ${cardHtml(card, true)}
    <div class="row gap wrap">
      ${follow.map((f, i) => `<button class="btn ${f.quiet ? "" : "primary"} sm" data-follow="${i}">${esc(f.label)}</button>`).join("")}
      ${canLuck ? `<span class="luckburn"><input type="number" min="1" class="num" id="luckpts" value="1"><button class="btn sm" data-act="burn">Burn Luck${ld ? ` (${ld} each)` : ""}</button></span>` : ""}
      <button class="icon-btn sm" data-act="dismiss" title="Dismiss">✕</button>
    </div>
  </div>`;
}

function cardHtml(card, big = false) {
  const tagClass = (t) => (/CRIT/.test(t) ? "crit" : /NAT 1|FAIL|MOJO/.test(t) ? "bad" : /SUCCESS/.test(t) ? "good" : "");
  const isMine = card.charId && app.char && card.charId === app.char.id;
  const jammer = app.char && app.char.cls === "jammer" && !isMine && card.kind !== "info" && card.kind !== "damage";
  return `<div class="card ${big ? "big" : ""}" style="--pc:${esc(card.color || "#888")}">
    <div class="card-head"><span class="who">${esc(card.char || card.player)}</span><span class="what">${esc(card.title)}</span>${card.visibility && card.visibility !== "public" ? `<span class="vis">${card.visibility === "gm" ? "GM" : "private"}</span>` : ""}</div>
    <div class="card-main"><span class="total">${esc(card.total)}</span><span class="parts">${esc((card.parts || []).join(" "))}</span></div>
    ${card.tags && card.tags.length ? `<div class="tags">${card.tags.map((t) => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join("")}</div>` : ""}
    ${card.notes && card.notes.length ? `<ul class="notes">${card.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    ${jammer && !big ? `<button class="link" data-amend="${esc(card.id)}">+ Mojo after the roll</button>` : ""}
  </div>`;
}

function renderLog(n = 30, controls = false) {
  const items = app.log.filter((card) => card.visibility !== "gm" || app.player.role === "GM" || card.player === app.player.name).slice(0, n);
  return `<section class="log">
    <div class="row between"><h3>Roll log</h3>${controls ? `<button class="link" data-act="clearlog">clear</button>` : ""}</div>
    ${items.length ? items.map((c) => cardHtml(c)).join("") : `<p class="muted">No rolls yet.</p>`}
  </section>`;
}

/* ---------------- Tabs ---------------- */
function field(label, inner, cls = "") {
  return `<label class="field ${cls}"><span>${label}</span>${inner}</label>`;
}
function input(path, value, type = "text", extra = "") {
  return `<input type="${type}" data-bind="${path}" value="${esc(value)}" ${type === "number" ? 'class="num"' : ""} ${extra}>`;
}
function check(path, value, label) {
  return `<label class="chk"><input type="checkbox" data-bind="${path}" ${value ? "checked" : ""}> ${label}</label>`;
}

function classSelect(c) {
  const sp = c.species || "human";
  const allowed = SPECIES_CLASSES[sp] || [];
  const tag = (k) => (c.cls === "zero" || allowed.some((a) => a === k || a.startsWith(k + ":")) ? "" : " (species?)");
  return `<select data-bind="cls">${CLASS_ORDER.map((k) => opt(k, CLASSES[k].name + (k === "zero" ? "" : tag(k)), c.cls)).join("")}</select>`;
}

function tabCore(c, d) {
  const aug = AUGURS[c.augur];
  const xpNext = d.lvl < 10 ? XP_THRESHOLDS[d.lvl + 1] : null;
  const canLevel = xpNext !== null && Number(c.xp) >= xpNext;
  return `
  <section class="grid2">
    ${field("Class", classSelect(c))}
    ${c.cls === "specialist" ? field("Specialty", `<select data-bind="sub">${opt("", "— choose —", c.sub)}${SUB_ORDER.map((k) => opt(k, SPECIALIST_SUBS[k].name, c.sub)).join("")}</select>`) : field("Level", c.cls === "zero" ? `<input value="0" disabled class="num">` : `<select data-bind="level">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => opt(l, l, d.lvl)).join("")}</select>`)}
    ${c.cls === "specialist" ? field("Level", `<select data-bind="level">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => opt(l, l, d.lvl)).join("")}</select>`) : ""}
    ${field(`XP <small>${xpNext !== null ? `next ${xpNext}` : "max"}</small>`, input("xp", c.xp, "number"))}
    ${field("Alignment", `<select data-bind="alignment">${opt("L", "Lawful", c.alignment)}${opt("N", "Neutral", c.alignment)}${opt("C", "Chaotic", c.alignment)}</select>`)}
    ${field("Species", `<select data-bind="species">${Object.entries(SPECIES).map(([k, v]) => opt(k, v.name, c.species)).join("")}</select>`)}
    ${field("Occupation", `<input data-bind="occupation" list="occs" value="${esc(c.occupation)}"><datalist id="occs">${OCCUPATIONS.slice(1).map((o) => `<option value="${esc(o[0])}">`).join("")}</datalist>`, "span2")}
    ${field("Player", input("player", c.player))}
    ${field("Team", input("team", c.team))}
    ${field("Played in the movie by", input("actor", c.actor), "span2")}
  </section>
  ${canLevel || c.cls === "zero" ? `<div class="row gap">${canLevel ? `<button class="btn primary" data-act="levelup">Level up to ${d.lvl + 1}</button>` : ""}${c.cls === "zero" ? `<small class="muted">At 10 XP choose a class. ${esc((SPECIES_CLASSES[c.species] || []).map((k) => { const [a, b] = k.split(":"); return b ? SPECIALIST_SUBS[b].name : CLASSES[a].name; }).join(", "))}</small>` : ""}</div>` : ""}
  ${c.cls === "specialist" && !c.sub ? `<div class="banner warn">Choose a specialty to see skills and abilities.</div>` : ""}

  <h3>Abilities</h3>
  <div class="abilities">
    ${ABILITIES.map((a) => {
      const sc = c.abil[a.key];
      const mod = abilityMod(sc.cur);
      return `<div class="ab">
        <button class="ab-name roll" data-roll="ability" data-arg="${a.key}" title="Roll ${a.name} check">${a.short}</button>
        <b class="ab-mod">${signed(mod)}</b>
        <div class="ab-scores"><input type="number" class="num" data-bind="abil.${a.key}.cur" value="${esc(sc.cur)}" title="Current"><span>/</span><input type="number" class="num" data-bind="abil.${a.key}.max" value="${esc(sc.max)}" title="Maximum"></div>
      </div>`;
    }).join("")}
  </div>
  <div class="row gap wrap small-btns">
    <button class="btn sm" data-roll="luckcheck">Luck check</button>
    <button class="btn sm" data-roll="untrained" data-arg="str">Untrained (d10)…</button>
    ${c.cls === "athlete" && d.lvl > 0 ? `<button class="btn sm" data-roll="athletics" data-arg="str">Athletics (Str + ${d.row.train})</button><button class="btn sm" data-roll="athletics" data-arg="agi">Athletics (Agi)</button>` : ""}
  </div>

  <h3>Saving throws</h3>
  <div class="saves">
    ${["ref", "fort", "will"].map((k) => `<button class="save roll" data-roll="save" data-arg="${k}"><span>${{ ref: "Reflex", fort: "Fortitude", will: "Willpower" }[k]}</span><b>${signed(d.saves[k].total)}</b></button>`).join("")}
  </div>

  <h3>The Games</h3>
  <div class="row gap wrap">
    <button class="btn" data-roll="grandstand">Grandstand <small>(Crowd DC ${esc(app.room.crowdDC)})</small></button>
    <button class="btn" data-roll="knowledge">Xcrawl knowledge</button>
  </div>
  <div class="grid3">
    ${field("Fame", input("fame", c.fame, "number"))}
    ${field("Fame modifier", `<input disabled value="${d.fame.label}">`)}
    ${field("Mojo", input("mojo", c.mojo, "number"))}
  </div>

  <h3>Birth augur</h3>
  <div class="grid2">
    ${field("Augur (d24)", `<select data-bind="augur">${AUGURS.slice(1).map((a, i) => opt(i + 1, `${i + 1}. ${a.name}`, c.augur)).join("")}</select>`, "span2")}
    ${field("Lucky roll", `<input disabled value="${esc(aug ? aug.roll : "")}">`, "span2")}
    ${field("Augur modifier <small>(fixed at creation)</small>", input("augurMod", c.augurMod, "number"))}
    <div class="field"><span>&nbsp;</span><button class="btn sm" data-act="augur-from-luck">Set from max Luck</button></div>
  </div>
  `;
}

function tabCombat(c, d) {
  const weapons = c.weapons;
  const specials = R.specialAttacks(c);
  return `
  <section class="grid3">
    ${field("Armour", `<select data-bind="armor">${ARMOR.map((a) => opt(a[0], `${a[0]} (+${a[1]})`, c.armor)).join("")}</select>`, "span2")}
    <div class="field"><span>Shield</span><label class="chk"><input type="checkbox" data-bind="shield" ${c.shield ? "checked" : ""}> +1 AC</label></div>
    ${field("Magic AC", input("acMagic", c.acMagic, "number"))}
    ${field("Misc AC", input("acMisc", c.acMisc, "number"))}
    ${field("Misc speed", input("speedMisc", c.speedMisc, "number"))}
  </section>
  <div class="kv">
    <span>AC ${d.ac} = ${d.acParts.map(([l, v]) => `${esc(l)} ${signed(v)}`).join(", ").replace(/^Base \+10/, "10")}</span>
    <span>Check penalty <b>${d.arm.acp}</b> · Fumble die <b>${d.arm.fumble}</b>${d.arm.speed ? ` · Speed ${d.arm.speed}'` : ""}</span>
    <span>Attack <b>${d.deed ? `deed die ${d.deed}` : signed(d.atk)}</b> · Action dice <b>${d.row.ad}</b> · Crit <b>${d.critDie}</b> on table <b>${d.critTable}</b></span>
    ${c.cls === "brawler" && d.lvl ? `<span>Toughness: reduce melee damage taken by <b>${d.row.fort}</b>. Unarmed damage <b>${d.row.unarmed}</b>.</span>` : ""}
    ${c.cls === "athlete" && d.lvl ? `<span>Training die <b>${d.row.train}</b> · Scramble <b>${signed(d.row.scramble)}</b>${d.heavy ? " (lost: heavy armour)" : ""} · Ignore <b>${d.lvl}</b> subdual damage/round</span>` : ""}
    ${c.cls === "jammer" && d.lvl ? `<span>Chosen weapon AC bonus <b>+${d.lvl}</b>${d.heavy ? " (lost: heavy armour)" : ""} · Devastating <b>${d.row.devastate}</b></span>` : ""}
    ${c.cls === "messenger" && d.lvl ? `<span>Scourge <b>${d.row.scourge}</b> · Crit vs unholy <b>${d.row.unholyThreat}-20</b></span>` : ""}
    ${c.cls === "halforc" && d.lvl ? `<span>Wild attack threat range <b>${d.row.wild}-20</b></span>` : ""}
  </div>
  ${c.cls === "jammer" ? check("opts.chosenWielded", c.opts.chosenWielded, "Fighting with my chosen weapon (AC bonus)") : ""}
  <div class="row gap"><button class="btn" data-roll="init">Initiative ${signed(d.init)}</button><button class="btn" data-roll="init2h">Initiative, two-handed (d16)</button><button class="btn" data-roll="fumble">Fumble</button><button class="btn" data-roll="crit">Crit</button></div>

  <h3>Weapons</h3>
  <div class="weapons">
    ${weapons.length ? weapons.map((w, i) => weaponRow(c, d, w, i)).join("") : `<p class="muted">No weapons yet.</p>`}
  </div>
  <div class="row gap">
    <select id="addweapon">${WEAPONS.map((w) => opt(w[0], `${w[0]} (${w[1]})`, "Dagger")).join("")}</select>
    <button class="btn" data-act="add-weapon">Add weapon</button>
  </div>
  ${specials.length ? `<h3>Class attacks</h3><div class="row gap wrap">${specials.map((s, i) => `<button class="btn" data-special="${i}">${esc(s.label)}</button>`).join("")}</div>` : ""}
  ${c.cls === "athlete" && d.lvl ? `<h3>Grappling</h3><div class="row gap wrap"><input id="technique" placeholder="Technique (optional): takedown, choke…" class="grow"><button class="btn primary" data-roll="grapple">Grapple check</button></div>` : ""}
  `;
}

function weaponRow(c, d, w, i) {
  const p = `weapons.${i}`;
  return `<div class="weapon">
    <div class="w-line">
      <input data-bind="${p}.name" value="${esc(w.name)}" class="w-name">
      <input data-bind="${p}.dmg" value="${esc(w.dmg)}" class="w-dmg" title="Damage">
      <input type="number" data-bind="${p}.bonus" value="${esc(w.bonus)}" class="num" title="Magic bonus">
      <button class="btn primary sm" data-attack="${i}">Attack</button>
      <button class="btn sm" data-dmg="${i}">Dmg</button>
    </div>
    <details><summary>options</summary>
      <div class="w-opts">
        <select data-bind="${p}.kind">${opt("melee", "Melee", w.kind)}${opt("missile", "Missile", w.kind)}${opt("thrown", "Thrown", w.kind)}</select>
        ${check(p + ".trained", w.trained, "Trained")}
        ${check(p + ".agility", w.agility, "Agility weapon")}
        ${check(p + ".hurl", w.hurl, "Hurl (Str dmg close)")}
        ${check(p + ".twoHanded", w.twoHanded, "Two-handed")}
        ${c.cls === "zero" || w.start ? check(p + ".start", w.start, "0-level starting weapon") : ""}
        ${c.cls === "messenger" ? check(p + ".favored", w.favored, "Deity's favoured weapon") : ""}
        ${c.cls === "dwarf" ? check(p + ".lucky", w.lucky, "Lucky weapon") : ""}
        <label class="inline">Backstab dmg <input data-bind="${p}.bs" value="${esc(w.bs)}" class="w-dmg" placeholder="e.g. 1d10"></label>
        <label class="inline">Range <input data-bind="${p}.range" value="${esc(w.range)}" class="w-dmg"></label>
        <button class="link danger" data-act="del-weapon" data-i="${i}">remove</button>
      </div>
    </details>
  </div>`;
}

function featureList(items) {
  return `<div class="features">${items.map(([t, txt]) => `<details><summary>${esc(t)}</summary><p>${esc(txt)}</p></details>`).join("")}</div>`;
}

function skillsTable(c, d) {
  if (!d.skills.length) return "";
  return `<h3>Skills</h3><table class="skills"><tbody>
    ${d.skills.map((s, i) => `<tr><td>${esc(s.name)}</td><td class="r">${s.die ? esc(s.die) + (s.ab ? signed(s.ab) : "") : signed(s.total)}</td>
      <td class="muted small">${s.die ? "" : `${signed(s.bonus)}${s.ab ? ` ${signed(s.ab)} ${s.abKey}` : ""}${s.acp ? ` ${s.acp} armour` : ""}${s.aug ? ` ${signed(s.aug)} augur` : ""}`}</td>
      <td>${s.key === "backstab" ? `<small class="muted">add on attack</small>` : `<button class="btn sm" data-skill="${i}">Roll</button>`}</td></tr>`).join("")}
  </tbody></table>`;
}

function tabClass(c, d) {
  const def = d.def;
  const sub = d.sub;
  const parts = [];
  parts.push(`<div class="classhead"><b>${esc(displayClassName(c))}</b> ${d.lvl ? `level ${d.lvl}` : ""} · HD d${hitDie(c)} · corebook p.${sub ? sub.page : def.page}</div>`);
  parts.push(`<p class="small"><b>Weapons:</b> ${esc((sub && sub.weapons) || def.weapons)}</p>`);

  if (c.cls === "specialist") {
    parts.push(field("Specialty", `<select data-bind="sub">${opt("", "— choose —", c.sub)}${SUB_ORDER.map((k) => opt(k, SPECIALIST_SUBS[k].name, c.sub)).join("")}</select>`));
    if (d.lvl) parts.push(`<div class="kv"><span>Luck die <b>${d.row.luckDie}</b> per point of Luck spent${sub && sub.luckDamageBump ? ` (+1d for damage)` : ""}. Recover ${d.lvl} Luck per night.</span></div>
      <div class="row gap"><button class="btn" data-act="rest">Night's rest: recover ${d.lvl} Luck</button></div>`);
  }
  // class-specific controls
  if (c.cls === "athlete") parts.push(check("opts.athleteLuck", c.opts.athleteLuck, "Add Luck modifier to Strength, Agility and Stamina checks"));
  if (c.cls === "brawler") parts.push(check("opts.unarmedLuck", c.opts.unarmedLuck, "Add Luck modifier to unarmed attack and damage"));
  if (c.cls === "jammer") {
    parts.push(`<div class="grid2">
      ${field("Performance specialties", `<textarea data-bind="performances" rows="2">${esc(c.performances)}</textarea>`, "span2")}
      ${field("Chosen weapon", `<select data-act="chosen">${opt("", "— choose —", "")}${c.weapons.filter((w) => w.kind === "melee").map((w) => opt(w.id, w.name, w.chosen ? w.id : "")).join("")}</select>`)}
      <div class="field"><span>Disrespect</span><b>${d.lvl ? d.row.disrespect : "—"} for ${Math.max(1, d.lvl + d.m.per)} rds</b></div>
    </div>`);
    parts.push(check("opts.luckAC", c.opts.luckAC, "Add Luck modifier to AC"));
    parts.push(`<div class="row gap wrap"><button class="btn primary" data-roll="perf" data-arg="disrespect">Disrespect</button><button class="btn primary" data-roll="perf" data-arg="lionize">Lionize</button><button class="btn" data-roll="perf" data-arg="performance">Performance</button></div>
      <p class="small muted">Jammers can give Mojo after a teammate's roll: use "+ Mojo after the roll" on their entry in the log.</p>`);
  }
  if (c.cls === "messenger") {
    const deity = DEITIES.find((x) => x[0] === c.deity);
    parts.push(field("Ancestor deity", `<select data-bind="deity">${opt("", "— choose —", c.deity)}${DEITIES.map((x) => opt(x[0], `${x[0]} (${x[1]})`, c.deity)).join("")}</select>`));
    if (deity) parts.push(`<div class="kv"><span>Alignment <b>${deity[1]}</b> · Favoured weapon <b>${esc(deity[2])}</b></span><span>Unholy: ${esc(UNHOLY[deity[1]])}</span>${deity[1] !== c.alignment ? `<span class="warn">Your alignment should match your deity's (${deity[1]}).</span>` : ""}</div>`);
    parts.push(`<p class="small muted">Holy Acts are on the Magic tab.</p>`);
  }
  if (c.cls === "dwarf") parts.push(`<p class="small">Lucky weapon: tick <b>Lucky weapon</b> in a weapon's options. It uses your fixed augur Luck modifier (${signed(c.augurMod)}).</p>`);
  if (c.cls === "gnome") {
    parts.push(check("opts.agroLuck", c.opts.agroLuck, "Add Luck modifier to draw agro"));
    if (d.lvl) parts.push(`<div class="kv"><span>Team mascot die <b>${d.row.mascot}</b> (Mojo on a natural 20 attack or spell check)</span></div>`);
    parts.push(`<div class="row gap"><button class="btn primary" data-roll="agro">Draw agro</button></div>`);
  }
  if (c.cls === "halfelf") {
    parts.push(check("opts.luckSaves", c.opts.luckSaves, `Apply fixed Luck modifier (${signed(c.augurMod)}) to all saving throws`));
    if (d.lvl) parts.push(`<div class="kv"><span>Charisma die <b>${d.row.cha}</b> on Personality-based skill checks and Grandstanding</span></div>`);
  }
  if (c.cls === "halforc") parts.push(check("opts.wildLuck", c.opts.wildLuck, "Add Luck modifier to wild attack attack and damage"));
  if (sub && sub.disapproval) parts.push(disapprovalTracker(c));

  parts.push(skillsTable(c, d));
  if (c.cls === "specialist" && d.skills.some((s) => s.abKey === "agi") && d.arm.acp) parts.push(`<p class="small muted">Armour check penalty (${d.arm.acp}) is applied to Agility-based skills.</p>`);

  parts.push(`<h3>Abilities</h3>`);
  parts.push(featureList([...(def.features || []), ...((sub && sub.features) || [])]));
  const mojo = (sub && sub.mojo) || def.mojo;
  const luck = def.luck;
  if (mojo || luck) parts.push(`<div class="kv">${mojo ? `<span><b>Mojo:</b> ${esc(mojo)}</span>` : ""}${luck ? `<span><b>Luck:</b> ${esc(luck)}</span>` : ""}</div>`);
  if (d.lvl === 0 && d.species !== "human") parts.push(`<p class="small"><b>${esc(SPECIES[d.species].name)}:</b> ${esc(SPECIES[d.species].note || "")}</p>`);
  return parts.join("");
}

function disapprovalTracker(c) {
  return `<div class="disapproval">
    <span>Disapproval range <b>1–${esc(c.disapproval)}</b></span>
    <button class="mini" data-act="dis" data-n="-1">−</button><button class="mini" data-act="dis" data-n="1">+</button>
    <button class="btn sm" data-act="dis-reset">Morning prayer: reset to 1</button>
  </div>`;
}

function tabMagic(c, d) {
  const caster = d.caster;
  const parts = [];
  if (caster && caster.type === "messenger") {
    parts.push(disapprovalTracker(c));
    parts.push(`<div class="holy">${[["lay", "Lay on Hands"], ["bless", "Bless"], ["turn", "Turn Unholy"], ["summon", "Summon Weapon"], ["aid", "Divine Aid"], ["holy", "Other Holy Act"]].map(([k, l]) => `<button class="btn ${k === "lay" ? "primary" : ""}" data-roll="holy" data-arg="${k}">${l}</button>`).join("")}</div>
    <p class="small muted">Holy Act: 1d20 ${signed(d.m.per)} Per ${signed(d.lvl)} level. Natural rolls within the disapproval range fail automatically.</p>`);
    return parts.join("") + spellsList(c, d, null);
  }
  if (caster) {
    const listName = caster.list === "gnome" ? "gnome" : "blaster";
    parts.push(`<div class="kv">
      <span>Spell check: <b>1d20 ${signed(d.m.per)} Per ${caster.type === "blaster" ? `+ blaster die ${d.row.bdie}` : `${signed(d.lvl)} CL`}${caster.type === "trickster" ? ` ${signed(d.m.lck)} Luck` : ""}${d.arm.acp ? ` ${d.arm.acp} armour` : ""}</b></span>
      <span>Spells known <b>${caster.known}</b> (${c.spells.length} listed) · Max spell level <b>${caster.maxLvl}</b> · ${listName} list${caster.noCasting ? ` · <b class="warn">Personality too low to cast</b>` : ""}</span>
      ${caster.type === "trickster" || caster.type === "halfelf" ? `<span>${caster.type === "trickster" ? "Cannot spellburn or voluntarily take corruption." : "Draws spells from the blaster list."}</span>` : ""}
    </div>`);
    if (caster.spellburn) parts.push(`<div class="row gap">${field("Spellburn for next spell check", `<input type="number" class="num" id="spellburn" value="0" min="0">`)}<small class="muted">Remember to lower Str, Agi or Sta by the same amount.</small></div>`);
    parts.push(`<div class="row gap"><button class="btn primary" data-spell="-1">Spell check</button></div>`);
    if (caster.type !== "gnome") parts.push(field("Patron", `<select data-bind="patron">${opt("", "— none —", c.patron)}${Object.keys(PATRONS).map((p) => opt(p, p, c.patron)).join("")}</select>`));
    if (c.patron && PATRONS[c.patron]) parts.push(`<p class="small">Patron spells: ${esc(PATRONS[c.patron].join(" · "))}</p>`);
  }
  const scroll = d.skills.find((s) => s.key === "scroll");
  if (scroll) parts.push(`<div class="row gap"><button class="btn" data-skill="${d.skills.indexOf(scroll)}">Cast spell from scroll (${esc(scroll.die)}${signed(scroll.ab)})</button></div>`);
  parts.push(spellsList(c, d, caster));
  parts.push(field("Corruption & mercurial notes", `<textarea data-bind="corruption" rows="3">${esc(c.corruption)}</textarea>`));
  return parts.join("");
}

function spellsList(c, d, caster) {
  const list = caster && caster.list === "gnome" ? GNOME_SPELLS : BLASTER_SPELLS;
  const names = Object.entries(list).flatMap(([lvl, arr]) => arr.map((n) => [n, lvl]));
  const patronNames = c.patron && PATRONS[c.patron] ? PATRONS[c.patron].map((n, i) => [n, i + 1]) : [];
  return `<h3>${caster && caster.type === "messenger" ? "Notes on blessings & prayers" : "Spells"}</h3>
  <datalist id="spellnames">${[...names, ...patronNames].map(([n]) => `<option value="${esc(n)}">`).join("")}</datalist>
  <div class="spells">
    ${c.spells.map((s, i) => `<div class="spell ${s.lost ? "lost" : ""}">
      <div class="w-line">
        <input data-bind="spells.${i}.name" value="${esc(s.name)}" list="spellnames" class="w-name" placeholder="Spell name">
        <select data-bind="spells.${i}.level" title="Spell level">${[1, 2, 3].map((l) => opt(l, `L${l}`, s.level)).join("")}</select>
        ${check(`spells.${i}.lost`, s.lost, "lost")}
        ${caster && caster.type !== "messenger" ? `<button class="btn primary sm" data-spell="${i}">Cast</button>` : ""}
      </div>
      <details><summary>details</summary>
        ${field("Mercurial effect", `<input data-bind="spells.${i}.merc" value="${esc(s.merc || "")}">`)}
        ${field("Notes", `<textarea data-bind="spells.${i}.notes" rows="2">${esc(s.notes || "")}</textarea>`)}
        <button class="link danger" data-act="del-spell" data-i="${i}">remove</button>
      </details>
    </div>`).join("")}
  </div>
  <div class="row gap"><button class="btn" data-act="add-spell">Add spell</button>${c.spells.some((s) => s.lost) ? `<button class="btn" data-act="restore-spells">New day: restore lost spells</button>` : ""}</div>`;
}

function tabGear(c) {
  return `
  ${field("Equipment", `<textarea data-bind="equipment" rows="6">${esc(c.equipment)}</textarea>`)}
  <div class="grid4">
    ${field("gp", input("gp", c.gp, "number"))}
    ${field("sp", input("sp", c.sp, "number"))}
    ${field("cp", input("cp", c.cp, "number"))}
    ${field("Wealth", input("wealth", c.wealth, "number"))}
  </div>
  ${field("Languages", input("languages", c.languages))}
  ${field("Sponsors & endorsements", `<textarea data-bind="sponsors" rows="2">${esc(c.sponsors)}</textarea>`)}
  ${field("Notes", `<textarea data-bind="notes" rows="6">${esc(c.notes)}</textarea>`)}
  `;
}

/* ============================================================
   Modals
   ============================================================ */
function modal(html, onMount) {
  const wrap = document.createElement("div");
  wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest("[data-close]")) close();
  });
  if (onMount) onMount(wrap.querySelector(".modal"), close);
  return close;
}

function attackModal(i) {
  const c = app.char;
  const d = derive(c);
  const w = c.weapons[i];
  if (!w) return;
  const hasBackstab = d.skills.some((s) => s.key === "backstab");
  const unholyClass = c.cls === "messenger" || (c.cls === "specialist" && c.sub === "cryptraider");
  const showDisrespect = c.cls === "jammer" && d.lvl > 0;
  const hurl = w.hurl || w.kind === "thrown";
  const ad = d.ad;
  const simple = ad.length === 1 && !hasBackstab && !d.deed && !unholyClass && !showDisrespect && !hurl;
  if (simple) return doRoll(R.attackRoll(c, w, {}));
  modal(`<h3>${esc(w.name)} attack</h3>
    ${ad.length > 1 ? field("Action die", `<select id="m-ad">${ad.map((s, k) => opt(k, `d${s}${k ? " (extra action)" : ""}`, 0)).join("")}</select>`) : ""}
    ${d.deed ? field("Mighty Deed (optional)", `<input id="m-deed" placeholder="e.g. trip, disarm, blind">`) : ""}
    ${hasBackstab ? `<label class="chk"><input type="checkbox" id="m-bs"> Backstab (target unaware)</label>` : ""}
    ${unholyClass ? `<label class="chk"><input type="checkbox" id="m-unholy"> Target is unholy${c.cls === "specialist" ? " (un-dead or demon)" : ""}</label>` : ""}
    ${showDisrespect ? `<label class="chk"><input type="checkbox" id="m-dis"> Target is disrespected</label>` : ""}
    ${hurl ? `<label class="chk"><input type="checkbox" id="m-close" checked> Close range (Strength to damage)</label>` : ""}
    <div class="row gap end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="m-go">Roll attack</button></div>`, (m, close) => {
    m.querySelector("#m-go").addEventListener("click", () => {
      const v = (id) => m.querySelector(id);
      const opts = {
        adIndex: v("#m-ad") ? Number(v("#m-ad").value) : 0,
        deed: v("#m-deed") ? v("#m-deed").value.trim() : "",
        backstab: v("#m-bs") ? v("#m-bs").checked : false,
        unholy: v("#m-unholy") ? v("#m-unholy").checked : false,
        disrespected: v("#m-dis") ? v("#m-dis").checked : false,
        closeRange: v("#m-close") ? v("#m-close").checked : false,
      };
      close();
      doRoll(R.attackRoll(c, w, opts));
    });
  });
}

function giveMojoModal() {
  const c = app.char;
  const others = app.roster.filter((r) => !(r.data && r.data.id === c.id) && (r.ref.kind === "token" || !S.inOwlbear()));
  if (!others.length) return toast("No teammates in the scene to give Mojo to.");
  if (!(Number(c.mojo) > 0)) return toast("You have no Mojo to give.");
  modal(`<h3>Give Mojo</h3>
    <p class="small muted">Mojo goes on the teammate's next attack, spell, skill or ability roll. You can't spend it on yourself, and they can't ask for it!</p>
    ${field("Teammate", `<select id="g-to">${others.map((r, k) => opt(k, r.label, 0)).join("")}</select>`)}
    ${field(`Points (you have ${esc(c.mojo)})`, `<input type="number" class="num" id="g-n" value="1" min="1" max="${esc(c.mojo)}">`)}
    <div class="row gap end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="g-go">Give</button></div>`, (m, close) => {
    m.querySelector("#g-go").addEventListener("click", async () => {
      const target = others[Number(m.querySelector("#g-to").value)];
      const n = Math.max(1, Math.min(Number(m.querySelector("#g-n").value) || 1, Number(c.mojo)));
      const gift = { from: c.name, n };
      try {
        if (target.ref.kind === "token") {
          await S.updateTokenSheets([target.ref.id], (s) => {
            s.mojoIncoming = [...(s.mojoIncoming || []), gift];
            return s;
          });
        } else {
          const t = normalize(target.data);
          t.mojoIncoming.push(gift);
          S.librarySave(t);
        }
        c.mojo -= n;
        scheduleSave();
        const card = { id: uid(), ...rollMeta(), title: `gives ${n} Mojo to ${target.label}`, total: n, parts: [], tags: [], notes: [], visibility: "public", time: Date.now(), kind: "info" };
        pushCard(card);
        close();
        renderSheetBody();
      } catch {
        toast("Couldn't update that teammate's sheet.");
      }
    });
  });
}

function levelUpModal() {
  const c = app.char;
  if (c.cls !== "zero") {
    c.level = effectiveLevel(c) + 1;
    scheduleSave();
    renderSheetBody();
    doRoll(R.hpLevelRoll(c));
    return;
  }
  const allowed = SPECIES_CLASSES[c.species || "human"] || SPECIES_CLASSES.human;
  modal(`<h3>Choose a class</h3>
    <p class="small muted">${esc(SPECIES[c.species || "human"].name)} crawlers can advance as:</p>
    <div class="classpick">${allowed.map((k) => {
      const [a, b] = k.split(":");
      const name = b ? SPECIALIST_SUBS[b].name : CLASSES[a].name;
      return `<button class="btn" data-pick="${k}">${esc(name)}</button>`;
    }).join("")}</div>
    <div class="row gap end"><button class="btn" data-close>Cancel</button></div>`, (m, close) => {
    m.querySelectorAll("[data-pick]").forEach((b) => b.addEventListener("click", () => {
      const [a, s] = b.dataset.pick.split(":");
      c.cls = a;
      c.sub = s || "";
      c.level = 1;
      if (!(Number(c.mojo) > 0)) c.mojo = 1;
      if (a === "specialist" && s && SPECIALIST_SUBS[s].alignment) c.alignment = SPECIALIST_SUBS[s].alignment;
      if (a === "blaster" && !c.spells.length) c.spells.push({ id: uid(), name: "Spellweaver Blast", level: 1, lost: false });
      if ((a === "halfelf" || (a === "specialist" && s === "trickster")) && !c.spells.length) c.spells.push({ id: uid(), name: "Cantrip", level: 1, lost: false });
      for (const w of c.weapons) w.trained = w.start || weaponTrainedGuess(c, w.name);
      close();
      scheduleSave();
      renderSheetBody();
      doRoll(R.hpLevelRoll(c));
    }));
  });
}

function sheetMenu() {
  const c = app.char;
  const isToken = app.ref.kind === "token";
  const sel = app.selectionItems.filter((i) => i.layer === "CHARACTER" && !(i.metadata || {})[S.SHEET_KEY]);
  modal(`<h3>${esc(c.name)}</h3>
    <div class="menu">
      <button class="btn" data-m="export">Export JSON</button>
      ${isToken ? `<button class="btn" data-m="tolib">Copy to my library</button>` : ""}
      ${!isToken && S.inOwlbear() ? (sel.length === 1 ? `<button class="btn primary" data-m="attach">Attach to selected token (${esc(sel[0].name)})</button>` : `<p class="small muted">Select one character token without a sheet to attach this sheet to it.</p>`) : ""}
      <button class="btn" data-m="dup">Duplicate</button>
      ${isToken ? `<button class="btn danger" data-m="detach">Remove sheet from token</button>` : `<button class="btn danger" data-m="delete">Delete from library</button>`}
    </div>
    <div class="row gap end"><button class="btn" data-close>Close</button></div>`, (m, close) => {
    m.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-m]");
      if (!b) return;
      const act = b.dataset.m;
      await saveNow();
      if (act === "export") {
        const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${(c.name || "crawler").replace(/[^\w-]+/g, "_")}.xcc.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } else if (act === "tolib") {
        S.librarySave({ ...c, id: uid() });
        toast("Copied to your library.");
      } else if (act === "attach") {
        await S.saveToToken(sel[0].id, c);
        S.libraryDelete(c.id);
        app.ref = { kind: "token", id: sel[0].id };
        toast(`Attached to ${sel[0].name}.`);
      } else if (act === "dup") {
        const copy = { ...JSON.parse(JSON.stringify(c)), id: uid(), name: c.name + " (copy)" };
        S.librarySave(copy);
        toast("Copy saved to your library.");
      } else if (act === "detach") {
        if (!confirmInline(b)) return;
        S.librarySave(c);
        await S.removeFromToken(app.ref.id);
        app.ref = { kind: "local", id: c.id };
        toast("Removed from token; a copy is in your library.");
      } else if (act === "delete") {
        if (!confirmInline(b)) return;
        S.libraryDelete(c.id);
        app.view = "roster";
        app.char = null;
        app.ref = null;
        close();
        await refreshRoster();
        render();
        return;
      }
      close();
      await refreshRoster();
      render();
    });
  });
}
function confirmInline(btn) {
  if (btn.dataset.armed) return true;
  btn.dataset.armed = "1";
  btn.textContent = "Click again to confirm";
  return false;
}

/* ============================================================
   Events
   ============================================================ */
$app.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.room) {
    S.setRoomState({ [el.dataset.room]: Number(el.value) || 14 }).then((r) => (app.room = r));
    return;
  }
  if (el.dataset.pref === "notify") { S.lsSet("xcc-notify", el.checked); return; }
  if (el.dataset.act === "visibility") {
    app.visibility = el.value;
    S.lsSet("xcc-visibility", el.value);
    return;
  }
  if (el.dataset.act === "import") return importFile(el.files[0]);
  if (el.dataset.act === "chosen") {
    for (const w of app.char.weapons) w.chosen = w.id === el.value;
    app.char.opts.chosenWielded = !!el.value;
    scheduleSave();
    return renderSheetBody();
  }
  const path = el.dataset.bind;
  if (!path || !app.char) return;
  let value;
  if (el.type === "checkbox") value = el.checked;
  else if (el.type === "number") value = el.value === "" ? 0 : Number(el.value);
  else value = el.value;
  if (path === "level" || path === "augur" || /\.level$/.test(path)) value = Number(value);
  setPath(app.char, path, value);
  afterBind(path, value);
  scheduleSave();
  renderSheetBody();
});

function afterBind(path, value) {
  const c = app.char;
  if (path === "cls") {
    if (value === "zero") c.level = 0;
    else if (!(Number(c.level) > 0)) c.level = 1;
    if (value !== "specialist") c.sub = "";
    const def = CLASSES[value];
    if (def && def.species && def.species !== "human") c.species = def.species;
    if (value === "blaster" && !c.spells.length) c.spells.push({ id: uid(), name: "Spellweaver Blast", level: 1, lost: false });
    if (value === "halfelf" && !c.spells.length) c.spells.push({ id: uid(), name: "Cantrip", level: 1, lost: false });
  }
  if (path === "sub" && value && SPECIALIST_SUBS[value]) {
    const s = SPECIALIST_SUBS[value];
    if (s.species !== "human") c.species = s.species;
    if (s.alignment) c.alignment = s.alignment;
    if (value === "trickster" && !c.spells.length) c.spells.push({ id: uid(), name: "Cantrip", level: 1, lost: false });
  }
  if (path === "occupation") {
    const sp = speciesFromOccupation(value);
    if (sp !== "human" || c.species === "human") c.species = sp;
  }
  if (path === "deity") {
    const deity = DEITIES.find((x) => x[0] === value);
    if (deity) c.alignment = deity[1];
  }
  if (/^weapons\.\d+\.name$/.test(path)) {
    const i = Number(path.split(".")[1]);
    const w = WEAPONS.find((x) => x[0].toLowerCase() === String(value).toLowerCase());
    if (w) {
      const fresh = newWeapon(w[0]);
      Object.assign(c.weapons[i], { dmg: fresh.dmg, kind: fresh.kind, agility: fresh.agility, hurl: fresh.hurl, twoHanded: fresh.twoHanded, bs: fresh.bs, range: fresh.range, trained: c.weapons[i].start || weaponTrainedGuess(c, w[0]) });
    }
  }
}

$app.addEventListener("focusout", () => {
  setTimeout(() => {
    if (app.pendingRemote && !(document.activeElement && $app.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) {
      app.char = normalize(app.pendingRemote);
      app.lastSaved = JSON.stringify(app.pendingRemote);
      app.pendingRemote = null;
      renderSheetBody();
    }
  }, 50);
});

$app.addEventListener("click", async (e) => {
  const t = e.target.closest("button, [data-open], [data-tab]");
  if (!t) return;
  const c = app.char;
  const ds = t.dataset;

  if (ds.open) {
    const [kind, ...rest] = ds.open.split(":");
    return openSheet({ kind, id: rest.join(":") });
  }
  if (ds.tab) {
    app.tab = ds.tab;
    S.lsSet("xcc-tab", ds.tab);
    return renderSheetBody();
  }
  if (ds.follow !== undefined && app.lastCard) {
    const f = app.lastCard.res.follow.filter((x) => !x.auto)[Number(ds.follow)];
    if (!f) return;
    if (f.make) return doRoll(f.make());
    return applyAction(f);
  }
  if (ds.amend) return jammerAmend(ds.amend, 1);
  if (ds.attack !== undefined) return attackModal(Number(ds.attack));
  if (ds.dmg !== undefined) {
    const w = c.weapons[Number(ds.dmg)];
    const d = derive(c);
    return doRoll(R.damageRoll(c, w, { deedExpr: d.deed ? "1" + d.deed : null, closeRange: true }));
  }
  if (ds.special !== undefined) {
    const s = R.specialAttacks(c)[Number(ds.special)];
    return s && doRoll(s.make());
  }
  if (ds.skill !== undefined) {
    const d = derive(c);
    const sk = d.skills[Number(ds.skill)];
    return sk && doRoll(R.skillRoll(c, sk));
  }
  if (ds.spell !== undefined) {
    const i = Number(ds.spell);
    const sb = document.getElementById("spellburn");
    const spellburn = sb ? Number(sb.value) || 0 : 0;
    return doRoll(R.spellCheck(c, i >= 0 ? c.spells[i] : null, { spellburn }));
  }
  if (ds.roll) return handleRoll(ds.roll, ds.arg);

  switch (ds.act) {
    case "back":
      await saveNow();
      app.view = "roster";
      app.char = null;
      app.ref = null;
      await refreshRoster();
      return render();
    case "close":
      await saveNow();
      return S.OBR.popover.close(S.POPOVER_ID);
    case "win-size": {
      const prefs = S.popPrefs();
      const key = app.popoverItem ? "size" : "actionSize";
      const next = S.SIZE_ORDER[(S.SIZE_ORDER.indexOf(prefs[key]) + 1) % S.SIZE_ORDER.length];
      S.setPopPrefs({ [key]: next });
      const { width, height } = await S.sheetSize(next);
      if (app.popoverItem) {
        app.minimised = false;
        await S.OBR.popover.setWidth(S.POPOVER_ID, width);
        await S.OBR.popover.setHeight(S.POPOVER_ID, height);
      } else {
        await S.OBR.action.setWidth(width);
        await S.OBR.action.setHeight(height);
      }
      return render();
    }
    case "win-side": {
      await saveNow();
      const prefs = S.popPrefs();
      S.setPopPrefs({ side: prefs.side === "left" ? "right" : "left" });
      return S.OBR.broadcast.sendMessage(S.POPOVER_CHANNEL, { type: "reopen", itemId: app.popoverItem }, { destination: "LOCAL" });
    }
    case "win-min": {
      app.minimised = !app.minimised;
      const { height } = await S.sheetSize(S.popPrefs().size);
      await S.OBR.popover.setHeight(S.POPOVER_ID, app.minimised ? 46 : height);
      return render();
    }
    case "menu": return sheetMenu();
    case "hp":
      c.hp.cur = (Number(c.hp.cur) || 0) + Number(ds.n);
      break;
    case "mojo":
      c.mojo = Math.max(0, (Number(c.mojo) || 0) + Number(ds.n));
      break;
    case "give": return giveMojoModal();
    case "nextmod": app.next.mod += Number(ds.n); return renderSheetBody();
    case "nextshift": app.next.shift = Math.max(-5, Math.min(5, app.next.shift + Number(ds.n))); return renderSheetBody();
    case "burn": return burnLuck(document.getElementById("luckpts")?.value);
    case "dismiss": app.lastCard = null; return renderSheetBody();
    case "clearlog": S.logClear(); app.log = []; return app.view === "sheet" ? renderSheetBody() : render();
    case "levelup": return levelUpModal();
    case "augur-from-luck": c.augurMod = abilityMod(c.abil.lck.max); break;
    case "add-weapon": {
      const sel = document.getElementById("addweapon");
      const w = newWeapon(sel ? sel.value : "Dagger");
      w.trained = weaponTrainedGuess(c, w.name);
      c.weapons.push(w);
      break;
    }
    case "del-weapon": c.weapons.splice(Number(ds.i), 1); break;
    case "add-spell": {
      const d = derive(c);
      c.spells.push({ id: uid(), name: "", level: 1, lost: false, merc: "", notes: "", _list: d.caster && d.caster.list });
      break;
    }
    case "del-spell": c.spells.splice(Number(ds.i), 1); break;
    case "restore-spells": c.spells.forEach((s) => (s.lost = false)); break;
    case "dis": c.disapproval = Math.max(1, (Number(c.disapproval) || 1) + Number(ds.n)); break;
    case "dis-reset": c.disapproval = 1; break;
    case "rest": {
      const lvl = effectiveLevel(c);
      c.abil.lck.cur = Math.min(Number(c.abil.lck.max), (Number(c.abil.lck.cur) || 0) + lvl);
      toast(`Luck restored to ${c.abil.lck.cur}`);
      break;
    }
    // roster actions
    case "combat": app.room = await S.setRoomState({ combat: !app.room.combat }); return render();
    case "encounter": await rosterAll((s) => ({ ...s, mojo: (Number(s.mojo) || 0) + 1 }), "Encounter won: +1 Mojo to every crawler."); return;
    case "wipe": await rosterAll((s) => ({ ...s, mojo: s.cls === "gnome" && Number(s.level) > 0 ? 1 : 0 }), "Mojo wiped."); return;
    case "add-to-token": {
      const item = app.selectionItems.find((i) => i.id === ds.id);
      const nc = blankCharacter();
      nc.name = item ? item.name : nc.name;
      nc.owner = app.player.id;
      await S.saveToToken(ds.id, nc);
      await refreshRoster();
      return openSheet({ kind: "token", id: ds.id });
    }
    case "new-zero": case "new-blank": case "new-funnel": {
      const n = ds.act === "new-funnel" ? 4 : 1;
      let last;
      for (let i = 0; i < n; i++) {
        last = ds.act === "new-blank" ? blankCharacter() : randomZeroLevel();
        last.player = app.player.name === "You" ? "" : app.player.name;
        last.owner = app.player.id;
        S.librarySave(last);
      }
      await refreshRoster();
      if (n === 1) return openSheet({ kind: "local", id: last.id });
      toast("Four hopefuls added to your library. Good luck in Division III!");
      return render();
    }
    default:
      return;
  }
  scheduleSave();
  renderSheetBody();
});

async function rosterAll(fn, msg) {
  const ids = app.roster.filter((r) => r.ref.kind === "token").map((r) => r.ref.id);
  try {
    await S.updateTokenSheets(ids, fn);
    const card = { id: uid(), char: "Judge", player: app.player.name, playerId: app.player.id, color: app.player.color, title: msg, total: "", parts: [], tags: [], notes: [], visibility: "public", time: Date.now(), kind: "info" };
    pushCard(card);
    toast(msg);
  } catch {
    toast("Couldn't update every sheet.");
  }
  await refreshRoster();
  render();
}

function handleRoll(kind, arg) {
  const c = app.char;
  if (!c) return;
  switch (kind) {
    case "ability": return doRoll(R.abilityCheck(c, arg));
    case "untrained": return untrainedModal();
    case "athletics": return doRoll(R.abilityCheck(c, arg, { athletics: true }));
    case "luckcheck": return doRoll(R.luckCheck(c));
    case "save": return doRoll(R.saveRoll(c, arg));
    case "init": return doRoll(R.initiative(c));
    case "init2h": return doRoll(R.initiative(c, { twoHanded: true }));
    case "grandstand": return doRoll(R.grandstand(c, { dc: app.room.crowdDC }));
    case "knowledge": return doRoll(R.knowledge(c));
    case "fumble": return doRoll(R.fumbleRoll(c));
    case "crit": return doRoll(R.critRoll(c));
    case "grapple": {
      const t = document.getElementById("technique");
      return doRoll(R.grappleCheck(c, { technique: t ? t.value.trim() : "" }));
    }
    case "perf": return doRoll(R.performance(c, arg));
    case "agro": return doRoll(R.drawAgro(c));
    case "holy": return doRoll(R.holyAct(c, arg));
  }
}

function untrainedModal() {
  modal(`<h3>Untrained skill check (d10)</h3>
    <div class="classpick">${ABILITIES.filter((a) => a.key !== "lck").map((a) => `<button class="btn" data-ab="${a.key}">${a.name}</button>`).join("")}</div>
    <div class="row gap end"><button class="btn" data-close>Cancel</button></div>`, (m, close) => {
    m.querySelectorAll("[data-ab]").forEach((b) => b.addEventListener("click", () => {
      close();
      doRoll(R.abilityCheck(app.char, b.dataset.ab, { untrained: true }));
    }));
  });
}

async function importFile(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== "object" || !data.abil) throw new Error("not a sheet");
    const c = normalize(data);
    c.id = uid();
    S.librarySave(c);
    await refreshRoster();
    openSheet({ kind: "local", id: c.id });
  } catch {
    toast("That file isn't an Xcrawl sheet.");
  }
}

/* ============================================================
   Boot
   ============================================================ */
async function applyTheme() {
  if (!S.inOwlbear()) return;
  const set = (t) => {
    document.documentElement.dataset.theme = t.mode === "LIGHT" ? "light" : "dark";
  };
  set(await S.OBR.theme.getTheme());
  S.OBR.theme.onChange(set);
}

async function boot() {
  if (S.inOwlbear()) {
    app.player = await S.playerInfo();
    app.room = await S.getRoomState();
    S.onRoomState((r) => { app.room = r; if (app.view === "roster") render(); });
    S.OBR.player.onChange(async (p) => {
      app.player.name = p.name;
      app.player.color = p.color;
      app.player.role = p.role;
      const sel = p.selection || [];
      if (sel.join() !== app.selection.join()) {
        app.selection = sel;
        app.selectionItems = await S.getItemsByIds(sel).catch(() => []);
        if (app.view === "roster") render();
      }
    });
    S.onRemoteRoll((card) => {
      if (!card || typeof card !== "object") return;
      if (card.type === "amend") applyAmend(card);
      else {
        if (card.visibility === "gm" && app.player.role !== "GM") return;
        app.log = S.logPush(card);
      }
      if (app.view === "roster") render();
      else if (app.tab === "log" || (app.lastCard && card.cardId === app.lastCard.card.id)) renderSheetBody();
    });
    await applyTheme();
    await S.initScene(onSceneChange);
  } else {
    app.room = await S.getRoomState();
  }
  await refreshRoster();
  if (app.popoverItem) {
    await openSheet({ kind: "token", id: app.popoverItem });
    if (!app.char) render();
  } else render();
}

window.addEventListener("beforeunload", () => { saveNow(); });

if (S.inOwlbear()) S.OBR.onReady(boot);
else boot();
