# Chess2 UI-First Architecture

This document defines the user interface architecture that should have been established before deeper engine integration work.

The goal is to keep the product UI stable while engine, analysis, multiplayer, and training systems evolve behind it.

## Principles

- UI is the product surface. Engine modules serve the UI, not the other way around.
- Top-level windows stay stable even as features are added behind them.
- All board interactions resolve through one move-recognition pipeline.
- Every board-based feature reuses the same board, move list, status, and notation components.
- The UI owns view state, layout, input mode, and feedback timing.
- The engine owns legality, search, evaluation, and position transitions once the API is stable.

## Top-Level Windows

These are the required top-level windows for Chess2.

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

These top-level windows match the navigation source in [FEATURES.md](./FEATURES.md).

## Window Responsibilities

### Home

- Entry point for the app
- Quick actions: new game, resume game, analysis board, puzzles
- Surface recent games, saved positions, and featured content

### Play

- Primary playing surface
- Supports human vs engine, human vs human, and engine vs engine
- Must contain the board, move list, game actions, clocks or status, and engine summary area

### Analysis

- Analysis board with infinite or bounded engine analysis
- Full evaluation feedback, PV display, move quality review, and annotation tools

### Openings

- Opening explorer
- ECO and opening name lookup
- Book moves and aggregate position statistics

### Training

- Structured drills and study tools
- Endgame trainer, blindfold, visualization, guess-the-move, memory drills

### Puzzles

- Daily puzzle, puzzle rush, thematic puzzles, imported puzzle sets

### Variants

- Variant selection, rule descriptions, setup, and play/analysis surfaces for supported variants

### Multiplayer

- Matchmaking, live games, spectating, chat, tournaments, clubs

### Load / Save

- PGN, FEN, and EPD import/export
- Clipboard and local file handling
- Position editor entry points

### Tools

- Perft, move inspector, search tree, TT inspector, zobrist viewer, benchmark, logs

### Settings

- Theme, board style, piece set, input preferences, engine limits, sound, accessibility

### About

- Product info, controls help, notation help, version information, credits

## Core Shared UI Regions

Every board-centric window should be composed from these shared regions rather than custom one-off layouts.

### Board Region

- 2D board renderer
- Optional 3D board renderer
- Coordinate labels
- Overlays for legal moves, last move, check, arrows, circles, hints, engine lines

### Move Sidebar

- SAN move list
- Move numbers
- Click-to-jump navigation
- Variations and comments later without changing the shell

### Status Strip

- Side to move
- Game result or state
- Check, mate, draw, engine thinking, sync status

### Action Bar

- New game
- Undo/redo
- First/previous/next/last move
- Flip board
- Resign, offer draw, restart

### Engine Panel

- Eval bar
- Numeric score
- Depth, nodes, NPS, hashfull, time
- PV lines and Multi-PV later

### Context Panel

- Window-specific tools such as opening stats, puzzle prompt, training instructions, chat, or search logs

## Required Layouts By Window

### Play Layout

- Center: board region
- Right side: move sidebar and status strip
- Bottom or top: action bar
- Secondary right or collapsible section: engine panel

### Analysis Layout

- Center: board region
- Right side: engine panel and move sidebar
- Bottom: notation, comments, search logs, and alternate lines tabs

### Openings Layout

- Left: opening tree and filters
- Center: board region
- Right: stats, reference lines, transpose targets

### Training and Puzzles Layout

- Center: board region
- Right: prompt, score, streak, hint controls, move sidebar

### Multiplayer Layout

- Center: board region
- Right: clocks, move list, chat, player cards

## Move Recognition Architecture

Move recognition is the central UI interaction system. It must be defined once and reused everywhere.

### Accepted Input Modes

- Click-to-move
- Drag-and-drop
- Touch input
- Keyboard-driven square selection later
- Text move entry through SAN, LAN, or UCI in analysis and tools

### Move Recognition Pipeline

1. Input capture
2. Source-square recognition
3. Candidate move generation for the selected source
4. Destination resolution
5. Special-move resolution
6. Legality check
7. Commit move
8. Sync all dependent UI regions

### Input Capture

The board must normalize all pointer and touch interactions into a single event format:

- pointer type
- source square
- destination square if any
- gesture type: click, drag, tap, long-press
- modifier state for markup tools later

### Source-Square Recognition

