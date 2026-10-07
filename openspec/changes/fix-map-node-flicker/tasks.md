# Tasks

## 1. Declared handle geometry

- [x] 1.1 In the layout module, export the handle size constant (6) and pure helpers that return the declared handles for a folder node (`in` and `out` at half height) and a panel node (`in` and `out` at half height, plus `<file>#in` and `<file>#out` per visible row at `panelRowCenter`). Each handle carries x, y, width, height, position and type, with the anchor offset by half the size. Verify that `pnpm exec tsc --noEmit` passes.
- [x] 1.2 Extend `scripts/fold-report.mts`: with every folder open, every render group's `fromHandle` and `toHandle` must appear among the declared handles of its node, with the matching type (source for `fromHandle`, target for `toHandle`). Same check with every folder closed. Verify that `pnpm exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/fold-report.mts src/data/trpc-server.parse.json` prints `RESULT: PASS`.

## 2. Canvas uses declared geometry

- [x] 2.1 In the map canvas, give every node `width`, `height` and `handles` from the layout helpers, replacing `style.width` and `style.height`. Point the `Handle` elements' size style at the shared constant. Verify that types, lint and `pnpm build` pass.

## 3. Hand-off

- [x] 3.1 Tell the user what to check on `/preview`. Sweeping the pointer across nodes and rows never blinks anything out. Clicking a row, a folder or empty canvas dims or restores without a flash. Zooming over nodes keeps the graph drawn. Opening a folder redraws only that node.
