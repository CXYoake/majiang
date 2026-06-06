# Hongzhong Mahjong HTML5 Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current login page with a playable pure-front-end Hongzhong Mahjong game: one human player, three simple AI opponents, Hongzhong wildcards, basic Hu detection, and lightweight scoring.

**Architecture:** Keep the existing static three-file project. `index.html` defines a stable game-table DOM contract, `styles.css` renders the responsive Mahjong table and tiles, and `script.js` owns pure rule functions, game state, AI turns, scoring, rendering, event handling, and internal rule tests. Rule functions stay independent from DOM handlers so they can be tested from the browser console.

**Tech Stack:** HTML5, CSS3, plain JavaScript, browser console tests, `node --check` syntax verification.

---

## Scope Check

This plan implements one cohesive subsystem: a static single-player Mahjong game. It does not include online multiplayer, accounts, persistence, sound, image tile art, chi, full fan scoring, or advanced AI.

## File Structure

- Modify `index.html`: replace the login screen with the game table shell, player areas, central discard area, action controls, result dialog, and script/style links.
- Modify `styles.css`: replace auth styles with green-felt table styling, responsive player seats, tile visuals, buttons, dialog, logs, and mobile layout.
- Modify `script.js`: replace login behavior with tile definitions, wall/deal logic, Hongzhong wildcard Hu detection, AI discard scoring, game loop, scoring, rendering, events, and `window.runRuleTests()`.
- Keep `docs/superpowers/specs/2026-05-30-hongzhong-mahjong-design.md` as the source spec.

The directory is not currently a git repository. Commit steps are included for workers who initialize git first; otherwise record changed files in the final handoff.

---

### Task 1: Replace the Page Shell

**Files:**
- Modify: `index.html`
- Verify: `index.html`

- [ ] **Step 1: Replace `index.html` with the Mahjong game DOM contract**

Use this complete file content:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>红中麻将 | Daxiami</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="mahjong-app" aria-label="红中麻将">
      <section class="game-header" aria-label="游戏信息">
        <div>
          <p class="eyebrow">HTML5 Mahjong</p>
          <h1>红中麻将</h1>
        </div>
        <div class="round-stats" aria-label="局面状态">
          <span id="wallCount">牌墙 0</span>
          <span id="turnIndicator">准备开局</span>
        </div>
        <button class="ghost-button" id="newRoundButton" type="button">新开一局</button>
      </section>

      <section class="table-shell" aria-label="麻将桌">
        <div class="seat seat-top" id="seat-2"></div>
        <div class="seat seat-left" id="seat-3"></div>
        <div class="seat seat-right" id="seat-1"></div>

        <section class="table-center" aria-label="牌桌中央">
          <div class="discard-board" id="discardBoard" aria-label="弃牌区"></div>
          <div class="table-status">
            <strong id="statusTitle">准备开局</strong>
            <span id="statusText">点击“新开一局”开始。</span>
          </div>
        </section>

        <section class="player-zone" aria-label="你的区域">
          <div class="player-summary" id="seat-0"></div>
          <div class="hand-row" id="playerHand" aria-label="你的手牌"></div>
          <div class="action-row" aria-label="操作按钮">
            <button class="primary-button" id="discardButton" type="button" disabled>打出</button>
            <button class="win-button" id="huButton" type="button" hidden>胡</button>
            <button class="ghost-button" id="passButton" type="button" hidden>过</button>
          </div>
        </section>
      </section>

      <aside class="log-panel" aria-label="最近动作">
        <h2>最近动作</h2>
        <ol id="actionLog"></ol>
      </aside>
    </main>

    <dialog class="result-dialog" id="resultDialog" aria-labelledby="resultTitle">
      <div class="result-card">
        <h2 id="resultTitle">本局结束</h2>
        <p id="resultText"></p>
        <div class="score-list" id="scoreList"></div>
        <button class="primary-button" id="dialogNewRoundButton" type="button">再来一局</button>
      </div>
    </dialog>

    <script src="./script.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Run the DOM contract check**

Run:

```bash
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const ids=['wallCount','turnIndicator','newRoundButton','discardBoard','statusTitle','statusText','seat-0','seat-1','seat-2','seat-3','playerHand','discardButton','huButton','passButton','actionLog','resultDialog','resultTitle','resultText','scoreList','dialogNewRoundButton']; const missing=ids.filter(id=>!html.includes('id=\"'+id+'\"')); if(missing.length){throw new Error('Missing ids: '+missing.join(', '));} console.log('DOM contract ok');"
```

Expected:

```text
DOM contract ok
```

- [ ] **Step 3: Commit if git is available**

Run:

```bash
git add index.html
git commit -m "feat: add mahjong game shell"
```

Expected when git is initialized:

```text
[branch hash] feat: add mahjong game shell
```

If git is not initialized, skip this command and record `index.html` in the final changed-file list.

---

### Task 2: Implement the Rule Core and Internal Tests

**Files:**
- Modify: `script.js`
- Verify: browser console and `node --check script.js`

- [ ] **Step 1: Replace `script.js` with rule-first scaffolding and failing tests**

Use this complete starting content. It intentionally calls rule functions before their final implementation so `window.runRuleTests()` reports failures until Step 3.

