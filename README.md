# 🌌 Planet Merge — Fruit Cosmos

> A *Suika Game*-style fruit-merging game with a cosmic theme: radial gravity, Verlet + spring physics (squash & stretch), and synthesized audio via the Web Audio API (no mp3 files). Pure vanilla JS — no framework, no build step.

**This document describes the architecture in detail so that anyone (human or AI) can grasp the whole codebase without re-reading every file.**

---

## 1. Running the game

| Method | Action | Notes |
|---|---|---|
| **Dev build (canonical)** | `python -m http.server 8000` then open `localhost:8000` | Serves `index.html` + the separate `.js`/`.css` files. **This is the source of truth.** |
| **VS Code** | *Live Server* extension → **Go Live** | |
| **Offline bundle** | Open `suika_planet_offline.html` directly | All-in-one bundle, no server. **It is a separate, on-demand snapshot — see §9.** |

No build step, no `npm install`, no backend. Everything is static files running in the browser. Progress is saved in `localStorage`.

> The old Express + Anthropic API backend (`server.js`, `package.json`, `test-api.js`) was removed because the frontend never called it. Don't restore it unless real AI integration is needed.

---

## 2. File map

Script load order (see the bottom of `index.html`) matters — later files depend on classes from earlier ones:

```
audio.js → particles.js → level.js → physics.js → shop.js → teams.js → game.js
```

| File | Role | Exports (global) |
|---|---|---|
| `index.html` | HUD shell, canvas, overlay screens, booster bar, bottom controls, 3-tab menu (Shop/Play/Teams) | — |
| `style.css` | All UI: starfield, glassmorphism, cosmic theme, overlay animations (~40KB) | — |
| `level.js` | `FRUIT_CONFIGS` + `LevelManager` (11 levels, goals, stars, unlocking) | `FRUIT_CONFIGS`, `LevelManager` |
| `physics.js` | Verlet physics engine, collisions, merging, special mechanics (black hole / portal / membrane), **all fruit + face + custom-image drawing** | `PhysicsEngine`, `GAME_MODE`, `CUSTOM_IMAGE_PATHS` |
| `particles.js` | Particle system: merge juice, confetti, splash, black-hole absorb | `ParticleSystem` |
| `audio.js` | Web Audio API synth (click/drop/merge/win/lose/collision/splash) | `AudioSynth` |
| `shop.js` | Shop tab: buy coins/boosters/VIP/skins, daily gift | `Shop` |
| `teams.js` | Teams tab: join a team, community UI | `Teams` |
| `game.js` | **Orchestrator**: class `Game` — game loop, input, state machine, HUD, economy (coins/hearts/stars), boosters; drives every system above | `Game`, `initializeGame()` |
| `editor.html` | Standalone **Level Editor**. Reads/writes the level array inside `level.js` between the `<<LEVEL_EDITOR:START/END>>` markers | — |
| `suika_planet_offline.html` | Standalone bundle: inlines a **copy** of all JS/CSS. **On-demand only — see §9.** | — |

**Images (used as per-tier art in Custom mode):**
`Phong.png Ngoc.png Me.png Huy.png Giang.png Thai.png "A Tuan Anh.png" "C Phuong.png" "C bac.png" "A linh.png" tier4.jpg` + `mck.png` (special render for tier 5 in Custom mode).

---

## 3. Core concepts & coordinates

- **Logical canvas** is fixed at `520 × 680`, center `(cx, cy) = (260, 340)`. The canvas is CSS-scaled to fit the screen; every coordinate in code uses this logical space (preplaced fruit, centers, portals, etc.).
- **No physical planet core** (`planetRadius = 0`) — fruit falls and stacks around the center under radial gravity.
- **Gravity well**: one well at the center by default. Levels with multiple wells (`centers: [...]`) pull each fruit toward its **nearest** well (`PhysicsEngine.getNearestCenter`).
- **orbitRadius**: launcher orbit radius (the launcher rotates around the center). **warningLimit**: the limit radius — if fruit stays past it long enough, you lose.
- **Launcher orbit path**: `'circle'` by default, or `'figure8'` (a vertical Gerono lemniscate) — see §5 (Infinity Orbit) and `Game.getLauncherPos`.
- **Tier**: 0 → 10; higher = bigger. Merging 2 same-tier fruits → one tier+1 fruit.

