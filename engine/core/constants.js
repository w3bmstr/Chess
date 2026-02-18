// constants.js
// Chess engine constants
// engine/core/constants.js

// Colors
export const COLOR_WHITE = 0;
export const COLOR_BLACK = 1;

// Piece types (no color)
export const PIECE_NONE   = 0;
export const PIECE_PAWN   = 1;
export const PIECE_KNIGHT = 2;
export const PIECE_BISHOP = 3;
export const PIECE_ROOK   = 4;
export const PIECE_QUEEN  = 5;
export const PIECE_KING   = 6;

// Piece indices in bitboard array (0..11)
// 0–5: white, 6–11: black
export const BB_W_PAWN   = 0;
export const BB_W_KNIGHT = 1;
export const BB_W_BISHOP = 2;
export const BB_W_ROOK   = 3;
export const BB_W_QUEEN  = 4;
export const BB_W_KING   = 5;

export const BB_B_PAWN   = 6;
export const BB_B_KNIGHT = 7;
export const BB_B_BISHOP = 8;
export const BB_B_ROOK   = 9;
export const BB_B_QUEEN  = 10;
export const BB_B_KING   = 11;

// Square indexing: A1 = 0 ... H8 = 63 (LERF)
export const A1 = 0;  export const B1 = 1;  export const C1 = 2;  export const D1 = 3;
export const E1 = 4;  export const F1 = 5;  export const G1 = 6;  export const H1 = 7;

export const A2 = 8;  export const B2 = 9;  export const C2 = 10; export const D2 = 11;
export const E2 = 12; export const F2 = 13; export const G2 = 14; export const H2 = 15;

export const A3 = 16; export const B3 = 17; export const C3 = 18; export const D3 = 19;
export const E3 = 20; export const F3 = 21; export const G3 = 22; export const H3 = 23;

export const A4 = 24; export const B4 = 25; export const C4 = 26; export const D4 = 27;
export const E4 = 28; export const F4 = 29; export const G4 = 30; export const H4 = 31;

export const A5 = 32; export const B5 = 33; export const C5 = 34; export const D5 = 35;
export const E5 = 36; export const F5 = 37; export const G5 = 38; export const H5 = 39;

export const A6 = 40; export const B6 = 41; export const C6 = 42; export const D6 = 43;
export const E6 = 44; export const F6 = 45; export const G6 = 46; export const H6 = 47;

export const A7 = 48; export const B7 = 49; export const C7 = 50; export const D7 = 51;
export const E7 = 52; export const F7 = 53; export const G7 = 54; export const H7 = 55;

export const A8 = 56; export const B8 = 57; export const C8 = 58; export const D8 = 59;
export const E8 = 60; export const F8 = 61; export const G8 = 62; export const H8 = 63;

// Helper: file (0..7), rank (0..7) → square index
export function square(file, rank) {
  return rank * 8 + file;
}

// Move encoding (32-bit packed)

// bit layout:
//  0–5   from square (0..63)
//  6–11  to square (0..63)
// 12–15  piece
// 16–19  captured piece
// 20–23  promotion piece
// 24–27  flags (capture/promo info)
// 28–31  reserved

export const FROM_SHIFT    = 0;
export const TO_SHIFT      = 6;
export const PIECE_SHIFT   = 12;
export const CAPTURE_SHIFT = 16;
export const PROMO_SHIFT   = 20;
export const FLAGS_SHIFT   = 24;

export function makeMove(from, to, piece, captured, promo, flags) {
  return  (from     << FROM_SHIFT)
        | (to       << TO_SHIFT)
        | (piece    << PIECE_SHIFT)
        | (captured << CAPTURE_SHIFT)
        | (promo    << PROMO_SHIFT)
        | (flags    << FLAGS_SHIFT);
}

export function moveFrom(m)    { return (m >>> FROM_SHIFT)    & 0x3F; }
export function moveTo(m)      { return (m >>> TO_SHIFT)      & 0x3F; }
export function movePiece(m)   { return (m >>> PIECE_SHIFT)   & 0x0F; }
export function moveCapture(m) { return (m >>> CAPTURE_SHIFT) & 0x0F; }
export function movePromo(m)   { return (m >>> PROMO_SHIFT)   & 0x0F; }
export function moveFlags(m)   { return (m >>> FLAGS_SHIFT)   & 0x0F; }

// Flags (4 bits total)
// bit 2 (4): capture
// bit 3 (8): promotion

export const FLAG_QUIET          = 0;  // normal move
export const FLAG_DOUBLE_PAWN    = 1;  // double pawn push
export const FLAG_KING_CASTLE    = 2;
export const FLAG_QUEEN_CASTLE   = 3;

export const FLAG_CAPTURE        = 4;  // capture
export const FLAG_EP_CAPTURE     = 5;  // en passant capture

// 8–11: promotions (quiet)
export const FLAG_PROMO          = 8;  // base promo flag (quiet)
export const FLAG_PROMO_N        = 9;
export const FLAG_PROMO_B        = 10;
export const FLAG_PROMO_R        = 11;
export const FLAG_PROMO_Q        = 12; // you can shift these if you prefer

// 12–15: capture + promotion variants (example mapping)
export const FLAG_PROMO_CAPTURE_N = 13;
export const FLAG_PROMO_CAPTURE_B = 14;
export const FLAG_PROMO_CAPTURE_R = 15;
// (you can extend/adjust promo/capture combos as needed)

// ...existing code...
