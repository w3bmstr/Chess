// ============================================================
//  board3d.js — Three.js 3D chess board
//  Drop-in companion to the flat CSS board.
//  Requires Three.js r128+ loaded globally as window.THREE.
// ============================================================

class Board3D {
    constructor(container) {
        this.container = container;
        this.scene     = null;
        this.camera    = null;
        this.renderer  = null;
        this.active    = false;

        // 64 square meshes  [rank*8 + file]
        this.squareMeshes = [];
        // piece sprites – cleared / rebuilt on every renderFEN
        this.pieceMeshes  = [];
        // square highlight overlays
        this.highlights   = [];

        // Camera orbit state  (spherical coords around origin)
        this.drag  = false;
        this.prev  = { x: 0, y: 0 };
        this.orbit = { theta: Math.PI * 0.25, phi: Math.PI * 0.33 };
        this.flipped = false;
        this.camR  = 13;   // orbit radius

        this._init();
    }

    // ─────────────────────────────────────────────────────────
    //  INIT
    // ─────────────────────────────────────────────────────────
    _init() {
        const THREE = window.THREE;
        const W = this.container.clientWidth  || 600;
        const H = this.container.clientHeight || 600;

        // Scene
        this.scene = new THREE.Scene();
        this._updateSceneBg();

        // Camera
        this.camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
        this._applyOrbit();

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(W, H);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const amb = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(amb);

        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(6, 14, 8);
        sun.castShadow = true;
        sun.shadow.camera.left   = -8;
        sun.shadow.camera.right  =  8;
        sun.shadow.camera.top    =  8;
        sun.shadow.camera.bottom = -8;
        sun.shadow.mapSize.set(2048, 2048);
        this.scene.add(sun);

        const fill = new THREE.DirectionalLight(0x8899cc, 0.3);
        fill.position.set(-6, 8, -8);
        this.scene.add(fill);

        this._buildBoard();
        this._bindEvents();
        this._startLoop();
    }

