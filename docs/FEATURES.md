# Chess2 Feature Catalog

This document is the source of truth for feature planning and navigation design.

Status:
- The catalog is complete enough to drive navigation and prioritization.
- The full product scope includes all features listed in this file.
- Prioritization determines delivery order, not whether a listed feature belongs in the product.
- The product implementation is not complete.
- Top-level navigation should be derived from categories marked as user-facing.
- Any top-level navigation change requires a DCR.

## Scope Policy

- Every feature listed in this document is in scope for Chess2.
- `V1`, `V2`, and `Deferred` are sequencing labels only.
- `Deferred` means not in the current build order, not removed from product scope.
- No catalog feature should be treated as excluded unless a DCR explicitly removes it from the product.
- Navigation and architecture should assume long-term support for the full catalog.

## Navigation Source

Use these top-level areas for navigation unless a DCR explicitly changes them:

1. Home
2. Play
3. Analysis
4. Openings
5. Training
6. Puzzles
7. Variants
8. Multiplayer
9. Load / Save
10. Tools
11. Settings
12. About

Feature-to-navigation mapping:

- Play: Game Play, Controls and Navigation, Single Player
- Analysis: Analysis and Engine Feedback
- Openings: Opening and Endgame Tools
- Training: Training Modes, Endgame Trainer, Blindfold, Guess the Move
- Puzzles: Daily Puzzle, Puzzle Rush, Puzzle Battle, Thematic Puzzles, Puzzle DB Import
- Variants: Chess960 and custom rulesets
- Multiplayer: Live Games, Matchmaking, Spectate, Chat, Leaderboards, Tournaments, Clubs
- Load / Save: PGN, FEN, EPD, clipboard and file import/export
- Tools: Perft Runner, Move Inspector, Zobrist Viewer, TT Inspector, Search Tree, Benchmark, Stress Test

## Feature Entry Format

Use this one-line template for every feature entry:

`Feature Title — Category — Priority — Release (V1/V2/Deferred/Excluded) — Owner — Notes`

Example:

`Puzzles with Hints — Training and Puzzles — High — V2 — Daniel — Needs puzzle DB, hint engine, and scoring rules.`

## Prioritization Matrix

Score each feature on 1-5 for:

- Impact
- Effort
- Dependency Risk

Priority score:

`Impact x (6 - Effort) x (6 - Dependency Risk)`

Sort descending.

## Decision Gates

- Design Freeze: Wireframes, nav, and feature matrix approved. No top-level nav changes without a DCR.
- API Freeze: Engine public API contract approved. Any API change requires a DCR and migration notes.
- Content Freeze: Data-heavy features require a content plan and license review.

## Suggested MVP

Use this as the first narrow release target:

- Core engine: movegen, search, eval
- Play view: board, drag/drop, click-to-move, legal highlighting, flip
- Move list with SAN and PGN/FEN import/export
- Move navigation: start/back/forward/end, undo/redo
- Eval bar with basic engine stats
- Autoplay demo mode

This MVP is only the first delivery slice. It does not reduce the long-term product scope.

## Master Catalog

### 1. Core Engine

#### Move Generation

- Bitboard Movegen — Core Engine — Unscored — Unassigned — Daniel — 64-bit BigInt bitboards
- Magic Bitboards — Core Engine — Unscored — Unassigned — Daniel — Sliding piece attack tables
- Pawn Logic — Core Engine — Unscored — Unassigned — Daniel — Promotions, en passant, structure
- Legal Move Filtering — Core Engine — Unscored — Unassigned — Daniel — Remove illegal moves
- Check/Pin Detection — Core Engine — Unscored — Unassigned — Daniel — King safety logic
- Move Ordering — Core Engine — Unscored — Unassigned — Daniel — MVV-LVA, killers, history
- Zero-GC Movegen — Core Engine — Unscored — Unassigned — Daniel — No allocations during search
- Packed Move Encoding — Core Engine — Unscored — Unassigned — Daniel — 32-bit or 16-bit format
- Make/Unmake — Core Engine — Unscored — Unassigned — Daniel — Reversible state
- Zobrist Hashing — Core Engine — Unscored — Unassigned — Daniel — Hash keys for TT

#### Search