```javascript
const SUITS = ["wan", "tong", "tiao"];
const SUIT_LABELS = { wan: "万", tong: "筒", tiao: "条", zhong: "中" };
const PLAYER_NAMES = ["你", "电脑东", "电脑北", "电脑西"];

const state = {
  players: [],
  wall: [],
  currentPlayer: 0,
  selectedTileId: null,
  phase: "idle",
  pendingWin: null,
  winner: null,
  lastDiscard: null,
  log: []
};

function tileKey(tile) {
  return tile.suit === "zhong" ? "zhong" : `${tile.suit}-${tile.rank}`;
}

function tileName(tile) {
  if (tile.suit === "zhong") return "红中";
  return `${tile.rank}${SUIT_LABELS[tile.suit]}`;
}

function makeTile(suit, rank, copy) {
  return {
    id: suit === "zhong" ? `zhong-${copy}` : `${suit}-${rank}-${copy}`,
    suit,
    rank,
    copy
  };
}

function createWall() {
  const tiles = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank += 1) {
      for (let copy = 0; copy < 4; copy += 1) {
        tiles.push(makeTile(suit, rank, copy));
      }
    }
  }
  for (let copy = 0; copy < 4; copy += 1) {
    tiles.push(makeTile("zhong", 0, copy));
  }
  return tiles;
}

function sortTiles(tiles) {
  const suitOrder = { wan: 0, tong: 1, tiao: 2, zhong: 3 };
  return [...tiles].sort((a, b) => {
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return a.rank - b.rank;
  });
}

function canHu(hand) {
  return false;
}

function runRuleTests() {
  const t = (suit, rank, copy = 0) => makeTile(suit, rank, copy);
  const z = (copy = 0) => makeTile("zhong", 0, copy);
  const cases = [
    {
      name: "basic Hu without Hongzhong",
      hand: [t("wan", 1), t("wan", 2), t("wan", 3), t("wan", 4), t("wan", 5), t("wan", 6), t("tong", 2), t("tong", 3), t("tong", 4), t("tiao", 7), t("tiao", 7, 1), t("tiao", 7, 2), t("wan", 9), t("wan", 9, 1)],
      expected: true
    },
    {
      name: "Hu with one Hongzhong completing sequence",
      hand: [t("wan", 1), t("wan", 2), z(), t("wan", 4), t("wan", 5), t("wan", 6), t("tong", 2), t("tong", 3), t("tong", 4), t("tiao", 7), t("tiao", 7, 1), t("tiao", 7, 2), t("wan", 9), t("wan", 9, 1)],
      expected: true
    },
    {
      name: "Hu with multiple Hongzhong",
      hand: [t("wan", 1), z(0), t("wan", 3), t("wan", 4), t("wan", 5), t("wan", 6), t("tong", 2), z(1), t("tong", 4), t("tiao", 7), t("tiao", 7, 1), t("tiao", 7, 2), t("wan", 9), z(2)],
      expected: true
    },
    {
      name: "non-winning hand",
      hand: [t("wan", 1), t("wan", 1, 1), t("wan", 3), t("wan", 5), t("wan", 7), t("tong", 1), t("tong", 3), t("tong", 5), t("tong", 7), t("tiao", 1), t("tiao", 3), t("tiao", 5), t("tiao", 7), t("tiao", 9)],
      expected: false
    },
    {
      name: "seven pairs is out of scope",
      hand: [t("wan", 1), t("wan", 1, 1), t("wan", 2), t("wan", 2, 1), t("wan", 3), t("wan", 3, 1), t("tong", 1), t("tong", 1, 1), t("tong", 2), t("tong", 2, 1), t("tiao", 1), t("tiao", 1, 1), t("tiao", 2), t("tiao", 2, 1)],
      expected: false
    }
  ];

  const results = cases.map((testCase) => {
    const actual = canHu(testCase.hand);
    return { ...testCase, actual, pass: actual === testCase.expected };
  });
  console.table(results.map(({ name, expected, actual, pass }) => ({ name, expected, actual, pass })));
  const failed = results.filter((result) => !result.pass);
  if (failed.length > 0) {
    throw new Error(`${failed.length} rule test(s) failed`);
  }
  return results;
}

window.runRuleTests = runRuleTests;
```

- [ ] **Step 2: Verify tests fail for the intended reason**

Open `index.html` in a browser and run:

```javascript
window.runRuleTests()
```

Expected:

```text
Error: 3 rule test(s) failed
```

The failing tests should be the three Hu-capable hands because `canHu()` still returns `false`.

- [ ] **Step 3: Replace `canHu()` with the Hongzhong wildcard implementation**

Replace the `canHu` function with this complete function group:

```javascript
function canHu(hand) {
  if (!Array.isArray(hand) || hand.length % 3 !== 2) return false;

  const wildcards = hand.filter((tile) => tile.suit === "zhong").length;
  const counts = buildSuitCounts(hand.filter((tile) => tile.suit !== "zhong"));

  for (const pairChoice of enumeratePairChoices(counts, wildcards)) {
    const remaining = cloneCounts(counts);
    if (pairChoice.suit !== "zhong") {
      remaining[pairChoice.suit][pairChoice.rank] -= pairChoice.naturalCount;
    }
    if (canFormMelds(remaining, wildcards - pairChoice.wildcardsUsed)) {
      return true;
    }
  }

  return false;
}

function buildSuitCounts(tiles) {
  const counts = {
    wan: Array(10).fill(0),
    tong: Array(10).fill(0),
    tiao: Array(10).fill(0)
  };
  for (const tile of tiles) {
    counts[tile.suit][tile.rank] += 1;
  }
  return counts;
}

function cloneCounts(counts) {
  return {
    wan: [...counts.wan],
    tong: [...counts.tong],
    tiao: [...counts.tiao]
  };
}

function enumeratePairChoices(counts, wildcards) {
  const choices = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank += 1) {
      const natural = counts[suit][rank];
      if (natural >= 2) {
        choices.push({ suit, rank, naturalCount: 2, wildcardsUsed: 0 });
      }
      if (natural >= 1 && wildcards >= 1) {
        choices.push({ suit, rank, naturalCount: 1, wildcardsUsed: 1 });
      }
    }
  }
  if (wildcards >= 2) {
    choices.push({ suit: "zhong", rank: 0, naturalCount: 0, wildcardsUsed: 2 });
  }
  return choices;
}

function canFormMelds(counts, wildcards) {
  const first = findFirstTile(counts);
  if (!first) {
    return wildcards % 3 === 0;
  }

  const { suit, rank } = first;

  if (counts[suit][rank] > 0) {
    const tripletNeed = 3 - Math.min(3, counts[suit][rank]);
    if (tripletNeed <= wildcards) {
      const nextCounts = cloneCounts(counts);
      nextCounts[suit][rank] -= 3 - tripletNeed;
      if (canFormMelds(nextCounts, wildcards - tripletNeed)) {
        return true;
      }
    }
  }

  if (rank <= 7) {
    let sequenceNeed = 0;
    const nextCounts = cloneCounts(counts);
    for (let offset = 0; offset < 3; offset += 1) {
      const currentRank = rank + offset;
      if (nextCounts[suit][currentRank] > 0) {
        nextCounts[suit][currentRank] -= 1;
      } else {
        sequenceNeed += 1;
      }
    }
    if (sequenceNeed <= wildcards && canFormMelds(nextCounts, wildcards - sequenceNeed)) {
      return true;
    }
  }

  return false;
}

function findFirstTile(counts) {
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank += 1) {
      if (counts[suit][rank] > 0) {
        return { suit, rank };
      }
    }
  }
  return null;
}
```

- [ ] **Step 4: Verify rule tests pass**

Run in the browser console:

```javascript
window.runRuleTests()
```

Expected:

```text
Array(11)
```

The console table must show `pass: true` for all rule cases.

- [ ] **Step 5: Verify JavaScript syntax**

Run:

```bash
node --check script.js
```

Expected:

```text
```

`node --check` prints no output when syntax is valid.

- [ ] **Step 6: Commit if git is available**

Run:

```bash
git add script.js
git commit -m "feat: add hongzhong hu rules"
```

Expected when git is initialized:

```text
[branch hash] feat: add hongzhong hu rules
```

---

### Task 3: Add Game State, Wall, Dealing, and Scoring Helpers

**Files:**
- Modify: `script.js`
- Verify: browser console and `node --check script.js`

- [ ] **Step 1: Add the game setup helpers after `sortTiles()`**

Insert this code after `sortTiles()`:

```javascript
function shuffle(tiles) {
  const shuffled = [...tiles];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function createPlayers() {
  return PLAYER_NAMES.map((name, index) => ({
    id: index,
    name,
    score: 1000,
    hand: [],
    discards: [],
    isHuman: index === 0
  }));
}

function resetRound() {
  const previousScores = state.players.length > 0
    ? state.players.map((player) => player.score)
    : PLAYER_NAMES.map(() => 1000);
  state.players = createPlayers();
  state.players.forEach((player, index) => {
    player.score = previousScores[index] ?? 1000;
  });
  state.wall = shuffle(createWall());
  state.currentPlayer = 0;
  state.selectedTileId = null;
  state.phase = "player-turn";
  state.pendingWin = null;
  state.winner = null;
  state.lastDiscard = null;
  state.log = [];

  for (let draw = 0; draw < 13; draw += 1) {
    for (const player of state.players) {
      player.hand.push(state.wall.pop());
    }
  }

  drawTile(0);
  sortAllHands();
  addLog("新的一局开始，你先摸牌。");
}

function sortAllHands() {
  for (const player of state.players) {
    player.hand = sortTiles(player.hand);
  }
}

function drawTile(playerId) {
  if (state.wall.length === 0) {
    endDrawGame();
    return null;
  }
  const tile = state.wall.pop();
  state.players[playerId].hand.push(tile);
  return tile;
}

function removeTileFromHand(player, tileId) {
  const tileIndex = player.hand.findIndex((tile) => tile.id === tileId);
  if (tileIndex === -1) return null;
  const [tile] = player.hand.splice(tileIndex, 1);
  return tile;
}

function countHongzhong(hand) {
  return hand.filter((tile) => tile.suit === "zhong").length;
}

function addLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 8);
}

function calculateSettlement(winnerId, loserId, winType, winningHand) {
  const winner = state.players[winnerId];
  if (!winner) {
    throw new Error("Settlement requires a valid winner.");
  }
  if (winType !== "self" && winType !== "discard") {
    throw new Error("Settlement winType must be self or discard.");
  }
  if (winType === "discard" && !Array.isArray(winningHand)) {
    throw new Error("Discard settlement requires an explicit winning hand.");
  }
  if (winType === "discard" && !state.players[loserId]) {
    throw new Error("Discard settlement requires a valid discarder.");
  }
  if (winType === "discard" && loserId === winnerId) {
    throw new Error("Discard settlement winner and discarder must be different players.");
  }
  const settlementHand = winningHand || winner.hand;
  const bonus = countHongzhong(settlementHand);
  const payments = [];

  if (winType === "self") {
    for (const player of state.players) {
      if (player.id !== winnerId) {
        payments.push({ from: player.id, to: winnerId, amount: 2 + bonus });
      }
    }
  } else {
    payments.push({ from: loserId, to: winnerId, amount: 3 + bonus });
  }

  for (const payment of payments) {
    state.players[payment.from].score -= payment.amount;
    state.players[payment.to].score += payment.amount;
  }

  return {
    winner,
    winType,
    bonus,
    payments,
    label: winType === "self" ? "自摸" : "点炮",
    detail: `基础胡 + ${bonus} 红中奖励`
  };
}

function snapshotState() {
  return JSON.parse(JSON.stringify(state));
}

function restoreState(snapshot) {
  Object.assign(state, JSON.parse(JSON.stringify(snapshot)));
}

function withStateSnapshot(callback) {
  const snapshot = snapshotState();
  try {
    return callback();
  } finally {
    restoreState(snapshot);
  }
}

state.players = createPlayers();
```

