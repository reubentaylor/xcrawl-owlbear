// Import and export in the Purple Sorcerer Xcrawl Classics generator's JSON format:
// { "characters": [ { "class": "...", "specialty": "...", "level": 1, ... } ] }
import { AUGURS, OCCUPATIONS, SPECIALIST_SUBS, WEAPONS, abilityMod, speciesFromOccupation } from "./data.js";
import { blankCharacter, newWeapon, derive, augurBonus, hitDie, randomName, uid } from "./rules.js";

// Field order exactly as the generator writes it
export const PS_KEYS = [
  "class", "specialty", "level", "alignment", "occupation",
  "strengthScore", "strengthMod", "agilityScore", "agilityMod", "staminaScore", "staminaMod",
  "personalityScore", "personalityMod", "intelligenceScore", "intelligenceMod", "luckScore", "luckMod",
  "armorClass", "hitPoints", "speed", "initiative", "saveReflex", "saveFort", "saveWill",
  "hitDice", "attack", "actionDice", "critDie", "critTable", "weapon",
  "attackModMelee", "attackDamageMelee", "attackModRanged", "attackDamageRanged",
  "armor", "equipment", "tradeGood", "pack", "luckySign", "languages", "spellsKnown", "maxSpellLevel",
  "skills", "classAbilities", "notes", "prizes", "prizeWeapon", "fame", "fameMod", "wealth", "wealthTitle",
];
// Key used to carry the extension-only parts of a sheet (name, current HP, Mojo, spells…)
export const EXTRA_KEY = "xcrawlOwlbear";

const CLASS_TO_PS = { zero: "0-level", athlete: "Athlete", blaster: "Blaster", brawler: "Brawler", jammer: "Jammer", messenger: "Messenger", specialist: "Specialist", dwarf: "Dwarf", gnome: "Gnome", halfelf: "Half-elf", halforc: "Half-orc" };
const SUB_TO_PS = { acrobat: "Acrobat", commando: "Commando", criminal: "Criminal", scout: "Scout", cryptraider: "Crypt Raider", mechanic: "Dwarf Mechanic", trickster: "Elf Trickster", slayer: "Half-orc Slayer", halfling: "Halfling Rogue" };
const ALIGN = { L: "Lawful", N: "Neutral", C: "Chaotic" };
// Purple Sorcerer armour names <-> corebook Table 3-3 names
const ARMOR_TO_PS = { "Unarmored": "Unarmored", "Armored Jacket": "Armored jacket", "Leather": "Leather armor", "Chainmail Shirt": "Chainmail shirt", "Chainmail": "Chain mail", "Composite Sport, Light": "LCS armor", "Composite Sports, Heavy": "HCS armor" };
// Book wording of each augur's lucky roll, as the generator prints it
const AUGUR_ROLL = [null, "All Attack Rolls", "Melee Attack Rolls", "Personality-based Skill Checks", "Missile Fire Damage Rolls", "Strength-based Skill Checks", "Stamina-based Skill Checks", "Missile Fire Attack Rolls", "Initiative Checks", "Reflex Saving Throws", "Critical Chart Checks", "Perception Skill Checks", "All Saving Throws", "Intelligence-based Skill Checks", "Spell Checks", "Number of Languages", "Armor Class", "Attack + Damage For Chosen Level 0 Weapon", "Melee Damage Rolls", "Fumbles", "Willpower Saving Throws", "All Damage Rolls", "Hit Points (applies at each level)", "Speed (each +/- 1 = +/- 5' speed)", "Fortitude Saves"];

const OCC_PREFIXES = ["Cashier", "Clerk", "Contractor", "Dwarf", "Elf", "Farmer", "Gnome", "Half-elf", "Half-orc", "Halfling", "Office worker"];

const signed = (n) => (Number(n) >= 0 ? `+${Number(n)}` : `${Number(n)}`);
const lc = (s) => String(s || "").trim().toLowerCase();

