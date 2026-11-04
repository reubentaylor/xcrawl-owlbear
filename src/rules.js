import {
  CLASSES, SPECIALIST_SUBS, SKILL_DEFS, ARMOR, AUGURS, OCCUPATIONS, PACK_ARMOR, SPECIES, WEAPONS, MISSILE_WEAPONS,
  STARTING_WEAPONS, abilityMod, spellsKnownAdj, maxSpellLevelByPer, speciesFromOccupation, fameMod, XP_THRESHOLDS, DEITIES,
} from "./data.js";
import { rollDie, actionDice, parse } from "./dice.js";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function blankCharacter() {
  return {
    v: 1,
    id: uid(),
    name: "New Crawler",
    player: "",
    actor: "",
    team: "",
    cls: "zero",
    sub: "",
    level: 0,
    xp: 0,
    alignment: "N",
    occupation: "",
    species: "human",
    abil: {
      str: { max: 10, cur: 10 }, agi: { max: 10, cur: 10 }, sta: { max: 10, cur: 10 },
      per: { max: 10, cur: 10 }, int: { max: 10, cur: 10 }, lck: { max: 10, cur: 10 },
    },
    augur: 1,
    augurMod: 0,
    hp: { max: 1, cur: 1 },
    armor: "Unarmored",
    shield: false,
    acMagic: 0,
    acMisc: 0,
    speedMisc: 0,
    fame: 0,
    mojo: 0,
    mojoIncoming: [],
    disapproval: 1,
    weapons: [],
    spells: [],
    patron: "",
    corruption: "",
    deity: "",
    performances: "",
    opts: {},
    equipment: "",
    languages: "English",
    gp: 0, sp: 0, cp: 0, wealth: 0,
    sponsors: "",
    notes: "",
    owner: "",
  };
}

export function newWeapon(name = "Dagger") {
  const w = WEAPONS.find((x) => x[0].toLowerCase() === name.toLowerCase());
  const missile = MISSILE_WEAPONS.includes(w ? w[0] : name);
  const special = w ? w[3] : "";
  return {
    id: uid(),
    name: w ? w[0] : name,
    dmg: w ? w[1] : "1d4",
    bonus: 0,
    kind: missile ? "missile" : "melee",
    agility: /Agility/.test(special),
    hurl: /Hurl/.test(special),
    twoHanded: /Two-handed/.test(special),
    bs: /Backstab/.test(special) ? "1d10" : "",
    range: w ? w[2] : "",
    trained: true,
    start: false,
    favored: false,
    chosen: false,
    lucky: false,
  };
}

/* ---------------- 0-level generator (p.12-19) ---------------- */
const roll3d6 = () => rollDie(6) + rollDie(6) + rollDie(6);