- Alpha-Beta Search — Core Engine — Unscored — Unassigned — Daniel — Main search algorithm
- Iterative Deepening — Core Engine — Unscored — Unassigned — Daniel — Depth-by-depth search
- Transposition Table — Core Engine — Unscored — Unassigned — Daniel — Hash table for caching
- Null-Move Pruning — Core Engine — Unscored — Unassigned — Daniel — Aggressive pruning
- Late Move Reductions — Core Engine — Unscored — Unassigned — Daniel — LMR heuristics
- Aspiration Windows — Core Engine — Unscored — Unassigned — Daniel — Narrow search windows
- Quiescence Search — Core Engine — Unscored — Unassigned — Daniel — Capture search
- Futility Pruning — Core Engine — Unscored — Unassigned — Daniel — Skip hopeless nodes
- Singular Extensions — Core Engine — Unscored — Unassigned — Daniel — Extend forced lines
- Multi-PV — Core Engine — Unscored — Unassigned — Daniel — Multiple best lines
- Time Management — Core Engine — Unscored — Unassigned — Daniel — Clock-aware search
- Search Abort Signals — Core Engine — Unscored — Unassigned — Daniel — Stop search safely

#### Evaluation

- Material Evaluation — Core Engine — Unscored — Unassigned — Daniel — Base scoring
- PST Evaluation — Core Engine — Unscored — Unassigned — Daniel — Piece-square tables
- Mobility Evaluation — Core Engine — Unscored — Unassigned — Daniel — Move count scoring
- King Safety — Core Engine — Unscored — Unassigned — Daniel — Attacks, shelter
- Pawn Structure — Core Engine — Unscored — Unassigned — Daniel — Doubled, isolated, passed
- Space Evaluation — Core Engine — Unscored — Unassigned — Daniel — Territory control
- Threat Evaluation — Core Engine — Unscored — Unassigned — Daniel — Hanging pieces
- NNUE Integration — Core Engine — Unscored — Unassigned — Daniel — Default network, runtime loading, neural eval blending

#### Endgame

- Syzygy Tablebase Probe — Core Engine — Unscored — Unassigned — Daniel — Perfect endgames
- Mate Distance — Core Engine — Unscored — Unassigned — Daniel — DTM scoring
- Endgame Heuristics — Core Engine — Unscored — Unassigned — Daniel — Simplified logic

### 2. Game Play

#### Board Interaction

- Drag & Drop — Game Play — Unscored — Unassigned — Daniel — Standard movement
- Click-to-Move — Game Play — Unscored — Unassigned — Daniel — Alternative input
- Piece Animations — Game Play — Unscored — Unassigned — Daniel — Smooth sliding
- Ghost Piece — Game Play — Unscored — Unassigned — Daniel — Drag preview
- Legal Move Highlighting — Game Play — Unscored — Unassigned — Daniel — Dots or circles
- Last Move Highlight — Game Play — Unscored — Unassigned — Daniel — From/to squares
- Check Highlight — Game Play — Unscored — Unassigned — Daniel — King in check
- Coordinates — Game Play — Unscored — Unassigned — Daniel — Files/ranks
- Board Flip — Game Play — Unscored — Unassigned — Daniel — White/Black perspective
- Themes — Game Play — Unscored — Unassigned — Daniel — Board skins
- Piece Sets — Game Play — Unscored — Unassigned — Daniel — Visual styles
- Resizeable Board — Game Play — Unscored — Unassigned — Daniel — Responsive
- Mobile Gestures — Game Play — Unscored — Unassigned — Daniel — Touch support

#### Visual Markup

- Arrows — Game Play — Unscored — Unassigned — Daniel — Right-click
- Circles — Game Play — Unscored — Unassigned — Daniel — Right-click
- Multi-Color Arrows — Game Play — Unscored — Unassigned — Daniel — Red/green/yellow/blue
- Engine Arrows — Game Play — Unscored — Unassigned — Daniel — Best move
- Threat Highlights — Game Play — Unscored — Unassigned — Daniel — Attacked squares
- Hanging Piece Highlights — Game Play — Unscored — Unassigned — Daniel — Free captures

### 3. Controls and Navigation

#### Move Navigation