### Fruit configuration (`FRUIT_CONFIGS`, `level.js`)
An 11-element array (index = tier), each `{ name, emoji, r, color, highlight }`:

| Tier | Name | Emoji | r(px) |
|:--:|---|:--:|:--:|
| 0 | Cherry | 🍒 | 12 |
| 1 | Strawberry | 🍓 | 16 |
| 2 | Grape | 🍇 | 21 |
| 3 | Tangerine | 🍊 | 27 |
| 4 | Persimmon | 🍅 | 33 |
| 5 | Apple | 🍎 | 40 |
| 6 | Pear | 🍐 | 48 |
| 7 | Peach | 🍑 | 56 |
| 8 | Pineapple | 🍍 | 65 |
| 9 | Melon | 🍈 | 75 |
| 10 | Watermelon | 🍉 | 86 |

---

## 4. Data model

### Physics body (`PhysicsEngine.addBody`)
```js
{
  id, x, y, px, py,           // Verlet: current + previous position (implicit velocity = x-px)
  r, tier,
  angle, idleSpin,            // self-spin
  scale, targetScale,         // spawn pop animation (overshoot 1.15 → 1.0)
  deformX, deformY,           // squash & stretch (springs)
  deformVelX, deformVelY,
  merged,                     // already consumed by a merge
  blinkTimer, blinking,       // blinking eyes
  expression, expressionTimer,// 'normal' | 'surprised'
  isSettled,                  // stabilized (avoids false overflow right after launch)
  growthPhase, crossedBoundary,
  mergeDelayFrames            // (preplaced) delay merging at level start
}
```

### Level schema (`level.js`)
```js
{
  id, name, description,
  maxSpawnTier,              // highest tier that can randomly spawn
  orbitRadius, warningLimit, // launcher orbit & limit-ring geometry
  launcherSpeed,             // orbit rotation speed (Auto-rotate mode)
  maxSpawns,                 // total shots allowed in the level
  starScores: [s1, s2, s3],  // score thresholds for 1★/2★/3★
  goals: [ ... ],            // win conditions (see below)

  // --- OPTIONAL, enable special mechanics ---
  centers:    [{x,y}, ...],          // multiple gravity wells
  preplaced:  [{tier,x,y}, ...],     // fruit already on the field at start
  blackHoles: [{x,y,radius}],        // black hole: touching fruit vanishes
  shrinkZones:[{x,y,width,height}],  // membrane: passing through drops 1 tier
  portalPairs:[ [{x,y,w,h},{x,y,w,h}] ], // teleport pair
  orbitPath:  'figure8',             // launcher path shape ('circle' default)
  orbitA, orbitB,                    // figure-8 lobe width / total height
  aimNearest: true                   // each shot aims at the nearest well (vs the centroid)
}
```

### Goal (win condition)
Two types; all goals must be met to win (`LevelManager.checkVictory`):
- `{ type: 'fruit', target: <tier>, count: <n>, current: 0 }` — create/hold `n` fruits of tier `target`. `current` is updated both by a cumulative merge counter (`trackMergeGoal`) and by the count of live fruit on the field (`syncFruitGoals`), taking the max.
- `{ type: 'score', target: <points>, current: 0 }` — reach a score threshold (`trackScore`).

> **Fruit goals are the pass requirement; `starScores` decide how many stars you earn** based on final score. Best stars per level are saved in `localStorage` (`planet_merge_best_stars`).

---

## 5. The 11 levels & special mechanics

