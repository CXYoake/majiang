# Hongzhong Mahjong HTML5 Game Design

## Goal

Build a pure front-end HTML5 Hongzhong Mahjong game that can be opened directly in the browser and played as a complete single-player match against three computer opponents.

The first version prioritizes a playable full round over complete regional rule coverage. It should let the player start a round, draw and discard tiles, watch simple AI opponents take turns, win with a valid basic hand, and see a lightweight score settlement.

## Scope

The game runs in the existing static project structure:

- `index.html` contains the game table markup.
- `styles.css` contains the table, tile, action, and responsive layout styles.
- `script.js` contains the game state, rules, AI, scoring, rendering, and tests.

No login, networking, persistence, back end, framework, or build step is required for the first version.

## Rules

The tile set contains 112 tiles:

- Characters: 1-9, four copies each.
- Dots: 1-9, four copies each.
- Bamboo: 1-9, four copies each.
- Hongzhong: four copies.

Hongzhong tiles are wildcards. They can represent any suited tile needed to complete a basic winning hand.

The first version supports basic winning hands only:

- Four melds plus one pair.
- Melds may be sequences or triplets.
- Hongzhong tiles may fill missing members of melds or the pair.

Seven pairs and other special hands are intentionally not winning hands in the first version.

The first version does not support chi. Peng and gang may be added if they do not delay the core playable loop, but the minimum accepted game is draw, discard, AI turns, win detection, draw-game detection, and settlement.

## Game Flow

Opening the page shows a four-player table immediately. The human player sits at the bottom. Three computer players occupy the top, left, and right seats.

A round follows this flow:

1. Shuffle the full tile wall.
2. Deal 13 tiles to each player.
3. Let the human player take the first draw, then discard.
4. Let each AI opponent draw and discard in turn.
5. After each draw, check whether the current player can self-draw win.
6. After each discard, allow the next eligible player to claim Peng with two matching concealed tiles, or exposed Gang with three matching concealed tiles. Winning from another player's discard is not allowed.
7. Show a Hu action only when the human player can win by self-draw.
8. Let AI players win automatically only when their drawn hand is valid.
9. End the round on a win or when the wall is empty.
10. Show settlement and offer a new round.

The game should prevent invalid actions. The player cannot discard outside their turn, discard without a selected tile, continue after the round ends, or press Hu when the hand is not valid.

## Interface

Use a classic top-down Mahjong table.

The table includes:

- Player hand at the bottom, face up and clickable.
- Three AI hands around the table, shown mostly as tile backs with names and scores.
- A central discard area.
- Current turn indicator.
- Remaining wall count.
- Recent action log.
- Contextual action buttons such as Discard, Gang, Hu, Pass, and New Round.

Tiles are built with HTML and CSS rather than image files. The suits use clear text and color treatment:

- Characters use Chinese numerals with the character suit marker.
- Dots use a distinct dot-like visual or text marker.
- Bamboo uses a distinct bamboo marker.
- Hongzhong is red and visually special.

The visual direction is green felt, clear contrast, compact information, and light movement. Animations should be small and useful: selected tile lift, recently drawn tile highlight, and discard placement transition.

The layout must remain usable on desktop and mobile screens. On small screens, the player's hand and action controls remain the priority.

## Code Design

`script.js` should be organized into clear sections or objects:

- Tile definitions and formatting.
- Wall creation and shuffle.
- Player state.
- Game state and turn advancement.
- Rule functions.
- AI discard choice.
- Scoring and settlement.
- DOM rendering.
- Event handlers.
- Development test functions.

The Hu logic should be a pure rule function. Given a hand, it returns whether the hand can form four melds and one pair while using Hongzhong tiles as wildcards. UI handlers should call the rule function instead of embedding rule logic in click behavior.

The AI should be simple but stable. It should prefer discarding isolated suited tiles, preserve pairs and nearby sequence candidates when possible, and avoid discarding Hongzhong unless forced.

## Gang Rules

The interface uses one `杠` button for all gang actions.

- Concealed gang: on the current player's turn, four identical concealed tiles may be revealed as a gang.
- Exposed gang: after another player discards a tile, a player holding three matching concealed tiles may claim that discard as a gang.
- Added gang: a player with an existing Peng meld may add the fourth matching concealed tile to turn it into a gang. This uses the same `杠` button once Peng exists in play.
- Supplement draw: every gang immediately draws one replacement tile from the wall. If that tile completes a winning hand, the win is treated as self-draw.
- Pass: when the human player can claim an exposed gang, `过` skips the claim and normal turn order continues.
- Hongzhong can be ganged only as four real Hongzhong tiles. It cannot act as a wildcard to form a gang with suited tiles.

## Scoring

Use lightweight scoring:

- Self-draw only: each other player pays 2 points.
- Hongzhong bonus: each Hongzhong in the winning hand adds 1 point.
- Gang actions do not add points in this version.

## Peng Rules

The interface uses one `碰` button for Peng actions.

- After another player discards a tile, a player holding exactly two matching concealed tiles may claim that discard as Peng.
- Peng does not draw a tile. The claiming player must discard next.
- If a player has three matching concealed tiles, exposed Gang takes priority over Peng.
- `过` skips the human player's pending Peng claim and normal turn order continues.
- Hongzhong can be Peng only as real Hongzhong tiles. It cannot act as a wildcard to form Peng with suited tiles.

The Hongzhong bonus is added to the base payment. Each other player pays `2 + Hongzhong count`.

Settlement text should explain the result plainly, for example: "Basic Hu + 2 Hongzhong bonus". Since complex patterns are out of scope, the UI must not imply full regional fan scoring.

## Error Handling

The game should handle state problems through disabled controls and status text rather than browser alerts.

Required states:

- Waiting for player action.
- AI thinking.
- Player can self-draw Hu.
- Player can Gang.
- Player can Peng.
- Player can pass an exposed Gang claim.
- Player can pass a Peng claim.
- Round won.
- Draw game.
- New round available.

The wall-empty case ends the round as a draw. The UI should show that no player won and keep scores unchanged.

## Verification

Add a lightweight internal test runner for rule functions in `script.js`. It should be callable from development code or console and cover:

- A normal basic winning hand without Hongzhong.
- A winning hand using one Hongzhong.
- A winning hand using multiple Hongzhong.
- A non-winning hand.
- A seven-pairs shaped hand that must not win in version one.

Manual verification should cover:

- Page loads directly from `index.html`.
- New round deals correct hand sizes.
- Player can select and discard tiles.
- AI players take turns without freezing.
- Hu appears only when the current player has a valid self-draw hand.
- Other players' discards do not trigger Hu, even when the discarded tile would complete the human hand.
- Gang appears when the human player has a valid concealed gang or can claim an exposed gang.
- Gang draws a replacement tile and leaves the ganging player to discard next unless they self-draw Hu.
- Peng appears when the human player can claim another player's discard with two matching tiles.
- Peng creates an exposed meld, consumes no wall tile, and leaves the claiming player to discard next.
- Settlement updates scores.
- Empty wall ends in a draw.
- Layout remains readable on desktop and mobile widths.

## Out of Scope

The first version does not include:

- Online multiplayer.
- User accounts.
- Saved progress.
- Full regional scoring.
- Chi.
- Winning from another player's discard.
- Peng.
- Sound effects.
- Image-based tile art.
- Advanced AI strategy.