- First Move — Controls — Unscored — Unassigned — Daniel — Jump to start
- Previous Move — Controls — Unscored — Unassigned — Daniel — Step back
- Next Move — Controls — Unscored — Unassigned — Daniel — Step forward
- Last Move — Controls — Unscored — Unassigned — Daniel — Jump to end
- Undo — Controls — Unscored — Unassigned — Daniel — Reverse last move
- Redo — Controls — Unscored — Unassigned — Daniel — Reapply move
- Rewind — Controls — Unscored — Unassigned — Daniel — Jump to start
- Fast-Forward — Controls — Unscored — Unassigned — Daniel — Jump to end
- Keyboard Shortcuts — Controls — Unscored — Unassigned — Daniel — Arrow keys

#### Game Actions

- New Game — Controls — Unscored — Unassigned — Daniel — Reset board
- Resign — Controls — Unscored — Unassigned — Daniel — End game
- Offer Draw — Controls — Unscored — Unassigned — Daniel — Request draw
- Accept/Decline Draw — Controls — Unscored — Unassigned — Daniel — Respond to offer
- Claim Draw — Controls — Unscored — Unassigned — Daniel — 50-move, repetition
- Takeback Request — Controls — Unscored — Unassigned — Daniel — Multiplayer
- Auto-Promotion Settings — Controls — Unscored — Unassigned — Daniel — Queen/ask

#### Autoplay

- Engine vs Engine — Controls — Unscored — Unassigned — Daniel — Self-play
- Adjustable Speed — Controls — Unscored — Unassigned — Daniel — Fast/slow
- Pause/Resume — Controls — Unscored — Unassigned — Daniel — Control autoplay
- Auto-Flip — Controls — Unscored — Unassigned — Daniel — Flip each move
- Auto-Annotate — Controls — Unscored — Unassigned — Daniel — Auto comments

### 4. Notation and Storage

#### Move List

- SAN Notation — Notation — Unscored — Unassigned — Daniel — Standard notation
- LAN Notation — Notation — Unscored — Unassigned — Daniel — Long algebraic
- UCI Notation — Notation — Unscored — Unassigned — Daniel — Engine format
- Scrollable Move List — Notation — Unscored — Unassigned — Daniel — UI list
- Click to Jump — Notation — Unscored — Unassigned — Daniel — Navigate by clicking
- Variations — Notation — Unscored — Unassigned — Daniel — Branches
- Comments — Notation — Unscored — Unassigned — Daniel — User notes
- Move Annotations — Notation — Unscored — Unassigned — Daniel — ! ? !! ??

#### Import and Export

- PGN Import — Notation — Unscored — Unassigned — Daniel — Load games
- PGN Export — Notation — Unscored — Unassigned — Daniel — Save games
- FEN Load — Notation — Unscored — Unassigned — Daniel — Load position
- FEN Save — Notation — Unscored — Unassigned — Daniel — Save position
- EPD Support — Notation — Unscored — Unassigned — Daniel — Position format
- Clipboard Copy — Notation — Unscored — Unassigned — Daniel — Quick copy
- File Upload/Download — Notation — Unscored — Unassigned — Daniel — Local files

#### Position Editor

- Drag Pieces — Notation — Unscored — Unassigned — Daniel — Setup board
- Set Side to Move — Notation — Unscored — Unassigned — Daniel — White/Black
- Set Castling Rights — Notation — Unscored — Unassigned — Daniel — KQkq
- Set En Passant — Notation — Unscored — Unassigned — Daniel — EP square
- Validate Position — Notation — Unscored — Unassigned — Daniel — Legal check

### 5. Analysis and Engine Feedback

#### Evaluation

- Eval Bar — Analysis — Unscored — Unassigned — Daniel — Visual score
- Numeric Score — Analysis — Unscored — Unassigned — Daniel — +1.23
- Mate Score — Analysis — Unscored — Unassigned — Daniel — M3
- Blunder Detection — Analysis — Unscored — Unassigned — Daniel — Move quality
- Move Quality Classification — Analysis — Unscored — Unassigned — Daniel — Good/Bad

#### PV Display

- Best Line — Analysis — Unscored — Unassigned — Daniel — PV
- Multi-PV — Analysis — Unscored — Unassigned — Daniel — Top N lines
- Highlight PV — Analysis — Unscored — Unassigned — Daniel — On board
- Depth — Analysis — Unscored — Unassigned — Daniel — Search depth
- Nodes — Analysis — Unscored — Unassigned — Daniel — Node count
- NPS — Analysis — Unscored — Unassigned — Daniel — Nodes/sec
- Hash Full — Analysis — Unscored — Unassigned — Daniel — TT usage
- TB Hits — Analysis — Unscored — Unassigned — Daniel — Tablebase
- Time Spent — Analysis — Unscored — Unassigned — Daniel — Search time

