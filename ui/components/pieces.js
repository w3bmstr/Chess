
// /ui/components/pieces.js

// Simple, clean modern Staunton-style SVGs.
// Flat base + soft geometry, no crazy gradients.
// Each piece is a self-contained <svg> that scales to its parent.

const WHITE_PIECES = {
  K: `
<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="none">
    <!-- base -->
    <rect x="8" y="64" width="44" height="8" rx="3" fill="#dcd6c8"/>
    <rect x="12" y="58" width="36" height="6" rx="3" fill="#e9e3d4"/>
    <!-- body -->
    <path d="M20 58 C18 50 18 44 20 38 C22 32 26 28 30 28 C34 28 38 32 40 38 C42 44 42 50 40 58 Z"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.2"/>
    <!-- collar -->
    <rect x="20" y="26" width="20" height="4" rx="2" fill="#e2dbcc"/>
    <!-- head -->
    <circle cx="30" cy="20" r="5" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.1"/>
    <!-- cross -->
    <rect x="28" y="8" width="4" height="10" rx="2" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1"/>
    <rect x="24" y="12" width="12" height="3" rx="1.5" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1"/>
  </g>
</svg>
`,
  Q: `
<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="none">
    <!-- base -->
    <rect x="8" y="64" width="44" height="8" rx="3" fill="#dcd6c8"/>
    <rect x="12" y="58" width="36" height="6" rx="3" fill="#e9e3d4"/>
    <!-- body -->
    <path d="M20 58 C18 50 18 44 20 38 C22 32 26 28 30 28 C34 28 38 32 40 38 C42 44 42 50 40 58 Z"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.2"/>
    <!-- crown band -->
    <rect x="20" y="26" width="20" height="4" rx="2" fill="#e2dbcc"/>
    <!-- crown points -->
    <path d="M20 26 L23 18 L27 24 L30 17 L33 24 L37 18 L40 26 Z"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.1"/>
    <!-- crown balls -->
    <circle cx="23" cy="18" r="2" fill="#f4efe3" stroke="#b3aa9a" stroke-width="0.8"/>
    <circle cx="30" cy="17" r="2.2" fill="#f4efe3" stroke="#b3aa9a" stroke-width="0.8"/>
    <circle cx="37" cy="18" r="2" fill="#f4efe3" stroke="#b3aa9a" stroke-width="0.8"/>
  </g>
</svg>
`,
  R: `
<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="none">
    <!-- base -->
    <rect x="8" y="64" width="44" height="8" rx="3" fill="#dcd6c8"/>
    <rect x="12" y="58" width="36" height="6" rx="3" fill="#e9e3d4"/>
    <!-- tower body -->
    <rect x="18" y="32" width="24" height="26" rx="2" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.2"/>
    <!-- parapet -->
    <rect x="16" y="26" width="28" height="6" rx="2" fill="#e2dbcc"/>
    <!-- battlements -->
    <rect x="16" y="20" width="6" height="8" rx="1.5" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1"/>
    <rect x="27" y="20" width="6" height="8" rx="1.5" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1"/>
    <rect x="38" y="20" width="6" height="8" rx="1.5" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1"/>
  </g>
</svg>
`,
  B: `
<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="none">
    <!-- base -->
    <rect x="8" y="64" width="44" height="8" rx="3" fill="#dcd6c8"/>
    <rect x="12" y="58" width="36" height="6" rx="3" fill="#e9e3d4"/>
    <!-- body -->
    <path d="M22 58 C20 52 20 46 22 40 C24 34 27 30 30 30 C33 30 36 34 38 40 C40 46 40 52 38 58 Z"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.2"/>
    <!-- collar -->
    <rect x="22" y="28" width="16" height="4" rx="2" fill="#e2dbcc"/>
    <!-- head -->
    <path d="M23 28 C22 24 23 20 25 17 C27 14 29 13 30 13 C31 13 33 14 35 17 C37 20 38 24 37 28 Z"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.1"/>
    <!-- mitre cut -->
    <path d="M24 20 L36 16" stroke="#b3aa9a" stroke-width="1.4" stroke-linecap="round"/>
    <!-- top ball -->
    <circle cx="30" cy="11" r="3" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1"/>
  </g>
</svg>
`,
  N: `
<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="none">
    <!-- base -->
    <rect x="8" y="64" width="44" height="8" rx="3" fill="#dcd6c8"/>
    <rect x="12" y="58" width="36" height="6" rx="3" fill="#e9e3d4"/>
    <!-- body / neck -->
    <path d="M20 58 L40 58 L40 46 C38 42 35 39 32 37 C29 35 27 33 26 30 C25 27 26 24 27 21
             C24 22 21 25 19 29 C17 33 16 38 16 43 C16 48 17 53 18 58 Z"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.2"/>
    <!-- head -->
    <path d="M27 21 C28 18 30 16 32 15 C34 14 36 14 38 15 C40 16 41 18 41 20 C41 22 40 24 39 25
             C38 26 37 27 35 28 C33 29 31 30 30 31"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- ear -->
    <path d="M33 14 L35 10 L37 14 Z" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1"/>
    <!-- eye -->
    <circle cx="37" cy="19" r="1.6" fill="#3a332a"/>
  </g>
</svg>
`,
  P: `
<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="none">
    <!-- base -->
    <rect x="10" y="64" width="40" height="8" rx="3" fill="#dcd6c8"/>
    <rect x="14" y="58" width="32" height="6" rx="3" fill="#e9e3d4"/>
    <!-- body -->
    <path d="M22 58 C20 52 20 48 22 44 C24 40 27 38 30 38 C33 38 36 40 38 44 C40 48 40 52 38 58 Z"
          fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.2"/>
    <!-- neck -->
    <rect x="24" y="34" width="12" height="4" rx="2" fill="#e2dbcc"/>
    <!-- head -->
    <circle cx="30" cy="27" r="7" fill="#f4efe3" stroke="#b3aa9a" stroke-width="1.1"/>
  </g>
</svg>
`
};

