# Xcrawl Classics Sheets for Owlbear Rodeo

Character sheets for Xcrawl Classics that live on your tokens. They cover 0-level funnel characters, every class (athlete, blaster, brawler, jammer, messenger, specialist, dwarf, gnome, half-elf and half-orc) and all nine specialist specialties (acrobat, commando, criminal, scout, crypt raider, dwarf mechanic, elf trickster, half-orc slayer and halfling rogue).

The class tables, specialist skill tables, birth augurs, the occupation table, armour, weapons, spell lists, deities and the Lionize, Bless, Summon Weapon and Lay on Hands tables all come from the XCC RPG corebook.

## What it does

- **Sheets on tokens.** Right-click a character token and choose **Add Xcrawl sheet** or **Open Xcrawl sheet**. The sheet is stored in the token's metadata, so everyone in the room sees the same sheet and it stays with the scene.
- **Party view.** The toolbar button opens a roster of every sheet in the scene, showing HP, AC, Mojo, Luck and Fame. You also get a personal library of sheets kept in your browser, which you can attach to a token later.
- **Funnel generator.** Rolls 3d6 in order, a birth augur, an occupation (with species, starting equipment, armour and gold), a starting weapon and 1d4 HP. **Roll 4 for the funnel** makes a full set.
- **Level up.** At 10 XP you choose a class from those your species allows (dwarves can be dwarves or mechanics, elves can only be tricksters, and so on). Each new level rolls HP with your Stamina and augur.
- **Derived numbers.** These are calculated from the book's tables:
  - attack bonus or deed die, crit die and table, action dice and saves
  - AC, including scramble, jammer chosen weapon, Luck to AC and augur, and armour that is too heavy
  - speed, initiative (including the slayer's Cunning) and the specialist skill totals with their ability modifier and armour check penalty
  - spells known and maximum spell level, adjusted for Personality
- **Rolls.** Every roll button builds the roll and shows a breakdown, and results are broadcast to the room:
  - **Attacks:** action die choice, Mighty Deeds, backstab (auto-crit, sub-class crit tables), unholy targets (messenger threat range and scourge, crypt raider +1d crit), disrespected targets (devastating attack), wild attacks, brawler free strike and open hand, dwarf shield bash, two-fisted healing, athlete grapple checks and grapple damage using the same training die result
  - **Crits and fumbles:** these use Luck, the augur and Stricken of Cupid's double Luck. Fumbles use the fumble die for your armour
  - **Class rolls:** Holy Acts with automatic disapproval, Disapproval rolls ((nat)d4 − Luck), Lay on Hands, Bless and Summon Weapon results, Turn Unholy, Divine Aid (+10), spell checks per class (blaster die, CL, Luck for tricksters, armour penalty, spellburn), scroll casting, Performance, Disrespect and Lionize, and Draw Agro
  - **General rolls:** Grandstanding (Fame modifier, half-elf charisma die, crypt raider −1d, +1 Fame buttons), Xcrawl knowledge, Luck checks, saves and untrained d10 checks
- **Luck.** You can burn Luck after a roll. Specialists roll their Luck die for each point. Commandos and slayers get +1d on damage, and crypt raiders get +2d against un-dead. There is also a night's-rest Luck recovery button.
- **Mojo:**
  - Give Mojo to a teammate. It is added automatically to their next eligible roll (attack, spell, skill or ability check, but not saves or damage).
  - Jammers can add Mojo after someone else's roll from the log.
  - When the GM starts combat, natural 20s earn Mojo (gnomes roll their Team Mascot die) and natural 1s wipe everyone's Mojo (gnomes keep 1).
  - GM buttons: **Encounter won: +1 Mojo all** and **Wipe Mojo**.
- **Monster and NPC sheets (judge only):**
  - Includes all 60 stat blocks from the corebook's Monsters chapter (pp.321–345), from Aangervark to Wolf, plus the sample NPCs.
  - Select one or more monster tokens and use **Add to selected tokens** in the party panel. Each token gets its own numbered sheet with rolled hit points.
  - Right-click a token and choose **Add monster sheet**, then fill it in from the corebook list or paste any stat block in the standard `Name: Init …; Atk …; … AL C.` format.
  - One-click rolls for initiative, attacks with each action die, deed-die attacks with matching damage, damage, crits on the right monster crit table, saves and hit points.
  - Monster sheets and their rolls are GM-only by default. Players can't open them unless you tick **Let players see this sheet**.
- **Next roll modifiers.** Set a ±mod and ±dice-chain shift, and choose who sees the roll (everyone, GM only, or only you).

## Install

Add this manifest URL in Owlbear Rodeo (profile → **Extensions → Add Extension**), then enable it in your room:

```
https://reubentaylor.github.io/xcrawl-owlbear/manifest.json
```

Every push to `main` rebuilds the site automatically through GitHub Actions (`.github/workflows/deploy.yml`).

### Hosting it yourself

### Easiest: GitHub Pages

1. Create a new GitHub repository (for example `xcrawl-owlbear`).
2. Upload the **contents of the `dist` folder** to the repository root. Don't upload the folder itself.
3. In the repository, go to **Settings → Pages**, set the source to the `main` branch, root folder, and save.
4. After a minute your manifest is at `https://<your-username>.github.io/xcrawl-owlbear/manifest.json`.
5. In Owlbear Rodeo, open your profile → **Extensions → Add Extension**, paste that manifest URL, then enable it in your room.

### Building from source

```bash
npm install
npm run build      # outputs to dist/
npm run dev        # local dev server on http://localhost:5173
```

For local testing inside Owlbear, run `npm run dev` and add `http://localhost:5173/manifest.json` as an extension.

Opening `index.html` in a normal browser, outside Owlbear, works as a standalone sheet manager. It saves to that browser.

## Notes and limits

- Owlbear limits how much data a token can hold (about 16 kB). A full sheet is normally 3–6 kB, and you get a warning if very long notes push it near the limit.
- Players must be allowed to edit tokens for their changes to save. That is the default, but it doesn't work if a token is locked or room permissions restrict edits.
- Results that depend on the judge are reported but not decided for you: hitting AC, Will saves against Disrespect and Draw Agro, crit and fumble table entries, and Turn Unholy by HD. The card tells you which table to look up.
- Half-elf adventuring skills: the book prints the 7th-level Backstab bonus as +3, which breaks the progression. The sheet uses +6.