export function randomZeroLevel() {
  const c = blankCharacter();
  for (const k of ["str", "agi", "sta", "per", "int", "lck"]) {
    const v = roll3d6();
    c.abil[k] = { max: v, cur: v };
  }
  c.augur = rollDie(24);
  c.augurMod = abilityMod(c.abil.lck.max);
  const occIdx = rollDie(100);
  const [occ, equip] = OCCUPATIONS[occIdx];
  c.occupation = occ;
  c.species = speciesFromOccupation(occ);
  if (/\+1 to Stamina/.test(equip)) { c.abil.sta.max += 1; c.abil.sta.cur += 1; }
  const pack = (equip.match(/pack ([A-E])/) || [])[1];
  if (pack && PACK_ARMOR[pack]) c.armor = PACK_ARMOR[pack];
  if (/chain mail/.test(equip)) c.armor = "Chainmail";
  if (pack === "D") c.shield = true;
  const startWeapon = STARTING_WEAPONS[rollDie(4) - 1];
  const w = newWeapon(startWeapon);
  w.start = true;
  c.weapons.push(w);
  const extra = ["hand axe", "warhammer", "rapier", "longbow", "quality dagger"].find((x) => equip.toLowerCase().includes(x));
  if (extra) {
    const nm = { "hand axe": "Handaxe", warhammer: "Warhammer", rapier: "Rapier", longbow: "Longbow", "quality dagger": "Dagger" }[extra];
    if (!c.weapons.some((x) => x.name === nm)) c.weapons.push(newWeapon(nm));
  }
  if (pack === "D" && !c.weapons.some((x) => x.name === "Handaxe")) c.weapons.push(newWeapon("Handaxe"));
  const gp = (equip.match(/(\d+) gp(?!\/)/) || [])[1];
  if (gp) c.gp = Number(gp);
  c.equipment = equip + (pack ? `\nPack ${pack}: ${packText(pack)}` : "") + "\nPlus one item of standard equipment worth 10 gp or less.";
  const lang = ["English"];
  if (c.species !== "human") lang.push(SPECIES[c.species].name === "Halfling" ? "Halfling" : { dwarf: "Dwarf", elf: "Elvish", gnome: "Gnomish", halfelf: "Elvish", halforc: "Orcish" }[c.species]);
  if (/Latin/.test(equip)) lang.push("Latin");
  const extraLang = Math.max(0, abilityMod(c.abil.int.max)) + (c.augur === 15 ? c.augurMod : 0);
  for (let i = 0; i < extraLang; i++) lang.push("(open slot)");
  c.languages = lang.join(", ");
  const hp = Math.max(1, rollDie(4) + abilityMod(c.abil.sta.max) + (c.augur === 22 ? c.augurMod : 0));
  c.hp = { max: hp, cur: hp };
  c.alignment = ["L", "N", "C"][rollDie(3) - 1];
  c.name = randomName();
  return c;
}
function packText(p) {
  return {
    A: "armored jacket, backpack, 20' rope, sports bottle, ration bar, flashlight",
    B: "leather armor, backpack, 50' rope, grappling hook, 1 day's iron rations, battery lantern",
    C: "leather armor, backpack, crowbar, expandable 10' pole, flashlight",
    D: "chainmail shirt, shield, backpack, three spikes and mallet, handaxe",
    E: "light composite sports armor, waterproof backpack, alchemist charge, smoke bomb, vial of holy water, silver holy symbol, bento box lunch, mineral water, spellphone",
  }[p];
}
const FIRST = ["Dex", "Roxy", "Tank", "Jinx", "Moxie", "Brick", "Vee", "Ace", "Kit", "Duke", "Sable", "Rocco", "Neon", "Zara", "Flash", "Bodie", "Lux", "Mags", "Pip", "Gunner"];
const LAST = ["Steelgrave", "McPummel", "Thunderhide", "Vasquez", "Blackwood", "Quickfinger", "O'Malley", "Ironjaw", "Starling", "Crowe", "Haversham", "Bonecrusher", "Del Rio", "Kowalski", "Fairweather", "Nakamura"];
function randomName() {
  return `${FIRST[rollDie(FIRST.length) - 1]} ${LAST[rollDie(LAST.length) - 1]}`;
}

/* ---------------- Derived statistics ---------------- */

export function classDef(c) { return CLASSES[c.cls] || CLASSES.zero; }
export function subDef(c) { return c.cls === "specialist" ? SPECIALIST_SUBS[c.sub] || null : null; }

export function effectiveLevel(c) {
  if (c.cls === "zero") return 0;
  return Math.max(1, Math.min(10, Number(c.level) || 1));
}

export function classRow(c) {
  const lvl = effectiveLevel(c);
  const def = classDef(c);
  if (lvl === 0) return CLASSES.zero.table[0];
  return def.table[lvl - 1];
}

export function augurApplies(c, key) {
  const a = AUGURS[c.augur];
  if (!a) return false;
  return a.applies.some((k) => key === k || key.startsWith(k + "."));
}
export function augurBonus(c, key) {
  return augurApplies(c, key) ? Number(c.augurMod) || 0 : 0;
}

export function mods(c) {
  const out = {};
  for (const k of ["str", "agi", "sta", "per", "int", "lck"]) out[k] = abilityMod(c.abil[k].cur);
  return out;
}

