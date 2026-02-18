console.log("UI.js loaded");

/* ============================
   ELEMENT LOOKUP
============================ */
const menuButton = document.getElementById("menu-button");
const sideDrawer = document.getElementById("side-drawer");

if (!menuButton || !sideDrawer) {
    console.error("Navigation elements not found in DOM");
}

/* ============================
   SIDE DRAWER TOGGLE
============================ */
if (menuButton && sideDrawer) {
    menuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        sideDrawer.classList.toggle("open");
    });
}

/* Close drawer when clicking outside */
document.addEventListener("click", (e) => {
    if (!sideDrawer.contains(e.target) && !menuButton.contains(e.target)) {
        sideDrawer.classList.remove("open");
    }
});

/* ============================
   SUBMENU TOGGLE
============================ */
document.querySelectorAll("#side-drawer .submenu").forEach(sub => {
    sub.addEventListener("click", (e) => {
        e.stopPropagation();
        sub.classList.toggle("open");
    });
});

/* ============================
   VIEW SWITCHING
============================ */
const views = document.querySelectorAll(".view");

function showView(viewId) {
    views.forEach(v => v.classList.remove("active"));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.add("active");
}

/* Handle clicks on nav items */
document.querySelectorAll("#side-drawer [data-view]").forEach(item => {
    item.addEventListener("click", () => {
        const view = item.getAttribute("data-view");
        showView(view);

        if (view === "play") {
            renderBoard();
        }

        sideDrawer.classList.remove("open");
    });
});



/* ============================
   DEFAULT VIEW
============================ */
showView("home");

/* ============================
   PLAY NOW BUTTON
============================ */
const startPlaying = document.getElementById("start-playing");

if (startPlaying) {
    startPlaying.addEventListener("click", () => {
        showView("play");
        renderBoard();
        sideDrawer.classList.remove("open");
    });
}

/* ============================
   BOARD RENDERING
============================ */
function renderBoard() {
    const board = document.getElementById("chessboard");
    if (!board) return;

    board.innerHTML = "";

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const square = document.createElement("div");
            const isDark = (rank + file) % 2 === 1;
            square.className = isDark ? "dark" : "light";
            board.appendChild(square);
        }
    }
}
/* ============================
   BOARD THEMES FROM NAV
============================ */
const navTheme = document.getElementById("nav-change-theme");

let boardThemes = [
    "theme-classic",
    "theme-blue",
    "theme-green",
    "theme-wood"
];

let currentTheme = 0;

function cycleBoardTheme() {
    const board = document.getElementById("chessboard");
    if (!board) return;

    boardThemes.forEach(t => board.classList.remove(t));

    currentTheme = (currentTheme + 1) % boardThemes.length;
    board.classList.add(boardThemes[currentTheme]);
}

if (navTheme) {
    navTheme.addEventListener("click", (e) => {
        e.stopPropagation();
        cycleBoardTheme();
    });
}