const BLACK_PIECES = {
  k: WHITE_PIECES.K.replace(/#f4efe3|#e9e3d4|#e2dbcc|#dcd6c8/gi, m => {
    if (m.toLowerCase() === "#f4efe3") return "#2b2622";
    if (m.toLowerCase() === "#e9e3d4") return "#3a3430";
    if (m.toLowerCase() === "#e2dbcc") return "#3f3833";
    if (m.toLowerCase() === "#dcd6c8") return "#26211e";
    return m;
  }),
  q: WHITE_PIECES.Q.replace(/#f4efe3|#e9e3d4|#e2dbcc|#dcd6c8/gi, m => {
    if (m.toLowerCase() === "#f4efe3") return "#2b2622";
    if (m.toLowerCase() === "#e9e3d4") return "#3a3430";
    if (m.toLowerCase() === "#e2dbcc") return "#3f3833";
    if (m.toLowerCase() === "#dcd6c8") return "#26211e";
    return m;
  }),
  r: WHITE_PIECES.R.replace(/#f4efe3|#e9e3d4|#e2dbcc|#dcd6c8/gi, m => {
    if (m.toLowerCase() === "#f4efe3") return "#2b2622";
    if (m.toLowerCase() === "#e9e3d4") return "#3a3430";
    if (m.toLowerCase() === "#e2dbcc") return "#3f3833";
    if (m.toLowerCase() === "#dcd6c8") return "#26211e";
    return m;
  }),
  b: WHITE_PIECES.B.replace(/#f4efe3|#e9e3d4|#e2dbcc|#dcd6c8/gi, m => {
    if (m.toLowerCase() === "#f4efe3") return "#2b2622";
    if (m.toLowerCase() === "#e9e3d4") return "#3a3430";
    if (m.toLowerCase() === "#e2dbcc") return "#3f3833";
    if (m.toLowerCase() === "#dcd6c8") return "#26211e";
    return m;
  }),
  n: WHITE_PIECES.N.replace(/#f4efe3|#e9e3d4|#e2dbcc|#dcd6c8/gi, m => {
    if (m.toLowerCase() === "#f4efe3") return "#2b2622";
    if (m.toLowerCase() === "#e9e3d4") return "#3a3430";
    if (m.toLowerCase() === "#e2dbcc") return "#3f3833";
    if (m.toLowerCase() === "#dcd6c8") return "#26211e";
    return m;
  }),
  p: WHITE_PIECES.P.replace(/#f4efe3|#e9e3d4|#e2dbcc|#dcd6c8/gi, m => {
    if (m.toLowerCase() === "#f4efe3") return "#2b2622";
    if (m.toLowerCase() === "#e9e3d4") return "#3a3430";
    if (m.toLowerCase() === "#e2dbcc") return "#3f3833";
    if (m.toLowerCase() === "#dcd6c8") return "#26211e";
    return m;
  })
};

const PIECE_SVGS = {
  ...WHITE_PIECES,
  ...BLACK_PIECES
};

/**
 * symbol: "K","Q","R","B","N","P" for white
 *         "k","q","r","b","n","p" for black
 */
export function createPiece(symbol) {
  const svg = PIECE_SVGS[symbol];
  if (!svg) return null;

  const el = document.createElement("div");
  el.className = "piece";
  el.dataset.piece = symbol;
  el.innerHTML = svg;
  return el;
}