#### Special Modes

- Infinite Analysis — Analysis — Unscored — Unassigned — Daniel — No time limit
- Threat Mode — Analysis — Unscored — Unassigned — Daniel — Opponent move
- Hint Mode — Analysis — Unscored — Unassigned — Daniel — 3 levels
- Search Logs — Analysis — Unscored — Unassigned — Daniel — Debug info

### 6. Opening and Endgame Tools

#### Opening Explorer

- Polyglot Book — Opening Tools — Unscored — Unassigned — Daniel — .bin files
- Win/Draw/Loss Stats — Opening Tools — Unscored — Unassigned — Daniel — Percentages
- Move Popularity — Opening Tools — Unscored — Unassigned — Daniel — Frequency
- ECO Codes — Opening Tools — Unscored — Unassigned — Daniel — A00-E99
- Opening Names — Opening Tools — Unscored — Unassigned — Daniel — Named lines
- Player Database — Opening Tools — Unscored — Unassigned — Daniel — Optional

#### Endgame Tools

- Tablebase Probe — Endgame Tools — Unscored — Unassigned — Daniel — Syzygy
- Perfect Play Lines — Endgame Tools — Unscored — Unassigned — Daniel — DTM
- Mate Distance — Endgame Tools — Unscored — Unassigned — Daniel — DTM
- Endgame Classification — Endgame Tools — Unscored — Unassigned — Daniel — KPK, KRK, etc.

### 7. Training and Puzzles

#### Puzzles

- Daily Puzzle — Training — Unscored — Unassigned — Daniel — One per day
- Puzzle Rush — Training — Unscored — Unassigned — Daniel — Timed
- Puzzle Battle — Training — Unscored — Unassigned — Daniel — Competitive
- Thematic Puzzles — Training — Unscored — Unassigned — Daniel — Openings
- Difficulty Rating — Training — Unscored — Unassigned — Daniel — Elo
- Rating System — Training — Unscored — Unassigned — Daniel — Puzzle Elo
- Streaks — Training — Unscored — Unassigned — Daniel — Consecutive solves
- Hints — Training — Unscored — Unassigned — Daniel — Multi-tier
- Retry — Training — Unscored — Unassigned — Daniel — Try again
- Puzzle Explanations — Training — Unscored — Unassigned — Daniel — Why solution works
- Puzzle Database Import — Training — Unscored — Unassigned — Daniel — External DB

#### Training Modes

- Blindfold Mode — Training — Unscored — Unassigned — Daniel — No pieces
- Guess the Move — Training — Unscored — Unassigned — Daniel — GM games
- Tactics Trainer — Training — Unscored — Unassigned — Daniel — Random puzzles
- Endgame Trainer — Training — Unscored — Unassigned — Daniel — KPK, KRK
- Visualization Drills — Training — Unscored — Unassigned — Daniel — Board memory
- Knight-Vision Drills — Training — Unscored — Unassigned — Daniel — Knight patterns
- Memory Mode — Training — Unscored — Unassigned — Daniel — Recall positions

### 8. Game Modes and Rules

#### Single Player

- Human vs Engine — Game Modes — Unscored — Unassigned — Daniel — Standard
- Engine vs Engine — Game Modes — Unscored — Unassigned — Daniel — Self-play
- Adjustable Strength — Game Modes — Unscored — Unassigned — Daniel — Difficulty
- Time Controls — Game Modes — Unscored — Unassigned — Daniel — Blitz, rapid
- Increment/Delay — Game Modes — Unscored — Unassigned — Daniel — Fischer
- Handicap Modes — Game Modes — Unscored — Unassigned — Daniel — Odds

#### Variants

- Chess960 — Game Modes — Unscored — Unassigned — Daniel — Random back rank
- King of the Hill — Game Modes — Unscored — Unassigned — Daniel — Center win
- Three-Check — Game Modes — Unscored — Unassigned — Daniel — 3 checks wins
- Horde — Game Modes — Unscored — Unassigned — Daniel — Pawn horde
- Atomic — Game Modes — Unscored — Unassigned — Daniel — Explosions
- Crazyhouse — Game Modes — Unscored — Unassigned — Daniel — Drops
- Bughouse — Game Modes — Unscored — Unassigned — Daniel — Partner
- Capablanca/Gothic — Game Modes — Unscored — Unassigned — Daniel — 10x8
- Custom Variants — Game Modes — Unscored — Unassigned — Daniel — User-defined