/* ---------------- detection ---------------- */
export function isPurpleSorcerer(json) {
  const list = Array.isArray(json) ? json : json && Array.isArray(json.characters) ? json.characters : json ? [json] : [];
  return list.length > 0 && list.every((c) => c && typeof c === "object" && "strengthScore" in c && "luckySign" in c);
}
export function characterList(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.characters)) return json.characters;
  return json ? [json] : [];
}

/* ---------------- occupations ---------------- */
function occFromPS(s) {
  let o = String(s || "").trim();
  if (/^College /.test(o) && o !== "College student") o = o.replace(/^College /, "Collegiate, ");
  for (const p of OCC_PREFIXES) {
    if (o.startsWith(p + "-")) { o = p + ", " + o.slice(p.length + 1); break; }
  }
  const known = OCCUPATIONS.slice(1).find((x) => lc(x[0]) === lc(o));
  return known ? known[0] : o;
}
function occToPS(s) {
  let o = String(s || "").trim();
  if (/^Collegiate, /.test(o)) return o.replace(/^Collegiate, /, "College ");
  for (const p of OCC_PREFIXES) if (o.startsWith(p + ", ")) return p + "-" + o.slice(p.length + 2);
  return o;
}

/* ---------------- import ---------------- */
export function fromPurpleSorcerer(o) {
  if (o && o[EXTRA_KEY] && typeof o[EXTRA_KEY] === "object" && o[EXTRA_KEY].abil) {
    // Saved by this extension: restore the full sheet.
    return { ...o[EXTRA_KEY], id: uid() };
  }
  const c = blankCharacter();
  const clsName = lc(o.class);
  const clsKey = Object.keys(CLASS_TO_PS).find((k) => lc(CLASS_TO_PS[k]) === clsName);
  const level = Number(o.level) || 0;
  c.cls = level === 0 || !clsKey ? "zero" : clsKey;
  c.level = c.cls === "zero" ? 0 : level;
  if (c.cls === "specialist") c.sub = Object.keys(SUB_TO_PS).find((k) => lc(SUB_TO_PS[k]) === lc(o.specialty)) || "";
  c.alignment = (String(o.alignment || "N")[0] || "N").toUpperCase();
  c.occupation = occFromPS(o.occupation);
  const psOccupation = String(o.occupation || "");
  c.species = speciesFromOccupation(c.occupation);
  const sub = c.sub && SPECIALIST_SUBS[c.sub];
  if (sub && sub.species !== "human") c.species = sub.species;
  const map = { str: "strength", agi: "agility", sta: "stamina", per: "personality", int: "intelligence", lck: "luck" };
  for (const [k, n] of Object.entries(map)) {
    const v = Number(o[`${n}Score`]) || 10;
    c.abil[k] = { max: v, cur: v };
  }
  c.hp = { max: Number(o.hitPoints) || 1, cur: Number(o.hitPoints) || 1 };

  // "Late July - Invoked of the Kharites (Spell Checks) (+0)"
  const sign = String(o.luckySign || "");
  const ai = AUGURS.findIndex((a) => a && sign.toLowerCase().includes(a.name.toLowerCase()));
  if (ai > 0) c.augur = ai;
  const am = sign.match(/\(([+\-]\d+)\)\s*$/);
  c.augurMod = am ? Number(am[1]) : abilityMod(c.abil.lck.max);

  // Armour: "Chainmail shirt, shield +4"
  const armor = String(o.armor || "");
  c.shield = /shield/i.test(armor);
  const base = armor.replace(/,?\s*shield/i, "").replace(/\s*[+\-]\d+\s*$/, "").trim();
  const armorKey = Object.keys(ARMOR_TO_PS).find((k) => lc(ARMOR_TO_PS[k]) === lc(base)) || (base ? base.replace(/\b\w/g, (x) => x.toUpperCase()) : "Unarmored");
  c.armor = armorKey;

  // Weapons: "Spear 1d8; Unarmed 1d4"
  c.weapons = String(o.weapon || "").split(";").map((s) => s.trim()).filter(Boolean).map((s, i) => {
    const m = s.match(/^(.*?)\s+(\d*d\d+(?:[+\-]\d+)?)$/);
    const name = m ? m[1] : s;
    const known = WEAPONS.find((w) => lc(w[0]) === lc(name) || lc(w[0]).replace(/[^a-z]/g, "") === lc(name).replace(/[^a-z]/g, ""));
    const w = newWeapon(known ? known[0] : name);
    if (m) w.dmg = m[2].startsWith("d") ? "1" + m[2] : m[2];
    w.start = i === 0;
    w.trained = true;
    return w;
  });

  c.languages = o.languages || "English";
  c.equipment = [o.equipment && `Equipment: ${o.equipment}`, o.tradeGood && `Trade good: ${o.tradeGood}`, o.pack].filter(Boolean).join("\n");
  c.notes = String(o.notes || "");
  c.fame = Number(o.fame) || 0;
  c.wealth = Number(o.wealth) || 0;
  c.prizes = [o.prizes, o.prizeWeapon].filter(Boolean).join("\n");
  c.ps = { equipment: o.equipment || "", tradeGood: o.tradeGood || "", pack: o.pack || "", prizeWeapon: o.prizeWeapon || "", wealthTitle: o.wealthTitle || "", importedEquipment: c.equipment, importedPrizes: c.prizes, occupation: psOccupation, importedOccupation: c.occupation };
  if (c.cls !== "zero") c.mojo = 1;
  if (c.cls === "blaster") c.spells = [{ id: uid(), name: "Spellweaver Blast", level: 1, lost: false }];
  if (c.cls === "halfelf" || c.sub === "trickster") c.spells = [{ id: uid(), name: "Cantrip", level: 1, lost: false }];
  c.name = `${randomName()}`;
  c.xp = c.cls === "zero" ? 0 : [0, 10, 50, 110, 190, 290, 410, 550, 710, 890, 1090][c.level] || 0;
  return c;
}

