# Chess2 UI Controller API

This document defines the first shared game-controller layer used by Play and Analysis.

## Purpose

The controller is the single source of truth for:

- current position
- move history
- review index
- board selection state
- promotion resolution entry points
- engine-info state
- navigation and undo/new-game actions

The UI layer should render snapshots from the controller and emit user actions back into it.

## Factory

`createGameController(deps)`

Required dependencies:

- `parseFEN(fen)`
- `serializeFEN(state)`
- `getPieceAt(state, square)`
- `pieceColor(piece)`
- `generateLegalMovesFrom(state, square)`
- `generateAllLegalMoves(state)`
- `applyMoveToState(state, move)`
- `moveToUCI(move)`
- `findKingSquare(state, color)`
- `isSquareAttacked(state, square, byColor)`
- `oppositeColor(color)`

## Public Methods

- `subscribe(listener)`
- `getSnapshot()`
- `configure(nextConfig)`
- `loadFEN(fen, options)`
- `startNewGame()`
- `undoLastMove()`
- `navigateToMove(index)`
- `selectSquare(squareName)`
- `handleSquareClick(squareName, options)`
- `commitMove(move)`
- `findLegalMoveByUCI(uciMove)`
- `applyEngineMoveFromUCI(uciMove)`
- `setEngineThinking(isThinking)`
- `setEngineInfo(info)`
- `clearSelection()`
- `canUndo()`
- `canGoPrevious()`
- `canGoNext()`

## Snapshot Shape

The controller emits a snapshot object containing:

- `currentBoardFEN`
- `currentGameState`
- `selectedSquare`
- `legalTargets`
- `lastMoveSquares`
- `moveHistory`
- `currentMoveIndex`
- `currentEngineInfo`
- `engineThinking`
- `checkSquare`
- `isLivePosition`

## Integration Rule

- `ui.js` or future shell modules should subscribe to controller snapshots.
- Play and Analysis views should render only from snapshots.
- Engine search callbacks should update controller engine state instead of mutating UI-owned globals.
