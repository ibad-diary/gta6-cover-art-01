[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ibad-diary/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ibad-diary/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
# Vice Coast — Cover Studio

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-gta6--cover--art--01-ff2e88)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun competition](https://img.shields.io/badge/make.fun-competition-open-22d3ee)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun prize](https://img.shields.io/badge/prize-%2450%20top%2050-ffd166)](https://make.fun/bounty/gta6-cover-art-01)

Turn any photo and a caption into multi-panel GTA-poster-style cover art, exported
as a PNG to share. It runs entirely offline in a desktop browser: photos are read
on your own machine and never uploaded.

## What it does

- **7 layouts** — Hero + Three, Four Panel Grid, Nine Panel Grid, Full Bleed,
  Tilted Snapshots, Triptych, and Hero + Strip.
- **5 colour grades** — Vice Sunset, Neon Nights, Miami Heat, Ocean Drive, After Dark.
- **Any photo** — upload up to 3 of your own photos (or use the two bundled
  samples), assign a photo per panel, fill every panel with one photo, and drag
  to reposition / scroll to zoom each panel, with zoom and pan sliders.
- **Lettering** — bold Anton title with a sunset gradient, Pacifico script
  subtitle, badge ribbon, a 5-star heat meter, halftone title dots, white poster
  frame, film grain and vignette.
- **Fast export** — one click exports a PNG at 1080 x 1080, 1080 x 1350, or
  1920 x 1080. Undo / redo (Ctrl+Z / Ctrl+Y) included.
- **Original art** — no game logos, artwork or fonts. Lettering uses Anton,
  Pacifico and Bebas Neue under the SIL Open Font License (see `app/fonts/OFL.txt`).

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. No build step, no network.

## Hand it in (make.fun)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the kit's vendored `vendor/makefun-app.ts` library.

## Screenshots

`screenshots/1-cover.jpg` is the cover (wide 1920 x 1080 export), `2-editor.jpg`
the studio with photos loaded, `3-cover.jpg` the nine-panel portrait cover,
`4-cover.jpg` the tilted-snapshot square cover. Scenes are scripted in
`shots.json` and rendered by the app itself (`app/src/shots.js`).

---

Referral code: `s67gjd7a`