- [ ] **Step 2: Add setup tests to `runRuleTests()`**

Add these state-helper checks at the end of `runRuleTests()` before `return results;`. Keep them wrapped in `withStateSnapshot()` so running public tests from the browser console cannot destroy the current round:

```javascript
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const assertThrows = (callback, message) => {
    let didThrow = false;
    try {
      callback();
    } catch (error) {
      didThrow = true;
    }
    if (!didThrow) throw new Error(message);
  };
  const wall = createWall();
  assert(wall.length === 112, "wall should contain 112 tiles");
  const stateBeforeSetupChecks = JSON.stringify(state);
  withStateSnapshot(() => {
    state.players = createPlayers();
    state.players[0].score = 1234;
    state.players[0].hand = [t("wan", 1), t("wan", 2)];
    state.players[0].discards = [t("tong", 9)];
    state.wall = [t("tiao", 1), t("tiao", 2)];
    state.currentPlayer = 2;
    state.selectedTileId = "kept-selection";
    state.phase = "player-turn";
    state.pendingWin = { playerId: 0 };
    state.winner = 1;
    state.lastDiscard = { tile: t("wan", 9), playerId: 3 };
    state.log = ["keep this log"];
    resetRound();
    assert(state.players[0].hand.length === 14, "human starts with 14 tiles after first draw");
    assert(state.players.slice(1).every((player) => player.hand.length === 13), "AI players start with 13 tiles");
    assert(state.wall.length === 59, "wall should have 59 tiles after deal and first draw");
    state.players[0].score = 1314;
    resetRound();
    assert(state.players[0].score === 1314, "resetRound should preserve existing scores");
    state.players = createPlayers();
    state.players[0].hand = [z(0), z(1)];
    const selfSettlement = calculateSettlement(0, null, "self");
    assert(selfSettlement.bonus === 2, "self settlement should count Hongzhong bonus");
    assert(state.players[0].score === 1012, "self settlement should collect from all three opponents");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 1)];
    const discardSettlement = calculateSettlement(0, 1, "discard", [t("wan", 1), z(0)]);
    assert(discardSettlement.bonus === 1, "discard settlement should count explicit winning hand bonus");
    assert(state.players[0].score === 1004 && state.players[1].score === 996, "discard settlement should charge discarder with bonus");
    assertThrows(() => calculateSettlement(0, 1, "discard"), "discard settlement should require explicit winning hand");
    assertThrows(() => calculateSettlement(0, 1, "other", [t("wan", 1)]), "settlement should reject invalid winType");
    assertThrows(() => calculateSettlement(0, 9, "discard", [t("wan", 1)]), "discard settlement should require valid discarder");
    assertThrows(() => calculateSettlement(0, 0, "discard", [t("wan", 1)]), "discard settlement should reject same winner and discarder");
  });
  assert(JSON.stringify(state) === stateBeforeSetupChecks, "runRuleTests should restore game state after setup checks");
```

- [ ] **Step 3: Verify tests pass**

Run in the browser console:

```javascript
window.runRuleTests()
```

Expected:

```text
Array(11)
```

No setup assertion failures should appear, and the live game state should be unchanged after `window.runRuleTests()`.

- [ ] **Step 4: Verify JavaScript syntax**

Run:

```bash
node --check script.js
```

Expected: no output.

- [ ] **Step 5: Commit if git is available**

Run:

```bash
git add script.js
git commit -m "feat: add mahjong round setup"
```

Expected when git is initialized:

```text
[branch hash] feat: add mahjong round setup
```

---

### Task 4: Add Rendering and Player Controls

**Files:**
- Modify: `script.js`
- Verify: browser interaction and `node --check script.js`

- [ ] **Step 1: Add DOM references near the top of `script.js` after `state`**

Insert:

```javascript
const els = {
  wallCount: document.querySelector("#wallCount"),
  turnIndicator: document.querySelector("#turnIndicator"),
  newRoundButton: document.querySelector("#newRoundButton"),
  discardBoard: document.querySelector("#discardBoard"),
  statusTitle: document.querySelector("#statusTitle"),
  statusText: document.querySelector("#statusText"),
  playerHand: document.querySelector("#playerHand"),
  discardButton: document.querySelector("#discardButton"),
  huButton: document.querySelector("#huButton"),
  passButton: document.querySelector("#passButton"),
  actionLog: document.querySelector("#actionLog"),
  resultDialog: document.querySelector("#resultDialog"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  scoreList: document.querySelector("#scoreList"),
  dialogNewRoundButton: document.querySelector("#dialogNewRoundButton"),
  seats: [
    document.querySelector("#seat-0"),
    document.querySelector("#seat-1"),
    document.querySelector("#seat-2"),
    document.querySelector("#seat-3")
  ]
};
```

