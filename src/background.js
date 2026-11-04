// Background script: adds the token context menu and turns other players' rolls into notifications.
import OBR from "@owlbear-rodeo/sdk";
import { NS, SHEET_KEY, ROLL_CHANNEL, logPush, lsGet } from "./store.js";
import { blankCharacter } from "./rules.js";

const POPOVER_ID = `${NS}/sheet`;
// Absolute URLs so the extension works when hosted in a sub-folder (e.g. GitHub Pages).
const here = (path) => new URL(path, window.location.href).href;

async function openSheetPopover(itemId) {
  const width = await OBR.viewport.getWidth();
  await OBR.popover.open({
    id: POPOVER_ID,
    url: here(`index.html?item=${encodeURIComponent(itemId)}`),
    width: Math.min(480, width - 40),
    height: 780,
    anchorReference: "POSITION",
    anchorPosition: { left: width - 16, top: 64 },
    anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    transformOrigin: { horizontal: "RIGHT", vertical: "TOP" },
    disableClickAway: true,
  });
}

OBR.onReady(() => {
  OBR.contextMenu.create({
    id: `${NS}/context-menu`,
    icons: [
      {
        icon: here("icon.svg"),
        label: "Open Xcrawl sheet",
        filter: {
          max: 1,
          every: [
            { key: "layer", value: "CHARACTER" },
            { key: ["metadata", SHEET_KEY], value: undefined, operator: "!=" },
          ],
        },
      },
      {
        icon: here("icon.svg"),
        label: "Add Xcrawl sheet",
        filter: {
          max: 1,
          every: [
            { key: "layer", value: "CHARACTER" },
            { key: ["metadata", SHEET_KEY], value: undefined },
          ],
        },
      },
    ],
    async onClick(context) {
      const item = context.items[0];
      if (!item) return;
      if (!item.metadata[SHEET_KEY]) {
        const c = blankCharacter();
        c.name = item.name || c.name;
        c.owner = OBR.player.id;
        await OBR.scene.items.updateItems([item.id], (drafts) => {
          for (const d of drafts) d.metadata[SHEET_KEY] = c;
        });
      }
      await openSheetPopover(item.id);
    },
  });

  OBR.broadcast.onMessage(ROLL_CHANNEL, async (ev) => {
    const card = ev.data;
    if (!card || typeof card !== "object") return;
    if (card.type === "amend") return;
    if (card.visibility === "gm") {
      const role = await OBR.player.getRole();
      if (role !== "GM") return;
    }
    logPush(card);
    if (lsGet("xcc-notify", true)) {
      const tags = card.tags && card.tags.length ? ` [${card.tags.join(", ")}]` : "";
      const who = String(card.char || card.player || "Someone");
      OBR.notification.show(`${who}: ${card.title} = ${card.total}${tags}`.slice(0, 180), card.tags && card.tags.some((t) => /CRIT/.test(t)) ? "SUCCESS" : "DEFAULT").catch(() => {});
    }
  });
});
