# Horse Bonus Design

## Goal

Add an entertainment-style "抓马" settlement feature to the pure front-end Hongzhong Mahjong game. After a player wins by self-draw, the game reveals horse tiles from the remaining wall, counts bonus fan from `1`, `5`, `9`, and Hongzhong tiles, and settles each losing player against the winner using a simple formula.

The feature should make the end of a round feel more exciting without changing the existing draw, discard, Peng, Gang, or Hu flow.

## Current Context

The project is a static HTML/CSS/JavaScript browser game. All round state, rules, AI, rendering, settlement, and rule tests live in `script.js`.

Current settlement is lightweight:

- Only self-draw wins are supported.
- Each other player pays the winner.
- The existing formula is `2 + Hongzhong count`.
- The result dialog shows the winner, settlement text, and final scores.

The horse bonus should replace the current Hongzhong-bonus settlement formula so the game has one clear scoring model.

## Rules

Every self-draw win triggers horse drawing.

- Base score: `5`.
- Base fan: `1`.
- If the winning hand contains at least one real Hongzhong tile, draw `4` horse tiles.
- If the winning hand contains no Hongzhong tiles, draw `8` horse tiles.
- Horse tiles are drawn from the remaining wall.
- If fewer tiles remain than the required horse count, draw all remaining wall tiles.
- A horse tile is a hit if it is:
  - any suited `1` tile,
  - any suited `5` tile,
  - any suited `9` tile,
  - any real Hongzhong tile.
- Each hit horse adds `+1` fan.
- Total fan is `1 + hit horse count`.
- Each losing player pays `base score * total fan` to the winner.
- Draw games do not trigger horse drawing.

Example:

- Horse tiles: `1万`, `3万`, `5万`, `红中`.
- Hit horses: `1万`, `5万`, `红中`.
- Hit count: `3`.
- Total fan: `1 + 3 = 4`.
- Base score: `5`.
- Each loser pays: `5 * 4 = 20`.

## Data Design

Settlement should return enough structured data for rendering, logging, and tests:

```js
{
  winner,
  winType: "self",
  baseScore: 5,
  baseFan: 1,
  horseCount,
  horseTiles,
  hitHorseTiles,
  horseFan,
  totalFan,
  paymentPerPlayer,
  payments,
  label: "自摸",
  detail
}
```

Definitions:

- `horseCount`: the requested horse draw count, either `4` or `8`.
- `horseTiles`: the actual tiles drawn from the wall, possibly fewer than `horseCount`.
- `hitHorseTiles`: the subset of `horseTiles` matching `1`, `5`, `9`, or Hongzhong.
- `horseFan`: the number of hit horse tiles.
- `totalFan`: `baseFan + horseFan`.
- `paymentPerPlayer`: `baseScore * totalFan`.
- `payments`: one payment from each losing player to the winner.

The settlement function should mutate scores exactly once, after horse tiles and payment amounts have been computed.

## Integration

`finishRound(winnerId)` remains the single place that ends a winning round.

The implementation should keep horse drawing inside or immediately below `calculateSettlement()`, because horse drawing is part of settlement rather than turn flow. This keeps `advanceTurn()`, `drawGangSupplement()`, and AI turn logic unchanged.

Recommended helper functions:

- `hasHongzhongInWinningTiles(player)`: checks the winner's hand and meld tiles for real Hongzhong.
- `getHorseDrawCount(player)`: returns `4` when the winner has Hongzhong, otherwise `8`.
- `drawHorseTiles(count)`: removes up to `count` tiles from the wall and returns them.
- `isHitHorse(tile)`: returns true for suited `1`, `5`, `9`, or Hongzhong.
- `calculateHorseBonus(player)`: returns horse count, drawn tiles, hit tiles, and fan totals.

Horse drawing should consume wall tiles after the win. Since the round has ended, this only affects settlement display and tests, not future turn flow.

## UI Design

The result dialog should add a compact horse section when `settlement` is present.

Required content:

- Draw count text:
  - `本局抓马 4 张`
  - or `无红中胡牌，抓马 8 张`
- Horse tile list, using the existing tile naming style.
- Clear visual highlight for hit horses.
- Formula text: `底分 5 x 4 番 = 每家 20 分`.
- Final score list remains unchanged.

The feature should reuse the current result dialog rather than adding a new modal or intermediate step. The goal is one satisfying end-of-round reveal, not a new interaction flow.

## Logging

The action log should record a concise summary after the win log:

`抓马：中 3 张，共 4 番，每家支付 20 分。`

If no horse hits:

`抓马：未中，按基础 1 番结算，每家支付 5 分。`

## Tests

Add focused coverage to `runRuleTests()`:

- A winner with Hongzhong requests `4` horse tiles.
- A winner without Hongzhong requests `8` horse tiles.
- Suited `1`, `5`, `9`, and Hongzhong count as hit horses.
- Suited `2`, `3`, `4`, `6`, `7`, `8` do not count as hit horses.
- Payment per loser equals `5 * (1 + hit count)`.
- Horse drawing consumes only available wall tiles when fewer than the requested count remain.
- Draw games do not mutate scores or draw horse tiles.

Keep the existing state snapshot pattern so tests do not leave global game state changed.

## Out Of Scope

This design does not add:

- Point-discard wins.
- Full regional fan scoring.
- Seat-based horse matching.
- User-configurable base score or horse count.
- Animations beyond simple highlighting in the result dialog.
- Persistence of horse history across rounds.

## Acceptance Criteria

- A self-draw win always performs horse settlement.
- Winners with Hongzhong draw 4 horse tiles.
- Winners without Hongzhong draw 8 horse tiles.
- Each `1`, `5`, `9`, and Hongzhong horse adds one fan.
- Each loser pays `5 * totalFan`.
- Result dialog shows horse tiles, hit highlights, formula, and final scores.
- Existing draw, discard, Peng, Gang, Hu, and draw-game flows continue to work.
- `node --check script.js` passes after implementation.
- `window.runRuleTests()` passes after implementation.
