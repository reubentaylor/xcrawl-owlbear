// Storage: character sheets live in the metadata of their token in the Owlbear scene, so everyone
// in the room sees the same sheet. Sheets that are not attached to a token live in this browser's
// local library. Outside Owlbear (plain browser) only the local library is used.
import OBR from "@owlbear-rodeo/sdk";

export const NS = "rodeo.xcrawl-classics";
export const SHEET_KEY = `${NS}/sheet`;
export const ROOM_KEY = `${NS}/room`;
export const ROLL_CHANNEL = `${NS}/roll`;
export const LIB_KEY = "xcc-library-v1";
export const LOG_KEY = "xcc-log-v1";

export const inOwlbear = () => OBR.isAvailable;

/* ---------- sheet window (popover) placement ---------- */
export const POPOVER_ID = `${NS}/sheet`;
export const POPOVER_CHANNEL = `${NS}/popover`;
export const SIZES = { S: [380, 560], M: [480, 780], L: [580, 980] };
export const SIZE_ORDER = ["S", "M", "L"];
export function popPrefs() {
  return { side: "right", size: "M", actionSize: "M", ...lsGet("xcc-pop", {}) };
}
export function setPopPrefs(patch) {
  lsSet("xcc-pop", { ...popPrefs(), ...patch });
}
export async function sheetSize(size) {
  const [w, h] = SIZES[size] || SIZES.M;
  const [vw, vh] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
  return { width: Math.min(w, vw - 32), height: Math.min(h, vh - 80) };
}
export async function openSheetPopover(itemId) {
  const prefs = popPrefs();
  const vw = await OBR.viewport.getWidth();
  const { width, height } = await sheetSize(prefs.size);
  const right = prefs.side !== "left";
  const side = right ? "RIGHT" : "LEFT";
  await OBR.popover.open({
    id: POPOVER_ID,
    url: new URL(`index.html?item=${encodeURIComponent(itemId)}`, window.location.href).href,
    width,
    height,
    anchorReference: "POSITION",
    anchorPosition: { left: right ? vw - 16 : 16, top: 64 },
    anchorOrigin: { horizontal: side, vertical: "TOP" },
    transformOrigin: { horizontal: side, vertical: "TOP" },
    disableClickAway: true,
  });
}

/* ---------- safe localStorage ---------- */
export function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- local library ---------- */
export function libraryList() {
  const lib = lsGet(LIB_KEY, {});
  return Object.values(lib).map((data) => ({ ref: { kind: "local", id: data.id }, data, label: data.name }));
}
export function librarySave(data) {
  const lib = lsGet(LIB_KEY, {});
  lib[data.id] = data;
  return lsSet(LIB_KEY, lib);
}
export function libraryDelete(id) {
  const lib = lsGet(LIB_KEY, {});
  delete lib[id];
  lsSet(LIB_KEY, lib);
}

/* ---------- scene (tokens) ---------- */
let sceneReady = false;
export async function initScene(onChange) {
  if (!inOwlbear()) return;
  sceneReady = await OBR.scene.isReady();
  OBR.scene.onReadyChange((ready) => {
    sceneReady = ready;
    onChange();
  });
  OBR.scene.items.onChange(() => onChange());
}
export const isSceneReady = () => sceneReady;

export async function sceneList() {
  if (!inOwlbear() || !sceneReady) return [];
  const items = await OBR.scene.items.getItems((item) => item.metadata && item.metadata[SHEET_KEY] !== undefined);
  return items.map((item) => ({
    ref: { kind: "token", id: item.id },
    data: item.metadata[SHEET_KEY],
    label: item.metadata[SHEET_KEY].name || item.name,
    tokenName: item.name,
    image: item.image ? item.image.url : null,
  }));
}

export async function tokenSheet(itemId) {
  if (!inOwlbear() || !sceneReady) return null;
  const items = await OBR.scene.items.getItems([itemId]);
  if (!items.length) return null;
  return items[0].metadata[SHEET_KEY] || null;
}

export async function saveToToken(itemId, data) {
  // Assign a copy: the SDK's immer producer freezes whatever object is assigned into a draft,
  // and we keep mutating the live sheet object afterwards.
  const copy = JSON.parse(JSON.stringify(data));
  await OBR.scene.items.updateItems([itemId], (drafts) => {
    for (const d of drafts) d.metadata[SHEET_KEY] = copy;
  });
}

export async function removeFromToken(itemId) {
  await OBR.scene.items.updateItems([itemId], (drafts) => {
    for (const d of drafts) delete d.metadata[SHEET_KEY];
  });
}

/** Apply an update function to many token sheets at once (Mojo wipes, encounter awards). */
export async function updateTokenSheets(ids, fn) {
  if (!ids.length) return;
  await OBR.scene.items.updateItems(ids, (drafts) => {
    for (const d of drafts) {
      const s = d.metadata[SHEET_KEY];
      if (s) d.metadata[SHEET_KEY] = fn(JSON.parse(JSON.stringify(s)));
    }
  });
}

export async function selectedTokenIds() {
  if (!inOwlbear()) return [];
  return (await OBR.player.getSelection()) || [];
}

export async function getItemsByIds(ids) {
  if (!inOwlbear() || !sceneReady || !ids.length) return [];
  return OBR.scene.items.getItems(ids);
}

/* ---------- room state (combat flag) ---------- */
export async function getRoomState() {
  if (!inOwlbear()) return lsGet("xcc-room", { combat: false, crowdDC: 14 });
  const md = await OBR.room.getMetadata();
  return { combat: false, crowdDC: 14, ...(md[ROOM_KEY] || {}) };
}
export async function setRoomState(patch) {
  const cur = await getRoomState();
  const next = { ...cur, ...patch };
  if (!inOwlbear()) { lsSet("xcc-room", next); return next; }
  await OBR.room.setMetadata({ [ROOM_KEY]: next });
  return next;
}
export function onRoomState(cb) {
  if (!inOwlbear()) return () => {};
  return OBR.room.onMetadataChange((md) => cb({ combat: false, crowdDC: 14, ...(md[ROOM_KEY] || {}) }));
}

/* ---------- player ---------- */
export async function playerInfo() {
  if (!inOwlbear()) return { id: "local", name: "You", role: "GM", color: "#c0392b" };
  const [name, role, color] = await Promise.all([OBR.player.getName(), OBR.player.getRole(), OBR.player.getColor()]);
  return { id: OBR.player.id, name, role, color };
}

/* ---------- rolls broadcast ---------- */
export async function broadcastRoll(card) {
  if (!inOwlbear()) return;
  await OBR.broadcast.sendMessage(ROLL_CHANNEL, card, { destination: "REMOTE" });
}
export function onRemoteRoll(cb) {
  if (!inOwlbear()) return () => {};
  return OBR.broadcast.onMessage(ROLL_CHANNEL, (ev) => cb(ev.data));
}

export function notify(msg, variant = "DEFAULT") {
  if (inOwlbear()) OBR.notification.show(msg.slice(0, 200), variant).catch(() => {});
}

export function logGet() { return lsGet(LOG_KEY, []); }
export function logPush(card) {
  const log = lsGet(LOG_KEY, []);
  const i = log.findIndex((x) => x.id === card.id);
  if (i >= 0) log[i] = card;
  else log.unshift(card);
  lsSet(LOG_KEY, log.slice(0, 80));
  return log;
}
export function logClear() { lsSet(LOG_KEY, []); }

export { OBR };