- [ ] **Step 2: Add rendering helpers after `calculateSettlement()`**

Insert:

```javascript
function render() {
  renderHeader();
  renderSeats();
  renderHand();
  renderDiscards();
  renderActions();
  renderLog();
}

function renderHeader() {
  els.wallCount.textContent = `牌墙 ${state.wall.length}`;
  const current = state.players[state.currentPlayer];
  els.turnIndicator.textContent = state.phase === "ended" ? "本局结束" : `轮到 ${current ? current.name : "准备"}`;
}

function renderSeats() {
  state.players.forEach((player) => {
    const seat = els.seats[player.id];
    const hiddenCount = player.isHuman ? player.hand.length : player.hand.length;
    seat.innerHTML = `
      <div class="seat-name">${player.name}</div>
      <div class="seat-score">${player.score} 分</div>
      <div class="mini-tiles" aria-label="${player.name} 手牌数量">
        ${Array.from({ length: Math.min(hiddenCount, 14) }, () => `<span class="tile-back"></span>`).join("")}
      </div>
    `;
  });
}

function renderHand() {
  const player = state.players[0];
  els.playerHand.innerHTML = sortTiles(player.hand).map((tile) => {
    const selected = tile.id === state.selectedTileId ? " is-selected" : "";
    const wildcard = tile.suit === "zhong" ? " is-zhong" : "";
    return `<button class="tile${selected}${wildcard}" type="button" data-tile-id="${tile.id}" aria-label="${tileName(tile)}">${tileFace(tile)}</button>`;
  }).join("");
}

function tileFace(tile) {
  if (tile.suit === "zhong") return `<strong>中</strong><small>红</small>`;
  return `<strong>${tile.rank}</strong><small>${SUIT_LABELS[tile.suit]}</small>`;
}

function renderDiscards() {
  els.discardBoard.innerHTML = state.players.map((player) => `
    <div class="discard-lane">
      <b>${player.name}</b>
      <div class="discard-tiles">
        ${player.discards.map((tile) => `<span class="discard-tile ${tile.suit === "zhong" ? "is-zhong" : ""}">${tileName(tile)}</span>`).join("")}
      </div>
    </div>
  `).join("");
}

function renderActions() {
  if (state.phase === "idle") {
    els.discardButton.disabled = true;
    els.huButton.hidden = true;
    els.passButton.hidden = true;
    els.statusTitle.textContent = "准备开局";
    els.statusText.textContent = "点击“新开一局”开始。";
    return;
  }

  const isHumanTurn = state.currentPlayer === 0 && state.phase === "player-turn";
  const canHumanClaimDiscard = state.pendingWin?.playerId === 0;
  const canDiscard = isHumanTurn && Boolean(state.selectedTileId);
  els.discardButton.disabled = !canDiscard;
  els.huButton.hidden = !(canHumanClaimDiscard || (isHumanTurn && canHu(state.players[0].hand)));
  els.passButton.hidden = !state.pendingWin || state.pendingWin.playerId !== 0;

  if (state.phase === "ended") {
    els.statusTitle.textContent = "本局结束";
  } else if (state.pendingWin?.playerId === 0) {
    els.statusTitle.textContent = "可以胡牌";
    els.statusText.textContent = `你可以胡 ${tileName(state.pendingWin.tile)}。`;
  } else if (isHumanTurn) {
    els.statusTitle.textContent = canHu(state.players[0].hand) ? "可以自摸" : "你的回合";
    els.statusText.textContent = canHu(state.players[0].hand) ? "点击“胡”结束本局，或继续打出一张牌。" : "选择一张手牌打出。";
  } else {
    els.statusTitle.textContent = "电脑思考中";
    els.statusText.textContent = "请稍等。";
  }
}

function renderLog() {
  els.actionLog.innerHTML = state.log.map((item) => `<li>${item}</li>`).join("");
}
```

- [ ] **Step 3: Add player event handlers near the end of `script.js`**

Insert:

```javascript
function bindEvents() {
  els.newRoundButton.addEventListener("click", startNewRound);
  els.dialogNewRoundButton.addEventListener("click", startNewRound);
  els.playerHand.addEventListener("click", handleHandClick);
  els.playerHand.addEventListener("dblclick", handleHandDoubleClick);
  els.discardButton.addEventListener("click", discardSelectedTile);
  els.huButton.addEventListener("click", claimHumanHu);
  els.passButton.addEventListener("click", passPendingWin);
}

function startNewRound() {
  if (els.resultDialog.open) els.resultDialog.close();
  resetRound();
  render();
}

function handleHandClick(event) {
  const tileButton = event.target.closest("[data-tile-id]");
  if (!tileButton || state.currentPlayer !== 0 || state.phase !== "player-turn") return;
  state.selectedTileId = tileButton.dataset.tileId;
  render();
}

function handleHandDoubleClick(event) {
  const tileButton = event.target.closest("[data-tile-id]");
  if (!tileButton || state.currentPlayer !== 0 || state.phase !== "player-turn") return;
  state.selectedTileId = tileButton.dataset.tileId;
  discardSelectedTile();
}

function discardSelectedTile() {
  if (state.currentPlayer !== 0 || state.phase !== "player-turn" || !state.selectedTileId) return;
  discardTile(0, state.selectedTileId);
}

function claimHumanHu() {
  if (state.pendingWin?.playerId === 0) {
    state.players[0].hand.push(state.pendingWin.tile);
    const winningHand = [...state.players[0].hand];
    sortAllHands();
    finishRound(0, state.pendingWin.fromPlayerId, "discard", winningHand);
    return;
  }
  if (state.currentPlayer === 0 && canHu(state.players[0].hand)) {
    finishRound(0, null, "self");
  }
}

function passPendingWin() {
  if (state.pendingWin?.playerId !== 0) return;
  state.pendingWin = null;
  advanceTurn();
}

bindEvents();
render();
```

