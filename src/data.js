// Xcrawl Classics rules data, transcribed from the XCC RPG corebook (Chapter One unless noted).
// Page references are to the printed page numbers in the corebook.

export const DICE_CHAIN = [3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 30];

export const ABILITIES = [
  { key: "str", name: "Strength", short: "STR" },
  { key: "agi", name: "Agility", short: "AGI" },
  { key: "sta", name: "Stamina", short: "STA" },
  { key: "per", name: "Personality", short: "PER" },
  { key: "int", name: "Intelligence", short: "INT" },
  { key: "lck", name: "Luck", short: "LCK" },
];

// Table 1-1 (p.14)
export function abilityMod(score) {
  const s = Number(score) || 0;
  if (s <= 3) return -3;
  if (s <= 5) return -2;
  if (s <= 8) return -1;
  if (s <= 12) return 0;
  if (s <= 15) return 1;
  if (s <= 17) return 2;
  return 3;
}
export function spellsKnownAdj(per) {
  const s = Number(per) || 0;
  if (s <= 3) return null; // no spellcasting possible
  if (s <= 5) return -2;
  if (s <= 7) return -1;
  if (s <= 13) return 0;
  if (s <= 16) return 1;
  return 2;
}
export function maxSpellLevelByPer(per) {
  const s = Number(per) || 0;
  if (s <= 3) return 0;
  if (s <= 7) return 1;
  if (s <= 9) return 2;
  if (s <= 11) return 3;
  if (s <= 13) return 4;
  return 5;
}

// Table 1-2: Birth Augur (p.15). "applies" lists roll keys the augur Luck modifier is added to.
export const AUGURS = [
  null,
  { date: "Early January", name: "Champion of Juno", roll: "All attack rolls", applies: ["attack"] },
  { date: "Late January", name: "Armed by Vulcan", roll: "Melee attack rolls", applies: ["attack.melee"] },
  { date: "Early February", name: "Radiance of Apollo", roll: "Personality-based skill checks", applies: ["skill.per"] },
  { date: "Late February", name: "Guided by Minerva", roll: "Missile fire damage rolls", applies: ["damage.missile"] },
  { date: "Early March", name: "Fortified by Hercules", roll: "Strength-based skill checks", applies: ["skill.str"] },
  { date: "Late March", name: "Toasted by Bacchus", roll: "Stamina-based skill checks", applies: ["skill.sta"] },
  { date: "Early April", name: "Taught by Diana", roll: "Missile fire attack rolls", applies: ["attack.missile"] },
  { date: "Late April", name: "Imperative of Jupiter", roll: "Initiative checks", applies: ["init"] },
  { date: "Early May", name: "Quickened of Mercury", roll: "Reflex saving throws", applies: ["save.ref"] },
  { date: "Late May", name: "Commanded of Mars", roll: "Critical chart checks", applies: ["crit"] },
  { date: "Early June", name: "Led by Sol", roll: "Perception skill checks (spot, search, notice, hear)", applies: ["skill.perception"] },
  { date: "Late June", name: "Chosen of Fortuna", roll: "All saving throws", applies: ["save"] },
  { date: "Early July", name: "Informed by the Mora", roll: "Intelligence-based skill checks", applies: ["skill.int"] },
  { date: "Late July", name: "Invoked of the Kharites", roll: "Spell checks", applies: ["spell"] },
  { date: "Early August", name: "Whispers of Trivia", roll: "Number of languages", applies: [] },
  { date: "Late August", name: "Favored of Ceres", roll: "Armor Class", applies: ["ac"] },
  { date: "Early September", name: "Forged of Vulcan", roll: "Attack + damage for chosen level 0 weapon", applies: ["weapon0"] },
  { date: "Late September", name: "Revenged of the Furaie", roll: "Melee damage rolls", applies: ["damage.melee"] },
  { date: "Early October", name: "Stricken of Cupid", roll: "Fumbles (Luck counts double on crits and fumbles)", applies: ["double"] },
  { date: "Late October", name: "Determined by Discordia", roll: "Willpower saving throws", applies: ["save.will"] },
  { date: "Early November", name: "Wraith of Neptune", roll: "All damage rolls", applies: ["damage"] },
  { date: "Late November", name: "Promised of Hesta", roll: "Hit points (applies at each level)", applies: ["hp"] },
  { date: "Early December", name: "Chased by Faunus", roll: "Speed (each +/-1 = +/-5' speed)", applies: ["speed"] },
  { date: "Late December", name: "Guarded of Pluto", roll: "Fortitude saves", applies: ["save.fort"] },
];