| # | Name | Mechanic | Goal |
|:--:|---|---|---|
| 1 | Cosmic Intro | Tutorial, spawns Cherry only | 1× Tangerine (T3) |
| 2 | Sparkling Vineyard | — | 2× Grape (T2) + 1× Persimmon (T4) |
| 3 | Red Apple Gravity | — | 1× Apple (T5) |
| 4 | Peach Cosmos | — | 1× Pineapple (T8) |
| 5 | Melon Nebula | — | 1× Melon (T9) + 8× Strawberry (T1) |
| 6 | Ultimate Cosmos | — | 1× Watermelon (T10) |
| 7 | Triple Gravity | **3 gravity wells** (equilateral triangle) + preplaced fruit | 2× Tangerine (T3) |
| 8 | Void Gravity | **Black hole** above the core; touching it deletes the fruit | 1× Pear (T6) + 3× Tangerine (T3) |
| 9 | Shrink Membrane | **Horizontal membrane**; fruit passing through drops 1 tier | 1× Peach (T7) + 2× Persimmon (T4) |
| 10 | Portal Nexus | **2 portals** on the sides; exits point toward the core | 1× Pineapple (T8) + 2× Apple (T5) |
| 11 | Infinity Orbit | **Figure-8 launcher path** + **2 wells** in the top/bottom lobes; each shot aims at the nearest well | 2× Tangerine (T3) |

> All levels are currently **unlocked by default** (`level.js` forces `unlockedLevelIndex = levels.length-1`). The sequential-unlock logic still exists but is disabled.

> **Level Editor:** `editor.html` regenerates the level array between the `<<LEVEL_EDITOR:START>>` and `<<LEVEL_EDITOR:END>>` markers in `level.js`. **Do not edit or remove those two marker lines.**

**Losing:** fruit stays past `warningLimit` continuously for **3 seconds** (`overflowDuration`) → Game Over. In multi-well levels the distance is measured from the nearest well.

---

## 6. Lifecycle & state machine (`game.js`)

`Game.state`: `'menu'` → `'playing'` → `'victory' | 'gameover' | 'noHearts'`.

- `initializeGame()` runs on `window.load`, creating `new Game()`.
- The `Game` constructor builds `PhysicsEngine`, `AudioSynth`, `ParticleSystem`, `LevelManager`, `Shop`, `Teams`; loads economy from localStorage; calls `setupUI()`.
- `startLevel(idx)` → resets goals, loads `centers/preplaced/blackHoles/shrinkZones/portalPairs/orbitPath/...` into physics, sets state `'playing'`, starts `requestAnimationFrame(update)`.
- `update(timestamp)`: computes dt → `physics.update(...)` with `handleMerge`/collision/boundary callbacks → `particles.update` → checks overflow/victory → `draw()`.
- `draw()`: draws orbit guideline, core(s), special mechanics, `physics.draw(ctx)`, launcher, tutorial, floating text.
- `getLauncherPos(angle)` returns the launcher position for the level's `orbitPath` (circle or figure-8); `getAimTarget(lx,ly)` returns the aim point (nearest well when `aimNearest`, else the center).

**Controls (2 modes, saved in `planet_merge_control_mode`):**
- `auto` (Auto-rotate): the launcher orbits at `launcherSpeed`; tap/Space to shoot toward the core.
- `manual`: drag/touch to aim, release to shoot.

**Boosters (in-game bar below the canvas):**
- `vacuum` 🌀 — tap a fruit to suck it into the HELD slot, tap HELD to drop it back.
- `grow` 🔼 — tap a fruit to +1 tier (`morphFruit`).
- `slow` 🐢 — temporarily slow the orbit (`slowTimer`).
- `shuffle` 🔀 — fling all fruit into a chaotic tumble (`shuffleFruits`).

**Economy:** coins 🪙, stars ⭐, hearts ❤️ (max 5, regenerate 1 heart/30 min — `heartRegenMs`). All saved in localStorage.

---

## 7. Subsystems (key APIs)

**PhysicsEngine** (`physics.js`)
- `addBody(x,y,tier)`, `clear()`, `getNearestCenter(x,y)`
- `update(dt, onMerge, onCollision, onBoundaryCross)` — Verlet integration, squash & stretch springs, collisions, merging, black-hole/membrane/portal handling
- `draw(ctx)` → `drawFruitBody` → `drawFruitDecorations` + `drawFace` (eyes/expression)
- Tunables: `gravity=0.038`, `damping=0.985`, springs `springK=0.22`, `springDamping=0.76`