- [ ] **Step 4: Add temporary missing functions so syntax and first render are stable**

Insert before `bindEvents()`:

```javascript
function discardTile(playerId, tileId) {
  const player = state.players[playerId];
  const tile = removeTileFromHand(player, tileId);
  if (!tile) return;
  player.discards.push(tile);
  state.lastDiscard = { tile, playerId };
  state.selectedTileId = null;
  addLog(`${player.name} 打出 ${tileName(tile)}。`);
  advanceTurn();
}

function advanceTurn() {
  state.currentPlayer = (state.currentPlayer + 1) % 4;
  state.phase = state.currentPlayer === 0 ? "player-turn" : "ai-turn";
  if (state.currentPlayer === 0) {
    drawTile(0);
    sortAllHands();
    addLog("你摸牌。");
  }
  render();
}

function finishRound(winnerId, loserId, winType, winningHand) {
  const settlement = calculateSettlement(winnerId, loserId, winType, winningHand);
  state.phase = "ended";
  state.winner = winnerId;
  addLog(`${settlement.winner.name} ${settlement.label}，${settlement.detail}。`);
  render();
}

function endDrawGame() {
  state.phase = "ended";
  state.winner = null;
  addLog("牌墙摸完，流局。");
}
```

- [ ] **Step 5: Verify page starts and human can discard once**

Open `index.html` in the browser. Click “新开一局”, click one tile, then click “打出”.

Expected:

```text
The selected tile moves into the discard area, the log records the discard, and the turn indicator moves away from the human player.
```

- [ ] **Step 6: Verify JavaScript syntax**

Run:

```bash
node --check script.js
```

Expected: no output.

- [ ] **Step 7: Commit if git is available**

Run:

```bash
git add script.js
git commit -m "feat: render playable mahjong table"
```

Expected when git is initialized:

```text
[branch hash] feat: render playable mahjong table
```

---

### Task 5: Add AI Turns, Discard Wins, Draw Wins, and Settlement Dialog

**Files:**
- Modify: `script.js`
- Verify: browser interaction and console tests

- [ ] **Step 1: Replace `discardTile()` and `advanceTurn()` with win-aware versions**

Replace both functions with:

```javascript
function discardTile(playerId, tileId) {
  if (state.phase === "ended") return;
  const player = state.players[playerId];
  const tile = removeTileFromHand(player, tileId);
  if (!tile) return;

  player.discards.push(tile);
  state.lastDiscard = { tile, playerId };
  state.selectedTileId = null;
  addLog(`${player.name} 打出 ${tileName(tile)}。`);

  const winnerId = findDiscardWinner(tile, playerId);
  if (winnerId !== null) {
    if (winnerId === 0) {
      state.pendingWin = { playerId: 0, fromPlayerId: playerId, tile, winningHand: [...state.players[0].hand, tile] };
      state.phase = "player-turn";
      render();
      return;
    }
    state.players[winnerId].hand.push(tile);
    finishRound(winnerId, playerId, "discard", [...state.players[winnerId].hand]);
    return;
  }

  advanceTurn();
}

function advanceTurn() {
  if (state.phase === "ended") return;
  state.currentPlayer = (state.currentPlayer + 1) % 4;
  state.pendingWin = null;

  if (state.wall.length === 0) {
    endDrawGame();
    showResultDialog(null);
    render();
    return;
  }

  const drawn = drawTile(state.currentPlayer);
  sortAllHands();
  addLog(`${state.players[state.currentPlayer].name} 摸牌。`);

  if (canHu(state.players[state.currentPlayer].hand)) {
    finishRound(state.currentPlayer, null, "self");
    return;
  }

  if (state.currentPlayer === 0) {
    state.phase = "player-turn";
    render();
    return;
  }

  state.phase = "ai-turn";
  render();
  window.setTimeout(() => playAiTurn(state.currentPlayer), 650);
}
```

- [ ] **Step 2: Add AI and discard-win helpers before `bindEvents()`**

Insert:

```javascript
function findDiscardWinner(discardedTile, discarderId) {
  for (let offset = 1; offset < 4; offset += 1) {
    const playerId = (discarderId + offset) % 4;
    const candidateHand = [...state.players[playerId].hand, discardedTile];
    if (canHu(candidateHand)) {
      return playerId;
    }
  }
  return null;
}

function playAiTurn(playerId) {
  if (state.phase !== "ai-turn" || state.currentPlayer !== playerId || state.phase === "ended") return;
  const player = state.players[playerId];
  const tile = chooseAiDiscard(player.hand);
  discardTile(playerId, tile.id);
}

function chooseAiDiscard(hand) {
  const scored = hand.map((tile) => ({ tile, score: scoreDiscardCandidate(tile, hand) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].tile;
}

function scoreDiscardCandidate(tile, hand) {
  if (tile.suit === "zhong") return -100;

  let score = 10;
  const same = hand.filter((item) => item.suit === tile.suit && item.rank === tile.rank).length;
  const left = hand.some((item) => item.suit === tile.suit && item.rank === tile.rank - 1);
  const right = hand.some((item) => item.suit === tile.suit && item.rank === tile.rank + 1);
  const gapLeft = hand.some((item) => item.suit === tile.suit && item.rank === tile.rank - 2);
  const gapRight = hand.some((item) => item.suit === tile.suit && item.rank === tile.rank + 2);

  if (same >= 2) score -= 8;
  if (left) score -= 4;
  if (right) score -= 4;
  if (gapLeft) score -= 2;
  if (gapRight) score -= 2;
  if (tile.rank === 1 || tile.rank === 9) score += 2;

  return score;
}

function showResultDialog(settlement) {
  if (!settlement) {
    els.resultTitle.textContent = "流局";
    els.resultText.textContent = "牌墙摸完，没有玩家胡牌。";
  } else {
    els.resultTitle.textContent = `${settlement.winner.name} 胡牌`;
    els.resultText.textContent = `${settlement.label}：${settlement.detail}`;
  }

  els.scoreList.innerHTML = state.players.map((player) => `
    <div>
      <span>${player.name}</span>
      <strong>${player.score} 分</strong>
    </div>
  `).join("");

  if (!els.resultDialog.open) {
    els.resultDialog.showModal();
  }
}
```

- [ ] **Step 3: Update `finishRound()` to show settlement**

Replace `finishRound()` with:

```javascript
function finishRound(winnerId, loserId, winType, winningHand) {
  const settlement = calculateSettlement(winnerId, loserId, winType, winningHand);
  state.phase = "ended";
  state.winner = winnerId;
  state.pendingWin = null;
  addLog(`${settlement.winner.name} ${settlement.label}，${settlement.detail}。`);
  render();
  showResultDialog(settlement);
}
```

- [ ] **Step 4: Update `endDrawGame()` to render draw state**

Replace `endDrawGame()` with:

```javascript
function endDrawGame() {
  state.phase = "ended";
  state.winner = null;
  state.pendingWin = null;
  addLog("牌墙摸完，流局。");
}
```

- [ ] **Step 5: Verify a full automated table loop**

Open `index.html`, click “新开一局”, discard a tile whenever it is your turn, and wait through AI turns.

Expected:

```text
AI players draw and discard automatically, the log keeps updating, Hu ends the round when a player has a valid hand, and the result dialog shows scores.
```

- [ ] **Step 6: Verify JavaScript syntax**

Run:

```bash
node --check script.js
```

Expected: no output.

- [ ] **Step 7: Commit if git is available**

Run:

```bash
git add script.js
git commit -m "feat: add ai turns and settlement"
```

Expected when git is initialized:

```text
[branch hash] feat: add ai turns and settlement
```

---

### Task 6: Replace the Visual Design

**Files:**
- Modify: `styles.css`
- Verify: browser visual inspection

- [ ] **Step 1: Replace `styles.css` with responsive Mahjong table styles**

Use this complete file content:

```css
:root {
  color-scheme: light;
  --felt: #0f766e;
  --felt-dark: #0b4f49;
  --ink: #17212b;
  --muted: #667085;
  --paper: #fffaf0;
  --tile: #fff7e8;
  --tile-edge: #d8c39f;
  --line: rgba(255, 255, 255, 0.22);
  --red: #c92a2a;
  --gold: #d8a12d;
  --blue: #2563eb;
  --shadow: 0 24px 70px rgba(6, 22, 28, 0.22);
}

* {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  margin: 0;
  font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--ink);
  background: #e8eef2;
}

button {
  font: inherit;
}

.mahjong-app {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  padding: clamp(14px, 2vw, 24px);
}

.game-header {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--felt-dark);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: clamp(28px, 4vw, 44px);
}

.round-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: end;
}

.round-stats span,
.seat,
.log-panel,
.result-card {
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 12px 32px rgba(20, 40, 48, 0.08);
}

.round-stats span {
  padding: 9px 12px;
  border-radius: 8px;
  font-weight: 700;
}

.primary-button,
.ghost-button,
.win-button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  cursor: pointer;
  font-weight: 800;
}

.primary-button {
  color: white;
  background: var(--felt);
}

.win-button {
  color: white;
  background: var(--red);
}

.ghost-button {
  color: var(--felt-dark);
  background: white;
  border: 1px solid rgba(15, 118, 110, 0.22);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.table-shell {
  min-height: 640px;
  position: relative;
  display: grid;
  grid-template-columns: 150px 1fr 150px;
  grid-template-rows: 96px 1fr auto;
  gap: 14px;
  padding: clamp(14px, 2vw, 22px);
  border-radius: 18px;
  background:
    linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255,255,255,.08) 1px, transparent 1px),
    radial-gradient(circle at 50% 42%, #16877d, var(--felt-dark));
  background-size: 44px 44px, 44px 44px, auto;
  box-shadow: var(--shadow);
}

.seat {
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
}

.seat-top {
  grid-column: 2;
  grid-row: 1;
}

.seat-left {
  grid-column: 1;
  grid-row: 2;
}

.seat-right {
  grid-column: 3;
  grid-row: 2;
}

.seat-name {
  font-weight: 900;
}

.seat-score {
  margin-top: 3px;
  color: var(--muted);
  font-size: 13px;
}

.mini-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 10px;
}

.tile-back {
  width: 18px;
  height: 26px;
  border-radius: 4px;
  background: linear-gradient(145deg, #155e57, #0d3f3a);
  border: 1px solid rgba(255,255,255,.18);
}

.table-center {
  grid-column: 2;
  grid-row: 2;
  min-height: 300px;
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 12px;
}

.discard-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.12);
}

.discard-lane {
  min-height: 104px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.discard-lane b {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
}

.discard-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.discard-tile {
  min-width: 34px;
  padding: 5px 6px;
  border-radius: 5px;
  background: rgba(255, 250, 240, 0.92);
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.discard-tile.is-zhong {
  color: var(--red);
}

.table-status {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 8px;
  color: white;
  background: rgba(0, 0, 0, 0.2);
}

.table-status span {
  color: rgba(255, 255, 255, 0.78);
  text-align: right;
}

.player-zone {
  grid-column: 1 / 4;
  grid-row: 3;
  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: end;
  gap: 14px;
}

.player-summary {
  border-radius: 8px;
}

.hand-row {
  min-height: 88px;
  display: flex;
  align-items: end;
  gap: 6px;
  overflow-x: auto;
  padding: 8px 4px 12px;
}

.tile {
  width: 48px;
  height: 70px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  gap: 2px;
  border: 1px solid var(--tile-edge);
  border-bottom-width: 5px;
  border-radius: 7px;
  color: var(--ink);
  background: linear-gradient(160deg, #fffdf8, var(--tile));
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.16);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.tile strong {
  font-size: 24px;
  line-height: 1;
}

.tile small {
  font-size: 12px;
  font-weight: 900;
}

.tile.is-zhong {
  color: var(--red);
}

.tile.is-selected {
  transform: translateY(-12px);
  box-shadow: 0 18px 24px rgba(0, 0, 0, 0.2);
}

.action-row {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
}

.log-panel {
  border-radius: 8px;
  padding: 14px 16px;
}

.log-panel h2 {
  margin-bottom: 8px;
  font-size: 17px;
}

.log-panel ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
}

.result-dialog {
  border: 0;
  padding: 0;
  background: transparent;
}

.result-dialog::backdrop {
  background: rgba(7, 20, 24, 0.55);
}

.result-card {
  width: min(420px, calc(100vw - 32px));
  border-radius: 8px;
  padding: 22px;
}

.result-card p {
  margin: 10px 0 16px;
  color: var(--muted);
}

.score-list {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.score-list div {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f4f7f8;
}

@media (max-width: 820px) {
  .mahjong-app {
    padding: 10px;
  }

  .game-header {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .round-stats {
    justify-content: start;
  }

  .table-shell {
    min-height: 680px;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto 1fr auto;
  }

  .seat-top,
  .seat-left,
  .seat-right {
    grid-row: auto;
    grid-column: auto;
  }

  .seat-top {
    grid-column: 1 / 3;
  }

  .table-center {
    grid-column: 1 / 3;
    grid-row: 3;
  }

  .player-zone {
    grid-column: 1 / 3;
    grid-row: 4;
    grid-template-columns: 1fr;
  }

  .player-summary {
    display: none;
  }

  .action-row {
    padding-bottom: 0;
  }

  .tile {
    width: 42px;
    height: 62px;
  }

  .discard-board {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Verify visual layout**

Open `index.html`, click “新开一局”, and resize the browser from desktop width to mobile width.

Expected:

```text
The table is green felt, four seats remain visible, the human hand scrolls horizontally when needed, and controls do not overlap cards or logs.
```

- [ ] **Step 3: Commit if git is available**

Run:

```bash
git add styles.css
git commit -m "style: add mahjong table design"
```

Expected when git is initialized:

```text
[branch hash] style: add mahjong table design
```

---

### Task 7: Final Verification and Fixes

**Files:**
- Modify only files needed to fix verification failures: `index.html`, `styles.css`, `script.js`
- Verify: all commands and manual checks below

- [ ] **Step 1: Run syntax verification**

Run:

```bash
node --check script.js
```

Expected: no output.

- [ ] **Step 2: Run rule tests in browser console**

Open `index.html` and run:

```javascript
window.runRuleTests()
```

Expected:

```text
Array(11)
```

Every row in the console table shows `pass: true`.

- [ ] **Step 3: Verify core manual flow**

Perform this sequence:

```text
1. Click 新开一局.
2. Confirm your hand shows 14 tiles and AI seats show tile backs.
3. Select a tile.
4. Click 打出.
5. Wait for AI turns until it is your turn again.
6. Continue until a Hu dialog or draw dialog appears.
7. Click 再来一局.
```

Expected:

```text
No JavaScript errors appear. Turns advance, scores render, the dialog can start a new round, and the table remains interactive.
```

- [ ] **Step 4: Verify responsive layout**

Check these viewport widths:

```text
1280px desktop
820px tablet boundary
390px mobile
```

Expected:

```text
Text stays inside buttons and panels, the player hand is scrollable on mobile, and no seat overlaps the discard board.
```

- [ ] **Step 5: Final commit if git is available**

Run:

```bash
git add index.html styles.css script.js docs/superpowers/specs/2026-05-30-hongzhong-mahjong-design.md docs/superpowers/plans/2026-05-30-hongzhong-mahjong.md
git commit -m "feat: build hongzhong mahjong game"
```

Expected when git is initialized:

```text
[branch hash] feat: build hongzhong mahjong game
```

If git is not initialized, provide the final changed-file list instead of a commit hash.
