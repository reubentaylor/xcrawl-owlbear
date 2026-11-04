import { DICE_CHAIN } from "./data.js";

let rng = () => Math.random();
export function setRng(fn) { rng = fn; }

export function rollDie(sides) {
  if (sides <= 1) return sides;
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0xffffffff / sides) * sides;
    let x;
    do { globalThis.crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return (x % sides) + 1;
  }
  return Math.floor(rng() * sides) + 1;
}

/** Move a die size along the dice chain by `steps` (positive = bigger). */
export function shiftDie(sides, steps) {
  if (!steps) return sides;
  let idx = DICE_CHAIN.indexOf(sides);
  if (idx === -1) {
    // find nearest chain entry
    idx = DICE_CHAIN.findIndex((d) => d >= sides);
    if (idx === -1) idx = DICE_CHAIN.length - 1;
  }
  idx = Math.max(0, Math.min(DICE_CHAIN.length - 1, idx + steps));
  return DICE_CHAIN[idx];
}

/**
 * Parse an expression like "2d6+3", "d10+1", "1d20+1d14-2" into terms.
 * Returns [{n, sides, sign}] for dice and [{flat, sign}] for numbers.
 */
export function parse(expr) {
  const terms = [];
  const s = String(expr || "").replace(/\s+/g, "").toLowerCase();
  if (!s) return terms;
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[3]) {
      terms.push({ sign: m[1] === "-" ? -1 : 1, n: m[2] ? parseInt(m[2], 10) : 1, sides: parseInt(m[3], 10) });
    } else if (m[5]) {
      terms.push({ sign: m[4] === "-" ? -1 : 1, flat: parseInt(m[5], 10) });
    }
  }
  return terms;
}

/** Shift every die in an expression along the chain. */
export function shiftExpr(expr, steps) {
  if (!steps) return expr;
  return termsToString(parse(expr).map((t) => (t.sides ? { ...t, sides: shiftDie(t.sides, steps) } : t)));
}

export function termsToString(terms) {
  let out = "";
  terms.forEach((t, i) => {
    const sign = t.sign < 0 ? "-" : i === 0 ? "" : "+";
    out += sign + (t.sides ? `${t.n}d${t.sides}` : `${t.flat}`);
  });
  return out || "0";
}

/** Roll an expression. Returns {total, parts:[{label, rolls, value}], text} */
export function rollExpr(expr, label) {
  const terms = parse(expr);
  let total = 0;
  const detail = [];
  for (const t of terms) {
    if (t.sides) {
      const rolls = [];
      for (let i = 0; i < t.n; i++) rolls.push(rollDie(t.sides));
      const v = rolls.reduce((a, b) => a + b, 0) * t.sign;
      total += v;
      detail.push({ expr: `${t.sign < 0 ? "-" : ""}${t.n}d${t.sides}`, rolls, value: v });
    } else {
      total += t.flat * t.sign;
      detail.push({ expr: `${t.sign < 0 ? "-" : ""}${t.flat}`, value: t.flat * t.sign });
    }
  }
  return { total, detail, label };
}

/** "1d20+1d14" -> [20, 14] */
export function actionDice(ad) {
  return parse(ad).filter((t) => t.sides).flatMap((t) => Array(t.n).fill(t.sides));
}

export function signed(n) {
  n = Number(n) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}
