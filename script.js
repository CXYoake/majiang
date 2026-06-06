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
  pendingPeng: null,
  pendingGang: null,
  gangChoicesOpen: false,
  winner: null,
  lastDiscard: null,
  log: []
};

const hasDocument = typeof document !== "undefined";
const els = hasDocument ? {
  wallCount: document.querySelector("#wallCount"),
  turnIndicator: document.querySelector("#turnIndicator"),
  newRoundButton: document.querySelector("#newRoundButton"),
  discardBoard: document.querySelector("#discardBoard"),
  statusTitle: document.querySelector("#statusTitle"),
  statusText: document.querySelector("#statusText"),
  playerHand: document.querySelector("#playerHand"),
  discardButton: document.querySelector("#discardButton"),
  pengButton: document.querySelector("#pengButton"),
  gangButton: document.querySelector("#gangButton"),
  gangChoiceRow: document.querySelector("#gangChoiceRow"),
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
} : null;

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
    melds: [],
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
  state.pendingPeng = null;
  state.pendingGang = null;
  state.gangChoicesOpen = false;
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

function countPlayerHongzhong(player) {
  const meldTiles = (player.melds || []).flatMap((meld) => meld.tiles);
  return countHongzhong([...player.hand, ...meldTiles]);
}

function addLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 8);
}

function endDrawGame() {
  state.phase = "ended";
  state.winner = null;
  state.pendingWin = null;
  state.pendingPeng = null;
  state.pendingGang = null;
  state.gangChoicesOpen = false;
  addLog("牌墙摸完，流局。");
}

