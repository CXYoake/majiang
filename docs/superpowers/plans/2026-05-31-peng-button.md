# Peng Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `碰` button that lets the human and AI claim another player's discard with two matching concealed tiles, then discard without drawing.

**Architecture:** Reuse the existing `melds` structure and pass flow from gang. Add a pending Peng claim state, a single button in the action row, and pure helpers for finding and executing Peng. Existing self-draw-only Hu remains unchanged.

**Tech Stack:** HTML5, CSS3, plain JavaScript, browser console tests, `node --check`.

---

## Tasks

### Task 1: Rule Tests

- [ ] Add failing tests to `runRuleTests()` for Peng detection, skipping Peng when exposed Gang is available, and executing Peng without drawing.
- [ ] Run `node -e "global.window = global; require('./script.js'); global.runRuleTests();"` and confirm the test fails before implementation.

### Task 2: State and Logic

- [ ] Add `pendingPeng` to game state and reset it whenever a round starts, the turn advances, or the round ends.
- [ ] Implement `findPengOption(discardedTile, discarderId)` with exact tile matching.
- [ ] Implement `executePeng(option)` by removing the claimed discard, removing two matching concealed tiles, adding a `peng` meld, and making the claimer discard next.

### Task 3: UI

- [ ] Add `pengButton` to the action row.
- [ ] Show `碰` and `过` only when the human can claim a pending Peng.
- [ ] Keep `胡` hidden for discard claims so self-draw-only Hu remains intact.

### Task 4: Verification

- [ ] Run `node --check script.js`.
- [ ] Run `window.runRuleTests()` through Node.
- [ ] Verify the local page starts in the browser with the updated action row and no console errors.