// Table 1-3: Occupation (pp.17-19). [name, starting equipment]
export const OCCUPATIONS = [
  null,
  ["Accountant", "Adventurer's pack A, calculator"],
  ["Artisan", "Adventurer's pack A, artisan tools"],
  ["Baker", "Adventurer's pack A, recipe book"],
  ["Bank teller", "Adventurer's pack B, 150 gp"],
  ["Barista", "Adventurer's pack A, thermos"],
  ["Bartender", "Adventurer's pack A, bottle opener"],
  ["Beautician", "Adventurer's pack A, makeup kit"],
  ["Body mod artist", "Adventurer's pack A, tats + piercings"],
  ["Bouncer", "Adventurer's pack A, combat boots"],
  ["Bus driver", "Adventurer's pack A, 50 gp"],
  ["Cab driver", "Adventurer's pack A, keys to a serviceable auto"],
  ["Cafeteria worker", "Adventurer's pack A, snacks"],
  ["Call center rep", "Adventurer's pack A, headset"],
  ["Caregiver", "Adventurer's pack A, first aid kit"],
  ["Cashier, grocery", "Adventurer's pack A, 10 gp"],
  ["Clerk, bookstore", "Adventurer's pack A, notebook + pens"],
  ["Clerk, retail", "Adventurer's pack A, 20 gp"],
  ["College student", "Adventurer's pack A, school hoodie"],
  ["Collegiate, campus security", "Adventurer's pack A, handcuffs"],
  ["Collegiate, library assistant", "Adventurer's pack A, good book"],
  ["Collegiate, resident advisor", "Adventurer's pack A, headache meds"],
  ["Collegiate, scholarship athlete", "Adventurer's pack B, 100 gp"],
  ["Collegiate, scholarship student", "Adventurer's pack A, 20 gp"],
  ["Collegiate, teaching assistant", "Adventurer's pack A, laser pointer"],
  ["Contractor, carpenter", "Adventurer's pack B, toolbox"],
  ["Contractor, painter", "Adventurer's pack B, 50 gp"],
  ["Contractor, roofer", "Adventurer's pack B, hammer and iron spikes"],
  ["Criminal", "Adventurer's pack C, lockpicks"],
  ["Custodian", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Dancer", "Adventurer's pack A, great outfit"],
  ["Delivery person", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Dishwasher", "Adventurer's pack A, pack of smokes + lighter"],
  ["Drifter", "Clothes on your back"],
  ["Dwarf, miner", "Adventurer's pack D, hand axe"],
  ["Dwarf, stonemason", "Adventurer's pack D, warhammer"],
  ["Elf, ne'er-do-well", "Adventurer's pack C, keys to motorcycle"],
  ["Equestrian trainer", "Adventurer's pack B, riding crop"],
  ["Factory worker", "Adventurer's pack A, keys to late model sedan"],
  ["Farmer, arable", "Adventurer's pack A, keys to pickup truck"],
  ["Farmer, dairy", "Adventurer's pack A, 1 lb. quality cheese"],
  ["Farmer, organic", "Adventurer's pack A, 1 lb. dried fruit"],
  ["Farmer, pastoral", "Adventurer's pack A, hammer"],
  ["Farmer, poultry", "Adventurer's pack A, quality hatchet"],
  ["Farmer, sustenance", "Adventurer's pack A, keys to pickup truck"],
  ["Fast food employee", "Adventurer's pack A, snacks"],
  ["Firefighter", "Adventurer's pack B, waterproof boots"],
  ["Fisherman", "Adventurer's pack A, quality knife"],
  ["Fitness instructor", "Adventurer's pack A, +1 to Stamina"],
  ["Flight attendant", "Adventurer's pack B, stand-by tickets"],
  ["Gardener", "Adventurer's pack A, quality gloves"],
  ["Gnome, crafter", "Adventurer's pack B, choose 1 piece of equipment"],
  ["Gnome, entertainer", "Adventurer's pack B, give-away swag"],
  ["Gnome, tailor", "Adventurer's pack B, great outfit"],
  ["Half-elf, adventurer", "Adventurer's pack C, monster tooth pendant"],
  ["Half-elf, wayfarer", "Adventurer's pack A, quality boots"],
  ["Half-orc, crawler", "Adventurer's pack A, chain mail, choose 1 additional trained weapon"],
  ["Half-orc, language teacher", "Adventurer's pack A, translation guidebook"],
  ["Halfling, cook", "Adventurer's pack A, snacks"],
  ["Halfling, gardener", "Adventurer's pack A, quality gloves"],
  ["Handyman", "Adventurer's pack B, multitool"],
  ["Homemaker", "Adventurer's pack A, scissors"],
  ["Hotel employee", "Adventurer's pack A, choose 1 piece of equipment"],
  ["House staff", "Adventurer's pack A, quality dagger"],
  ["Hunter", "Adventurer's pack B, longbow, quiver (24 arrows)"],
  ["Laborer", "Adventurer's pack A, hammer"],
  ["Law clerk", "Adventurer's pack B, bottle opener"],
  ["Lifeguard", "Adventurer's pack A, whistle"],
  ["Line cook", "Adventurer's pack A, snacks"],
  ["Luggage handler", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Marketing assistant", "Adventurer's pack B, quality camera"],
  ["Musician", "Adventurer's pack A, musical instrument"],
  ["Nanny", "Adventurer's pack A, first aid kit"],
  ["Nobility", "Adventurer's pack E, 100 gp/month income, rapier, keys to sports car, bonus language: Latin"],
  ["Nurse", "Adventurer's pack B, first aid kit"],
  ["Odd job person", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Office assistant", "Adventurer's pack A, stapler"],
  ["Office worker, temp", "Adventurer's pack A, timecard"],
  ["Painter", "Adventurer's pack A, 20 gp"],
  ["Paramedic", "Adventurer's pack A, first aid kit"],
  ["Parking valet", "Adventurer's pack A, 30 gp"],
  ["Plumber", "Adventurer's pack B, toolbox"],
  ["Postal worker", "Adventurer's pack A, waterproof messenger bag"],
  ["Rail conductor", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Ranch hand", "Adventurer's pack A, quality gloves + hat"],
  ["Seaman", "Adventurer's pack A, knife"],
  ["Security guard", "Adventurer's pack B, combat flashlight"],
  ["Servant", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Slacker", "Adventurer's pack A, graphic novel"],
  ["Substitute teacher", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Tailor", "Adventurer's pack A, sewing kit"],
  ["Teacher", "Adventurer's pack B, choose 1 piece of equipment"],
  ["Templar", "Adventurer's pack B, holy symbol, 1 vial holy water"],
  ["Therapist", "Adventurer's pack A, 40 gp"],
  ["Translator", "Adventurer's pack A, English-to-? dictionary, minimum 1 language beyond English"],
  ["Truck driver", "Adventurer's pack B, tire iron"],
  ["Tutor", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Veterinary assistant", "Adventurer's pack A, snakebite kit"],
  ["Waiter", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Warehouse worker", "Adventurer's pack A, choose 1 piece of equipment"],
  ["Wizard's assistant", "Adventurer's pack B, scroll of 1 level-1 blaster spell"],
];

// Starting adventurer's packs (p.73)
export const PACKS = {
  A: "armored jacket, backpack, 20' rope, sports bottle, ration bar, flashlight, starting weapon",
  B: "leather armor, backpack, 50' rope, grappling hook, 1 day's iron rations, battery lantern, starting weapon",
  C: "leather armor, backpack, crowbar, expandable 10' pole, flashlight, starting weapon",
  D: "chainmail shirt, shield, backpack, three spikes and mallet, handaxe",
  E: "light composite sports armor, waterproof backpack, one alchemist charge, one smoke bomb, one vial holy water, silver holy symbol, bento box lunch, bottle of mineral water, starting weapon, spellphone",
};
export const PACK_ARMOR = { A: "Armored Jacket", B: "Leather", C: "Leather", D: "Chainmail Shirt", E: "Composite Sport, Light" };

export const SPECIES = {
  human: { name: "Human", speed: 30, infra: 0 },
  dwarf: { name: "Dwarf", speed: 20, infra: 60, note: "60' infravision, base speed 20'." },
  elf: { name: "Elf", speed: 30, infra: 60, note: "Sensitive to iron, 60' infravision, heightened senses." },
  gnome: { name: "Gnome", speed: 25, infra: 0, note: "Base speed 25', can draw agro." },
  halfelf: { name: "Half-elf", speed: 30, infra: 0, note: "+1 on Personality-based skill checks; +1d saves vs magical sleep & paralysis." },
  halforc: { name: "Half-orc", speed: 30, infra: 30, note: "30' infravision; robust." },
  halfling: { name: "Halfling", speed: 20, infra: 30, note: "30' infravision, base speed 20'." },
};
export function speciesFromOccupation(occ) {
  const o = (occ || "").toLowerCase();
  if (o.startsWith("dwarf")) return "dwarf";
  if (o.startsWith("elf")) return "elf";
  if (o.startsWith("gnome")) return "gnome";
  if (o.startsWith("half-elf")) return "halfelf";
  if (o.startsWith("half-orc")) return "halforc";
  if (o.startsWith("halfling")) return "halfling";
  return "human";
}

// Table 1-4 (p.21)
export const XP_THRESHOLDS = [0, 10, 50, 110, 190, 290, 410, 550, 710, 890, 1090];

// Table 3-1 Weapons (p.71): name, damage, range, special
export const WEAPONS = [
  ["Battleaxe", "1d10", "", "Two-handed"],
  ["Club", "1d4", "", ""],
  ["Crossbow", "1d6", "80/160/240", "Two-handed, Reload"],
  ["Crossbow, Hand", "1d4", "20/40/60", "Reload"],
  ["Crossbow, Repeating", "1d6", "80/160/240", "Two-handed"],
  ["Dagger", "1d4", "10/20/30", "Backstab 1d10, Hurl"],
  ["Flail", "1d6", "", ""],
  ["Javelin", "1d6", "30/60/90", "Hurl"],
  ["Handaxe", "1d6", "10/20/30", "Hurl"],
  ["Lance", "1d12", "", "Mounted"],
  ["Longbow", "1d6", "70/140/210", "Two-handed"],
  ["Longsword", "1d8", "", ""],
  ["Mace", "1d6", "", ""],
  ["Nunchaku", "1d5", "", ""],
  ["Polearm", "1d10", "", "Two-handed"],
  ["Pick, Military", "1d10", "", "Two-handed"],
  ["Quarterstaff", "1d4", "", ""],
  ["Rapier", "1d5", "", "Agility"],
  ["Scimitar", "1d6", "", ""],
  ["Shield", "1d3", "", ""],
  ["Sling", "1d4", "40/80/120", ""],
  ["Shortbow", "1d6", "50/100/150", "Two-handed"],
  ["Short sword", "1d6", "", ""],
  ["Spear", "1d8", "", "Two-handed"],
  ["Stiletto", "1d3", "10/15/20", "Concealable"],
  ["Scythe", "1d10", "", "Two-handed"],
  ["Trident", "1d8", "", "Two-handed"],
  ["Two-Handed Sword", "1d10", "", "Two-handed"],
  ["Warhammer", "1d8", "", ""],
  ["Whip", "1d4", "", "Agility, Stretch"],
  ["Unarmed", "1d3", "", ""],
];
export const MISSILE_WEAPONS = ["Crossbow", "Crossbow, Hand", "Crossbow, Repeating", "Longbow", "Sling", "Shortbow"];

// Table 3-3 Armor (p.72): name, AC, check penalty, speed penalty, fumble die
export const ARMOR = [
  ["Unarmored", 0, 0, 0, "d4"],
  ["Sexy Leather", 1, 0, 0, "d4"],
  ["Armored Jacket", 1, -1, 0, "d6"],
  ["Leather", 2, -1, 0, "d8"],
  ["Halfling Leather", 2, 0, 0, "d6"],
  ["Micromesh Clothing", 2, -1, 0, "d6"],
  ["Composite Sport, Light", 3, -1, 0, "d8"],
  ["Hide", 3, -4, -10, "d12"],
  ["Micromesh", 3, -3, 0, "d8"],
  ["Sexy Chainmail", 3, -2, 0, "d8"],
  ["MiniLynx, Light", 4, -2, 0, "d8"],
  ["Chainmail Shirt", 4, -2, 0, "d10"],
  ["Composite Sports, Heavy", 5, -4, -10, "d12"],
  ["Chainmail", 5, -5, -5, "d12"],
  ["Titanium Chainmail", 5, -4, 0, "d10"],
  ["Breastplate", 5, -4, -10, "d12"],
  ["Titanium Breastplate", 5, -3, -10, "d10"],
  ["Sexy Half Plate", 5, -5, -10, "d12"],
  ["Elfmake Chainmail", 5, -3, 0, "d8"],
  ["Banded Mail", 6, -6, -5, "d12"],
  ["MiniLynx", 6, -3, -5, "d10"],
  ["Half Plate", 7, -7, -10, "d14"],
  ["Dwarvish Plate", 8, -5, -10, "d12"],
  ["Plate Mail", 8, -8, -10, "d16"],
  ["Titanium Plate Mail", 8, -6, -10, "d14"],
];

// Table 6-1 Fame modifier (p.113). Returns {bonus, dice}
export function fameMod(fame) {
  const f = Number(fame) || 0;
  if (f <= 20) return { bonus: 0, dice: 0, label: "—" };
  if (f <= 40) return { bonus: 1, dice: 0, label: "+1" };
  if (f <= 60) return { bonus: 2, dice: 0, label: "+2" };
  if (f <= 80) return { bonus: 0, dice: 1, label: "+1d" };
  return { bonus: 0, dice: 2, label: "+2d" };
}

// Spell lists (Table 7-8, 7-9, p.136-137)
export const BLASTER_SPELLS = {
  1: ["Arcane Aspect", "Baffling Haze", "Blue Streak", "Bug Storm", "Buzz Bomb", "Cantrip", "Castro's Rampart", "Countermagic", "Dungeon Drone", "Eldritch Escapology", "Guardian Spirit", "Hover", "Howitt's Flexible Form", "Invoke Patron", "Patron Bond", "Ragsdale's Force Hand", "Spellweaver Blast", "Supercharge!", "War Gear", "Weave"],
  2: ["Blazeweapon", "Cyclone Blast", "Dungeon-vision", "Egolf's Wizardly Weapon", "Medeski's Transformation", "Melsenschlap's 2-D Dweomer", "Orpheus Remix", "Pixelization Evocation", "Power Word: Hero", "Psycho-Ray", "Puppet Master", "Quicksand", "Squad Goaltender", "Unseen Wall", "Villalobos' Attack Outta Nowhere", "Xcrawl Special"],
  3: ["7 Agents of Fate", "7 League Boots", "The Arcane Collection", "Blaster-vision", "The Cavalry", "Instant Replay", "Locks and Chains", "Raulwocket's Artful Oubliette", "Smart Bomb", "Soul Shield"],
};
export const GNOME_SPELLS = {
  1: ["Animal Language", "Cantrip", "Creature Companion", "Entryway Charm", "Fey Aspect", "Hocus Pocus", "Jinx", "Pocket Charm", "Ropework", "Smoke and Mirrors", "Spiral Pattern", "Starlight", "Touch of Fellowship", "Ventriloquism", "Weave"],
};
export const PATRONS = {
  "The Amazing Rando": ["Prepare Yourself for Wizardly Combat", "Bring the Noise", "Cosmic Journey from Death to Life"],
  "Circe": ["Sorcerous Lassitude", "Become Beasts", "The Charm'ed Pot"],
  "Medea": ["Envenom", "Confusion to our Enemies", "Teeth of the Hydra"],
  "Barzodi": ["The Flesh Shall Fester", "Barzodi's Dark Decree", "Voices of the Ancient Ones"],
  "Prometheus": ["Celestial Battery", "Soul Weal", "Fires of Creation"],
};

// The Gods of Olympus (p.38)
export const DEITIES = [
  ["Apollo, God of Music and Archery", "C", "Bow"],
  ["Bacchus, God of Wine and Mirth", "C", "Club"],
  ["Cupid, God of Love's Chaos", "C", "Bow"],
  ["Discordia, Goddess of Mischief", "C", "Whip"],
  ["Faunus, God of Beasts", "C", "Crossbow"],
  ["Fortuna, Goddess of Luck", "C", "Rapier"],
  ["Mars, God of War", "C", "Sword (any)"],
  ["Mora, Goddess of Science and Discovery", "C", "Short sword"],
  ["Neptune, God of the Oceans", "C", "Trident"],
  ["Diana, Goddess of the Moon", "L", "Bow"],
  ["Furaie, Goddesses of Justice", "L", "Morningstar"],
  ["Juno, Queen of the Gods", "L", "Mace"],
  ["Jupiter, God of the Sky", "L", "Long spear"],
  ["Mercury, God of Messengers", "L", "Club"],
  ["Minerva, Goddess of Wisdom", "L", "Long sword"],
  ["Sol, God of the Sun", "L", "Lance"],
  ["Vesta, Goddess of the Hearth", "L", "Short spear"],
  ["Vulcan, God of the Forge", "L", "Hammer"],
  ["Ceres, God of Agriculture", "N", "Sickle"],
  ["Horae, Goddesses of the Seasons", "N", "Staff"],
  ["Kharites, the Three Graces", "N", "Staff"],
  ["Pluto, Guardian of the Underworld", "N", "Battleaxe"],
  ["Trivia, Goddess of the Crossroads", "N", "Torch"],
  ["Venus, Goddess of Fertility", "N", "Short spear"],
];
export const UNHOLY = {
  L: "Chaotic holy warriors, un-dead, demons, devils, chaotic extra-planar creatures, chaotic dragons, chaotic messengers",
  N: "Dire animals, elementals, un-dead, demons, devils, lycanthropes, slimes",
  C: "Un-dead, lawful extra-planar creatures, lawful holy warriors, lawful dragons, lawful messengers",
};

// Lookup tables used to annotate roll results
export const LIONIZE = [
  [1, 1, "Bombs! Judge chooses an opponent to gain +1d on their next combat action."],
  [2, 11, "No effect."],
  [12, 13, "+1 attack rolls."],
  [14, 16, "+1 attack rolls and Willpower saves."],
  [17, 19, "+1 attack rolls, Willpower saves and skill checks."],
  [20, 22, "+2 attack rolls, Willpower saves, Reflex saves and skill checks."],
  [23, 26, "+2 attack rolls, Willpower saves, Reflex saves and skill checks; +1 spell checks or Holy Acts."],
  [27, 30, "+2 attack rolls, Willpower saves, Reflex saves and skill checks; +1 spell checks, Holy Acts and AC."],
  [31, 999, "+3 attack rolls, Willpower saves, Reflex saves and skill checks; +2 spell checks, Holy Acts and AC."],
];
export const BLESSING = [
  [-999, 11, "Fail, and disapproval range increases by 1."],
  [12, 13, "+1 to all attack rolls for one encounter."],
  [14, 15, "+1 to all attack and damage rolls for one encounter."],
  [16, 17, "+1 to all attack, damage, saves, skill checks and spell checks for one encounter."],
  [18, 19, "+1d3 to all attack, damage, saves, skill checks and spell checks for one encounter."],
  [20, 21, "+1d4 to all attack, damage, saves, skill checks and spell checks for one encounter."],
  [22, 23, "+1d4 to all attack, damage, saves, skill checks and spell checks for 1 turn."],
  [24, 25, "+1d5 to all attack, damage, saves, skill checks and spell checks for 1 turn."],
  [26, 27, "+1d6 to all attack, damage, saves, skill checks and spell checks for 1 turn."],
  [28, 29, "+1d7 to all attack, damage, saves, skill checks and spell checks for 1 turn."],
  [30, 999, "+1d8 to all attack, damage, saves, skill checks and spell checks for 1 turn."],
];
export const SUMMON_WEAPON = [
  [-999, 11, "Fail; messenger gains one point of disapproval."],
  [12, 18, "Mundane version of the deity's favoured weapon."],
  [19, 25, "Superior version: +1 to hit, difficult to break."],
  [26, 30, "Magical: +1 hit and damage, +1d scourge damage."],
  [31, 999, "Legendary: CL/2 bonus to hit and damage (min +1), unbreakable, +2d scourge damage."],
];
// Lay on Hands (Table 1-12): dice healed by target relationship
export const LAY_ON_HANDS_COLS = ["Teammate", "Same alignment", "Adjacent alignment", "Opposed alignment", "Rival team"];
export const LAY_ON_HANDS = [
  [-999, 11, [0, 0, 0, 0, 0]],
  [12, 13, [2, 1, 1, 1, 0]],
  [14, 19, [3, 2, 2, 1, 1]],
  [20, 21, [4, 3, 3, 2, 2]],
  [22, 999, [5, 4, 4, 3, 2]],
];
export function lookup(table, total) {
  for (const row of table) if (total >= row[0] && total <= row[1]) return row[2];
  return null;
}

/* ------------------------------------------------------------------------------------------
   CLASS TABLES
   Each level row: { atk, crit, ad, ref, fort, will, ...extra }
   atk is either a number (fixed bonus) or a deed die string like "d3" / "d10+1".
------------------------------------------------------------------------------------------- */
function rows(cols, data) {
  return data.map((r) => {
    const o = {};
    cols.forEach((c, i) => (o[c] = r[i]));
    return o;
  });
}

const ZERO_ROW = { atk: 0, crit: "1d4/I", ad: "1d20", ref: 0, fort: 0, will: 0 };

const SPECIALIST_TABLE = rows(["atk", "crit", "ad", "luckDie", "ref", "fort", "will"], [
  [0, "1d8/II", "1d20", "d3", 1, 1, 0],
  [1, "1d10/II", "1d20", "d4", 1, 1, 0],
  [2, "1d12/II", "1d20", "d5", 2, 1, 1],
  [2, "1d14/II", "1d20", "d6", 2, 2, 1],
  [3, "1d16/II", "1d20", "d7", 3, 2, 1],
  [4, "1d20/II", "1d20+1d14", "d8", 4, 2, 2],
  [5, "1d20/II", "1d20+1d16", "d10", 4, 3, 2],
  [5, "1d24/II", "1d20+1d20", "d12", 5, 3, 2],
  [6, "1d24/II", "1d20+1d20", "d14", 5, 3, 3],
  [7, "1d30/II", "1d20+1d20", "d16", 6, 4, 3],
]);

// Specialist skill tables (Table 1-16, pp.49-51). Ability: a=Agility, i=Intelligence, p=Personality, s=Strength, ""=none
const L = (...v) => v;
const SK = {
  backstab: { name: "Backstab", ab: "" },
  sneak: { name: "Sneak Silently", ab: "agi" },
  hide: { name: "Hide in Shadows", ab: "agi" },
  climb: { name: "Climb Sheer Surfaces", ab: "agi" },
  picklock: { name: "Pick Lock", ab: "agi" },
  pickpocket: { name: "Pick Pocket", ab: "agi" },
  findtrap: { name: "Find Trap", ab: "int" },
  disable: { name: "Disable Trap", ab: "agi" },
  readlang: { name: "Read Languages", ab: "int" },
  acrobatics: { name: "Acrobatics", ab: "agi" },
  polevault: { name: "Pole Vault", ab: "str" },
  tightrope: { name: "Tightrope Walk", ab: "agi" },
  leap: { name: "Leap", ab: "str" },
  connections: { name: "Criminal Connections", ab: "per" },
  forge: { name: "Forge Document", ab: "int" },
  disguise: { name: "Disguise Self", ab: "per" },
  poison: { name: "Handle Poison", ab: "" },
  danger: { name: "Danger Sense", ab: "" },
  turn: { name: "Turn Unholy", ab: "per", die: true },
  scroll: { name: "Cast Spell From Scroll", ab: "int", die: true },
};
export const SKILL_DEFS = SK;

const P_A = L(3, 5, 7, 8, 9, 11, 12, 13, 14, 15); // +3 progression
const P_B = L(1, 3, 5, 7, 8, 9, 10, 11, 12, 13); // +1 progression
const P_C = L(0, 1, 2, 3, 4, 5, 6, 7, 8, 9); // +0 progression
const P_D = L(2, 3, 5, 7, 9, 10, 11, 12, 13, 14); // +2 progression

export const SPECIALIST_SUBS = {
  acrobat: {
    name: "Acrobat", species: "human", hd: 6, page: 41,
    weapons: "Crossbow, dagger, dart, short sword, sling, staff",
    skills: {
      acrobatics: P_A, backstab: P_C, sneak: L(2, 3, 5, 7, 9, 10, 11, 12, 13, 14), hide: P_B, climb: P_A,
      picklock: L(1, 3, 5, 6, 7, 8, 9, 10, 11, 12), polevault: L(2, 3, 4, 5, 6, 7, 8, 10, 11, 12),
      tightrope: L(1, 2, 3, 4, 5, 6, 7, 9, 10, 11), leap: P_A, findtrap: P_B, disable: P_C,
    },
    features: [
      ["Acrobatic dodge", "Spend your move action dodging: DC 10 vs one ranged attacker, DC 15 vs several ranged attacks or one melee opponent, DC 20 vs several melee opponents. Success adds your Reflex save modifier to AC until your next action."],
      ["Acrobatic movement", "Move up to half speed as part of an acrobatics check (full speed from 5th level). A DC 15/20 check denies free attacks when you withdraw from one/several opponents."],
      ["Mitigate falls", "Free automatic acrobatics check: DC 10 ignores 1d6, DC 15 ignores 2d6, DC 20 ignores 3d6 falling damage (6th level+: DC 25 = 4d6, DC 30 = 5d6)."],
      ["Tightrope walk", "DC 10 beam/thick rope, DC 15 standard rope, DC 20 climbing or silk rope. A full action moves 10'."],
      ["Pole vault", "DC 10 over 5', DC 15 over 10', DC 20 over 15', DC 25 over 20'."],
      ["Leap", "Add your leap bonus to any running jump, jump or high jump."],
    ],
    mojo: "A Mojo point for slaying an opponent you strike after a successful acrobatics check that same round.",
  },
  commando: {
    name: "Commando", species: "human", hd: 7, page: 43,
    weapons: "Blackjack, blowgun, crossbow, dagger, dart, garrote, hand axe, longsword, short sword, sling",
    fort: L(1, 2, 2, 3, 3, 4, 4, 5, 6, 7),
    backstabTable: "III",
    luckDamageBump: 1,
    skills: { backstab: P_A, sneak: P_A, hide: P_B, climb: P_A, findtrap: P_B, disable: P_C },
    features: [
      ["Ranged backstab", "Rolls on Crit Table III on a successful backstab. Can backstab with a sling or hurled dagger up to medium range, or an alchemist charge at short range."],
      ["Luck for damage", "When spending Luck on damage, the Luck die is +1d on the chain."],
    ],
    mojo: "A Mojo point for every opponent put down with a backstab.",
  },
  criminal: {
    name: "Criminal", species: "human", hd: 6, page: 43,
    weapons: "Short sword, dagger, sling, shortbow, hand crossbow, plus pistols and revolvers",
    skills: {
      backstab: P_A, sneak: P_A, hide: P_B, pickpocket: P_A, connections: L(2, 3, 5, 7, 9, 10, 11, 12, 13, 14),
      picklock: P_B, findtrap: P_B, disable: P_C, forge: P_A, disguise: L(0, 0, 1, 2, 3, 4, 5, 6, 7, 8), poison: L(0, 0, 1, 2, 3, 4, 5, 6, 7, 8),
    },
    features: [
      ["Criminal connections", "DC 5 home turf, DC 10 major city, DC 15 small city, DC 20 small town. Reaches a contact; cooperation not guaranteed."],
      ["Forge document", "DC 5–20; official state documents are DC 15+. Needs 100 gp of equipment and 100–600 gp a year in bribes."],
      ["Disguise self", "DC 5 same species & build, DC 10 change facial features, DC 15 mannerisms/height, DC 20+ to fool someone close to the target."],
      ["Bribery expert", "Check with class level + Int modifier to know if someone takes bribes and how much: DC 10 home turf, DC 15 unfamiliar with connections, DC 20 strange locale."],
    ],
    mojo: "A Mojo point for Xcrawl rule-breaking that helps you or your allies without getting caught (up to 1d6 for a sweet score).",
  },
  scout: {
    name: "Scout", species: "human", hd: 6, page: 44,
    weapons: "Short sword, dagger, sling, shortbow, hand crossbow",
    skills: { backstab: P_B, sneak: P_A, hide: P_A, climb: P_B, picklock: P_B, findtrap: P_A, disable: P_A, danger: P_B },
    features: [
      ["Danger sense", "Sense concealed creatures within 60': DC 10 simple concealment, DC 15 camouflaged, DC 20 invisible. Learn a threat exists and roughly where."],
      ["Sneak attack", "Backstab only with shortbow (1d8 damage) or sling (1d6) at short range."],
    ],
    mojo: "A Mojo point for spotting an ambush, or for finding and disarming a trap.",
  },
  cryptraider: {
    name: "Crypt Raider", species: "human", hd: 6, page: 44,
    weapons: "Short sword, dagger, sling, shortbow, hand crossbow",
    skills: {
      backstab: P_B, sneak: P_D, hide: P_D, climb: P_A, picklock: P_B, findtrap: P_D, disable: P_D, readlang: P_C,
      turn: L("d10", "d12", "d14", "d16", "d20", "d20", "d20", "d24", "d24", "d24"),
    },
    disapproval: true,
    features: [
      ["Find secret doors", "Free automatic check when passing within 10'; add class level to all attempts."],
      ["Dark knowledge", "+1d on knowledge checks to identify un-dead and demons (including forensic checks)."],
      ["Latin", "Speaks and writes Latin."],
      ["Turn Unholy", "Turn un-dead and demons with the Turn Unholy die. A failed check gives a point of disapproval; rolling within disapproval requires hours of prayer equal to disapproval before trying again."],
      ["Backstab vs un-dead", "+1d on crit die and Crit Table III vs un-dead and demons; can crit them even if immune. Can backstab with hurled holy water within 10'."],
      ["Unpopular", "-1d on all Grandstanding checks."],
      ["Luck vs un-dead", "Luck spent on saves vs un-dead/demon powers, or on attacks, turning or damage vs them, rolls the Luck die +2d on the chain."],
    ],
    mojo: "A Mojo point for each successful Turn Unholy check and each un-dead creature or demon you help destroy.",
    grandstandDice: -1,
  },
  mechanic: {
    name: "Dwarf Mechanic", species: "dwarf", hd: 8, page: 45, speed: 20,
    weapons: "Short sword, dagger, sling, shortbow, hand crossbow, hand axe",
    skills: { backstab: P_B, sneak: P_B, hide: P_B, climb: P_B, picklock: P_A, findtrap: P_A, disable: P_A },
    features: [
      ["Infravision", "See in the dark up to 60'. Base speed 20'."],
      ["Stonework traps", "+1d to find and disable traps involving pits, moving stonework, sliding walls and structural deadfalls."],
      ["Underground skills", "Underground, add character level to detect sloping passages, shifting-wall secret doors and new construction. Always knows approximate depth."],
      ["The Shale", "Speaks Dwarf, English and The Shale, a secret face-to-face cant."],
      ["Shunned", "-2d on social rolls with dwarven kin (-1d at 3rd level, gone at 4th). No dwarven sponsorships."],
    ],
    mojo: "Two Mojo points for mocking the trap maker on camera after disarming a trap first time (more if witty); a Mojo point for every giant, troll or ogre the team destroys with your help.",
  },
  trickster: {
    name: "Elf Trickster", species: "elf", hd: 5, page: 46, caster: "trickster", alignment: "C",
    weapons: "Short sword, dagger, staff, shortbow",
    skills: {
      backstab: P_C, sneak: P_A, hide: P_A, pickpocket: P_B, climb: P_B, picklock: P_B, findtrap: P_B, disable: P_C, readlang: P_A,
      scroll: L("d10", "d12", "d12", "d14", "d14", "d16", "d16", "d20", "d20", "d20"),
    },
    spellsKnown: L(2, 2, 3, 3, 4, 4, 4, 5, 5, 5),
    maxSpell: L(1, 1, 1, 1, 1, 2, 2, 2, 2, 2),
    features: [
      ["The bunk", "Spell check: 1d20 + Personality mod + caster level (+ Luck mod). Learns Cantrip plus spells from the gnome list. Cannot spellburn or voluntarily take corruption."],
      ["Cantrip", "Lasts up to 10 rounds; can choose a lesser effect. On 18+ gains fine kinetic control at range (pick locks, disarm traps, pick pockets)."],
      ["Elf", "60' infravision; immune to magical sleep & paralysis; iron causes 1 hp/day of contact. +4 to detect secret doors, free check within 10'."],
    ],
    mojo: "1–3 Mojo points for battlefield tricks that dupe, delay, divide or neutralise opponents.",
  },
  slayer: {
    name: "Half-Orc Slayer", species: "halforc", hd: 10, page: 47,
    weapons: "Battleaxe, club, crossbow, dagger, dart, flail, hand axe, javelin, longsword, shortbow, sling, spear, two-handed sword",
    fort: L(1, 1, 2, 2, 3, 4, 4, 5, 5, 6),
    backstabTable: "III",
    luckDamageBump: 1,
    initFromRef: true,
    skills: { backstab: P_A, sneak: P_B, hide: P_B, climb: P_B, poison: P_A },
    features: [
      ["Infravision", "30' infravision. -1d on Personality skills except intimidation and Grandstanding."],
      ["Robust", "+1d saves vs disease and poison; heals 2 hp and 2 physical ability points per night (3 with a full day of bed rest)."],
      ["Cunning", "Add base Reflex save to initiative."],
      ["Backstab", "Crit Table III on backstab; melee backstab weapon damage +1d (daggers 1d10). Luck spent on damage rolls the Luck die +1d. Can always backstab prone targets."],
      ["Mistrusted & non-citizen", "See the half-orc entry (p.62)."],
    ],
    mojo: "A Mojo point for every creature you kill single-handedly.",
  },
  halfling: {
    name: "Halfling Rogue", species: "halfling", hd: 6, page: 47, speed: 20,
    weapons: "Short sword, dagger, sling, shortbow, hand crossbow",
    skills: {
      backstab: P_B, sneak: L(4, 6, 8, 9, 10, 12, 13, 14, 15, 16), hide: L(5, 7, 9, 10, 11, 13, 14, 15, 16, 17),
      pickpocket: P_A, climb: P_B, picklock: P_B, findtrap: P_B, disable: P_B, readlang: P_C,
      scroll: L("d10", "d10", "d12", "d12", "d14", "d14", "d16", "d16", "d20", "d20"),
    },
    features: [
      ["Infravision", "30' infravision. Base speed 20'."],
      ["Ranged backstab", "Backstab with slings, hurled daggers and hurled stones to short range. Damage: dagger 1d10, hurled stone 1d5, sling 1d8."],
      ["Publicly disavowed", "Outcast in public, quietly admired in private."],
    ],
    mojo: "A Mojo point for downing an opponent with a backstab or disarming a trap.",
  },
};

export const CLASSES = {
  zero: {
    name: "0-Level", hd: 4, page: 15,
    weapons: "One of club, dagger, sling or spear, plus any weapon in starting equipment",
    table: Array.from({ length: 1 }, () => ZERO_ROW),
    features: [
      ["The funnel", "1d4 hit points (modified by Stamina), +0 attacks and saves, crit die 1d4 on Table I. Advance to 1st level at 10 XP."],
      ["Untrained weapons", "Level 0 characters take no penalty for untrained weapons."],
    ],
  },
  athlete: {
    name: "Athlete", hd: 12, page: 22, species: "human",
    weapons: "Spear, club, dagger, quarterstaff, javelin; sports equipment as improvised weapons",
    table: rows(["atk", "crit", "ad", "train", "scramble", "move", "ref", "fort", "will"], [
      [0, "1d8/III", "1d20", "d3", 0, 30, 1, 1, 1],
      [1, "1d8/III", "1d20", "d4", 1, 35, 1, 1, 1],
      [2, "1d10/III", "1d20", "d5", 1, 40, 2, 2, 1],
      [2, "1d10/III", "1d20", "d6", 2, 40, 2, 2, 2],
      [3, "1d12/III", "1d20", "d7", 2, 45, 3, 3, 2],
      [4, "1d12/IV", "1d20+1d14", "d8", 3, 50, 4, 4, 2],
      [5, "1d14/IV", "1d20+1d16", "d10", 3, 50, 4, 4, 3],
      [5, "1d14/IV", "1d20+1d20", "d12", 4, 55, 5, 5, 3],
      [6, "1d16/IV", "1d20+1d20", "d14", 4, 55, 5, 5, 3],
      [7, "1d16/IV", "1d20+1d20", "d16", 5, 60, 6, 6, 4],
    ]),
    // Table 1-7 grapple crit
    grappleCrit: rows(["threat", "die"], [
      [20, "1d6"], [19, "1d7"], [19, "1d8"], [19, "1d10"], [18, "1d12"], [18, "1d14"], [18, "1d16"], [17, "1d20"], [17, "1d20+1"], [17, "1d20+2"],
    ]),
    features: [
      ["Training die", "Add to athletics skill checks (jumping, swimming, climbing, gymnastics, lifting) and to grapple checks and grapple damage."],
      ["Grappling", "Grapple check: 1d20 + Str mod + training die. Grapple damage: 1d4 + Str mod + the same training die result. Can move a grappled foe 5' (+5' per 4 points of margin)."],
      ["Giant killer", "Large creatures get half their size bonus against your grapple (double-size +2, triple +4, quadruple +8)."],
      ["Grapple crits", "Crit on a maximum grapple action die (threat range grows by level), roll on the Athlete Grapple Crit Table (p.89)."],
      ["Techniques of Wrestling Prowess", "Declare a technique before the grapple; training die 3+ and winning the grapple makes it work (p.93)."],
      ["Scramble", "Bonus to AC while able to move. Lost in armour with check penalty -4 or worse."],
      ["Athletic durability", "Ignore subdual damage each round equal to class level."],
      ["Fast movement", "Speed per table; climb and swim speeds +50%. Lost when heavily encumbered or in armour worse than -4."],
    ],
    mojo: "A Mojo point for any creature taken out with nothing but grapple damage, or forced to surrender/tap out.",
    luck: "May add Luck modifier to Strength, Agility and Stamina-based skill checks.",
  },
  blaster: {
    name: "Blaster", hd: 5, page: 25, species: "human", caster: "blaster",
    weapons: "Longsword, short sword, spear, club, dagger, crossbow",
    table: rows(["atk", "crit", "ad", "bdie", "known", "maxLvl", "ref", "fort", "will"], [
      [1, "1d6/I", "1d20", "d3", 4, 1, 1, 0, 1],
      [1, "1d7/I", "1d20", "d4", 5, 1, 1, 0, 1],
      [2, "1d8/I", "1d20", "d5", 6, 2, 1, 1, 2],
      [2, "1d8/I", "1d20", "d6", 7, 2, 2, 1, 2],
      [3, "1d10/I", "1d20", "d7", 8, 3, 2, 1, 3],
      [3, "1d10/I", "1d20+1d14", "d8", 9, 3, 2, 2, 4],
      [4, "1d12/I", "1d20+1d16", "d10", 10, 3, 3, 2, 4],
      [4, "1d14/I", "1d20+1d20", "d12", 11, 3, 3, 2, 5],
      [5, "1d16/I", "1d20+1d20", "d14", 12, 3, 3, 3, 5],
      [5, "1d16/I", "1d20+1d20+1d14", "d16", 14, 3, 4, 3, 6],
    ]),
    features: [
      ["Spell check", "1d20 + Personality mod + blaster die (minus armour check penalty). Learns Spellweaver Blast plus three random spells at 1st level."],
      ["Spellburn", "Burn Strength, Agility or Stamina to boost spell checks (p.119)."],
      ["Patrons", "The Amazing Rando, Circe, Medea, Barzodi, Prometheus. Invoke patron requires spellburning at least 1 point."],
      ["Pattern focus", "No familiars, no magic items, cannot scribe scrolls (can use them)."],
      ["Action dice", "Second action die can only be used for spell checks."],
    ],
    mojo: "A Mojo point for helping defeat an enemy that can cast spells or use magic abilities.",
    luck: "Luck modifier applies to Corruption and Mercurial Magic checks.",
  },
  brawler: {
    name: "Brawler", hd: 10, page: 28, species: "human",
    weapons: "Unarmed, all melee weapons, bows (any), crossbows. No firearms.",
    table: rows(["atk", "crit", "ad", "unarmed", "ref", "fort", "will"], [
      ["d3", "1d12/III", "1d20", "1d4", 1, 1, 0],
      ["d4", "1d14/III", "1d20", "1d5", 1, 1, 0],
      ["d5", "1d16/IV", "1d20", "1d5", 1, 2, 1],
      ["d6", "1d20/IV", "1d20", "1d6", 2, 2, 1],
      ["d7", "1d24/V", "1d20", "1d7", 2, 3, 1],
      ["d8", "1d30/V", "1d20+1d14", "1d7", 2, 4, 2],
      ["d10", "1d30/V", "1d20+1d16", "1d8", 3, 4, 2],
      ["d10+1", "2d20/V", "1d20+1d20", "1d8", 3, 5, 2],
      ["d10+2", "2d20/V", "1d20+1d20", "1d10", 3, 5, 3],
      ["d10+3", "2d20/V", "1d20+1d20+1d14", "1d12", 4, 6, 3],
    ]),
    features: [
      ["Deed die", "Roll the deed die on every attack and add it to attack and damage."],
      ["Mighty Deeds of Arms", "Declare before attacking; a deed die of 3+ and a hit means the Deed succeeds (p.90)."],
      ["Unarmed fighting", "Free d14 unarmed attack every round you fight with a weapon (add deed die). Or fight open-handed: two unarmed strikes at 2d16 (crit on 16, fumble only on double 1)."],
      ["Toughness", "Melee damage against you is reduced by your base Fortitude save."],
    ],
    mojo: "A Mojo point for every creature with HD equal to or higher than your level that you beat using only unarmed attacks.",
    luck: "May add Luck modifier to unarmed attack and damage rolls.",
  },
  jammer: {
    name: "Jammer", hd: 8, page: 31, species: "human",
    weapons: "Longsword, short sword, rapier, hand axe, dagger, spear, crossbow",
    table: rows(["atk", "crit", "ad", "disrespect", "devastate", "ref", "fort", "will"], [
      [1, "1d8/III", "1d20", -2, "1d3", 1, 1, 0],
      [2, "1d8/III", "1d20", -3, "1d4", 1, 1, 0],
      [2, "1d10/III", "1d20", -3, "1d5", 2, 1, 1],
      [3, "1d10/III", "1d20", -4, "1d6", 2, 2, 1],
      [4, "1d12/III", "1d20+1d14", -4, "1d7", 3, 2, 1],
      [5, "1d12/III", "1d20+1d16", -5, "1d8", 4, 2, 2],
      [5, "1d14/III", "1d20+1d20", -5, "1d10", 4, 3, 2],
      [6, "1d14/III", "1d20+1d20", -6, "1d12", 5, 3, 3],
      [7, "1d16/III", "1d20+1d20", -6, "1d14", 5, 3, 3],
      [8, "1d16/III", "1d20+1d20", -8, "1d16", 6, 4, 4],
    ]),
    features: [
      ["Chosen weapon", "AC bonus equal to class level while fighting with your chosen melee weapon and able to move. Lost in armour with check penalty -4 or worse."],
      ["Performance", "1d20 + Personality mod + class level + Luck mod with your performance specialty. Gain a new specialty each level."],
      ["Disrespect", "Full round: Performance check; target makes a Will save vs the result or is disrespected for level + Per mod rounds (min 1), taking the Disrespect penalty to attacks, spell checks, damage and Will saves."],
      ["Devastating attack", "Add the devastating attack die to damage on a successful attack against a disrespected opponent."],
      ["Lionize", "One action: Performance check on an ally (Table 1-10). Lasts class level in rounds. A natural 1 boosts an opponent."],
      ["Mojo after the roll", "Can give Mojo to allies after their die roll."],
    ],
    mojo: "A Mojo point for every failed attack roll or spell check by a disrespected opponent.",
    luck: "Adds Luck modifier to Performance checks. May add Luck modifier to AC.",
  },
  messenger: {
    name: "Messenger", hd: 8, page: 35, species: "human", caster: "messenger",
    weapons: "Deity's favoured weapon, dagger, club, staff, sling",
    table: rows(["atk", "crit", "ad", "scourge", "unholyThreat", "ref", "fort", "will"], [
      [1, "1d10/III", "1d20", "1d3", 20, 1, 1, 1],
      [2, "1d10/III", "1d20", "1d4", 19, 1, 1, 1],
      [3, "1d12/III", "1d20", "1d5", 19, 1, 2, 2],
      [3, "1d12/III", "1d20", "1d6", 19, 2, 2, 2],
      [4, "1d14/III", "1d20+1d14", "1d6", 18, 2, 3, 3],
      [5, "1d14/III", "1d20+1d16", "1d8", 18, 2, 4, 4],
      [6, "1d16/III", "1d20+1d20", "1d10", 18, 3, 4, 4],
      [6, "1d16/III", "1d20+1d20", "1d12", 16, 3, 5, 5],
      [7, "1d20/III", "1d20+1d20", "1d14", 16, 3, 5, 5],
      [8, "1d20/III", "1d20+1d20+1d14", "1d16", 15, 4, 6, 6],
    ]),
    disapproval: true,
    features: [
      ["Holy Act", "1d20 + Personality mod + class level. A natural roll within your disapproval range fails automatically: roll (natural roll)d4 − Luck mod on Table 7-7. Each failed Holy Act raises disapproval by 1; an hour of prayer each morning resets it to 1. Needs a holy symbol (or Holy Blood)."],
      ["Lay on Hands", "Holy Act (+ Luck mod) to heal dice of the target's hit die type (Table 1-12), capped at target's HD; or cure a condition (broken limb 1, organ damage/disease 2, paralysis/poison 3, blindness/deafness 4 dice)."],
      ["Bless", "Holy Act on yourself or an ally (Table 1-13). Doesn't stack."],
      ["Turn Unholy", "Holy Act to turn creatures your alignment deems unholy (p.100)."],
      ["Summon Weapon", "Holy Act to summon the deity's favoured weapon for 1 turn per CL."],
      ["Divine Aid", "Holy Act with +10 disapproval: 10 small miracle, 15 useful miracle, 20+ powerful miracle (p.293)."],
      ["Scourge", "Add scourge damage when hitting unholy creatures with your deity's favoured weapon."],
      ["Crit vs unholy", "Increased threat range against unholy creatures."],
      ["Two-fisted healing", "When laying on hands on an adjacent ally, make a free 1d14 attack (+ Luck mod) against an adjacent foe with a one-handed melee weapon."],
      ["Holy Blood", "Cut yourself for 1 damage: your blood works as a holy symbol for the encounter."],
    ],
    mojo: "A Mojo point for bringing an ally back from 0 hit points, and for every successful Turn Unholy.",
    luck: "Luck modifier applies to Lay on Hands rolls and the Two-Fisted Healing attack.",
  },
  specialist: {
    name: "Specialist", hd: 6, page: 39,
    weapons: "Short sword, dagger, sling, shortbow, hand crossbow (varies by specialty)",
    table: SPECIALIST_TABLE,
    features: [
      ["Backstab", "Add Backstab bonus when attacking an unaware target; a hit is an automatic critical."],
      ["Luck and wits", "When spending Luck, roll the Luck die per point instead of +1. Recover Luck each night equal to your level (up to your natural maximum)."],
      ["Cast spell from scroll", "Roll the listed die (+ Int mod) as a spell check. No spellburn."],
      ["Handle poison", "DC 10 safety check (1d20 + Agi mod + level) each time poison is applied; natural 1 attacking with a poisoned blade poisons you."],
    ],
  },
  dwarf: {
    name: "Dwarf", hd: 10, page: 52, species: "dwarf", speed: 20,
    weapons: "Battleaxe, hand axe, longsword, mace, short sword, spear, two-handed sword, warhammer, crossbow, javelin, shortbow, sling",
    table: rows(["atk", "crit", "ad", "ref", "fort", "will"], [
      ["d3", "1d10/III", "1d20", 1, 1, 1],
      ["d4", "1d12/III", "1d20", 1, 1, 1],
      ["d5", "1d14/III", "1d20", 1, 2, 1],
      ["d6", "1d16/IV", "1d20", 2, 2, 2],
      ["d7", "1d20/IV", "1d20+1d14", 2, 3, 2],
      ["d8", "1d24/V", "1d20+1d16", 2, 4, 2],
      ["d10+1", "1d30/V", "1d20+1d20", 3, 4, 3],
      ["d10+2", "1d30/V", "1d20+1d20", 3, 5, 3],
      ["d10+3", "2d30/V", "1d20+1d20", 3, 5, 3],
      ["d10+4", "2d30/V", "1d20+1d20+1d14", 4, 6, 4],
    ]),
    features: [
      ["Deed die & Mighty Deeds", "As the brawler: deed die to attack and damage; Deeds succeed on 3+ and a hit."],
      ["Sword and board", "With a shield, a free shield bash each round: d14 to hit + deed die, 1d3 + deed die damage."],
      ["Infravision", "60'. Base speed 20' (armour does not slow you)."],
      ["Underground skills", "Add class level to detect traps, slanting passages, shifting walls and new construction underground. Smell gold and gems within 100'."],
    ],
    mojo: "A Mojo point for every ogre, giant or troll you help defeat.",
    luck: "Lucky weapon: add your (fixed) Luck modifier to attack rolls with one chosen weapon.",
  },
  gnome: {
    name: "Gnome", hd: 6, page: 55, species: "gnome", speed: 25, caster: "gnome",
    weapons: "Short sword, dagger, crossbow, shortbow, quarterstaff",
    table: rows(["atk", "crit", "ad", "known", "mascot", "ref", "fort", "will"], [
      [1, "1d6/II", "1d20", 2, "1d3", 1, 1, 1],
      [2, "1d8/II", "1d20", 3, "1d3", 1, 1, 1],
      [2, "1d8/II", "1d20", 4, "1d4", 2, 2, 1],
      [3, "1d10/II", "1d20", 5, "1d4", 2, 2, 2],
      [3, "1d10/II", "1d20+1d14", 6, "1d5", 3, 3, 2],
      [4, "1d12/II", "1d20+1d16", 7, "1d5", 4, 4, 2],
      [5, "1d12/II", "1d20+1d20", 8, "1d6", 4, 4, 3],
      [5, "1d14/II", "1d20+1d20", 9, "1d6", 5, 5, 3],
      [6, "1d14/II", "1d20+1d20", 10, "1d7", 5, 5, 3],
      [7, "1d16/II", "1d20+1d20+1d14", 12, "1d8", 6, 6, 4],
    ]),
    skills: {
      sneak: L(4, 6, 8, 9, 10, 12, 13, 14, 15, 16),
      hide: L(5, 7, 9, 10, 11, 13, 14, 15, 16, 17),
      pickpocket: L(3, 5, 7, 8, 9, 11, 12, 13, 14, 15),
    },
    features: [
      ["Gnome magic", "Spell check: 1d20 + Personality mod + caster level. Can spellburn."],
      ["Draw agro", "Action: 1d20 + Personality mod + class level vs target's Will save (within 60', must see and hear). Failure means it attacks you next action, or takes -1d (-2d from 5th level) if it refuses."],
      ["Small & slow", "3½–4½ feet tall. Base speed 25'."],
      ["Team mascot", "A natural 20 on an attack or spell check earns the Team Mascot die in Mojo. When a natural 1 wipes the team's Mojo, you gain 1 point."],
    ],
    mojo: "A Mojo point for every draw agro victim that switches its target to you.",
    luck: "May add Luck modifier to draw agro attempts.",
  },
  halfelf: {
    name: "Half-Elf", hd: 7, page: 58, species: "halfelf", caster: "halfelf",
    weapons: "Long sword, short sword, longbow, shortbow, dagger",
    table: rows(["atk", "crit", "ad", "known", "maxLvl", "cha", "ref", "fort", "will"], [
      [1, "1d6/II", "1d20", 2, 1, "1d2", 1, 1, 1],
      [2, "1d8/II", "1d20", 3, 1, "1d3", 1, 1, 1],
      [2, "1d8/II", "1d20", 4, 1, "1d3", 1, 1, 2],
      [3, "1d10/II", "1d20", 5, 2, "1d4", 2, 2, 2],
      [3, "1d10/II", "1d20+1d14", 6, 2, "1d4", 2, 2, 3],
      [4, "1d12/II", "1d20+1d16", 7, 2, "1d5", 2, 2, 4],
      [5, "1d12/II", "1d20+1d20", 8, 3, "1d5", 3, 3, 4],
      [5, "1d14/II", "1d20+1d20", 9, 3, "1d6", 3, 3, 5],
      [6, "1d14/II", "1d20+1d20", 10, 3, "1d6", 3, 3, 5],
      [7, "1d16/II", "1d20+1d20+1d14", 11, 3, "1d7", 4, 4, 6],
    ]),
    // Table 1-21. Note: the book prints +3 for Backstab at 7th level, which breaks the progression; +6 is used here.
    skills: {
      acrobatics: L(1, 3, 5, 7, 8, 9, 10, 11, 12, 13),
      backstab: L(0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
      sneak: L(3, 5, 7, 8, 9, 11, 12, 13, 14, 15),
      hide: L(1, 3, 5, 7, 8, 9, 10, 11, 12, 13),
      climb: L(3, 5, 7, 8, 9, 11, 12, 13, 14, 15),
    },
    features: [
      ["Charisma die", "Rolled and added to Personality-based skill checks, including Grandstanding (not spell checks)."],
      ["Magic", "Spell check: 1d20 + Personality mod + caster level (minus armour check penalty). Starts with Cantrip + 1 random blaster spell. Luck check on level-up to choose the new spell."],
      ["Adventuring skills", "Climb, hide, sneak and acrobatics as the specialist; armour check penalty applies, including to backstab."],
      ["Backstab", "Automatic crit on a successful backstab, but crit die -2d unless you roll a natural 20."],
      ["Resistance", "+1d saves vs magical sleep and paralysis."],
      ["Vulnerability", "Cold iron weapons -1 to hit; cold iron armour -1 AC."],
    ],
    mojo: "A Mojo point for every point of Fame you earn.",
    luck: "May apply your (fixed) Luck modifier to all saving throws.",
  },
  halforc: {
    name: "Half-Orc", hd: 14, page: 62, species: "halforc",
    weapons: "Axes (all), bows (all), crossbows, daggers, javelins, lances, polearms, spears, swords (all), warhammers",
    table: rows(["atk", "crit", "ad", "wild", "ref", "fort", "will"], [
      ["d3", "1d10/III", "1d20", 19, 1, 1, 1],
      ["d4", "1d12/III", "1d20", 19, 1, 1, 1],
      ["d5", "1d14/III", "1d20", 19, 1, 2, 1],
      ["d5", "1d16/IV", "1d20", 18, 2, 2, 2],
      ["d6", "1d20/IV", "1d20+1d14", 18, 2, 3, 2],
      ["d7", "1d24/IV", "1d20+1d16", 17, 2, 4, 2],
      ["d8", "1d30/V", "1d20+1d20", 17, 3, 4, 3],
      ["d8", "1d30/V", "1d20+1d20", 16, 3, 5, 3],
      ["d10", "2d20/V", "1d20+1d20", 16, 3, 5, 3],
      ["d10", "2d20/V", "1d20+1d20+1d14", 15, 4, 6, 4],
    ]),
    features: [
      ["Deed die & Mighty Deeds", "As the brawler. +1 to the deed result (not hit or damage) for Deeds to frighten or intimidate."],
      ["Wild attack", "After a melee attack, goad the target into a free attack; if it bites, make an extra deed-die attack with the wild attack threat range. One per round."],
      ["Infravision", "60'."],
      ["Robust", "+1d saves vs disease and poison; heal 2 hp and 2 physical ability points per night (3 with bed rest)."],
      ["Mistrusted", "-1d on Personality skill checks in the real world (except Grandstanding, other half-orcs, Xcrawl staff, Reno) until 3rd level. +1d to intimidate, always."],
      ["Non-citizen", "Athletic visa. From 4th level, pay (10 + 1d6 − Luck mod) thousand gp in bribes to become a citizen."],
    ],
    mojo: "A Mojo point for every solo kill (you dealt all the damage).",
    luck: "May add Luck modifier to the attack and damage of your wild attack.",
  },
};

export const CLASS_ORDER = ["zero", "athlete", "blaster", "brawler", "jammer", "messenger", "specialist", "dwarf", "gnome", "halfelf", "halforc"];
export const SUB_ORDER = ["acrobat", "commando", "criminal", "scout", "cryptraider", "mechanic", "trickster", "slayer", "halfling"];

// Which classes each 0-level species may advance into (p.16, p.21)
export const SPECIES_CLASSES = {
  human: ["athlete", "blaster", "brawler", "jammer", "messenger", "specialist:acrobat", "specialist:commando", "specialist:criminal", "specialist:scout", "specialist:cryptraider"],
  dwarf: ["dwarf", "specialist:mechanic"],
  elf: ["specialist:trickster"],
  gnome: ["gnome"],
  halfelf: ["halfelf"],
  halforc: ["halforc", "specialist:slayer"],
  halfling: ["specialist:halfling"],
};

export const STARTING_WEAPONS = ["Club", "Dagger", "Sling", "Spear"];