    // ─────────────────────────────────────────────────────────
    //  BOARD GEOMETRY
    // ─────────────────────────────────────────────────────────
    _buildBoard() {
        const THREE = window.THREE;
        const css   = getComputedStyle(document.body);

        const lightHex  = css.getPropertyValue('--sq-light').trim()  || '#f0d9b5';
        const darkHex   = css.getPropertyValue('--sq-dark').trim()   || '#b58863';
        const frameHex  = css.getPropertyValue('--board-frame').trim()|| '#3a2f1b';

        const lightCol  = new THREE.Color(lightHex);
        const darkCol   = new THREE.Color(darkHex);
        const frameCol  = new THREE.Color(frameHex);

        // ── outer frame ──────────────────────────────────────
        const frameGeo = new THREE.BoxGeometry(9.2, 0.32, 9.2);
        const frameMat = new THREE.MeshLambertMaterial({ color: frameCol });
        const frameBox = new THREE.Mesh(frameGeo, frameMat);
        frameBox.position.y = -0.22;
        frameBox.receiveShadow = true;
        this.scene.add(frameBox);

        // small bottom plinth
        const plinthGeo = new THREE.BoxGeometry(9.6, 0.1, 9.6);
        const plinthMat = new THREE.MeshLambertMaterial({ color: frameCol.clone().multiplyScalar(0.7) });
        const plinth    = new THREE.Mesh(plinthGeo, plinthMat);
        plinth.position.y = -0.4;
        plinth.receiveShadow = true;
        this.scene.add(plinth);

        // ── 64 squares ───────────────────────────────────────
        const sqGeo = new THREE.BoxGeometry(1, 0.18, 1);

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const isLight = (rank + file) % 2 === 0;
                const mat = new THREE.MeshLambertMaterial({
                    color: isLight ? lightCol.clone() : darkCol.clone()
                });
                const sq  = new THREE.Mesh(sqGeo, mat);
                sq.position.set(file - 3.5, 0, rank - 3.5);
                sq.receiveShadow = true;
                sq.userData = {
                    rank, file,
                    sqName: 'abcdefgh'[file] + '87654321'[rank],
                    isLight
                };
                this.scene.add(sq);
                this.squareMeshes[rank * 8 + file] = sq;
            }
        }

        // ── coordinate labels ─────────────────────────────────
        this._buildCoordLabels();
    }

    _buildCoordLabels() {
        const THREE   = window.THREE;
        const files   = 'abcdefgh';
        const ranks   = '87654321';
        const css     = getComputedStyle(document.body);
        const textCol = css.getPropertyValue('--sq-light').trim() || '#f0d9b5';

        const makeLabel = (text, x, z) => {
            const canvas  = document.createElement('canvas');
            canvas.width  = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 64, 64);
            ctx.font         = 'bold 38px sans-serif';
            ctx.fillStyle    = textCol;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 32, 32);
            const tex = new THREE.CanvasTexture(canvas);
            const geo = new THREE.PlaneGeometry(0.45, 0.45);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
            const m   = new THREE.Mesh(geo, mat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.1, z);
            this.scene.add(m);
        };

        for (let i = 0; i < 8; i++) {
            makeLabel(files[i],  i - 3.5,  4.2);  // file letters, south edge
            makeLabel(ranks[i], -4.2,  i - 3.5);  // rank numbers, west edge
        }
    }

    // ─────────────────────────────────────────────────────────
    //  PIECE RENDERING
    // ─────────────────────────────────────────────────────────
    static SYMBOLS = {
        K:'🧑‍🚀', Q:'👩‍🚀', R:'🤖', B:'🧙', N:'🐎', P:'🧑‍✈️',
        k:'🦹',  q:'🧙‍♂️', r:'👾', b:'😈', n:'🐉', p:'👤'
    };

    /** Re-render all pieces from a FEN string */
    renderFEN(fen) {
        const THREE = window.THREE;

        // clear old pieces
        this.pieceMeshes.forEach(m => this.scene.remove(m));
        this.pieceMeshes = [];

        const rows = fen.split(' ')[0].split('/');

        for (let rank = 0; rank < 8; rank++) {
            let file = 0;
            for (const ch of rows[rank]) {
                if (isNaN(ch)) {
                    this._spawnPiece(ch, file, rank);
                    file++;
                } else {
                    file += parseInt(ch, 10);
                }
            }
        }
    }

    _spawnPiece(fenChar, file, rank) {
        const THREE  = window.THREE;
        const symbol = Board3D.SYMBOLS[fenChar];
        if (!symbol) return;

        const isWhite = fenChar === fenChar.toUpperCase();

        // ── canvas texture ────────────────────────────────────
        const SZ  = 256;
        const can = document.createElement('canvas');
        can.width = can.height = SZ;
        const ctx = can.getContext('2d');

        // Glowing halo behind the piece
        const glowColor = isWhite ? 'rgba(255,240,200,0.55)' : 'rgba(80,40,180,0.45)';
        ctx.beginPath();
        ctx.arc(SZ/2, SZ/2, SZ * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();

        // Emoji
        ctx.font         = `${SZ * 0.62}px serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, SZ / 2, SZ / 2 + 8);

        const tex = new THREE.CanvasTexture(can);

        // ── flat sprite on the board surface ─────────────────
        // Billboard group: always faces the camera
        const billboard = new THREE.Group();
        billboard.position.set(file - 3.5, 0.12, rank - 3.5);

        const pGeo = new THREE.PlaneGeometry(0.82, 0.82);
        const pMat = new THREE.MeshBasicMaterial({
            map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(pGeo, pMat);
        plane.rotation.x = -Math.PI / 2;   // lay flat on the square

        billboard.add(plane);
        this.scene.add(billboard);
        this.pieceMeshes.push(billboard);
    }

    // ─────────────────────────────────────────────────────────
    //  HIGHLIGHT / SELECT SQUARES
    // ─────────────────────────────────────────────────────────
    clearHighlights() {
        this.highlights.forEach(m => this.scene.remove(m));
        this.highlights = [];
    }

    highlightSquare(sqName, type = 'select') {
        const THREE = window.THREE;
        const file  = 'abcdefgh'.indexOf(sqName[0]);
        const rank  = '87654321'.indexOf(sqName[1]);
        if (file < 0 || rank < 0) return;

        const colors = {
            select:   0x14cc28,
            lastmove: 0xd4d737,
            legal:    0x226699,
            check:    0xff2020,
        };
        const col = colors[type] || 0xffff00;

        const geo = new THREE.PlaneGeometry(0.96, 0.96);
        const mat = new THREE.MeshBasicMaterial({
            color: col, transparent: true, opacity: 0.45,
            depthWrite: false, side: THREE.DoubleSide
        });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(file - 3.5, 0.1, rank - 3.5);
        this.scene.add(m);
        this.highlights.push(m);
    }

    // ─────────────────────────────────────────────────────────
    //  CAMERA ORBIT
    // ─────────────────────────────────────────────────────────
    _applyOrbit() {
        const { theta, phi } = this.orbit;
        const r = this.camR;
        this.camera.position.set(
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.cos(theta)
        );
        this.camera.lookAt(0, 0, 0);
    }

    resetView() {
        this.orbit = {
            theta: Math.PI * 0.25 + (this.flipped ? Math.PI : 0),
            phi: Math.PI * 0.33,
        };
        this._applyOrbit();
    }

    flipView() {
        this.flipped = !this.flipped;
        this.orbit.theta += Math.PI;
        this._applyOrbit();
    }

    setFlipped(flipped) {
        if (this.flipped === Boolean(flipped)) return;
        this.flipView();
    }

    // ─────────────────────────────────────────────────────────
    //  THEME
    // ─────────────────────────────────────────────────────────
    refreshTheme() {
        const THREE  = window.THREE;
        const css    = getComputedStyle(document.body);
        const lightH = css.getPropertyValue('--sq-light').trim()  || '#f0d9b5';
        const darkH  = css.getPropertyValue('--sq-dark').trim()   || '#b58863';
        const lightC = new THREE.Color(lightH);
        const darkC  = new THREE.Color(darkH);

        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const sq = this.squareMeshes[rank * 8 + file];
                if (!sq) continue;
                sq.material.color.set((rank + file) % 2 === 0 ? lightC : darkC);
            }
        }

        this._updateSceneBg();
    }

    _updateSceneBg() {
        const THREE  = window.THREE;
        const css    = getComputedStyle(document.body);
        const bgHex  = css.getPropertyValue('--page-bg').trim() || '#1a1a2e';
        if (this.scene) this.scene.background = new THREE.Color(bgHex);
    }

    // ─────────────────────────────────────────────────────────
    //  SHOW / HIDE
    // ─────────────────────────────────────────────────────────
    show() {
        this.active = true;
        this.container.style.display = 'block';
        this.resize();
        this._startLoop();
    }

    hide() {
        this.active = false;
        this.container.style.display = 'none';
    }

    resize() {
        const W = this.container.clientWidth  || 600;
        const H = this.container.clientHeight || 600;
        this.camera.aspect = W / H;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(W, H);
    }

    // ─────────────────────────────────────────────────────────
    //  RENDER LOOP
    // ─────────────────────────────────────────────────────────
    _startLoop() {
        if (this._loopRunning) return;
        this._loopRunning = true;
        const loop = () => {
            if (!this.active) { this._loopRunning = false; return; }
            requestAnimationFrame(loop);
            this.renderer.render(this.scene, this.camera);
        };
        loop();
    }

    // ─────────────────────────────────────────────────────────
    //  INPUT EVENTS
    // ─────────────────────────────────────────────────────────
    _bindEvents() {
        const el = this.renderer.domElement;

        // ── Mouse ──────────────────────────────────────────────
        el.addEventListener('mousedown', e => {
            this.drag = true;
            this.prev = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mousemove', e => {
            if (!this.drag) return;
            const dx = e.clientX - this.prev.x;
            const dy = e.clientY - this.prev.y;
            this.orbit.theta -= dx * 0.012;
            this.orbit.phi    = Math.max(0.18, Math.min(1.45, this.orbit.phi + dy * 0.012));
            this.prev = { x: e.clientX, y: e.clientY };
            this._applyOrbit();
        });
        window.addEventListener('mouseup',  () => { this.drag = false; });

        // ── Touch ──────────────────────────────────────────────
        el.addEventListener('touchstart', e => {
            this.drag = true;
            this.prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: true });
        el.addEventListener('touchmove', e => {
            if (!this.drag) return;
            const dx = e.touches[0].clientX - this.prev.x;
            const dy = e.touches[0].clientY - this.prev.y;
            this.orbit.theta -= dx * 0.012;
            this.orbit.phi    = Math.max(0.18, Math.min(1.45, this.orbit.phi + dy * 0.012));
            this.prev = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            this._applyOrbit();
            e.preventDefault();
        }, { passive: false });
        el.addEventListener('touchend', () => { this.drag = false; });

        // ── Scroll to zoom ─────────────────────────────────────
        el.addEventListener('wheel', e => {
            this.camR = Math.max(7, Math.min(22, this.camR + e.deltaY * 0.02));
            this._applyOrbit();
            e.preventDefault();
        }, { passive: false });

        // ── Resize ─────────────────────────────────────────────
        window.addEventListener('resize', () => this.resize());
    }

    // ─────────────────────────────────────────────────────────
    //  CLEANUP
    // ─────────────────────────────────────────────────────────
    destroy() {
        this.active = false;
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// Make globally available
window.Board3D = Board3D;