export function armorInfo(c) {
  const a = ARMOR.find((x) => x[0] === c.armor) || ARMOR[0];
  let ac = a[1], acp = a[2], speed = a[3], fumble = a[4];
  if (c.shield) { ac += 1; acp -= 1; }
  return { name: a[0], ac, acp, speed, fumble };
}

export function displayClassName(c) {
  const def = classDef(c);
  const sub = subDef(c);
  if (c.cls === "zero") return "0-Level";
  return sub ? `${sub.name}` : def.name;
}

export function hitDie(c) {
  const sub = subDef(c);
  if (sub) return sub.hd;
  return classDef(c).hd;
}

export function speciesKey(c) {
  const sub = subDef(c);
  if (sub && sub.species !== "human") return sub.species;
  const def = classDef(c);
  if (def.species && def.species !== "human") return def.species;
  return c.species || "human";
}

export function derive(c) {
  const lvl = effectiveLevel(c);
  const def = classDef(c);
  const sub = subDef(c);
  const row = classRow(c);
  const m = mods(c);
  const arm = armorInfo(c);
  const heavy = arm.acp <= -4; // "-4 armor check penalty or worse"
  const deed = typeof row.atk === "string" ? row.atk : null;
  const atk = deed ? 0 : row.atk;
  const [critDie, critTable] = String(row.crit).split("/");
  const ad = actionDice(row.ad);

  // Saves
  const baseFort = sub && sub.fort && lvl > 0 ? sub.fort[lvl - 1] : row.fort;
  const halfelfLuck = c.cls === "halfelf" && c.opts.luckSaves ? Number(c.augurMod) || 0 : 0;
  const saves = {
    ref: { base: row.ref, ab: m.agi, augur: augurBonus(c, "save.ref"), extra: halfelfLuck },
    fort: { base: baseFort, ab: m.sta, augur: augurBonus(c, "save.fort"), extra: halfelfLuck },
    will: { base: row.will, ab: m.per, augur: augurBonus(c, "save.will"), extra: halfelfLuck },
  };
  for (const s of Object.values(saves)) s.total = s.base + s.ab + s.augur + s.extra;

  // AC
  const acParts = [["Base", 10], ["Agility", m.agi]];
  if (arm.ac) acParts.push([arm.name + (c.shield ? " + shield" : ""), arm.ac]);
  else if (c.shield) acParts.push(["Shield", 1]);
  if (c.cls === "athlete" && !heavy && row.scramble) acParts.push(["Scramble", row.scramble]);
  if (c.cls === "jammer" && !heavy && c.opts.chosenWielded) acParts.push(["Chosen weapon", lvl]);
  if (c.cls === "jammer" && c.opts.luckAC) acParts.push(["Luck", m.lck]);
  if (augurApplies(c, "ac")) acParts.push(["Birth augur", Number(c.augurMod) || 0]);
  if (Number(c.acMagic)) acParts.push(["Magic", Number(c.acMagic)]);
  if (Number(c.acMisc)) acParts.push(["Misc", Number(c.acMisc)]);
  const ac = acParts.reduce((a, p) => a + p[1], 0);

  // Speed
  const sp = speciesKey(c);
  let speed = SPECIES[sp] ? SPECIES[sp].speed : 30;
  if (sub && sub.speed) speed = sub.speed;
  if (def.speed && lvl > 0) speed = def.speed;
  if (c.cls === "athlete" && lvl > 0 && !heavy) speed = row.move;
  const ignoresArmorSpeed = c.cls === "dwarf" && lvl > 0;
  if (!ignoresArmorSpeed) speed += arm.speed;
  speed += augurBonus(c, "speed") * 5 + (Number(c.speedMisc) || 0);

  // Initiative
  let init = m.agi + augurBonus(c, "init");
  if (sub && sub.initFromRef && lvl > 0) init += row.ref;

  // Skills
  const skills = [];
  const tableSkills = sub ? sub.skills : def.skills;
  if (tableSkills && lvl > 0) {
    for (const [key, vals] of Object.entries(tableSkills)) {
      const sd = SKILL_DEFS[key];
      const v = vals[lvl - 1];
      const ab = sd.ab ? m[sd.ab] : 0;
      const acpApplies = sd.ab === "agi" || (c.cls === "halfelf" && key === "backstab");
      const acp = acpApplies ? arm.acp : 0;
      let aug = 0;
      if (sd.ab && sd.ab !== "agi") aug += augurBonus(c, "skill." + sd.ab);
      if (key === "findtrap" || key === "danger") aug += augurBonus(c, "skill.perception");
      if (sd.die) {
        skills.push({ key, name: sd.name, die: v, ab, abKey: sd.ab, acp: 0, aug, total: null });
      } else {
        skills.push({ key, name: sd.name, bonus: v, ab, abKey: sd.ab, acp, aug, total: v + ab + acp + aug });
      }
    }
  }

  // Spellcasting
  let caster = null;
  const casterType = sub ? sub.caster : def.caster;
  if (casterType && lvl > 0) {
    const adj = spellsKnownAdj(c.abil.per.max);
    const perMax = maxSpellLevelByPer(c.abil.per.max);
    if (casterType === "blaster") {
      caster = { type: "blaster", label: "Spell check", known: row.known + (adj || 0), maxLvl: Math.min(row.maxLvl, perMax), die: row.bdie, list: "blaster", spellburn: true };
    } else if (casterType === "gnome") {
      caster = { type: "gnome", label: "Spell check", known: row.known + (adj || 0), maxLvl: Math.min(1, perMax), list: "gnome", spellburn: true };
    } else if (casterType === "halfelf") {
      caster = { type: "halfelf", label: "Spell check", known: row.known + (adj || 0), maxLvl: Math.min(row.maxLvl, perMax), list: "blaster", spellburn: false };
    } else if (casterType === "trickster") {
      caster = { type: "trickster", label: "Spell check", known: sub.spellsKnown[lvl - 1] + (adj || 0), maxLvl: Math.min(sub.maxSpell[lvl - 1], perMax), list: "gnome", spellburn: false };
    } else if (casterType === "messenger") {
      caster = { type: "messenger", label: "Holy Act" };
    }
    if (caster && caster.known !== undefined) {
      if (adj === null) caster.noCasting = true;
      caster.known = Math.max(1, caster.known);
    }
  }

  const fame = fameMod(c.fame);
  const xpNext = lvl < 10 ? XP_THRESHOLDS[lvl + 1] : null;
  const deity = DEITIES.find((d) => d[0] === c.deity) || null;

  return { lvl, def, sub, row, m, arm, heavy, deed, atk, critDie, critTable, ad, saves, ac, acParts, speed, init, skills, caster, fame, xpNext, deity, species: sp };
}

/** Luck die used when spending Luck (specialists); null = flat +1 per point. */
export function luckDie(c) {
  if (c.cls !== "specialist" || effectiveLevel(c) < 1) return null;
  return classRow(c).luckDie;
}

export function levelUpHP(c) {
  const d = derive(c);
  const hd = hitDie(c);
  const r = rollDie(hd);
  const sta = d.m.sta;
  const aug = augurBonus(c, "hp");
  return { roll: r, hd, sta, aug, total: Math.max(1, r + sta + aug) };
}

export function weaponTrainedGuess(c, name) {
  const def = classDef(c);
  const sub = subDef(c);
  const list = ((sub && sub.weapons) || def.weapons || "").toLowerCase();
  const n = name.toLowerCase().replace(/,.*$/, "").replace("handaxe", "hand axe").replace("quarterstaff", "staff");
  if (c.cls === "brawler") return !MISSILE_WEAPONS.includes(name) || /bow/i.test(name);
  if (c.cls === "zero") return true;
  return list.includes(n) || list.includes(n.replace(/s$/, ""));
}

export function critExpr(c) {
  return classRow(c).crit.split("/")[0];
}
export function hasParse(expr) { return parse(expr).length > 0; }