/* ---------------- export ---------------- */
function classAbilities(c, d) {
  if (!d.lvl) return "";
  const r = d.row;
  const one = (x) => (String(x).startsWith("d") ? "1" + x : String(x));
  switch (c.cls) {
    case "blaster": return `Blaster Die: ${one(r.bdie)}`;
    case "gnome": return `Team Mascot: ${r.mascot}`;
    case "jammer": return `Disrespect: ${r.disrespect}; Devastating Attack: +${r.devastate}`;
    case "messenger": return `Scourge: ${r.scourge}; Crit vs. Evil: ${r.unholyThreat === 20 ? "20" : `${r.unholyThreat}-20`}`;
    case "athlete": {
      const gc = d.def.grappleCrit[d.lvl - 1];
      return `Training Die: ${one(r.train)}; Scramble: ${signed(r.scramble)}; Grapple Crit: ${gc.threat === 20 ? "20" : `${gc.threat}-20`} (${gc.die})`;
    }
    case "halforc": return `Wild Attack: ${r.wild}-20`;
    case "halfelf": return `Charisma Die: ${r.cha}`;
    case "specialist": return `Luck Die: ${one(r.luckDie)}`;
    default: return "";
  }
}

export function toPurpleSorcerer(c, { extras = true } = {}) {
  const d = derive(c);
  const ps = c.ps || {};
  const m = d.m;
  const score = (k) => Number(c.abil[k].cur) || 0;
  const attack = d.deed ? (c.cls === "halforc" ? `1${d.deed}` : `+1${d.deed}`) : signed(d.atk);
  const armorName = ARMOR_TO_PS[d.arm.name] || d.arm.name;
  let armor;
  if (d.arm.name === "Unarmored") armor = c.shield ? "Shield +1" : "Unarmored";
  else armor = `${armorName}${c.shield ? ", shield" : ""} ${signed(d.arm.ac - (c.shield ? 1 : 0))}`; // generator shows the armour's own bonus
  const skills = d.skills.map((s) => `${s.key === "turn" ? "Turn Undead" : s.name}: ${s.die ? s.die : signed(s.bonus + s.ab + s.aug)}`).join("; ");
  const augur = AUGURS[c.augur];
  const out = {
    class: CLASS_TO_PS[c.cls] || "0-level",
    specialty: c.cls === "specialist" ? SUB_TO_PS[c.sub] || "" : "",
    level: d.lvl,
    alignment: ALIGN[c.alignment] || "Neutral",
    occupation: c.ps && c.occupation === ps.importedOccupation ? ps.occupation : occToPS(c.occupation),
    strengthScore: score("str"), strengthMod: m.str,
    agilityScore: score("agi"), agilityMod: m.agi,
    staminaScore: score("sta"), staminaMod: m.sta,
    personalityScore: score("per"), personalityMod: m.per,
    intelligenceScore: score("int"), intelligenceMod: m.int,
    luckScore: score("lck"), luckMod: m.lck,
    armorClass: d.ac,
    hitPoints: Number(c.hp.max) || 0,
    speed: d.speed,
    initiative: d.init,
    saveReflex: d.saves.ref.total,
    saveFort: d.saves.fort.total,
    saveWill: d.saves.will.total,
    hitDice: `${Math.max(1, d.lvl)}d${d.lvl ? hitDie(c) : 4}`,
    attack,
    actionDice: d.row.ad,
    critDie: d.critDie,
    critTable: d.critTable,
    weapon: c.weapons.map((w) => `${w.name} ${w.dmg}`).join("; "),
    attackModMelee: m.str + augurBonus(c, "attack.melee"),
    attackDamageMelee: m.str + augurBonus(c, "damage.melee"),
    attackModRanged: m.agi + augurBonus(c, "attack.missile"),
    // The generator adds Strength to ranged damage when the first weapon is a sling
    attackDamageRanged: (c.weapons[0] && /sling/i.test(c.weapons[0].name) ? m.str : 0) + augurBonus(c, "damage.missile"),
    armor,
    // Unchanged since import: give back the generator's three separate fields; otherwise the sheet's text.
    equipment: c.ps && c.equipment === ps.importedEquipment ? ps.equipment : String(c.equipment || ""),
    tradeGood: c.ps && c.equipment === ps.importedEquipment ? ps.tradeGood || "" : "",
    pack: c.ps && c.equipment === ps.importedEquipment ? ps.pack || "" : "",
    luckySign: augur ? `${augur.date} - ${augur.name} (${AUGUR_ROLL[c.augur]}) (${signed(c.augurMod)})` : "",
    languages: c.languages || "English",
    spellsKnown: d.caster && d.caster.known !== undefined ? String(d.caster.known) : "",
    maxSpellLevel: d.caster && (c.cls === "blaster" || c.cls === "halfelf") ? String(d.caster.maxLvl) : "",
    skills,
    classAbilities: classAbilities(c, d),
    notes: String(c.notes || ""),
    prizes: c.ps && c.prizes === ps.importedPrizes ? (ps.importedPrizes || "").split("\n").filter((x) => x !== ps.prizeWeapon).join("\n") : String(c.prizes || ""),
    prizeWeapon: c.ps && c.prizes === ps.importedPrizes ? ps.prizeWeapon || "" : "",
    fame: Number(c.fame) ? String(c.fame) : "",
    fameMod: Number(c.fame) > 20 ? d.fame.label : "",
    wealth: Number(c.wealth) ? String(c.wealth) : "",
    wealthTitle: ps.wealthTitle || "",
  };
  const ordered = {};
  for (const k of PS_KEYS) ordered[k] = out[k];
  if (extras) ordered[EXTRA_KEY] = c;
  return ordered;
}

export function exportFile(chars, opts) {
  return JSON.stringify({ characters: chars.map((c) => toPurpleSorcerer(c, opts)) }, null, 2);
}