- Ignore empty squares unless a move sequence is already active
- Ignore pieces that do not belong to the side to move unless in editor mode
- Selecting a valid piece activates selection state and legal target overlays

### Destination Resolution

- Click flow: source click, then destination click
- Drag flow: source press, hover trail, destination release
- Touch flow: source tap, destination tap, optional long-press for markup later

### Special-Move Resolution

- Castling is inferred from king movement to a castling target square
- En passant is inferred from pawn movement to the stored en passant target
- Promotion requires a promotion modal unless auto-promotion is enabled
- Variant-specific move rules plug in here later without rewriting the UI shell

### Legality Check

- UI may show pseudo-legal targets for responsiveness
- Final move acceptance must use the canonical legality source
- Illegal moves must clear transient drag state and preserve board state

### Commit Step

When a move is committed, update these in one transaction:

- board position
- last move markers
- move list
- clocks or turn status
- check or result status
- engine input position
- opening, training, puzzle, or multiplayer context panels as applicable

## Move Recognition State Machine

Use this simple state machine across Play, Analysis, Training, and Puzzles.

### Idle

- No piece selected
- Waiting for input

### Selected

- Source square selected
- Legal targets visible
- Waiting for destination or cancel

### Dragging

- Piece is being dragged
- Hover feedback active
- Await release target or cancel

### Awaiting Promotion

- Board interaction paused
- Promotion dialog active
- Commit only after promotion piece is chosen

### Committing

- Move is being validated and applied
- Input locked briefly to avoid double-submit

### Awaiting Engine

- Human input disabled for the engine side
- Engine status and thinking feedback visible

### Review Mode

- Used for move navigation, analysis browsing, openings, and PGN review
- Move entry may be disabled or branch into variation mode depending on window

## Reusable UI Components

These components should exist as actual modules rather than being embedded ad hoc in one file.

- App shell
- Side navigation
- Board component
- Board overlay layer
- Move list component
- Action bar component
- Status strip component
- Engine panel component
- Eval bar component
- Clocks component
- Promotion modal
- Game setup modal
- Import/export panel
- Position editor panel
- Chat panel
- Search stats panel

## View-State Model

The UI should track view state separately from engine state.

### UI State

- active window
- active subview or tab
- board orientation
- 2D or 3D mode
- selection state
- overlay visibility
- modal visibility
- current panel layout
- input mode preferences

### Game State

- current position
- move history
- result or ongoing state
- clocks
- side controlled by engine or human

### Analysis State

- analysis running or stopped
- depth, nodes, NPS, score, PV
- selected PV line
- selected historical move for review

## UI-First Implementation Order

This is the order that should guide implementation from here.

### Phase 1: Shell and Stable Windows

- finalize top-level windows
- define shared layout regions
- build the app shell and navigation behavior

### Phase 2: Board Interaction Core

- board component
- move recognition state machine
- legal overlays
- promotion flow
- move commit pipeline

### Phase 3: Play Surface

- game action bar
- move list
- status strip
- engine turn integration
- clocks and results

### Phase 4: Analysis Surface

- eval bar
- engine info panel
- PV rendering
- move review and navigation

### Phase 5: Specialized Windows

- openings
- training
- puzzles
- variants
- multiplayer
- tools

## Immediate Next Build Slice

The next concrete UI task should be to turn the current monolithic play behavior into explicit modules:

1. `ui/components/board.js`
2. `ui/components/move_list.js`
3. `ui/components/controls.js`
4. `ui/views/play.js`

These four modules should own:

- board rendering and overlay state
- move recognition and promotion flow
- move list rendering and navigation
- play-window orchestration

`ui.js` should then shrink into app-shell routing and high-level wiring.

## Non-Negotiable Rules

- No new board behavior should be implemented directly in the app shell if it belongs in a UI component.
- No window should invent its own move input rules.
- No notation parser should bypass the canonical move-commit pipeline.
- No top-level navigation change should be made without updating [FEATURES.md](./FEATURES.md) and the DCR process.
- The UI must remain usable without 3D mode.

## Definition of Done For UI Foundation

The UI foundation is complete when:

- all top-level windows are defined and routable
- Play and Analysis have stable layouts
- the board component owns move recognition
- move commit updates all dependent panels consistently
- promotion, illegal move rejection, and engine-turn lockout behave consistently
- shared UI components are reused instead of duplicated
