// Roll builders. Each builder returns a "spec" that execute() turns into a result card.
import { rollDie, rollExpr, shiftDie, shiftExpr, parse, signed } from "./dice.js";
import { derive, augurBonus, luckDie, effectiveLevel, classRow } from "./rules.js";
import { LIONIZE, BLESSING, SUMMON_WEAPON, LAY_ON_HANDS, LAY_ON_HANDS_COLS, lookup, CLASSES } from "./data.js";

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

/**
 * spec: {
 *   title, kind, die, count?, shift?, mods: [[label, value]], dice: [[label, expr, key?]],
 *   threat?, mojo?, autoFail?, rollUnder?, notes?(r) => string[], follow?(r) => [{label, make: () => spec}],
 *   flat? (no main die; damage style), expr? (main expression for damage)
 * }
 */
export function execute(spec, ctx = {}) {
  const parts = [];
  let total = 0;
  const extras = {};
  let nat = null;
  let nats = [];
  let dieUsed = null;

  if (spec.expr) {
    // Damage-style roll: main expression may contain several dice
    const r = rollExpr(spec.expr);
    total += r.total;
    for (const d of r.detail) parts.push(d.rolls ? `${d.expr}(${d.rolls.join(",")})` : d.expr);
  } else if (spec.die) {
    dieUsed = shiftDie(spec.die, (spec.shift || 0) + (ctx.shift || 0));
    const count = spec.count || 1;
    for (let i = 0; i < count; i++) nats.push(rollDie(dieUsed));
    nat = nats[0];
    if (spec.best) nat = Math.max(...nats);
    total += spec.sumDice ? nats.reduce((a, b) => a + b, 0) : nat;
    parts.push(`d${dieUsed}(${nats.join(",")})`);
  }

  for (const [label, expr, key] of spec.dice || []) {
    if (!expr) continue;
    const r = rollExpr(expr);
    if (key) extras[key] = r.total;
    total += r.total;
    const rolled = r.detail.map((d) => (d.rolls ? `${d.expr}(${d.rolls.join(",")})` : d.expr)).join("");
    parts.push(`${rolled.startsWith("-") ? "" : "+"}${rolled} ${label}`);
  }
  for (const [label, value] of spec.mods || []) {
    const v = Number(value) || 0;
    if (!v) continue;
    total += v;
    parts.push(`${signed(v)} ${label}`);
  }
  if (ctx.mod) { total += ctx.mod; parts.push(`${signed(ctx.mod)} situational`); }
  if (ctx.mojo && spec.mojo) { total += ctx.mojo; parts.push(`+${ctx.mojo} Mojo`); }

  if (spec.minimum !== undefined) total = Math.max(spec.minimum, total);

  const res = {
    title: spec.title,
    kind: spec.kind,
    total,
    nat,
    nats,
    die: dieUsed,
    parts,
    extras,
    crit: false,
    fumble: false,
    autoFail: false,
    notes: [],
    tags: [],
    mojoEligible: !!spec.mojo,
  };
  if (dieUsed) {
    const threat = spec.threat !== undefined ? spec.threat : dieUsed;
    if (spec.count > 1 && spec.critOn) {
      res.crit = nats.some((n) => n >= spec.critOn);
      res.fumble = nats.every((n) => n === 1);
    } else {
      res.crit = spec.noCrit ? false : nat >= threat;
      res.fumble = spec.noFumble ? false : nat === 1;
    }
    if (spec.autoFail && nat <= spec.autoFail) { res.autoFail = true; res.tags.push("AUTO-FAIL"); }
  }
  if (spec.rollUnder !== undefined) {
    res.success = total <= spec.rollUnder;
    res.tags.push(res.success ? "SUCCESS" : "FAIL");
  }
  if (res.crit && spec.kind !== "damage") res.tags.unshift(spec.critLabel || "CRIT");
  if (res.fumble && spec.kind !== "damage") res.tags.unshift(spec.fumbleLabel || "NAT 1");
  if (spec.notes) res.notes.push(...spec.notes(res).filter(Boolean));
  res.follow = spec.follow ? spec.follow(res) : [];
  res.luck = spec.luck || {};
  return res;
}