### 9. Multiplayer and Social

- Live Games — Multiplayer — Unscored — Unassigned — Daniel — Real-time
- Matchmaking — Multiplayer — Unscored — Unassigned — Daniel — Rating-based
- Spectate — Multiplayer — Unscored — Unassigned — Daniel — Watch games
- Chat — Multiplayer — Unscored — Unassigned — Daniel — Messaging
- Rematch — Multiplayer — Unscored — Unassigned — Daniel — Replay
- Rating System — Multiplayer — Unscored — Unassigned — Daniel — Elo
- Leaderboards — Multiplayer — Unscored — Unassigned — Daniel — Rankings
- Tournaments — Multiplayer — Unscored — Unassigned — Daniel — Brackets
- Clubs/Teams — Multiplayer — Unscored — Unassigned — Daniel — Groups

### 10. UI, UX and Accessibility

- Dark/Light Themes — UI/UX — Unscored — Unassigned — Daniel — Visual modes
- High Contrast — UI/UX — Unscored — Unassigned — Daniel — Accessibility
- Colorblind Mode — UI/UX — Unscored — Unassigned — Daniel — Red/green safe
- Adjustable Fonts — UI/UX — Unscored — Unassigned — Daniel — Scaling
- ARIA Labels — UI/UX — Unscored — Unassigned — Daniel — Screen readers
- Keyboard Navigation — UI/UX — Unscored — Unassigned — Daniel — Accessibility
- Sound Effects — UI/UX — Unscored — Unassigned — Daniel — Move sounds
- Move Confirmation — UI/UX — Unscored — Unassigned — Daniel — Tap twice
- Animation Toggle — UI/UX — Unscored — Unassigned — Daniel — Performance

### 11. Import / Export and Integrations

- PGN/FEN/EPD — Integrations — Unscored — Unassigned — Daniel — Formats
- Polyglot — Integrations — Unscored — Unassigned — Daniel — Opening book
- Lichess API — Integrations — Unscored — Unassigned — Daniel — Online data
- Chess.com API — Integrations — Unscored — Unassigned — Daniel — Online data
- Cloud Save — Integrations — Unscored — Unassigned — Daniel — Sync
- Share Game Link — Integrations — Unscored — Unassigned — Daniel — URL
- Export Board Image — Integrations — Unscored — Unassigned — Daniel — PNG
- Import from URL — Integrations — Unscored — Unassigned — Daniel — Load remote
- UCI/XBoard Protocol — Integrations — Unscored — Unassigned — Daniel — Engine adapters

### 12. Developer and Debug Tools

- Perft Runner — Dev Tools — Unscored — Unassigned — Daniel — Movegen testing
- Move Inspector — Dev Tools — Unscored — Unassigned — Daniel — Debug moves
- Zobrist Viewer — Dev Tools — Unscored — Unassigned — Daniel — Hash keys
- TT Inspector — Dev Tools — Unscored — Unassigned — Daniel — Tablebase
- Search Tree Visualizer — Dev Tools — Unscored — Unassigned — Daniel — Debug search
- Logging Console — Dev Tools — Unscored — Unassigned — Daniel — Engine logs
- Benchmark Mode — Dev Tools — Unscored — Unassigned — Daniel — Speed tests
- Stress Test — Dev Tools — Unscored — Unassigned — Daniel — Stability

### 13. Monetization and Licensing

- Pro Features — Monetization — Unscored — Unassigned — Daniel — Paid extras
- Subscription — Monetization — Unscored — Unassigned — Daniel — Monthly
- One-Time Purchase — Monetization — Unscored — Unassigned — Daniel — Lifetime
- Cloud Analysis Credits — Monetization — Unscored — Unassigned — Daniel — Paid compute
- Puzzle Packs — Monetization — Unscored — Unassigned — Daniel — DLC
- Cosmetic Themes — Monetization — Unscored — Unassigned — Daniel — Paid skins
- Offline Mode — Monetization — Unscored — Unassigned — Daniel — Local engine
- Commercial Licensing — Monetization — Unscored — Unassigned — Daniel — Sell engine

