# Gang Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one `杠` button that supports concealed gang, exposed gang, and added gang, draws a supplement tile after every gang, and preserves self-draw-only Hu.

**Architecture:** Keep the static three-file game structure. Extend player state with exposed melds, add pure gang-detection helpers in `script.js`, then connect those helpers to the existing render/action loop. Tests stay in `window.runRuleTests()` and cover the state-machine edges.

**Tech Stack:** HTML5, CSS3, plain JavaScript, browser console tests, `node --check`.

---

## File Structure

- Modify `index.html`: add `gangButton` and `gangChoiceRow` to the existing action controls.
- Modify `styles.css`: style the gang button, exposed meld chips, and optional gang choices.
- Modify `script.js`: add meld state, gang detection, gang execution, supplement draw, human action handlers, AI gang choices, and rule tests.
- Modify `docs/superpowers/specs/2026-05-30-hongzhong-mahjong-design.md`: document the gang rules.

## Tasks

### Task 1: DOM Contract

- [ ] Add a `杠` button with id `gangButton` between `打出` and `胡`.
- [ ] Add an initially hidden `gangChoiceRow` container for multiple gang choices.
- [ ] Verify with a DOM-id check that both ids exist.

### Task 2: Failing Gang Tests

- [ ] Add tests to `runRuleTests()` for concealed gang detection, exposed gang detection, added gang upgrade, supplement draw, and self-draw-only discard behavior.
- [ ] Run `node -e "global.window = global; require('./script.js'); global.runRuleTests();"` and confirm the new tests fail before implementation.

### Task 3: Gang State and Rule Helpers

- [ ] Add `melds` to each player and `pendingGang` / `gangChoicesOpen` to global state.
- [ ] Implement exact-tile gang detection. Hongzhong only matches real Hongzhong.
- [ ] Update Hu checks to account for existing melds by requiring fewer concealed melds.

### Task 4: Gang Execution

- [ ] Implement concealed gang by removing four concealed tiles, adding a gang meld, drawing one supplement tile, and keeping the player in control.
- [ ] Implement exposed gang by removing the claimed discard from the discarder, removing three matching concealed tiles from the claimer, adding a gang meld, drawing one supplement tile, and making the claimer discard next.
- [ ] Implement added gang by upgrading an existing Peng meld when the player holds the fourth matching tile, drawing one supplement tile, and keeping the player in control.
- [ ] Keep Hu from discards disabled; a supplement-draw Hu remains self-draw.

### Task 5: UI and AI

- [ ] Render exposed gang melds for all players.
- [ ] Show `杠` for human concealed gang or exposed gang claims.
- [ ] Show `过` only for human exposed gang claims.
- [ ] Let AI automatically take the first available gang.

### Task 6: Verification

- [ ] Run `node --check script.js`.
- [ ] Run `window.runRuleTests()` through Node.
- [ ] Open the local page in the in-app browser and verify the game still starts, the action row renders, and normal turn flow continues.