function calculateSettlement(winnerId, loserId = null, winType = "self") {
  const winner = state.players[winnerId];
  if (!winner) {
    throw new Error("Settlement requires a valid winner.");
  }
  if (winType !== "self") {
    throw new Error("Only self-draw wins are allowed.");
  }
  const bonus = countPlayerHongzhong(winner);
  const payments = [];

  for (const player of state.players) {
    if (player.id !== winnerId) {
      payments.push({ from: player.id, to: winnerId, amount: 2 + bonus });
    }
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
    label: "自摸",
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

function matchingTiles(player, key) {
  return player.hand.filter((tile) => tileKey(tile) === key);
}

function removeTilesFromHand(player, tileIds) {
  const removed = [];
  for (const tileId of tileIds) {
    const tile = removeTileFromHand(player, tileId);
    if (tile) removed.push(tile);
  }
  return removed;
}

function getConcealedGangOptions(playerId) {
  const player = state.players[playerId];
  if (!player) return [];
  const counts = new Map();
  for (const tile of player.hand) {
    const key = tileKey(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .map(([key]) => {
      const tiles = matchingTiles(player, key).slice(0, 4);
      return {
        type: "concealed",
        playerId,
        tileKey: key,
        label: tileName(tiles[0]),
        tileIds: tiles.map((tile) => tile.id)
      };
    });
}

function getAddedGangOptions(playerId) {
  const player = state.players[playerId];
  if (!player) return [];
  return (player.melds || [])
    .map((meld, meldIndex) => ({ meld, meldIndex }))
    .filter(({ meld }) => meld.type === "peng")
    .map(({ meld, meldIndex }) => {
      const tiles = matchingTiles(player, meld.tileKey);
      if (tiles.length === 0) return null;
      return {
        type: "added",
        playerId,
        meldIndex,
        tileKey: meld.tileKey,
        label: tileName(tiles[0]),
        tileIds: [tiles[0].id]
      };
    })
    .filter(Boolean);
}

function findExposedGangOption(discardedTile, discarderId) {
  if (!discardedTile) return null;
  const key = tileKey(discardedTile);
  for (let offset = 1; offset < 4; offset += 1) {
    const playerId = (discarderId + offset) % 4;
    const player = state.players[playerId];
    if (!player) continue;
    const tiles = matchingTiles(player, key);
    if (tiles.length >= 3) {
      return {
        type: "exposed",
        playerId,
        fromPlayerId: discarderId,
        tile: discardedTile,
        tileKey: key,
        label: tileName(discardedTile),
        tileIds: tiles.slice(0, 3).map((tile) => tile.id)
      };
    }
  }
  return null;
}

function findPengOption(discardedTile, discarderId) {
  if (!discardedTile) return null;
  const key = tileKey(discardedTile);
  for (let offset = 1; offset < 4; offset += 1) {
    const playerId = (discarderId + offset) % 4;
    const player = state.players[playerId];
    if (!player) continue;
    const tiles = matchingTiles(player, key);
    if (tiles.length >= 2) {
      return {
        type: "peng",
        playerId,
        fromPlayerId: discarderId,
        tile: discardedTile,
        tileKey: key,
        label: tileName(discardedTile),
        tileIds: tiles.slice(0, 2).map((tile) => tile.id)
      };
    }
  }
  return null;
}

function getHumanGangOptions() {
  if (state.pendingGang?.playerId === 0) {
    return [state.pendingGang];
  }
  if (state.currentPlayer === 0 && state.phase === "player-turn") {
    return [...getConcealedGangOptions(0), ...getAddedGangOptions(0)];
  }
  return [];
}

function shouldAiPeng(option) {
  const player = state.players[option.playerId];
  if (!player) return false;

  const newMeldCount = (player.melds?.length || 0) + 1;
  const newHandLength = 14 - newMeldCount * 3;
  if (player.hand.length - 2 === newHandLength) return true;
  if (player.hand.length - 2 >= newHandLength + 1 && state.wall.length > 15) return true;
  if (state.wall.length < 10) return false;

  const otherTiles = player.hand.filter((t) => tileKey(t) !== option.tileKey);
  const singles = otherTiles.filter((t) =>
    otherTiles.filter((x) => tileKey(x) === tileKey(t)).length === 1
  ).length;
  return singles <= 5;
}

function executePeng(option) {
  if (!option) return false;
  const player = state.players[option.playerId];
  const discarder = state.players[option.fromPlayerId];
  if (!player || !discarder) return false;
  player.melds ||= [];
  state.pendingPeng = null;
  state.pendingGang = null;
  state.gangChoicesOpen = false;
  const discardIndex = discarder.discards.findIndex((tile) => tile.id === option.tile.id);
  if (discardIndex === -1) return false;
  const tiles = matchingTiles(player, option.tileKey).slice(0, 2);
  if (tiles.length < 2) return false;

  const [claimedTile] = discarder.discards.splice(discardIndex, 1);
  const removedTiles = removeTilesFromHand(player, tiles.map((tile) => tile.id));
  if (removedTiles.length < 2) return false;
  player.melds.push({
    type: "peng",
    tileKey: option.tileKey,
    fromPlayerId: option.fromPlayerId,
    tiles: [claimedTile, ...removedTiles]
  });

  state.currentPlayer = option.playerId;
  state.selectedTileId = null;
  addLog(`${player.name} 碰 ${tileName(claimedTile)}。`);
  if (option.playerId === 0) {
    state.phase = "player-turn";
    render();
    return true;
  }
  state.phase = "ai-turn";
  render();
  scheduleAiTurn(option.playerId);
  return true;
}

function executeGang(option) {
  if (!option) return false;
  const player = state.players[option.playerId];
  if (!player) return false;
  player.melds ||= [];
  state.pendingGang = null;
  state.gangChoicesOpen = false;

  let meldTiles = [];
  if (option.type === "concealed") {
    const tiles = matchingTiles(player, option.tileKey).slice(0, 4);
    if (tiles.length < 4) return false;
    meldTiles = removeTilesFromHand(player, tiles.map((tile) => tile.id));
    if (meldTiles.length < 4) return false;
    player.melds.push({ type: "concealed", tileKey: option.tileKey, tiles: meldTiles });
    addLog(`${player.name} 暗杠 ${tileName(meldTiles[0])}。`);
  } else if (option.type === "added") {
    const meld = player.melds[option.meldIndex];
    const tiles = matchingTiles(player, option.tileKey).slice(0, 1);
    if (!meld || meld.type !== "peng" || tiles.length < 1) return false;
    const removedTiles = removeTilesFromHand(player, [tiles[0].id]);
    if (removedTiles.length < 1) return false;
    meld.type = "added";
    meld.tiles.push(removedTiles[0]);
    meldTiles = meld.tiles;
    addLog(`${player.name} 补杠 ${tileName(removedTiles[0])}。`);
  } else if (option.type === "exposed") {
    const discarder = state.players[option.fromPlayerId];
    if (!discarder) return false;
    const discardIndex = discarder.discards.findIndex((tile) => tile.id === option.tile.id);
    if (discardIndex === -1) return false;
    const tiles = matchingTiles(player, option.tileKey).slice(0, 3);
    if (tiles.length < 3) return false;
    const [claimedTile] = discarder.discards.splice(discardIndex, 1);
    const removedTiles = removeTilesFromHand(player, tiles.map((tile) => tile.id));
    if (removedTiles.length < 3) return false;
    meldTiles = [claimedTile, ...removedTiles];
    player.melds.push({
      type: "exposed",
      tileKey: option.tileKey,
      fromPlayerId: option.fromPlayerId,
      tiles: meldTiles
    });
    addLog(`${player.name} 明杠 ${tileName(claimedTile)}。`);
  } else {
    return false;
  }

  state.currentPlayer = option.playerId;
  drawGangSupplement(option.playerId);
  return true;
}

function drawGangSupplement(playerId) {
  const player = state.players[playerId];
  if (!player) return;
  if (state.wall.length === 0) {
    endDrawGame();
    showResultDialog(null);
    render();
    return;
  }

  drawTile(playerId);
  sortAllHands();
  addLog(`${player.name} 杠后补摸。`);

  if (canHuPlayer(player)) {
    finishRound(playerId);
    return;
  }

  if (playerId === 0) {
    state.phase = "player-turn";
    render();
    return;
  }

  state.phase = "ai-turn";
  render();
  scheduleAiTurn(playerId);
}

state.players = createPlayers();

function render() {
  if (!els) return;
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
    if (!seat) return;
    const hiddenCount = player.hand.length;
    seat.innerHTML = `
      <div class="seat-name">${player.name}</div>
      <div class="seat-score">${player.score} 分</div>
      <div class="mini-tiles" aria-label="${player.name} 手牌数量">
        ${Array.from({ length: Math.min(hiddenCount, 14) }, () => `<span class="tile-back"></span>`).join("")}
      </div>
      ${renderMelds(player)}
    `;
  });
}

function renderMelds(player) {
  if (!player.melds?.length) return "";
  return `
    <div class="meld-row" aria-label="${player.name} 已亮牌">
      ${player.melds.map((meld) => {
        const source = meld.fromPlayerId != null ? state.players[meld.fromPlayerId]?.name : "";
        const sourceLabel = source ? ` ← ${source}` : "";
        return `
        <span class="meld-chip ${meld.type === "concealed" ? "is-concealed" : "is-exposed"}">
          ${gangTypeLabel(meld.type)} ${tileName(meld.tiles[0])}${sourceLabel}
        </span>`;
      }).join("")}
    </div>
  `;
}

function gangTypeLabel(type) {
  if (type === "concealed") return "暗杠";
  if (type === "added") return "补杠";
  if (type === "peng") return "碰";
  return "明杠";
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
    els.pengButton.hidden = true;
    els.gangButton.hidden = true;
    els.gangChoiceRow.hidden = true;
    els.huButton.hidden = true;
    els.passButton.hidden = true;
    els.statusTitle.textContent = "准备开局";
    els.statusText.textContent = "点击“新开一局”开始。";
    return;
  }

  const isHumanTurn = state.currentPlayer === 0 && state.phase === "player-turn";
  const isPendingHumanPeng = state.pendingPeng?.playerId === 0;
  const isPendingHumanGang = state.pendingGang?.playerId === 0;
  const humanGangOptions = isPendingHumanGang
    ? [state.pendingGang]
    : (isHumanTurn ? [...getConcealedGangOptions(0), ...getAddedGangOptions(0)] : []);
  const canDiscard = isHumanTurn && !isPendingHumanPeng && !isPendingHumanGang && Boolean(state.selectedTileId);
  els.discardButton.disabled = !canDiscard;
  els.pengButton.hidden = !isPendingHumanPeng;
  els.pengButton.disabled = !isPendingHumanPeng;
  els.gangButton.hidden = humanGangOptions.length === 0;
  els.gangButton.disabled = humanGangOptions.length === 0;
  els.huButton.hidden = isPendingHumanPeng || isPendingHumanGang || !(isHumanTurn && canHuPlayer(state.players[0]));
  els.passButton.hidden = !(isPendingHumanPeng || isPendingHumanGang);
  renderGangChoices(humanGangOptions);

  if (state.phase === "ended") {
    els.statusTitle.textContent = "本局结束";
    els.statusText.textContent = "点击“新开一局”继续。";
  } else if (isPendingHumanPeng && isPendingHumanGang) {
    const gangSource = state.players[state.pendingGang.fromPlayerId]?.name || "";
    const pengSource = state.players[state.pendingPeng.fromPlayerId]?.name || "";
    els.statusTitle.textContent = "可以杠或碰";
    els.statusText.textContent = `${gangSource} 打出 ${tileName(state.pendingGang.tile)}，你可以杠、碰或跳过。`;
  } else if (isPendingHumanPeng) {
    const source = state.players[state.pendingPeng.fromPlayerId]?.name || "";
    els.statusTitle.textContent = "可以碰牌";
    els.statusText.textContent = `${source} 打出 ${tileName(state.pendingPeng.tile)}，你可以碰或点"过"跳过。`;
  } else if (isPendingHumanGang) {
    const source = state.players[state.pendingGang.fromPlayerId]?.name || "";
    els.statusTitle.textContent = "可以杠牌";
    els.statusText.textContent = `${source} 打出 ${tileName(state.pendingGang.tile)}，你可以杠或点"过"跳过。`;
  } else if (isHumanTurn) {
    const canSelfDraw = canHuPlayer(state.players[0]);
    const canGang = humanGangOptions.length > 0;
    els.statusTitle.textContent = canSelfDraw ? "可以自摸" : canGang ? "可以杠牌" : "你的回合";
    els.statusText.textContent = canSelfDraw
      ? "点击“胡”结束本局，或继续打出一张牌。"
      : canGang
        ? "点击“杠”补摸一张，或继续打出一张牌。"
        : "选择一张手牌打出。";
  } else {
    els.statusTitle.textContent = "电脑思考中";
    els.statusText.textContent = "请稍等。";
  }
}

function renderGangChoices(options) {
  if (!els.gangChoiceRow) return;
  const shouldShowChoices = state.gangChoicesOpen && options.length > 1;
  els.gangChoiceRow.hidden = !shouldShowChoices;
  els.gangChoiceRow.innerHTML = shouldShowChoices
    ? options.map((option, index) => `
      <button class="gang-choice" type="button" data-gang-index="${index}">
        ${gangTypeLabel(option.type)} ${option.label}
      </button>
    `).join("")
    : "";
}

function renderLog() {
  els.actionLog.innerHTML = state.log.map((item) => `<li>${item}</li>`).join("");
}

function canHu(hand, meldCount = 0) {
  const requiredLength = 14 - meldCount * 3;
  if (!Array.isArray(hand) || meldCount < 0 || meldCount > 4 || hand.length !== requiredLength) return false;
  if (meldCount === 0 && isSevenPairsShape(hand)) return false;

  const wildcards = hand.filter((tile) => tile.suit === "zhong").length;
  const suitedTiles = hand.filter((tile) => tile.suit !== "zhong");
  const counts = buildSuitCounts(suitedTiles);

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

function canHuPlayer(player) {
  return canHu(player.hand, player.melds?.length || 0);
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
  const tripletNeed = 3 - Math.min(3, counts[suit][rank]);
  if (tripletNeed <= wildcards) {
    const nextCounts = cloneCounts(counts);
    nextCounts[suit][rank] -= 3 - tripletNeed;
    if (canFormMelds(nextCounts, wildcards - tripletNeed)) {
      return true;
    }
  }

  for (let startRank = Math.max(1, rank - 2); startRank <= Math.min(rank, 7); startRank += 1) {
    let sequenceNeed = 0;
    const nextCounts = cloneCounts(counts);
    for (let offset = 0; offset < 3; offset += 1) {
      const currentRank = startRank + offset;
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

function isSevenPairsShape(hand) {
  if (hand.length !== 14) return false;
  let wildcards = 0;
  const counts = new Map();
  for (const tile of hand) {
    if (tile.suit === "zhong") {
      wildcards += 1;
      continue;
    }
    const key = tileKey(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let wildcardsNeeded = 0;
  for (const count of counts.values()) {
    wildcardsNeeded += count % 2;
  }

  return wildcardsNeeded <= wildcards && (wildcards - wildcardsNeeded) % 2 === 0;
}

function discardTile(playerId, tileId) {
  if (state.phase === "ended") return;
  const player = state.players[playerId];
  const tile = removeTileFromHand(player, tileId);
  if (!tile) return;

  player.discards.push(tile);
  state.lastDiscard = { tile, playerId };
  state.selectedTileId = null;
  addLog(`${player.name} 打出 ${tileName(tile)}。`);

  const gangOption = findExposedGangOption(tile, playerId);
  const pengOption = findPengOption(tile, playerId);

  if (gangOption && gangOption.playerId === 0 || pengOption && pengOption.playerId === 0) {
    state.pendingGang = gangOption?.playerId === 0 ? gangOption : null;
    state.pendingPeng = pengOption?.playerId === 0 ? pengOption : null;
    state.gangChoicesOpen = false;
    state.phase = "player-turn";
    render();
    return;
  }

  if (gangOption) {
    executeGang(gangOption);
    return;
  }

  if (pengOption) {
    if (shouldAiPeng(pengOption)) {
      executePeng(pengOption);
    } else {
      addLog(`${state.players[pengOption.playerId].name} 选择不碰 ${tileName(tile)}。`);
      advanceTurn();
    }
    return;
  }

  advanceTurn();
}

function advanceTurn() {
  if (state.phase === "ended") return;
  state.currentPlayer = (state.currentPlayer + 1) % 4;
  state.pendingWin = null;
  state.pendingPeng = null;
  state.pendingGang = null;
  state.gangChoicesOpen = false;

  if (state.wall.length === 0) {
    endDrawGame();
    showResultDialog(null);
    render();
    return;
  }

  drawTile(state.currentPlayer);
  sortAllHands();
  addLog(`${state.players[state.currentPlayer].name} 摸牌。`);

  if (canHuPlayer(state.players[state.currentPlayer])) {
    finishRound(state.currentPlayer);
    return;
  }

  if (state.currentPlayer === 0) {
    state.phase = "player-turn";
    render();
    return;
  }

  state.phase = "ai-turn";
  render();
  scheduleAiTurn(state.currentPlayer);
}

function finishRound(winnerId) {
  const settlement = calculateSettlement(winnerId);
  state.phase = "ended";
  state.winner = winnerId;
  state.pendingWin = null;
  state.pendingPeng = null;
  state.pendingGang = null;
  state.gangChoicesOpen = false;
  addLog(`${settlement.winner.name} ${settlement.label}，${settlement.detail}。`);
  render();
  showResultDialog(settlement);
}

function playAiTurn(playerId) {
  if (state.phase !== "ai-turn" || state.currentPlayer !== playerId || state.phase === "ended") return;
  const player = state.players[playerId];
  if (canHuPlayer(player)) {
    finishRound(playerId);
    return;
  }
  const gangOptions = [...getConcealedGangOptions(playerId), ...getAddedGangOptions(playerId)];
  if (gangOptions.length > 0) {
    executeGang(gangOptions[0]);
    return;
  }
  const tile = chooseAiDiscard(player.hand);
  discardTile(playerId, tile.id);
}

function scheduleAiTurn(playerId) {
  const scheduler = typeof window !== "undefined" && typeof window.setTimeout === "function"
    ? window.setTimeout.bind(window)
    : typeof setTimeout === "function"
      ? setTimeout
      : (callback) => callback();
  scheduler(() => playAiTurn(playerId), 650);
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
  if (!els) return;
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

function bindEvents() {
  if (!els) return;
  els.newRoundButton.addEventListener("click", startNewRound);
  els.dialogNewRoundButton.addEventListener("click", startNewRound);
  els.playerHand.addEventListener("click", handleHandClick);
  els.playerHand.addEventListener("dblclick", handleHandDoubleClick);
  els.discardButton.addEventListener("click", discardSelectedTile);
  els.pengButton.addEventListener("click", handlePengButtonClick);
  els.gangButton.addEventListener("click", handleGangButtonClick);
  els.gangChoiceRow.addEventListener("click", handleGangChoiceClick);
  els.huButton.addEventListener("click", claimHumanHu);
  els.passButton.addEventListener("click", passPendingWin);
}

function startNewRound() {
  if (els?.resultDialog.open) els.resultDialog.close();
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

function handlePengButtonClick() {
  if (state.pendingPeng?.playerId !== 0) return;
  executePeng(state.pendingPeng);
}

function handleGangButtonClick() {
  if (state.pendingGang?.playerId === 0) {
    executeGang(state.pendingGang);
    return;
  }
  const options = getHumanGangOptions();
  if (options.length === 0) return;
  if (options.length === 1) {
    executeGang(options[0]);
    return;
  }
  state.gangChoicesOpen = !state.gangChoicesOpen;
  render();
}

function handleGangChoiceClick(event) {
  const choice = event.target.closest("[data-gang-index]");
  if (!choice) return;
  const options = getHumanGangOptions();
  const option = options[Number(choice.dataset.gangIndex)];
  executeGang(option);
}

function claimHumanHu() {
  if (state.currentPlayer === 0 && state.phase === "player-turn" && canHuPlayer(state.players[0])) {
    finishRound(0);
  }
}

function passPendingWin() {
  if (state.pendingPeng?.playerId === 0 || state.pendingGang?.playerId === 0) {
    if (state.pendingPeng?.playerId === 0) {
      addLog(`你跳过 ${tileName(state.pendingPeng.tile)} 碰牌。`);
    }
    if (state.pendingGang?.playerId === 0) {
      addLog(`你跳过 ${tileName(state.pendingGang.tile)} 明杠。`);
    }
    state.pendingPeng = null;
    state.pendingGang = null;
    state.gangChoicesOpen = false;
    advanceTurn();
    return;
  }
  state.pendingWin = null;
  render();
}

function runRuleTests() {
  const t = (suit, rank, copy = 0) => makeTile(suit, rank, copy);
  const z = (copy = 0) => makeTile("zhong", 0, copy);
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
      name: "Hu with Hongzhong completing lower sequence",
      hand: [t("wan", 1), t("wan", 2), t("wan", 3), t("wan", 4), t("wan", 5), t("wan", 6), t("tong", 1), t("tong", 2), t("tong", 3), z(), t("tiao", 8), t("tiao", 9), t("wan", 9), t("wan", 9, 1)],
      expected: true
    },
    {
      name: "partial pair is not complete Hu",
      hand: [t("wan", 1), t("wan", 1, 1)],
      expected: false
    },
    {
      name: "meld plus pair is not complete Hu",
      hand: [t("wan", 1), t("wan", 2), t("wan", 3), t("tong", 5), t("tong", 5, 1)],
      expected: false
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
    },
    {
      name: "decomposable seven pairs is out of scope",
      hand: [t("wan", 1), t("wan", 1, 1), t("wan", 2), t("wan", 2, 1), t("wan", 3), t("wan", 3, 1), t("tong", 4), t("tong", 4, 1), t("tong", 5), t("tong", 5, 1), t("tong", 6), t("tong", 6, 1), t("tiao", 7), t("tiao", 7, 1)],
      expected: false
    },
    {
      name: "Hongzhong-assisted seven pairs is out of scope",
      hand: [t("wan", 1), t("wan", 1, 1), t("wan", 2), t("wan", 2, 1), t("wan", 3), t("wan", 3, 1), t("tong", 4), t("tong", 4, 1), t("tong", 5), t("tong", 5, 1), t("tong", 6), t("tong", 6, 1), t("tiao", 7), z()],
      expected: false
    },
    {
      name: "two Hongzhong-assisted seven pairs is out of scope",
      hand: [t("wan", 1), t("wan", 1, 1), t("wan", 2), t("wan", 2, 1), t("wan", 3), t("wan", 3, 1), t("tong", 4), t("tong", 4, 1), t("tong", 5), t("tong", 5, 1), t("tiao", 6), t("tiao", 7), z(0), z(1)],
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
    assertThrows(
      () => calculateSettlement(0, 1, "discard", [t("wan", 1), z(0)]),
      "discard settlement should be disabled because only self-draw wins are allowed"
    );
    assertThrows(
      () => calculateSettlement(0, 1, "other", [t("wan", 1)]),
      "settlement should reject non-self winType"
    );
    state.players = createPlayers();
    state.players[0].hand = [
      t("wan", 1), t("wan", 2), t("wan", 3),
      t("wan", 4), t("wan", 5), t("wan", 6),
      t("tong", 2), t("tong", 3), t("tong", 4),
      t("tiao", 7), t("tiao", 7, 1), t("tiao", 7, 2),
      t("wan", 9)
    ];
    const discardedWinnerTile = t("wan", 9, 1);
    state.players[3].hand = [discardedWinnerTile];
    state.wall = [t("tiao", 1, 3)];
    state.currentPlayer = 3;
    state.phase = "ai-turn";
    assert(canHu([...state.players[0].hand, discardedWinnerTile]), "discarded tile would complete the human hand");
    discardTile(3, discardedWinnerTile.id);
    assert(state.pendingWin === null, "discarded winning tile should not create a pending Hu");
    assert(state.winner === null, "discarded winning tile should not end the round");
    assert(!state.players[0].hand.some((tile) => tile.id === discardedWinnerTile.id), "human should not receive another player's discard");
    assert(state.currentPlayer === 0 && state.phase === "player-turn", "turn should continue normally after ignored discard win");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 2, 0), t("wan", 2, 1), t("wan", 2, 2), t("wan", 2, 3), z(0), z(1), z(2)];
    let concealedGangOptions = getConcealedGangOptions(0);
    assert(concealedGangOptions.length === 1, "four identical concealed tiles should create one concealed gang option");
    assert(concealedGangOptions[0].type === "concealed" && concealedGangOptions[0].tileKey === "wan-2", "concealed gang option should identify the exact tile");
    state.players[0].hand = [t("wan", 2, 0), t("wan", 2, 1), t("wan", 2, 2), z(0)];
    concealedGangOptions = getConcealedGangOptions(0);
    assert(concealedGangOptions.length === 0, "Hongzhong should not act as a wildcard for suited gang");
    state.players[0].hand = [z(0), z(1), z(2), z(3)];
    concealedGangOptions = getConcealedGangOptions(0);
    assert(concealedGangOptions.length === 1 && concealedGangOptions[0].tileKey === "zhong", "four real Hongzhong tiles should be a concealed gang");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 2, 0), t("wan", 2, 1), t("wan", 2, 2)];
    state.players[3].discards = [t("wan", 2, 3)];
    const exposedGangOption = findExposedGangOption(t("wan", 2, 3), 3);
    assert(exposedGangOption?.playerId === 0 && exposedGangOption.type === "exposed", "three matching concealed tiles should claim the previous discard as an exposed gang");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 2, 0), t("wan", 2, 1), t("wan", 2, 2), t("wan", 2, 3), t("tong", 1)];
    state.wall = [t("tiao", 9)];
    state.currentPlayer = 0;
    state.phase = "player-turn";
    executeGang(getConcealedGangOptions(0)[0]);
    assert(state.players[0].melds.length === 1, "concealed gang should add one meld");
    assert(state.players[0].hand.length === 2 && state.players[0].hand.some((tile) => tile.id === "tiao-9-0"), "concealed gang should draw one supplement tile");
    assert(state.currentPlayer === 0 && state.phase === "player-turn", "concealed gang should leave the player to discard next");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 2, 0), t("wan", 2, 1), t("wan", 2, 2), t("tong", 1)];
    const discardedGangTile = t("wan", 2, 3);
    state.players[3].discards = [discardedGangTile];
    state.wall = [t("tiao", 9)];
    state.currentPlayer = 3;
    state.phase = "ai-turn";
    executeGang(findExposedGangOption(discardedGangTile, 3));
    assert(state.players[0].melds.length === 1, "exposed gang should add one meld");
    assert(state.players[3].discards.length === 0, "exposed gang should remove the claimed discard from discards");
    assert(state.players[0].hand.length === 2 && state.players[0].hand.some((tile) => tile.id === "tiao-9-0"), "exposed gang should draw one supplement tile");
    assert(state.currentPlayer === 0 && state.phase === "player-turn", "exposed gang should make the claimer discard next");
    state.players = createPlayers();
    state.players[0].melds = [{ type: "peng", tileKey: "wan-2", tiles: [t("wan", 2, 0), t("wan", 2, 1), t("wan", 2, 2)] }];
    state.players[0].hand = [t("wan", 2, 3), t("tong", 1)];
    state.wall = [t("tiao", 9)];
    state.currentPlayer = 0;
    state.phase = "player-turn";
    const addedGangOption = getAddedGangOptions(0)[0];
    executeGang(addedGangOption);
    assert(state.players[0].melds[0].type === "added", "added gang should upgrade an existing peng meld");
    assert(state.players[0].melds[0].tiles.length === 4, "added gang should contain four tiles");
    assert(state.players[0].hand.length === 2 && state.players[0].hand.some((tile) => tile.id === "tiao-9-0"), "added gang should draw one supplement tile");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 3, 0), t("wan", 3, 1), t("tong", 1)];
    state.players[3].discards = [t("wan", 3, 2)];
    const pengOption = findPengOption(t("wan", 3, 2), 3);
    assert(pengOption?.playerId === 0 && pengOption.type === "peng", "two matching concealed tiles should claim the previous discard as peng");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 3, 0), t("wan", 3, 1), t("wan", 3, 3), t("tong", 1)];
    const threeTilePeng = findPengOption(t("wan", 3, 2), 3);
    assert(threeTilePeng?.playerId === 0 && threeTilePeng.tileIds.length === 2, "three matching tiles should still offer peng option using two tiles for gang/peng coexistence");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 3, 0), t("wan", 3, 1), t("tong", 1)];
    const discardedPengTile = t("wan", 3, 2);
    state.players[3].discards = [discardedPengTile];
    state.wall = [t("tiao", 9)];
    state.currentPlayer = 3;
    state.phase = "ai-turn";
    executePeng(findPengOption(discardedPengTile, 3));
    assert(state.players[0].melds.length === 1 && state.players[0].melds[0].type === "peng", "peng should add one exposed meld");
    assert(state.players[3].discards.length === 0, "peng should remove the claimed discard from discards");
    assert(state.players[0].hand.length === 1, "peng should not draw a supplement tile");
    assert(state.wall.length === 1, "peng should not consume a wall tile");
    assert(state.currentPlayer === 0 && state.phase === "player-turn", "peng should make the claimer discard next");
    state.players = createPlayers();
    state.players[0].melds = [{ type: "concealed", tiles: [t("wan", 1, 0), t("wan", 1, 1), t("wan", 1, 2), t("wan", 1, 3)] }];
    state.players[0].hand = [t("wan", 2), t("wan", 3), t("wan", 4), t("tong", 2), t("tong", 3), t("tong", 4), t("tiao", 7), t("tiao", 7, 1), t("tiao", 7, 2), t("wan", 9), t("wan", 9, 1)];
    assert(canHuPlayer(state.players[0]), "Hu detection should account for existing gang melds");
    state.players = createPlayers();
    state.players[0].hand = [t("wan", 3, 0), t("wan", 3, 1), t("wan", 3, 2), t("tong", 1)];
    const coexistDiscard = t("wan", 3, 3);
    state.players[3].discards = [coexistDiscard];
    const coexistGang = findExposedGangOption(coexistDiscard, 3);
    const coexistPeng = findPengOption(coexistDiscard, 3);
    assert(coexistGang?.playerId === 0 && coexistPeng?.playerId === 0, "three matching tiles should allow both gang and peng on the same discard");
    state.players = createPlayers();
    state.players[1].hand = [t("wan", 5, 0), t("wan", 5, 1), t("tong", 1)];
    state.players[2].hand = [t("wan", 5, 2), t("wan", 5, 3), t("tong", 2)];
    const priorityDiscard = t("wan", 5, 0);
    state.players[0].discards = [priorityDiscard];
    const priorityPeng = findPengOption(priorityDiscard, 0);
    assert(priorityPeng?.playerId === 1, "peng priority should go to the closest player in counter-clockwise order");
    state.players = createPlayers();
    state.players[1].hand = [t("wan", 7, 0), t("wan", 7, 1), t("tong", 1), t("tong", 3), t("tong", 5), t("tiao", 1), t("tiao", 3), t("tiao", 5), t("tiao", 7), t("tiao", 9), t("wan", 1)];
    state.wall = Array.from({ length: 8 }, (_, i) => t("tong", 1, i));
    const lowWallOption = { type: "peng", playerId: 1, fromPlayerId: 0, tile: t("wan", 7, 2), tileKey: "wan-7", tileIds: ["wan-7-0", "wan-7-1"] };
    assert(shouldAiPeng(lowWallOption) === false, "AI should not peng when wall is below 10 tiles");
    state.players = createPlayers();
    state.players[1].melds = [{ type: "peng", tileKey: "wan-9", fromPlayerId: 2, tiles: [t("wan", 9, 0), t("wan", 9, 1), t("wan", 9, 2)] }];
    state.players[1].hand = [t("wan", 4, 0), t("wan", 4, 1), t("wan", 1), t("wan", 2), t("wan", 3), t("tong", 2), t("tong", 3), t("tong", 4), t("tiao", 7), t("tiao", 7, 1), t("tiao", 7, 2)];
    state.wall = Array.from({ length: 50 }, (_, i) => makeTile(SUITS[i % 3], (i % 9) + 1, i));
    const goodPengOption = { type: "peng", playerId: 1, fromPlayerId: 0, tile: t("wan", 4, 2), tileKey: "wan-4", tileIds: ["wan-4-0", "wan-4-1"] };
    assert(shouldAiPeng(goodPengOption) === true, "AI should peng when it brings hand closer to winning");
  });
  assert(JSON.stringify(state) === stateBeforeSetupChecks, "runRuleTests should restore game state after setup checks");
  return results;
}

if (typeof window !== "undefined") {
  window.runRuleTests = runRuleTests;
}

bindEvents();
render();
