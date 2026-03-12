// ============================
//   FEN LOADER — Complete Reference Library
//   180+ positions across 14 groups
//   Depends on globals: renderBoard(), renderFEN() — defined in board.js
// ============================

const FEN_PRESETS = [

    // ── STARTING POSITIONS ──────────────────────────────────────────
    { group: "Starting Positions", items: [
        { label: "Starting Position",           emoji: "♟",  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
        { label: "Empty Board",                 emoji: "⬜", fen: "8/8/8/8/8/8/8/8 w - - 0 1" },
        { label: "Chess960 Sample",             emoji: "🎲", fen: "rbbqknrn/pppppppp/8/8/8/8/PPPPPPPP/RBBQKNRN w KQkq - 0 1" },
    ]},

    // ── POPULAR OPENINGS ────────────────────────────────────────────
    { group: "Popular Openings", items: [
        { label: "Sicilian Defence",            emoji: "🐉", fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2" },
        { label: "Sicilian Najdorf",            emoji: "🦂", fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6" },
        { label: "Sicilian Dragon",             emoji: "🔥", fen: "rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6" },
        { label: "Sicilian Scheveningen",       emoji: "🌊", fen: "rnbqkb1r/pp3ppp/4pn2/2pp4/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6" },
        { label: "Ruy López",                   emoji: "⚔",  fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4" },
        { label: "Italian Game",                emoji: "🍕",  fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3" },
        { label: "Scotch Game",                 emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3" },
        { label: "King's Gambit",               emoji: "🔥",  fen: "rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 2" },
        { label: "Vienna Game",                 emoji: "🎼",  fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3" },
        { label: "Petroff Defence",             emoji: "🪆",  fen: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3" },
        { label: "Philidor Defence",            emoji: "🎵",  fen: "rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3" },
        { label: "French Defence",              emoji: "🥐",  fen: "rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3" },
        { label: "Caro-Kann",                   emoji: "🛡",  fen: "rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2" },
        { label: "Scandinavian Defence",        emoji: "🇸🇪",  fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2" },
        { label: "Alekhine's Defence",          emoji: "🐴",  fen: "rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2" },
        { label: "Pirc Defence",                emoji: "🦊",  fen: "rnbqkbnr/ppp1pppp/3p4/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2" },
        { label: "Queen's Gambit",              emoji: "👑",  fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2" },
        { label: "Queen's Gambit Accepted",     emoji: "🤝",  fen: "rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3" },
        { label: "Slav Defence",                emoji: "🇸🇰",  fen: "rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3" },
        { label: "Semi-Slav Defence",           emoji: "⚗",  fen: "rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5" },
        { label: "King's Indian Defence",       emoji: "🏰",  fen: "rnbqk2r/ppppppbp/5np2/8/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 2 5" },
        { label: "Nimzo-Indian Defence",        emoji: "🧠",  fen: "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4" },
        { label: "Queen's Indian Defence",      emoji: "🌸",  fen: "rnbqk2r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 5" },
        { label: "Grünfeld Defence",            emoji: "🌿",  fen: "rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq d6 0 4" },
        { label: "Catalan Opening",             emoji: "🏛",  fen: "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/6P1/PP2PPBP/RNBQK1NR b KQkq - 1 4" },
        { label: "Benoni Defence",              emoji: "🏹",  fen: "rnbqkb1r/pp1ppppp/5n2/2pP4/2P5/8/PP2PPPP/RNBQKBNR b KQkq - 0 3" },
        { label: "Benko Gambit",                emoji: "🎭",  fen: "rnbqkb1r/p2ppppp/5n2/1ppP4/2P5/8/PP2PPPP/RNBQKBNR w KQkq b6 0 4" },
        { label: "Dutch Defence",               emoji: "🌷",  fen: "rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w KQkq f6 0 2" },
        { label: "English Opening",             emoji: "🏴",  fen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1" },
        { label: "Réti Opening",                emoji: "🌀",  fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1" },
        { label: "King's Indian Attack",        emoji: "🗡",  fen: "rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPPBP/RNBQK2R b KQkq - 0 2" },
        { label: "Bird's Opening",              emoji: "🐦",  fen: "rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq f3 0 1" },
        { label: "London System",               emoji: "🌁",  fen: "rnbqkb1r/ppp1pppp/3p1n2/8/3P1B2/5N2/PPP1PPPP/RN1QKB1R b KQkq - 3 3" },
        { label: "Trompowsky Attack",           emoji: "🎺",  fen: "rnbqkb1r/pppppppp/5n2/6B1/3P4/8/PPP1PPPP/RN1QKBNR b KQkq - 2 2" },
    ]},

    // ── FAMOUS GAMES ────────────────────────────────────────────────
    { group: "Famous Games", items: [
        { label: "Immortal Game",               emoji: "⚡",  fen: "r1bk3r/p2pBpNp/n4n2/1p1NP2P/6P1/3p4/P1P1K3/q5b1 b - - 1 23" },
        { label: "Evergreen Game",              emoji: "🌲",  fen: "r1b2k1r/ppp1bppp/2n5/3p4/8/5N2/PPP2PPP/2KRR3 w - - 0 1" },
        { label: "Opera Game",                  emoji: "🎭",  fen: "2kr3r/ppp2Npp/1b6/1P1pN3/2Pp4/3P4/PPP3PP/R1BK3R b - - 0 15" },
        { label: "Game of the Century",         emoji: "🏆",  fen: "1Q6/5pk1/2p3p1/1p2N2p/1b5P/1bn5/2r3P1/2K5 w - - 16 42" },
        { label: "Immortal Zugzwang",           emoji: "🧊",  fen: "r2q1rk1/pb2bppp/1pn1pn2/3p2B1/2PP4/2N1PN2/PP2BPPP/R2QR1K1 b - - 0 11" },
        { label: "Kasparov vs Topalov",         emoji: "🌩",  fen: "r4rk1/1p1bppbp/p2p1np1/q7/3BP3/2N2N1P/PPP1QPP1/R3R1K1 w - - 4 18" },
        { label: "Deep Blue vs Kasparov",       emoji: "🤖",  fen: "r1k4r/p2nb1p1/2b4p/1p1n1pNq/2pP4/3Q4/1B1NB1PP/R4RK1 w - - 0 22" },
        { label: "Fischer vs Spassky G6",       emoji: "🇮🇸",  fen: "r1b1k2r/pp3ppp/1qn1p3/3pP3/3P4/2PB4/PP3PPP/R2QK2R w KQkq - 1 14" },
        { label: "Morphy vs Duke of Brunswick", emoji: "🎩",  fen: "4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 1" },
        { label: "Steinitz vs Lasker",          emoji: "🎖",  fen: "r3k2r/pp2bppp/2p1pn2/q7/3P4/2N1BN2/PPQ2PPP/R4RK1 w kq - 0 1" },
        { label: "Alekhine's Immortal",         emoji: "♾",  fen: "r4rk1/pp2qppp/2p5/4nb2/8/1BN5/PPP2PPP/R2QR1K1 w - - 0 1" },
        { label: "Tal's Sacrifice",             emoji: "🔮",  fen: "r1bqr1k1/pp1nbppp/2p2n2/3p4/3P1B2/2NBPN2/PPQ2PPP/R4RK1 w - - 0 12" },
        { label: "Capablanca Endgame",          emoji: "🕰",  fen: "8/p3kppp/1p6/8/8/1PP5/P4PPP/6K1 w - - 0 1" },
        { label: "Magnus's Queen Sac",          emoji: "🥶",  fen: "r4rk1/1bqnbppp/p2ppn2/1p6/3NP3/PBN1BP2/1PP1Q1PP/R4RK1 w - - 0 15" },
        { label: "Karpov vs Kasparov",          emoji: "🌩",  fen: "r3r1k1/pp3pbp/1qp3p1/2B5/2BP2b1/Q1n2N2/P4PPP/3RR1K1 b - - 0 1" },
        { label: "Nakamura's Immortal",         emoji: "🇺🇸",  fen: "r1bq1rk1/pp3ppp/2nbpn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 9" },
        { label: "Polgar vs Kasparov",          emoji: "👸",  fen: "r1bq1rk1/4bppp/p1n2n2/1pppp3/4P3/2PP1N2/PPB2PPP/RNBQR1K1 w - - 0 11" },
        { label: "Anand vs Karpov",             emoji: "🌏",  fen: "r1b2rk1/pp2ppbp/2np1np1/q7/2PNP3/2N1BP2/PP2B1PP/R2QK2R w KQ - 0 10" },
    ]},

    // ── TACTICAL MOTIFS ─────────────────────────────────────────────
    { group: "Tactical Motifs", items: [
        { label: "Scholar's Mate",              emoji: "🎓",  fen: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4" },
        { label: "Fool's Mate",                 emoji: "🤪",  fen: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3" },
        { label: "Greek Gift Sacrifice",        emoji: "🎁",  fen: "r1bq1rk1/ppp1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQ - 0 7" },
        { label: "Back Rank Mate",              emoji: "🔒",  fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1" },
        { label: "Smothered Mate",              emoji: "🫣",  fen: "6rk/6pp/8/8/8/8/6N1/7K w - - 0 1" },
        { label: "Anastasia's Mate",            emoji: "💀",  fen: "r5k1/pp3N1p/6p1/8/8/8/PPP3PP/7K w - - 0 1" },
        { label: "Arabian Mate",                emoji: "🐪",  fen: "7k/5N1R/8/8/8/8/8/7K w - - 0 1" },
        { label: "Legal's Mate",                emoji: "⚖",   fen: "r1bqk2r/ppp2ppp/2np4/2b1p3/2BPP3/5N2/PPP2PPP/RNBQR1K1 b - - 0 7" },
        { label: "Fork Tactic",                 emoji: "🍴",  fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4" },
        { label: "Pin Tactic",                  emoji: "📌",  fen: "r2qkb1r/ppp2ppp/2n1bn2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 7" },
        { label: "Skewer Tactic",               emoji: "🗡",  fen: "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1" },
        { label: "Discovered Attack",           emoji: "💥",  fen: "r1bqkb1r/ppp2ppp/2n5/3pp3/2B1P3/2NP4/PPP2PPP/R1BQK2R w KQkq - 0 6" },
        { label: "Double Check",                emoji: "‼",   fen: "r1bqkb1r/pppp1ppp/2n5/4p2N/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 3 4" },
        { label: "Clearance Sacrifice",         emoji: "🧹",  fen: "r1bq1rk1/ppp2ppp/2nb1n2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
        { label: "Remove the Defender",         emoji: "🎯",  fen: "r1bqr1k1/ppp2ppp/2n2n2/3pp3/1bB1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
        { label: "Overloading a Piece",         emoji: "😵",  fen: "r1bqk2r/ppp2ppp/2n2n2/3pp3/1bB1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7" },
        { label: "Zwischenzug",                 emoji: "⚡",  fen: "r1bq1rk1/pp2ppbp/2np1np1/8/2BNP3/2N1BP2/PPP3PP/R2QK2R w KQ - 0 9" },
        { label: "Deflection Tactic",           emoji: "↗",  fen: "r3k2r/pp1bpppp/2n5/3p4/3P4/2N1PN2/PP3PPP/R1B1K2R w KQkq - 0 1" },
        { label: "Decoy Sacrifice",             emoji: "🪤",  fen: "r4rk1/pp2ppbp/2n3p1/q2p4/3P4/2N1PN2/PP2BPPP/R2QK2R w KQ - 0 1" },
        { label: "Windmill Combination",        emoji: "🌀",  fen: "r2qr1k1/ppp2ppp/3p1n2/8/3P4/2N1PN2/PP3PPP/R2QK2R w KQ - 0 1" },
        { label: "Interference Tactic",         emoji: "🚧",  fen: "r2qkb1r/ppp2ppp/2n1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5" },
        { label: "X-Ray Attack",                emoji: "🔭",  fen: "4k3/8/8/8/3r4/8/8/R3K3 w Q - 0 1" },
        { label: "Zugzwang Study",              emoji: "🧩",  fen: "8/8/p1p5/1p5p/1P5p/8/PPP2K1p/4R1rk w - - 0 1" },
    ]},

    // ── CLASSIC ENDGAMES ────────────────────────────────────────────
    { group: "Classic Endgames", items: [
        { label: "Lucena Position",             emoji: "📖",  fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1" },
        { label: "Philidor Position",           emoji: "🔐",  fen: "4k3/8/8/8/8/8/r7/3RK3 w - - 0 1" },
        { label: "Cochrane Defence",            emoji: "🛡",  fen: "8/8/8/1k6/8/1K6/1r6/4R3 w - - 0 1" },
        { label: "Rook Behind Passed Pawn",     emoji: "🚂",  fen: "8/8/8/3k4/3p4/8/8/R3K3 w Q - 0 1" },
        { label: "K+P vs K (Opposition)",       emoji: "👣",  fen: "8/8/8/8/8/4k3/4P3/4K3 w - - 0 1" },
        { label: "K+R vs K (Mating Net)",       emoji: "🎯",  fen: "8/8/8/8/8/2k5/8/R3K3 w Q - 0 1" },
        { label: "K+Q vs K (Mating Net)",       emoji: "♛",  fen: "8/8/8/8/8/2k5/8/Q3K3 w - - 0 1" },
        { label: "Bishop + Knight Mate",        emoji: "🔔",  fen: "8/8/8/8/8/1k6/8/K1BN4 w - - 0 1" },
        { label: "Two Bishops vs K",            emoji: "✝",  fen: "8/8/8/8/8/2k5/8/K1BB4 w - - 0 1" },
        { label: "Opposite Colour Bishops",     emoji: "🔲",  fen: "8/4kp2/8/8/8/8/4KP2/8 w - - 0 1" },
        { label: "Q vs P on 7th Rank",          emoji: "🤯",  fen: "8/6p1/8/8/8/8/6K1/k6Q w - - 0 1" },
        { label: "Q vs R (Philidor Defence)",   emoji: "🏹",  fen: "8/8/8/3k4/8/8/8/3KQ3 w - - 0 1" },
        { label: "Rook Pawn Draw",              emoji: "🤝",  fen: "8/8/8/8/8/7k/7P/7K w - - 0 1" },
        { label: "Wrong Rook Pawn",             emoji: "🤦",  fen: "8/8/8/8/8/7k/7P/6BK w - - 0 1" },
        { label: "Trebuchet",                   emoji: "⚙",  fen: "8/8/8/3k4/8/3K4/3P4/8 w - - 0 1" },
        { label: "Réti Study",                  emoji: "💡",  fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1" },
        { label: "Saavedra Position",           emoji: "🎖",  fen: "8/8/1KP5/3r4/8/8/8/k7 w - - 0 1" },
        { label: "Passed Pawn Race",            emoji: "🏃",  fen: "8/p7/8/8/8/8/P7/8 w - - 0 1" },
        { label: "Outside Passed Pawn",         emoji: "🎿",  fen: "8/5ppp/8/5PPP/8/8/p7/8 w - - 0 1" },
        { label: "Triangulation",               emoji: "🔺",  fen: "8/8/8/3k4/3P4/3K4/8/8 w - - 0 1" },
        { label: "K+2P vs K+P Draw",            emoji: "🤜",  fen: "8/8/8/8/8/k7/p1p5/K7 w - - 0 1" },
        { label: "Underpromotion Draw",         emoji: "🎭",  fen: "8/5P1k/8/8/8/8/8/7K w - - 0 1" },
    ]},

    // ── MATING PATTERNS ─────────────────────────────────────────────
    { group: "Mating Patterns", items: [
        { label: "Boden's Mate",                emoji: "✂",  fen: "2kr3r/ppp2ppp/2n5/8/1b6/2N5/PPPP1PPP/R1BQK2R w KQ - 0 1" },
        { label: "Epaulette Mate",              emoji: "🪖",  fen: "3rkr2/8/8/8/8/8/8/3QK3 w - - 0 1" },
        { label: "Hook Mate",                   emoji: "🪝",  fen: "5rk1/5ppp/8/8/8/8/5N2/4R1K1 w - - 0 1" },
        { label: "Corridor Mate",               emoji: "🚇",  fen: "7k/6pp/8/8/8/8/6PP/6RK w - - 0 1" },
        { label: "Dovetail Mate",               emoji: "🕊",  fen: "6k1/5p1p/8/8/8/8/5Q2/6K1 w - - 0 1" },
        { label: "Swallow's Tail Mate",         emoji: "🐦",  fen: "r5k1/5ppp/8/8/8/8/8/3QK3 w - - 0 1" },
        { label: "Morphy's Mate",               emoji: "🏛",  fen: "5rk1/pp4pp/8/8/8/1B6/PP3PPP/4R1K1 w - - 0 1" },
        { label: "Opera Mate",                  emoji: "🎼",  fen: "3R4/8/8/8/8/8/B7/4K1k1 w - - 0 1" },
        { label: "Blackburne's Mate",           emoji: "🌑",  fen: "6k1/5ppp/8/8/2B5/8/5PPP/3R2K1 w - - 0 1" },
        { label: "Damiano's Mate",              emoji: "🧨",  fen: "5rk1/6pp/6P1/8/8/8/5Q2/6K1 w - - 0 1" },
        { label: "Pillsbury's Mate",            emoji: "🎩",  fen: "6rk/5Npp/8/8/8/8/5PPP/6K1 w - - 0 1" },
        { label: "Corner Mate",                 emoji: "📐",  fen: "6Rk/7p/8/8/8/8/8/6NK w - - 0 1" },
        { label: "Ladder Mate (Q+R)",           emoji: "🪜",  fen: "7k/8/8/8/8/8/8/QR5K w - - 0 1" },
        { label: "Lolli's Mate",                emoji: "🍭",  fen: "r1bqkb1r/pppp1Npp/8/4n3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5" },
        { label: "Triangle Mate",               emoji: "🔻",  fen: "7k/8/8/8/8/8/8/3QK3 w - - 0 1" },
    ]},

    // ── PAWN STRUCTURE CONCEPTS ─────────────────────────────────────
    { group: "Pawn Structure Concepts", items: [
        { label: "Isolated Queen's Pawn",       emoji: "🏝",  fen: "r1bqkb1r/pp3ppp/2n1pn2/3p4/2PP4/2N2N2/PP3PPP/R1BQKB1R w KQkq - 0 7" },
        { label: "Hanging Pawns",               emoji: "⚖",  fen: "r1bqr1k1/pp3ppp/2nb1n2/3pp3/2PP4/2N1PN2/PP2BPPP/R1BQR1K1 w - - 0 11" },
        { label: "Doubled Pawns",               emoji: "👯",  fen: "r1bqkb1r/pp1p1ppp/2n1pn2/8/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5" },
        { label: "Backward Pawn",               emoji: "↩",  fen: "r1bqk2r/pp2bppp/2nppn2/8/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 8" },
        { label: "Pawn Chain (French)",         emoji: "⛓",  fen: "r1bqkb1r/pp3ppp/2nppn2/8/2PpP3/2N2N2/PP3PPP/R1BQKB1R w KQkq - 0 7" },
        { label: "Passed Pawn (Advanced)",      emoji: "🚀",  fen: "6k1/8/6K1/4P3/8/8/8/8 w - - 0 1" },
        { label: "Pawn Majority",               emoji: "⚡",  fen: "8/5ppp/8/8/8/8/3PPP2/8 w - - 0 1" },
        { label: "Pawn Island Count",           emoji: "🏖",  fen: "r1bqkb1r/1p3ppp/p1nppn2/8/3NP3/2N1BP2/PPP3PP/R2QKB1R w KQkq - 0 9" },
        { label: "Pawn Lever",                  emoji: "🔧",  fen: "r1bqkb1r/pp3ppp/2nppn2/8/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 7" },
        { label: "Pawn Breakthrough",           emoji: "💣",  fen: "8/8/8/2ppp3/2PPP3/8/8/8 w - - 0 1" },
        { label: "Minority Attack",             emoji: "🎯",  fen: "r1b1r1k1/pp3ppp/2p2n2/q2p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 12" },
        { label: "Queenside Majority",          emoji: "↔",  fen: "8/5pp1/8/8/pp6/8/PPP5/8 w - - 0 1" },
    ]},

    // ── STRATEGIC CONCEPTS ──────────────────────────────────────────
    { group: "Strategic Concepts", items: [
        { label: "Good vs Bad Bishop",          emoji: "🟫",  fen: "4k3/pp1b1ppp/8/3pp3/3PP3/8/PP1B1PPP/4K3 w - - 0 1" },
        { label: "Knight Outpost",              emoji: "🐎",  fen: "r1bqr1k1/pp3ppp/2pb1n2/3Np3/4P3/2N1BP2/PPP3PP/R2QK2R w KQ - 0 11" },
        { label: "Rook on 7th Rank",            emoji: "🔝",  fen: "6k1/1R3ppp/8/8/8/8/5PPP/6K1 w - - 0 1" },
        { label: "Rook on Open File",           emoji: "📂",  fen: "r1bqk2r/pp3ppp/2nbpn2/3p4/3P4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 8" },
        { label: "Bishop Pair Advantage",       emoji: "✌",  fen: "r1bqk2r/pp3ppp/2n1pn2/3p4/3P4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 8" },
        { label: "Knight vs Bad Bishop",        emoji: "🐴",  fen: "4k3/pp3ppp/3b4/3pp3/3PN3/8/PP3PPP/4K3 w - - 0 1" },
        { label: "Weak Square Complex",         emoji: "🕳",  fen: "r2qr1k1/pb2bppp/1pn1pn2/3p4/2PP4/1PN1PN2/PB2BPPP/R2QR1K1 w - - 0 12" },
        { label: "Open vs Closed Center",       emoji: "🌐",  fen: "r1bq1rk1/pp1nbppp/2p1pn2/3p4/2PP4/2NBPN2/PPQ2PPP/R1B2RK1 w - - 0 10" },
        { label: "Prophylaxis",                 emoji: "🛑",  fen: "r2qr1k1/pp1b1ppp/2nbpn2/3p4/3P4/2NBPN2/PPQ2PPP/R1B1R1K1 w - - 0 12" },
        { label: "Overprotection",              emoji: "🛡",  fen: "r1bqr1k1/pp3ppp/2nbpn2/3p4/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 0 11" },
        { label: "Color Complex Control",       emoji: "🎨",  fen: "r1bq1rk1/pp2bppp/2nppn2/8/2PP4/2N1PN2/PP2BPPP/R1BQR1K1 w - - 0 10" },
        { label: "Space Advantage",             emoji: "🌌",  fen: "r1bqr1k1/pp3ppp/2nbpn2/2pp4/3PP3/2N1BN2/PPQ2PPP/R1B2RK1 w - - 0 10" },
    ]},

    // ── DEFENSIVE TECHNIQUES & DRAWS ────────────────────────────────
    { group: "Defensive Techniques & Draws", items: [
        { label: "Stalemate Trap",              emoji: "🤝",  fen: "7k/8/6Q1/8/8/8/8/6K1 w - - 0 1" },
        { label: "Fortress Draw (R vs Q)",      emoji: "🏰",  fen: "7k/8/8/8/8/8/5R2/7K w - - 0 1" },
        { label: "Perpetual Check",             emoji: "🔄",  fen: "6k1/5ppp/8/8/8/8/5Q2/6K1 w - - 0 1" },
        { label: "Stalemate in Q Endgame",      emoji: "😅",  fen: "8/8/8/8/8/8/q7/k1K5 w - - 0 1" },
        { label: "Drawing Fortress (B+P)",      emoji: "🏯",  fen: "8/8/8/8/1B6/8/K1pk4/8 w - - 0 1" },
        { label: "Perpetual Check Setup",       emoji: "♾",  fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4" },
        { label: "Skewer Draw",                 emoji: "↔",  fen: "8/8/8/8/8/k7/8/rR5K w - - 0 1" },
        { label: "Desperado Piece",             emoji: "😤",  fen: "4k3/8/8/3Nn3/8/8/8/4K3 w - - 0 1" },
        { label: "Blockade Draw",               emoji: "🚫",  fen: "8/8/8/1p6/1P6/k7/8/K7 w - - 0 1" },
        { label: "Dead Position Draw",          emoji: "💤",  fen: "8/8/8/3k4/8/8/8/3K4 w - - 0 1" },
        { label: "Mutual Zugzwang Draw",        emoji: "🔃",  fen: "8/8/8/3kp3/3pP3/3K4/8/8 w - - 0 1" },
    ]},

    // ── OPENING TRAPS ───────────────────────────────────────────────
    { group: "Opening Traps", items: [
        { label: "Fried Liver Attack",          emoji: "🔪",  fen: "r1bqkb1r/ppp2ppp/2n5/3Pp1N1/2Bn4/8/PPPP1PPP/RNBQK2R w KQkq - 0 7" },
        { label: "Elephant Trap",               emoji: "🐘",  fen: "r1bqk2r/ppp2ppp/2n1pn2/3p4/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 6" },
        { label: "Noah's Ark Trap",             emoji: "⛵",  fen: "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4" },
        { label: "Budapest Gambit Trap",        emoji: "🇭🇺",  fen: "rnbqkb1r/pppp1ppp/8/4p3/2PPn3/8/PP2PPPP/RNBQKBNR w KQkq - 1 4" },
        { label: "Lasker Trap",                 emoji: "🪤",  fen: "rnb1kb1r/ppp2ppp/4pq2/8/3Pn3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 7" },
        { label: "Fishing Pole Trap",           emoji: "🎣",  fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3" },
        { label: "Traxler Counter-Gambit",      emoji: "🗡",  fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 4 5" },
        { label: "Mortimer Trap",               emoji: "💀",  fen: "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/3PP3/5N2/PPP2PPP/RNBQK2R b KQkq d3 0 4" },
        { label: "Stafford Gambit Trap",        emoji: "🔫",  fen: "r1bqkb1r/pppp1ppp/5n2/8/2BpP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 5" },
        { label: "Tennison Gambit Trap",        emoji: "🎻",  fen: "r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4" },
        { label: "Albin Counter-Gambit",        emoji: "🔄",  fen: "rnbqkbnr/ppp2ppp/8/3pp3/2PP4/8/PP2PPPP/RNBQKBNR w KQkq e6 0 3" },
        { label: "Légal Trap Setup",            emoji: "🎭",  fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3" },
        { label: "Blackmar-Diemer Trap",        emoji: "🧨",  fen: "rnbqkb1r/ppp2ppp/4pn2/8/3PP3/2N2N2/PPP3PP/R1BQKB1R b KQkq - 0 5" },
        { label: "Englund Gambit Trap",         emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fen: "rnbqkb1r/pppp1ppp/5n2/4p3/3P4/3Q4/PPP1PPPP/RNB1KBNR b KQkq - 1 3" },
    ]},

    // ── PIECE COORDINATION & IMBALANCES ─────────────────────────────
    { group: "Piece Coordination & Imbalances", items: [
        { label: "Two Rooks vs Queen",          emoji: "🔁",  fen: "6k1/5ppp/8/8/8/8/5PPP/2RRK3 w - - 0 1" },
        { label: "Rook vs Two Minor Pieces",    emoji: "⚔",  fen: "6k1/5ppp/8/8/8/8/5PPP/2BNK3 w - - 0 1" },
        { label: "Knight vs Bishop (Open)",     emoji: "🌾",  fen: "6k1/5ppp/5n2/8/8/5B2/5PPP/6K1 w - - 0 1" },
        { label: "Knight vs Bishop (Closed)",   emoji: "🌲",  fen: "6k1/pp3ppp/2p1p3/8/3N4/3b4/PP3PPP/6K1 w - - 0 1" },
        { label: "Rook vs Two Pawns",           emoji: "⚖",  fen: "8/5k2/5pp1/8/8/8/5K2/4R3 w - - 0 1" },
        { label: "Queen vs Two Rooks",          emoji: "👸",  fen: "6k1/5ppp/8/8/8/8/5PPP/3QK3 w - - 0 1" },
        { label: "Active vs Passive Rook",      emoji: "🏃",  fen: "r5k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1" },
        { label: "Centralised vs Edge Knight",  emoji: "🐎",  fen: "8/8/8/3N4/8/8/8/n7 w - - 0 1" },
        { label: "Battery on Open File",        emoji: "💪",  fen: "6k1/5ppp/8/8/8/8/5PPP/R1R3K1 w - - 0 1" },
        { label: "Queen + Knight Attack",       emoji: "🎯",  fen: "r1bqr1k1/pp3ppp/2n2n2/3pp3/2B1P3/2N2N2/PPP2PPP/R1BQR1K1 w - - 0 9" },
        { label: "Rook Pair vs Queen",          emoji: "♟",  fen: "8/3k4/8/8/8/8/3K4/1q1RR3 w - - 0 1" },
        { label: "Bishop Pair in Open Game",    emoji: "✌",  fen: "r4rk1/pp3ppp/2n1pn2/3p4/3P4/2N1PN2/PP2BPPP/R1B2RK1 w - - 0 10" },
        { label: "Knight Pair vs Bishop Pair",  emoji: "🔀",  fen: "r4rk1/pp3ppp/2n2n2/3pp3/3PP3/2N2N2/PP3PPP/R4RK1 w - - 0 10" },
        { label: "Rook + Bishop vs Rook",       emoji: "🗼",  fen: "8/3k4/8/8/8/8/3K4/r2RB3 w - - 0 1" },
        { label: "Piece Activity vs Material",  emoji: "🔥",  fen: "r1b2rk1/pp3ppp/2nbpn2/3p4/3P4/2N1PN2/PP2BPPP/R1B2RK1 w - - 0 10" },
    ]},

    // ── KING SAFETY & ATTACKING PLAY ────────────────────────────────
    { group: "King Safety & Attacking Play", items: [
        { label: "Opposite Side Castling",      emoji: "⚔",  fen: "r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPP3PP/R2QKB1R w KQ - 0 9" },
        { label: "Pawn Storm (Kingside)",       emoji: "🌊",  fen: "r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2NBB3/PPP2PPP/R2QK2R w KQ - 0 9" },
        { label: "Pawn Storm (Queenside)",      emoji: "🏄",  fen: "r1bqk2r/1pp1bppp/p1np1n2/4p3/2PPP3/2N1BN2/PP3PPP/R2QKB1R w KQkq - 0 8" },
        { label: "Open h-File Attack",          emoji: "💣",  fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
        { label: "Greek Gift (Bxh7+)",          emoji: "🎁",  fen: "r1bq1rk1/ppp1bpp1/2np1n1p/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
        { label: "Uncastled King Attack",       emoji: "🏹",  fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5" },
        { label: "Vulnerable King on e1",       emoji: "😰",  fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2BPP3/5N2/PPP2PPP/RNBQK2R b KQkq d3 0 4" },
        { label: "King Hunt Example",           emoji: "🏃",  fen: "r2q1rk1/ppp2ppp/2n1pn2/3p4/1bPP4/2NBPN2/PP3PPP/R2QK2R w KQ - 0 9" },
        { label: "Attacking Castled King",      emoji: "🔥",  fen: "r1bq1rk1/ppp2ppp/2n2n2/3pp3/1bB1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
        { label: "Weakened King (f6 Pawn)",     emoji: "🕳",  fen: "r1bq1rk1/pppp1p1p/2n2np1/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
        { label: "Rook Lift to 3rd Rank",       emoji: "🚀",  fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NPB N2/PPP2PPP/R2QK2R w KQ - 0 8" },
        { label: "Mating Attack on g7",         emoji: "💥",  fen: "6k1/5ppp/4p3/8/8/5N2/5PPP/4RRK1 w - - 0 1" },
        { label: "Zugzwang in Attack",          emoji: "🎯",  fen: "r4rk1/pp2qppp/2p1pn2/8/2PP4/2N1PN2/PP2BPPP/R2QR1K1 w - - 0 12" },
        { label: "Weak King Pawn Cover",        emoji: "🧱",  fen: "r1bq1rk1/ppp3pp/2np1p2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
    ]},

    // ── POSITIONAL SACRIFICES ────────────────────────────────────────
    { group: "Positional Sacrifices", items: [
        { label: "Exchange Sac for Bishop",     emoji: "🔀",  fen: "r1bq1rk1/pp3ppp/2nbpn2/3p4/3P4/2NBPN2/PPQ2PPP/R1B2RK1 w - - 0 11" },
        { label: "Exchange Sac for Activity",   emoji: "⚡",  fen: "2rq1rk1/pp1b1ppp/2nbpn2/3p4/3P4/2NBPN2/PPQ2PPP/R1BR2K1 w - - 0 12" },
        { label: "Piece Sac for Passed Pawn",   emoji: "🚂",  fen: "r4rk1/pp1b1ppp/2nbpn2/q2p4/3P4/2NBPN2/PPQ2PPP/R1B2RK1 w - - 0 11" },
        { label: "Pawn Sac for Initiative",     emoji: "🎯",  fen: "r1bq1rk1/pp3ppp/2nbpn2/2pp4/3PP3/2N1BN2/PPQ2PPP/R1B2RK1 w - - 0 10" },
        { label: "Long-Term Pawn Sacrifice",    emoji: "🌱",  fen: "r1b2rk1/pp1q1ppp/2nbpn2/3p4/3P4/2NBPN2/PPQ2PPP/R1B2RK1 w - - 0 11" },
        { label: "Quality Sacrifice (Rook)",    emoji: "♜",  fen: "2r2rk1/pp1b1ppp/2nbpn2/3p4/3P4/2NBPN2/PPQ2PPP/R1BR2K1 w - - 0 12" },
        { label: "Sac for Dark Square Control", emoji: "⬛", fen: "r1bq1rk1/pp3ppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQR1K1 w - - 0 10" },
        { label: "Sac for Open File",           emoji: "📂",  fen: "r1bq1rk1/pp3ppp/2nbpn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQR1K1 w - - 0 10" },
        { label: "Knight Sac on f7",            emoji: "🐴",  fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5" },
        { label: "Bishop Sac on h7",            emoji: "🔱",  fen: "r1bq1rk1/ppp1bppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8" },
        { label: "Rook Sac for Queenside Play", emoji: "♖",  fen: "2r2rk1/pp1qbppp/2n1pn2/3p4/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 0 12" },
        { label: "Piece Sac for King Attack",   emoji: "👑",  fen: "r1bq1rk1/ppp2ppp/2n1pn2/3p2B1/1bPP4/2N2N2/PP2PPPP/R2QKB1R w KQ - 0 7" },
        { label: "The Immortal Pawn Sac",       emoji: "🏆",  fen: "r1bqr1k1/pp1n1ppp/2pb1n2/3p4/3P4/2NBPN2/PPQ2PPP/R1B2RK1 w - - 0 11" },
    ]},

    // ── COMPOSED ENDGAME STUDIES ─────────────────────────────────────
    { group: "Composed Endgame Studies", items: [
        { label: "Réti's Masterpiece",          emoji: "💡",  fen: "7K/8/k1P5/7p/8/8/8/8 w - - 0 1" },
        { label: "Saavedra Study",              emoji: "🎖",  fen: "8/8/1KP5/3r4/8/8/8/k7 w - - 0 1" },
        { label: "Troitzky Two Knights",        emoji: "🐴",  fen: "8/8/8/8/8/1k6/8/K2NN3 w - - 0 1" },
        { label: "Kasparian Rook Study",        emoji: "♖",  fen: "8/8/8/8/R7/8/pk6/8 w - - 0 1" },
        { label: "Rinck Bishop Study",          emoji: "♗",  fen: "8/8/8/8/8/1B6/1K6/1k6 w - - 0 1" },
        { label: "Kling & Horwitz Study",       emoji: "🕰",  fen: "8/8/8/8/8/3k4/3p4/3K4 w - - 0 1" },
        { label: "Vancura Position",            emoji: "🏄",  fen: "6k1/8/6KP/5R2/8/8/8/r7 w - - 0 1" },
        { label: "Barbier & Saavedra",          emoji: "🌹",  fen: "3k4/8/K1P5/8/8/8/8/3r4 w - - 0 1" },
        { label: "Lasker's Bishop Study",       emoji: "🔮",  fen: "8/8/8/8/8/2B5/K7/k7 w - - 0 1" },
        { label: "Horwitz & Kling Knights",     emoji: "♞",  fen: "8/8/8/3k4/8/3K4/8/4NN2 w - - 0 1" },
        { label: "Centurini Study",             emoji: "🏛",  fen: "8/8/8/8/5B2/4K3/5P2/5k2 w - - 0 1" },
        { label: "Grigoriev P+K Study",         emoji: "🌿",  fen: "8/8/1p6/1P6/8/k7/8/K7 w - - 0 1" },
        { label: "Troitzky Rook Study",         emoji: "🌙",  fen: "8/8/8/8/1R6/k7/8/K7 w - - 0 1" },
        { label: "Fine's R+P Endgame",          emoji: "📚",  fen: "8/5k2/8/5P2/8/8/5K2/5R2 w - - 0 1" },
        { label: "Averbakh Bishop Study",       emoji: "⚗",  fen: "8/8/8/3B4/3K4/3k4/8/8 w - - 0 1" },
        { label: "Rook vs Bishop Draw",         emoji: "🤝",  fen: "8/8/8/3k4/3b4/3K4/8/4R3 w - - 0 1" },
    ]},
];

// ============================
//   FEN VALIDATION
// ============================
function validateFEN(fen) {
    if (!fen || typeof fen !== 'string') return { valid: false, error: "FEN string is empty." };
    const parts = fen.trim().split(/\s+/);
    const rows = parts[0].split('/');
    if (rows.length !== 8) return { valid: false, error: "Expected 8 ranks, got " + rows.length + "." };
    let expectedWidth = 0;
    for (let r = 0; r < rows.length; r++) {
        let count = 0;
        for (let index = 0; index < rows[r].length; index++) {
            const ch = rows[r][index];
            if (/^[0-9]$/.test(ch)) {
                let digits = ch;
                while (index + 1 < rows[r].length && /^[0-9]$/.test(rows[r][index + 1])) {
                    index += 1;
                    digits += rows[r][index];
                }
                count += parseInt(digits, 10);
            } else if ('prnbqkacPRNBQKAC'.includes(ch)) {
                count += 1;
            } else {
                return { valid: false, error: "Invalid character '" + ch + "' in rank " + (8 - r) + "." };
            }
        }
        if (!expectedWidth) expectedWidth = count;
        if (count !== expectedWidth) return { valid: false, error: "Rank " + (8 - r) + " has " + count + " squares (expected " + expectedWidth + ")." };
    }
    const board = parts[0];
    const wk = (board.match(/K/g) || []).length;
    const bk = (board.match(/k/g) || []).length;
    if (wk !== 1) return { valid: false, error: "Expected 1 white king, found " + wk + "." };
    if (bk !== 1) return { valid: false, error: "Expected 1 black king, found " + bk + "." };
    if (parts[1] && parts[1] !== 'w' && parts[1] !== 'b')
        return { valid: false, error: "Active colour must be 'w' or 'b', got '" + parts[1] + "'." };
    return { valid: true };
}

// ============================
//   CURRENT FEN — reads live board DOM
// ============================
function getCurrentFEN() {
    if (typeof window.getCurrentBoardFEN === 'function') {
        const currentFen = window.getCurrentBoardFEN();
        if (currentFen) return currentFen;
    }

    const board = document.getElementById('chessboard');
    if (!board) return null;
    const squares = board.querySelectorAll('.square');
    if (!squares.length) return null;
    let rows = [];
    for (let rank = 0; rank < 8; rank++) {
        let row = '', empty = 0;
        for (let file = 0; file < 8; file++) {
            const piece = squares[rank * 8 + file].querySelector('.piece');
            if (piece) {
                if (empty > 0) { row += empty; empty = 0; }
                row += piece.dataset.piece;
            } else {
                empty++;
            }
        }
        if (empty > 0) row += empty;
        rows.push(row);
    }
    return rows.join('/') + ' w - - 0 1';
}

// ============================
//   INIT
// ============================
function initFenLoader() {
    const input       = document.getElementById('fen-input');
    const loadBtn     = document.getElementById('fen-load-btn');
    const clearBtn    = document.getElementById('fen-clear-btn');
    const statusEl    = document.getElementById('fen-status');
    const copyBtn     = document.getElementById('fen-copy-btn');
    const currentDisp = document.getElementById('fen-current-display');
    const presetsGrid = document.getElementById('fen-presets-grid');

    if (!input || !loadBtn) return;

    if (input.dataset.fenInit === '1') { refreshCurrentFEN(); return; }
    input.dataset.fenInit = '1';

    function setStatus(msg, type) {
        statusEl.textContent = msg;
        statusEl.className = 'fen-status ' + (type || 'idle');
    }

    function refreshCurrentFEN() {
        if (currentDisp) {
            const fen = getCurrentFEN();
            currentDisp.textContent = fen || '(board not rendered yet — click Play first)';
        }
    }

    function loadFENAndPlay(fen) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const playView = document.getElementById('view-play');
        if (playView) playView.classList.add('active');
        renderBoard();
        renderFEN(fen);
    }

    input.addEventListener('input', function() {
        const val = input.value.trim();
        if (!val) { setStatus('', 'idle'); return; }
        const r = validateFEN(val);
        setStatus(r.valid ? '✓ Valid FEN' : '✗ ' + r.error, r.valid ? 'ok' : 'error');
    });

    loadBtn.addEventListener('click', function() {
        const val = input.value.trim();
        if (!val) { setStatus('Paste a FEN string above.', 'error'); return; }
        const r = validateFEN(val);
        if (!r.valid) { setStatus('✗ ' + r.error, 'error'); return; }
        loadFENAndPlay(val);
        setStatus('✓ Position loaded!', 'ok');
    });

    clearBtn.addEventListener('click', function() {
        input.value = '';
        setStatus('', 'idle');
        input.focus();
    });

    copyBtn.addEventListener('click', function() {
        const fen = getCurrentFEN();
        if (!fen) { copyBtn.textContent = '⚠ No board yet'; setTimeout(function(){ copyBtn.textContent = '📋 Copy'; }, 1800); return; }
        function done() { copyBtn.textContent = '✓ Copied!'; setTimeout(function(){ copyBtn.textContent = '📋 Copy'; }, 1800); }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(fen).then(done).catch(function(){ fallbackCopy(fen, done); });
        } else {
            fallbackCopy(fen, done);
        }
    });

    function fallbackCopy(text, cb) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch(e) {}
        ta.remove(); cb();
    }

    if (presetsGrid && !presetsGrid.dataset.built) {
        presetsGrid.dataset.built = '1';
        FEN_PRESETS.forEach(function(group) {
            const heading = document.createElement('h4');
            heading.className = 'fen-group-heading';
            heading.textContent = group.group;
            presetsGrid.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'fen-presets-grid-inner';
            presetsGrid.appendChild(grid);

            group.items.forEach(function(preset) {
                const card = document.createElement('button');
                card.className = 'fen-preset-card';
                card.innerHTML = '<span class="preset-emoji">' + preset.emoji + '</span><span class="preset-label">' + preset.label + '</span>';
                card.title = preset.fen;
                card.addEventListener('click', function() {
                    input.value = preset.fen;
                    setStatus('✓ Valid FEN', 'ok');
                    loadFENAndPlay(preset.fen);
                });
                grid.appendChild(card);
            });
        });
    }

    refreshCurrentFEN();
}

document.addEventListener('DOMContentLoaded', initFenLoader);