**AudioSynth** (`audio.js`): `playClick/playDrop/playMerge(tier)/playWin/playLose/playCollision(sizeFactor)/playSplash`. Synthesized sine/triangle waves, no audio files.

**ParticleSystem** (`particles.js`): `spawnMergeEffect / spawnComboJuiceEffect / spawnWatermelonExplosion / spawnConfetti / spawnSplashEffect / spawnBlackHoleAbsorption`, `update(dt)`, `draw(ctx)`.

**Shop** (`shop.js`): injects HTML into `#tab-shop`; sells coins/boosters/VIP/skins; 24h gift (`updateGiftButton`); time-limited VIP (`isVIPActive`).

**Teams** (`teams.js`): injects HTML into `#tab-teams`; join/switch team (`planet_merge_joined_team`).

---

## 8. Storage (localStorage keys)

All prefixed with `planet_merge_`:

| Key | Meaning |
|---|---|
| `coins`, `stars`, `lives` | Resources |
| `last_heart_regen` | Heart-regen timestamp |
| `unlocked_level` | Highest unlocked level (currently forced to max) |
| `best_stars` | JSON `{ "levelIdx": stars }` |
| `control_mode` | `auto` \| `manual` |
| `game_mode` | `fruit` \| `custom` (see §9) |
| `perf_mode` | `true`/`false` — disable shadows & reduce particles to hold 60 FPS |
| `ib_vacuum/ib_grow/ib_slow/ib_shuffle` | Per-booster counts |
| `joined_team` | Joined team |
| `last_gift` | Daily gift timestamp |
| `vip`, `vip_expiry` | VIP plan & expiry |
| `season_pass`, `skins` | Season pass & owned skins |

> To **reset all progress**: clear every `planet_merge_*` key in DevTools → Application → Local Storage.

---

## 9. ⚠️ Important notes for anyone editing the code

1. **`suika_planet_offline.html` is a separate copy — DO NOT auto-sync it.**
   - **Workflow rule (MANDATORY):** When editing logic in the modular files (`.js`/`.css`/`index.html`), **do NOT** mirror changes into the offline bundle. **Only rebuild the offline bundle when the owner explicitly asks** (e.g. "rebuild offline", "tổng hợp lại"). Otherwise, leave it out of date on purpose.
   - Consequence: **`suika_planet_offline.html` is currently STALE** relative to the modular files (missing recent changes). It is not the source of truth — the modular files are. When asked to rebuild it, regenerate it from the latest modular files.

2. **Custom-mode image mapping DIFFERS between the two builds** — a real trap:
   - `physics.js` `CUSTOM_IMAGE_PATHS`: T0=Phong, T1=Ngoc, T2=Me, T3=Huy, T4=Giang, T5=Thai, T6=A Tuan Anh, T7=C Phuong, T8=tier4.jpg, T9=C bac, T10=A linh.
   - `suika_planet_offline.html` (stale): a different mapping. Reconcile both only when you rebuild the offline bundle.

3. **`GAME_MODE`** (`fruit`/`custom`) decides whether to draw emoji-fruit or face photos. Custom mode has a special render for **tier 5** = `mck.png` (circle-clipped). All drawing logic lives in `physics.js`.

4. **Coordinates are the 520×680 logical space**, not screen pixels. When adding `preplaced`/`centers`/`portals`, respect the spacing rule: same-tier fruits must be placed further apart than their combined radii (see the notes in level 7 in `level.js`).

5. **Level array is editor-managed.** `editor.html` overwrites everything between the `<<LEVEL_EDITOR:START/END>>` markers in `level.js`. Keep those marker lines intact when hand-editing levels.

6. **No automated tests.** Verify by opening the game and playing each level.

---

## 10. Technical highlights

- **Verlet + springs:** fruit squashes & stretches on impact, then springs back.
- **ASMR synth:** audio generated live via the Web Audio API; merge pitch rises with tier.
- **Live expressions:** eyes blink and switch to 'surprised' before a collision/merge.
- **Multi-well gravity, black holes, shrink membranes, portals, figure-8 orbit** — advanced level mechanics.
- **Performance Mode:** disables shadows & reduces particles to keep 60 FPS on weak devices.
