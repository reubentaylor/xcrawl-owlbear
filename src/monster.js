// Monster / NPC sheets: parsing XCC stat blocks, rolls and rendering.
import { COREBOOK_MONSTERS } from "./monsters-data.js";
import { rollExpr, actionDice, signed } from "./dice.js";
import { uid } from "./rules.js";

export { COREBOOK_MONSTERS };

const CRIT_TABLES = {
  M: "M: Monsters (pp.320-321)",
  DN: "DN: Devils and Demons (p.315)",
  DR: "DR: Dragons (pp.312-314)",
  G: "G: Giants (p.316)",
  U: "U: Un-Dead (pp.317-319)",
  I: "I (p.84)", II: "II (p.85)", III: "III (p.86)", IV: "IV (p.87)", V: "V (p.88)",
};

export function blankMonster() {
  return {
    kind: "monster",
    v: 1,
    id: uid(),
    name: "New Monster",
    init: "+0",
    attacks: [{ id: uid(), name: "attack", bonus: "+0", type: "melee", dmg: "1d4", raw: "" }],
    crit: "M/d4",
    critRange: null,
    ac: "10",
    hd: "1d8",
    mv: "30’",
    act: "1d20",
    sp: "",
    fort: 0, ref: 0, will: 0,
    al: "N",
    hp: { max: 4, cur: 4 },
    page: null,
    source: "",
    block: "",
    notes: "",
    showPlayers: false,
    rollVis: "gm",
  };
}

/* ---------------- parsing ---------------- */