/** Add luck burned after the roll. */
export function applyLuckBurn(res, points, c, opts = {}) {
  const ld = luckDie(c);
  let add = 0;
  let text;
  if (ld) {
    let sides = parseInt(ld.slice(1), 10);
    let bump = 0;
    if (opts.damage && c.cls === "specialist" && (c.sub === "commando" || c.sub === "slayer")) bump += 1;
    if (opts.unholy && c.cls === "specialist" && c.sub === "cryptraider") bump += 2;
    sides = shiftDie(sides, bump);
    const rolls = [];
    for (let i = 0; i < points; i++) rolls.push(rollDie(sides));
    add = rolls.reduce((a, b) => a + b, 0);
    text = `+${points}d${sides}(${rolls.join(",")}) Luck`;
  } else {
    add = points;
    text = `+${points} Luck`;
  }
  res.total += add;
  res.parts.push(text);
  res.luckBurned = (res.luckBurned || 0) + points;
  return res;
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

const critNote = (r) => (r.crit ? "Critical! Roll your crit die." : null);

export function abilityCheck(c, key, opts = {}) {
  const d = derive(c);
  const names = { str: "Strength", agi: "Agility", sta: "Stamina", per: "Personality", int: "Intelligence", lck: "Luck" };
  const mods = [[names[key], d.m[key]]];
  if (key !== "agi" && key !== "lck") mods.push(["Augur", augurBonus(c, "skill." + key)]);
  if (opts.perception) mods.push(["Augur (perception)", augurBonus(c, "skill.perception")]);
  if (c.cls === "athlete" && c.opts.athleteLuck && ["str", "agi", "sta"].includes(key)) mods.push(["Luck", d.m.lck]);
  if (d.species === "halfelf" && key === "per" && d.lvl === 0) mods.push(["Half-elf", 1]);
  const dice = [];
  if (c.cls === "athlete" && opts.athletics && d.lvl > 0) dice.push(["training", "1" + d.row.train, "train"]);
  if (c.cls === "halfelf" && key === "per" && d.lvl > 0) dice.push(["charisma", d.row.cha, "cha"]);
  const shift = c.cls === "halforc" && key === "per" && d.lvl < 3 && opts.realWorld ? -1 : 0;
  return {
    title: `${names[key]} check${opts.athletics ? " (athletics)" : ""}`,
    kind: "check",
    die: opts.untrained ? 10 : 20,
    shift,
    mods,
    dice,
    mojo: true,
    noCrit: false,
  };
}

export function luckCheck(c) {
  return { title: "Luck check", kind: "luck", die: 20, mods: [], rollUnder: Number(c.abil.lck.cur) || 0, noCrit: true, noFumble: true, notes: () => [`Roll equal to or under Luck ${c.abil.lck.cur}.`] };
}

export function saveRoll(c, key) {
  const d = derive(c);
  const s = d.saves[key];
  const label = { ref: "Reflex", fort: "Fortitude", will: "Willpower" }[key];
  const ab = { ref: "Agility", fort: "Stamina", will: "Personality" }[key];
  const mods = [["base", s.base], [ab, s.ab], ["Augur", s.augur]];
  if (s.extra) mods.push(["Luck (half-elf)", s.extra]);
  return { title: `${label} save`, kind: "save", die: 20, mods, mojo: false, noCrit: true };
}

export function initiative(c, opts = {}) {
  const d = derive(c);
  const mods = [["Agility", d.m.agi], ["Augur", augurBonus(c, "init")]];
  if (d.sub && d.sub.initFromRef && d.lvl > 0) mods.push(["Cunning (Ref)", d.row.ref]);
  return { title: "Initiative", kind: "init", die: opts.twoHanded ? 16 : 20, mods, noCrit: true, noFumble: true };
}

export function grandstand(c, opts = {}) {
  const d = derive(c);
  const mods = [["Personality", d.m.per], ["level", d.lvl], ["Fame", d.fame.bonus], ["Augur", augurBonus(c, "skill.per")]];
  const dice = [];
  if (c.cls === "halfelf" && d.lvl > 0) dice.push(["charisma", d.row.cha]);
  let shift = d.fame.dice;
  if (d.sub && d.sub.grandstandDice) shift += d.sub.grandstandDice;
  const dc = Number(opts.dc) || 14;
  return {
    title: `Grandstanding (Crowd DC ${dc})`,
    kind: "grandstand",
    die: 20,
    shift,
    mods,
    dice,
    mojo: true,
    notes: (r) => [r.total >= dc ? (r.total >= 20 ? "Crowd goes wild! +1 Fame (judge may award +2 for 20+)." : "Success: +1 Fame (once in combat, once just after).") : "The crowd isn't buying it."],
    follow: (r) => (r.total >= dc ? [{ label: "+1 Fame", action: "fame", n: 1 }].concat(r.total >= 20 ? [{ label: "+2 Fame", action: "fame", n: 2 }] : []) : []),
  };
}

export function knowledge(c) {
  const d = derive(c);
  return {
    title: "Xcrawl knowledge",
    kind: "check",
    die: 20,
    mods: [["Intelligence", d.m.int], ["level", d.lvl], ["Augur", augurBonus(c, "skill.int")]],
    mojo: true,
    notes: (r) => [r.total >= 25 ? "DC 25+: secret histories and private knowledge." : r.total >= 20 ? "DC 20: extremely rare crawlers, DJs and monsters." : r.total >= 15 ? "DC 15: rare crawlers & monsters, weaknesses of average monsters." : r.total >= 10 ? "DC 10: most crawlers & DJs, average monsters." : r.total >= 5 ? "DC 5: famous crawlers, common monsters." : "Nothing comes to mind."],
  };
}

export function skillRoll(c, skill) {
  const d = derive(c);
  if (skill.die) {
    const sides = parseInt(String(skill.die).replace(/^1?d/, ""), 10);
    const spec = {
      title: skill.name,
      kind: skill.key === "turn" ? "turn" : "spell",
      die: sides,
      mods: [[skill.abKey === "per" ? "Personality" : "Intelligence", skill.ab]],
      mojo: true,
    };
    if (skill.key === "turn") {
      spec.autoFail = Number(c.disapproval) || 1;
      spec.notes = (r) => [r.autoFail ? "Within disapproval range: the turn fails. Pray hours equal to disapproval before trying again." : "Compare to Table 4-4: Turn Unholy (p.100). A failed check adds 1 disapproval."];
      spec.follow = () => [{ label: "Failed: +1 disapproval", action: "disapproval", n: 1 }];
    } else {
      spec.notes = () => ["Spell check from a scroll. DC as per the spell. No spellburn."];
      spec.mods.push(["Augur", augurBonus(c, "spell")]);
    }
    return spec;
  }
  const mods = [["skill", skill.bonus]];
  if (skill.ab) mods.push([{ agi: "Agility", int: "Intelligence", per: "Personality", str: "Strength" }[skill.abKey], skill.ab]);
  if (skill.acp) mods.push(["armour", skill.acp]);
  if (skill.aug) mods.push(["Augur", skill.aug]);
  const spec = { title: skill.name, kind: "skill", die: 20, mods, mojo: true };
  if (skill.key === "disable") spec.notes = (r) => [r.nat === 1 ? "Natural 1: the trap is triggered!" : null];
  if (skill.key === "poison") spec.notes = () => ["Safety check DC 10 each time poison is applied."];
  return spec;
}

/* ---------------- Combat ---------------- */

function weaponAbility(c, d, w) {
  if (w.agility) return ["Agility", d.m.agi];
  if (w.kind === "missile") return ["Agility", d.m.agi];
  if (w.kind === "thrown") return ["Agility", d.m.agi];
  return ["Strength", d.m.str];
}

/**
 * opts: { adIndex, backstab, deed, unholy, disrespected, closeRange, wild, label }
 */
export function attackRoll(c, w, opts = {}) {
  const d = derive(c);
  const lvl = d.lvl;
  const ad = d.ad;
  const idx = Math.min(opts.adIndex || 0, ad.length - 1);
  let die = opts.die || ad[idx] || 20;
  let shift = 0;
  if (!w.trained && lvl > 0) shift -= 1;
  const mods = [];
  const dice = [];
  if (d.deed) dice.push(["deed", "1" + d.deed.replace(/^d/, "d"), "deed"]);
  else mods.push(["attack", d.atk]);
  mods.push(weaponAbility(c, d, w));
  const isMissile = w.kind !== "melee";
  mods.push(["Augur", augurBonus(c, isMissile ? "attack.missile" : "attack.melee")]);
  if (w.start && augurBonus(c, "weapon0")) mods.push(["Augur (weapon)", augurBonus(c, "weapon0")]);
  if (Number(w.bonus)) mods.push(["weapon", Number(w.bonus)]);
  if (c.cls === "dwarf" && w.lucky && lvl > 0) mods.push(["lucky weapon", Number(c.augurMod) || 0]);
  if (opts.backstab) {
    const bs = d.skills.find((s) => s.key === "backstab");
    if (bs) mods.push(["backstab", bs.bonus + (c.cls === "halfelf" ? d.arm.acp : 0)]);
  }
  if (opts.wild && c.cls === "halforc" && c.opts.wildLuck) mods.push(["Luck", d.m.lck]);
  if (opts.unarmedLuck && c.cls === "brawler" && c.opts.unarmedLuck) mods.push(["Luck", d.m.lck]);
  if (opts.extraLuck) mods.push(["Luck", d.m.lck]);
  if (opts.extraMods) mods.push(...opts.extraMods);

  let threat;
  if (opts.unholy && c.cls === "messenger" && lvl > 0) threat = d.row.unholyThreat - (20 - shiftDie(die, shift));
  if (opts.wild && c.cls === "halforc") threat = d.row.wild - (20 - shiftDie(die, shift));
  if (threat !== undefined) threat = Math.max(2, threat);

  const title = opts.label || `${w.name} attack${opts.backstab ? " (backstab)" : ""}${opts.wild ? " (wild)" : ""}`;
  return {
    title,
    kind: "attack",
    die,
    shift: shift + (opts.dieShift || 0),
    mods,
    dice,
    threat,
    mojo: true,
    count: opts.count,
    critOn: opts.critOn,
    notes: (r) => {
      const n = [];
      if (d.deed && opts.deed) n.push(r.extras.deed >= 3 ? `Deed die ${r.extras.deed}: Mighty Deed succeeds if the attack hits — "${opts.deed}"` : `Deed die ${r.extras.deed}: the Mighty Deed fails.`);
      if (opts.backstab) n.push("Backstab: a hit is an automatic critical.");
      if (!w.trained && lvl > 0) n.push("Untrained weapon: -1d.");
      if (r.fumble) n.push(`Fumble! Roll ${d.arm.fumble} on Table 4-2.`);
      if (r.crit) n.push("Critical hit!");
      return n;
    },
    follow: (r) => {
      const f = [{ label: "Damage", make: () => damageRoll(c, w, { ...opts, deedValue: r.extras.deed, crit: r.crit }) }];
      if (r.crit || opts.backstab) f.push({ label: "Crit", make: () => critRoll(c, { ...opts, nat20: r.nat === 20 }) });
      else f.push({ label: "Crit", make: () => critRoll(c, { ...opts, nat20: r.nat === 20 }), quiet: true });
      if (r.fumble) f.push({ label: "Fumble", make: () => fumbleRoll(c) });
      return f;
    },
    luck: { unholy: !!opts.unholy },
  };
}

export function damageRoll(c, w, opts = {}) {
  const d = derive(c);
  let expr = opts.backstab && w.bs ? w.bs : w.dmg || "1d4";
  if (opts.expr) expr = opts.expr;
  if (opts.backstab && c.cls === "specialist" && c.sub === "slayer" && w.kind === "melee" && !(w.bs && /1d10/.test(w.bs))) expr = shiftExpr(expr, 1);
  const mods = [];
  const dice = [];
  const isMissile = w.kind === "missile";
  const strApplies = w.kind === "melee" || (w.hurl && opts.closeRange) || w.kind === "thrown" && opts.closeRange;
  if (w.agility) mods.push(["Agility", d.m.agi]);
  else if (strApplies) mods.push(["Strength", d.m.str]);
  if (opts.deedValue !== undefined && opts.deedValue !== null) mods.push(["deed", opts.deedValue]);
  else if (opts.deedExpr) dice.push(["deed", opts.deedExpr]);
  mods.push(["Augur", augurBonus(c, isMissile ? "damage.missile" : "damage.melee")]);
  if (w.start && augurBonus(c, "weapon0")) mods.push(["Augur (weapon)", augurBonus(c, "weapon0")]);
  if (Number(w.bonus)) mods.push(["weapon", Number(w.bonus)]);
  if (opts.disrespected && c.cls === "jammer" && d.lvl > 0) dice.push(["devastating", d.row.devastate]);
  if (opts.unholy && c.cls === "messenger" && w.favored && d.lvl > 0) dice.push(["scourge", d.row.scourge]);
  if (opts.wild && c.cls === "halforc" && c.opts.wildLuck) mods.push(["Luck", d.m.lck]);
  if (opts.unarmedLuck && c.cls === "brawler" && c.opts.unarmedLuck) mods.push(["Luck", d.m.lck]);
  if (opts.extraLuck) mods.push(["Luck", d.m.lck]);
  if (opts.extraDmg) dice.push(...opts.extraDmg);
  return {
    title: `${opts.dmgLabel || w.name} damage${opts.backstab ? " (backstab)" : ""}`,
    kind: "damage",
    expr,
    mods,
    dice,
    minimum: 1,
    luck: { damage: true, unholy: !!opts.unholy },
  };
}

export function critRoll(c, opts = {}) {
  const d = derive(c);
  let [die, table] = [d.critDie, d.critTable];
  if (opts.grapple && c.cls === "athlete" && d.lvl > 0) { die = CLASSES.athlete.grappleCrit[d.lvl - 1].die; table = "Athlete Grapple (p.89)"; }
  if (opts.backstab && c.cls === "specialist" && d.sub && d.sub.backstabTable) table = d.sub.backstabTable;
  if (opts.backstab && c.cls === "halfelf" && !opts.nat20) die = shiftExpr(die, -2);
  if (opts.unholy && c.cls === "specialist" && c.sub === "cryptraider") { die = shiftExpr(die, 1); table = "III"; }
  const luck = d.m.lck;
  const mods = [["Luck", luck], ["Augur", augurBonus(c, "crit")]];
  if (augurBonus(c, "double")) mods.push(["Luck (Cupid)", luck]);
  return {
    title: `Critical hit (Table ${table})`,
    kind: "crit",
    expr: die,
    mods,
    notes: () => [`Look up the result on Crit Table ${table} (p.84).`],
  };
}

export function fumbleRoll(c) {
  const d = derive(c);
  const luck = d.m.lck;
  const mods = [["Luck (reversed)", -luck]];
  if (augurBonus(c, "double")) mods.push(["Luck (Cupid)", -luck]);
  return { title: `Fumble (${d.arm.fumble})`, kind: "fumble", expr: "1" + d.arm.fumble, mods, notes: () => ["Look up the result on Table 4-2: Fumbles (p.83). Lower is better."] };
}

/* ---------------- Class specials ---------------- */

export function grappleCheck(c, opts = {}) {
  const d = derive(c);
  const die = d.ad[opts.adIndex || 0] || 20;
  const gc = d.lvl > 0 ? CLASSES.athlete.grappleCrit[d.lvl - 1] : { threat: 20 };
  return {
    title: `Grapple check${opts.technique ? ` — ${opts.technique}` : ""}`,
    kind: "attack",
    die,
    mods: [["Strength", d.m.str], ["Augur", augurBonus(c, "attack.melee")]],
    dice: [["training", "1" + d.row.train, "train"]],
    threat: Math.max(2, gc.threat - (20 - die)),
    mojo: true,
    critLabel: "GRAPPLE CRIT",
    notes: (r) => [
      opts.technique ? (r.extras.train >= 3 ? `Training die ${r.extras.train}: the technique works if you win the grapple.` : `Training die ${r.extras.train}: the technique fails.`) : null,
      "Opposed by the target's grapple check. Each factor of 4 you win by moves the foe an extra 5'.",
    ],
    follow: (r) => [
      { label: "Grapple damage", make: () => ({ title: "Grapple damage", kind: "damage", expr: "1d4", mods: [["Strength", d.m.str], ["training", r.extras.train], ["Augur", augurBonus(c, "damage.melee")]], minimum: 1, luck: { damage: true } }) },
      { label: "Grapple crit", make: () => critRoll(c, { grapple: true }), quiet: !r.crit },
    ],
  };
}

export function performance(c, mode = "performance") {
  const d = derive(c);
  const mods = [["Personality", d.m.per], ["level", d.lvl], ["Luck", d.m.lck], ["Augur", augurBonus(c, "skill.per")]];
  const titles = { performance: "Performance check", disrespect: "Disrespect", lionize: "Lionize" };
  return {
    title: titles[mode],
    kind: "skill",
    die: 20,
    mods,
    mojo: true,
    notes: (r) => {
      if (mode === "disrespect") return [`Target makes a Will save vs DC ${r.total}. On a failure it is disrespected for ${Math.max(1, d.lvl + d.m.per)} rounds: ${d.row.disrespect} to attacks, spell checks, damage and Will saves; your hits add ${d.row.devastate} devastating damage.`];
      if (mode === "lionize") return [r.nat === 1 ? LIONIZE[0][2] : `${lookup(LIONIZE, r.total)} Lasts ${d.lvl} round${d.lvl === 1 ? "" : "s"}.`];
      return [];
    },
  };
}

export function drawAgro(c) {
  const d = derive(c);
  const mods = [["Personality", d.m.per], ["level", d.lvl]];
  if (c.opts.agroLuck) mods.push(["Luck", d.m.lck]);
  return {
    title: "Draw agro",
    kind: "skill",
    die: 20,
    mods,
    mojo: true,
    notes: (r) => [`Target makes a Will save vs DC ${r.total}. On a failure it must attack you next action, or take ${d.lvl >= 5 ? "-2d" : "-1d"} on its combat actions next round.`],
  };
}

const HOLY = {
  holy: "Holy Act",
  lay: "Lay on Hands",
  bless: "Bless",
  turn: "Turn Unholy",
  summon: "Summon Weapon",
  aid: "Divine Aid",
};
export function holyAct(c, act = "holy") {
  const d = derive(c);
  const mods = [["Personality", d.m.per], ["level", d.lvl]];
  if (act === "lay") mods.push(["Luck", d.m.lck]);
  const dis = Number(c.disapproval) || 1;
  return {
    title: HOLY[act],
    kind: "holy",
    die: 20,
    mods,
    mojo: true,
    noCrit: false,
    autoFail: act === "aid" ? dis + 10 : dis,
    notes: (r) => {
      const n = [];
      if (r.autoFail) n.push(`Natural ${r.nat} is within your disapproval range: the act fails. Roll ${r.nat}d4 − Luck on Table 7-7: Deity Disapproval.`);
      else if (act === "lay") {
        const cols = lookup(LAY_ON_HANDS, r.total);
        n.push(cols && cols.some(Boolean) ? "Dice healed — " + LAY_ON_HANDS_COLS.map((k, i) => `${k}: ${cols[i] || "fail"}`).join(" · ") : "Fail.");
      } else if (act === "bless") n.push(lookup(BLESSING, r.total));
      else if (act === "summon") n.push(lookup(SUMMON_WEAPON, r.total) + ` Lasts ${d.lvl} turn${d.lvl === 1 ? "" : "s"}.`);
      else if (act === "turn") n.push("Compare to Table 4-4: Turn Unholy Result by HD (p.100).");
      else if (act === "aid") n.push(r.total >= 20 ? "20+: a powerful miracle." : r.total >= 15 ? "15+: a useful but limited miracle." : r.total >= 10 ? "10+: the smallest of miracles." : "No miracle.");
      if (act === "aid") n.push("Requesting Divine Aid adds 10 disapproval.");
      return n;
    },
    follow: (r) => {
      const f = [];
      if (r.autoFail) f.push({ label: `Disapproval (${r.nat}d4)`, make: () => ({ title: "Deity disapproval (Table 7-7)", kind: "check", expr: `${r.nat}d4`, mods: [["Luck", -d.m.lck]], notes: () => ["Look up Table 7-7: Deity Disapproval (p.134)."] }) });
      const failedByTable = (act === "lay" || act === "bless" || act === "summon") && r.total <= 11;
      if (r.autoFail || failedByTable) f.push({ label: "+1 disapproval", action: "disapproval", n: 1, auto: true });
      else f.push({ label: "Failed: +1 disapproval", action: "disapproval", n: 1 });
      if (act === "aid") f.push({ label: "+10 disapproval", action: "disapproval", n: 10, auto: true });
      if (act === "turn" && !r.autoFail) f.push({ label: "Turned! +1 Mojo", action: "mojo", n: 1 });
      return f;
    },
  };
}

export function spellCheck(c, spell, opts = {}) {
  const d = derive(c);
  const caster = d.caster;
  if (!caster) return null;
  if (caster.type === "messenger") return holyAct(c, "holy");
  const mods = [["Personality", d.m.per]];
  const dice = [];
  if (caster.type === "blaster") dice.push(["blaster die", "1" + d.row.bdie]);
  else mods.push(["caster level", d.lvl]);
  if (caster.type === "trickster") mods.push(["Luck", d.m.lck]);
  mods.push(["armour", d.arm.acp]);
  mods.push(["Augur", augurBonus(c, "spell")]);
  if (opts.spellburn) mods.push(["spellburn", Number(opts.spellburn)]);
  const lvl = spell ? Number(spell.level) || 1 : 1;
  return {
    title: spell && spell.name ? `${spell.name} (spell check)` : "Spell check",
    kind: "spell",
    die: 20,
    mods,
    dice,
    mojo: true,
    noCrit: false,
    notes: (r) => {
      const n = [];
      if (r.nat === 1) n.push("Natural 1: possible corruption or misfire — roll on the spell's tables.");
      else if (r.total < 10 + 2 * lvl) n.push(`Below DC ${10 + 2 * lvl}: the spell fails${caster.type === "blaster" || caster.type === "halfelf" ? " and may be lost for the day" : ""}.`);
      if (r.nat === 20) n.push("Natural 20!");
      if (spell && spell.merc) n.push(`Mercurial: ${spell.merc}`);
      return n;
    },
    follow: (r) => (r.nat === 1 || r.total < 10 + 2 * lvl ? [{ label: "Mark lost", action: "spellLost", spellId: spell && spell.id }] : []),
  };
}

/* Two-fisted healing, shield bash, free unarmed attack, open-hand, wild attack */
export function specialAttacks(c) {
  const d = derive(c);
  const out = [];
  const lvl = d.lvl;
  if (lvl === 0) return out;
  const unarmed = { name: "Unarmed", dmg: c.cls === "brawler" ? d.row.unarmed : "1d3", kind: "melee", trained: true, bonus: 0 };
  if (c.cls === "brawler") {
    out.push({ label: "Free unarmed strike (d14)", make: () => attackRoll(c, unarmed, { die: 14, label: "Free unarmed strike", unarmedLuck: true }) });
    out.push({ label: "Open hand: two strikes (d16)", make: () => openHand(c, unarmed) });
  }
  if (c.cls === "dwarf" && c.shield) {
    const shield = { name: "Shield bash", dmg: "1d3", kind: "melee", trained: true, bonus: 0 };
    out.push({ label: "Shield bash (d14)", make: () => attackRoll(c, shield, { die: 14, label: "Shield bash" }) });
  }
  if (c.cls === "messenger") {
    const w = c.weapons.find((x) => x.kind === "melee" && !x.twoHanded) || { name: "Weapon", dmg: "1d4", kind: "melee", trained: true, bonus: 0 };
    out.push({ label: `Two-fisted healing strike (d14, ${w.name})`, make: () => attackRoll(c, w, { die: 14, label: `Two-fisted healing: ${w.name}`, extraLuck: true }) });
  }
  if (c.cls === "halforc") {
    const w = c.weapons.find((x) => x.kind === "melee");
    if (w) out.push({ label: `Wild attack (${w.name})`, make: () => attackRoll(c, w, { wild: true }) });
  }
  return out;
}

function openHand(c, unarmed) {
  const spec = attackRoll(c, unarmed, { die: 16, label: "Open-hand strikes (2d16)", unarmedLuck: true });
  spec.count = 2;
  spec.critOn = 16;
  spec.sumDice = false;
  const baseNotes = spec.notes;
  spec.notes = (r) => [`Two strikes: ${r.nats.map((n) => n + (r.total - r.nat)).join(" and ")} to hit. Crit (not auto-hit) on a 16; fumble only on double 1.`, ...baseNotes(r).filter((x) => !/Critical hit/.test(x))];
  return spec;
}

export function hpLevelRoll(c) {
  const d = derive(c);
  const hd = c.cls === "specialist" && d.sub ? d.sub.hd : d.def.hd;
  return { title: `Hit points (d${hd})`, kind: "hp", expr: `1d${hd}`, mods: [["Stamina", d.m.sta], ["Augur", augurBonus(c, "hp")]], minimum: 1, follow: (r) => [{ label: `Add ${r.total} to max HP`, action: "addhp", n: r.total }] };
}

export function freeRoll(expr, title) {
  return { title: title || expr, kind: "free", expr, mods: [] };
}

export { effectiveLevel, classRow };