/** Split on a separator only at parenthesis depth 0. */
function splitTop(s, sepRe) {
  const out = [];
  let depth = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0) {
      const m = s.slice(i).match(sepRe);
      if (m && m.index === 0) {
        out.push(cur);
        cur = "";
        i += m[0].length - 1;
        continue;
      }
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

const KEYS = ["Init", "Atk", "Crit", "AC", "HD", "MV", "Act", "SP", "SV", "AL"];

export function parseAttacks(text) {
  const attacks = [];
  const re = /(?:^|\)\s*|,\s*|\bor\s+|\band\s+)([A-Za-z0-9’'.\-\s]*?)\s*([+\-]\s?\d+d\d+(?:\s?[+\-]\s?\d+)?|\d+d\d+\s?[+\-]\s?\d+|[+\-]\s?\d+)\s*(melee|missile fire|missile|ranged)?\s*\(((?:[^()]|\([^()]*\))*)\)/g;
  let m;
  while ((m = re.exec(text))) {
    let name = (m[1] || "").replace(/^(or|and)\b\s*/i, "").trim();
    if (!name) name = attacks.length ? `${attacks[attacks.length - 1].name} (alt)` : "attack";
    const type = m[3] ? (m[3] === "melee" ? "melee" : "missile") : "melee";
    attacks.push({ id: uid(), name, bonus: m[2].replace(/\s+/g, ""), type, dmg: m[4].trim(), raw: m[0].replace(/^[\s),]*(or|and)?\s*/i, "").trim() });
    re.lastIndex = m.index + m[0].length - 1; // allow the ")" to start the next match
  }
  return attacks;
}

/**
 * Parse an XCC stat block such as
 * "Orc: Init +0; Atk spear +1 melee (1d8); Crit III/d4; AC 13; HD 1d8; MV 20’; Act 1d20; SP infravision; SV Fort +1, Ref +0, Will -1; AL C."
 */
export function parseStatBlock(text, nameHint = "") {
  let s = String(text || "").replace(/\s+/g, " ").replace(/–/g, "-").trim();
  const m = blankMonster();
  m.block = s;
  const nm = s.match(/^([^:;]{1,80}):\s*(?=Init\b)/);
  if (nm) {
    m.name = nm[1].trim();
    s = s.slice(nm[0].length);
  } else if (nameHint) m.name = nameHint;
  // Some books use commas between fields ("AC 12, HD 1d8+1"): normalise to semicolons.
  s = s.replace(/,\s+(?=(HD|AC|MV|Act|SV|SP|AL)\s)/g, "; ");
  const parts = splitTop(s.replace(/\.\s*$/, ""), /;\s*/);
  m.attacks = [];
  m.ac = "";
  m.crit = "";
  m.critRange = null;
  for (const p of parts) {
    const key = KEYS.find((k) => p.startsWith(k + " ") || p === k);
    const val = key ? p.slice(key.length).trim() : p;
    switch (key) {
      case "Init": m.init = val.replace(/\s+/g, ""); break;
      case "Atk": m.atkText = val; m.attacks = parseAttacks(val); break;
      case "Crit": m.crit = val.replace(/\s+/g, ""); break;
      case "AC": m.ac = val; break;
      case "HD": m.hd = val; break;
      case "MV": m.mv = val; break;
      case "Act": m.act = val; break;
      case "SP": m.sp = val; break;
      case "SV": {
        const f = val.match(/Fort\s*([+\-]?\d+)/i), r = val.match(/Ref\s*([+\-]?\d+)/i), w = val.match(/Will\s*([+\-]?\d+)/i);
        if (f) m.fort = Number(f[1]);
        if (r) m.ref = Number(r[1]);
        if (w) m.will = Number(w[1]);
        break;
      }
      case "AL": m.al = val.replace(/\.$/, ""); break;
      default:
        // An attack list without the "Atk" label (e.g. the trench hydra)
        if (!m.attacks.length && /\(/.test(val)) { m.atkText = val; m.attacks = parseAttacks(val); }
    }
  }
  if (!m.attacks.length && m.atkText) m.attacks.push({ id: uid(), name: m.atkText.slice(0, 40), bonus: "+0", type: "melee", dmg: "", raw: m.atkText });
  // threat range written in SP ("crit on 20-24", "increased crit range (19–20)")
  const cr = (m.sp || "").match(/crit(?:ical)?(?: on| range)?\s*\(?\s*(\d+)\s*-\s*\d+/i);
  if (cr) m.critRange = Number(cr[1]);
  const hp = hdAverageOrFixed(m.hd);
  m.hp = { max: hp, cur: hp };
  return m;
}

export function fromCorebook(index) {
  const [name, page, block] = COREBOOK_MONSTERS[index];
  const m = parseStatBlock(block, name);
  m.name = name;
  m.page = page;
  m.source = `XCC corebook p.${page}`;
  return m;
}

function hdParts(hd) {
  const fixed = String(hd || "").match(/hp\s*(\d+)/i);
  const expr = (String(hd || "").match(/\d+d\d+(?:\s*[+\-]\s*\d+)?/) || [""])[0].replace(/\s+/g, "");
  return { fixed: fixed ? Number(fixed[1]) : null, expr };
}
function hdAverageOrFixed(hd) {
  const { fixed, expr } = hdParts(hd);
  if (fixed) return fixed;
  const m = expr.match(/(\d+)d(\d+)([+\-]\d+)?/);
  if (!m) return 1;
  return Math.max(1, Math.floor(Number(m[1]) * (Number(m[2]) + 1) / 2) + Number(m[3] || 0));
}
export function rollHP(m) {
  const { fixed, expr } = hdParts(m.hd);
  if (!expr && fixed) return fixed;
  if (!expr) return 1;
  return Math.max(1, rollExpr(expr).total);
}

/* ---------------- rolls ---------------- */

function num(s) {
  const n = parseInt(String(s).replace(/\s+/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function monsterInit(m) {
  return { title: "Initiative", kind: "init", die: 20, mods: [["Init", num(m.init)]], noCrit: true, noFumble: true };
}

export function monsterSave(m, key) {
  const label = { fort: "Fortitude", ref: "Reflex", will: "Willpower" }[key];
  return { title: `${label} save`, kind: "save", die: 20, mods: [[label, Number(m[key]) || 0]], noCrit: true };
}

function critParts(m) {
  const [table, die] = String(m.crit || "").split("/");
  const d = (die || "").trim();
  return { table: (table || "").trim(), die: d ? (/^\d/.test(d) ? d : "1" + d) : "" };
}

export function monsterCrit(m) {
  const { table, die } = critParts(m);
  if (!die) return { title: "Critical hit", kind: "crit", expr: "1d4", mods: [], notes: () => ["No crit die listed; rolled 1d4. Use Table 12-1 (p.311) by Hit Dice."] };
  return {
    title: `Critical hit (Table ${table || "?"})`,
    kind: "crit",
    expr: die,
    mods: [],
    notes: () => [`Look up Crit Table ${CRIT_TABLES[table] || table}. Subtract the target PC's Luck modifier (a negative Luck adds to the roll).`],
  };
}

/** Damage text such as "1d10+deed die+4", "1d4 +1d6 acid plus grab", "2d6 subdual, 30’ range". */
export function damageExpr(dmg, deed) {
  let t = String(dmg || "").replace(/–/g, "-");
  const head = t.split(/\bplus\b|,|;/)[0];
  let h = head.replace(/deed die/gi, deed != null ? String(deed) : "0");
  // keep only the leading arithmetic of dice and numbers, e.g. "1d4 +1d6 acid" -> "1d4+1d6"
  const tokens = h.match(/[+\-]?\s*\d+d\d+|[+\-]?\s*\d+(?!\s*(?:’|'|ft|Stamina))/g);
  if (!tokens || !/\d+d\d+/.test(h) || /Stamina/i.test(h)) return { expr: "", note: t };
  const expr = tokens.map((x) => x.replace(/\s+/g, "")).join("").replace(/^\+/, "");
  if (!/^\d+d\d+/.test(expr)) return { expr: "", note: t };
  const extra = t.slice(head.length).trim();
  const words = head.replace(/deed die/gi, " ").replace(/[+\-]?\s*\d+d\d+|[+\-]?\s*\d+/g, " ").replace(/[+\-]/g, " ").replace(/\s+/g, " ").trim();
  return { expr, note: [words, extra].filter(Boolean).join(" ").replace(/\s+,/g, ",").replace(/^,\s*/, "") };
}

export function monsterAttack(m, a, opts = {}) {
  const dice = actionDice(m.act || "1d20");
  const die = opts.die || dice[opts.adIndex || 0] || 20;
  const bonus = String(a.bonus || "+0").replace(/\s+/g, "");
  const mods = [];
  const extra = [];
  const deedMatch = bonus.match(/^([+\-]?)(\d+d\d+)([+\-]\d+)?$/);
  if (deedMatch) {
    extra.push(["deed", deedMatch[2], "deed"]);
    if (deedMatch[3]) mods.push(["attack", Number(deedMatch[3])]);
  } else mods.push(["attack", num(bonus)]);
  // Default: crit on the die's maximum. A listed range ("crit on 20-24", "19-20") is scaled to smaller dice.
  const cr = Number(m.critRange) || 0;
  const crThreat = cr ? Math.max(2, die >= 20 ? cr : cr - (20 - die)) : die;
  return {
    title: `${a.name} attack`,
    kind: "attack",
    die,
    mods,
    dice: extra,
    threat: crThreat,
    mojo: false,
    notes: (r) => [r.crit ? "Critical hit!" : null, r.fumble ? "Natural 1: a miss." : null, a.dmg && !damageExpr(a.dmg).expr ? `Effect: ${a.dmg}` : null],
    follow: (r) => {
      const f = [];
      const d = damageExpr(a.dmg, r.extras.deed);
      if (d.expr) f.push({ label: "Damage", make: () => ({ title: `${a.name} damage`, kind: "damage", expr: d.expr, mods: [], minimum: 1, notes: () => (d.note ? [d.note] : []) }) });
      f.push({ label: "Crit", make: () => monsterCrit(m), quiet: !r.crit });
      return f;
    },
  };
}

export function monsterDamage(m, a) {
  const d = damageExpr(a.dmg, null);
  if (!d.expr) return null;
  const deedNote = /deed die/i.test(a.dmg) ? " (deed die not included: roll the attack for it)" : "";
  return { title: `${a.name} damage`, kind: "damage", expr: d.expr, mods: [], minimum: 1, notes: () => [d.note, deedNote].filter(Boolean) };
}

export function hpRollSpec(m) {
  const { fixed, expr } = hdParts(m.hd);
  if (!expr) return null;
  return {
    title: `Hit points (${m.hd})`,
    kind: "hp",
    expr,
    mods: [],
    minimum: 1,
    notes: () => (fixed ? [`The book lists ${fixed} hp for this individual.`] : []),
    follow: (r) => [{ label: `Set HP to ${r.total}`, action: "sethp", n: r.total }],
  };
}

export { signed };
