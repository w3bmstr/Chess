// ui/components/settings.js
// In-game / global settings panel.
// Exposes: window.SettingsPanel

(function () {
  'use strict';

  const SETTINGS_KEY = 'bbjs-settings';

  const DEFAULTS = {
    // Board
    showCoords:      true,
    animateMoves:    true,
    soundEnabled:    true,
    // Engine
    engineDepth:     16,
    multiPV:         1,
    showEvalBar:     true,
    showArrows:      true,
    // Appearance
    pieceSet:        'staunton',    // 'staunton' | 'emoji'
    boardSize:       'auto',        // 'auto' | 'small' | 'large'
    highlightMoves:  true,
    // Clock
    timeControl:     600,           // seconds
    increment:       5,
  };

  class SettingsPanel {
    /**
     * @param {HTMLElement} container
     * @param {object}      onChange   Called with (key, value) on every change
     */
    constructor(container, onChange) {
      this.container = container;
      this.onChange  = onChange || (() => {});
      this._values   = this._load();
      this._render();
    }

    // ── Persistence ───────────────────────────────────────────────────────

    _load() {
      try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        return Object.assign({}, DEFAULTS, stored);
      } catch {
        return Object.assign({}, DEFAULTS);
      }
    }

    _save() {
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this._values)); } catch {}
    }

    get(key)        { return this._values[key]; }
    set(key, value) { this._values[key] = value; this._save(); this.onChange(key, value); }

    // ── Render ────────────────────────────────────────────────────────────

    _render() {
      this.container.innerHTML = '';
      this.container.className = (this.container.className + ' settings-panel').trim();

      const sections = [
        {
          title: '🎨 Board',
          rows: [
            this._toggle('showCoords',   'Show coordinates'),
            this._toggle('animateMoves', 'Animate moves'),
            this._toggle('soundEnabled', 'Sound effects'),
            this._toggle('highlightMoves','Highlight legal moves'),
            this._select('pieceSet', 'Piece set', [
              { value: 'staunton', label: 'Staunton SVG' },
              { value: 'emoji',    label: 'Emoji' },
            ]),
          ]
        },
        {
          title: '🤖 Engine',
          rows: [
            this._range('engineDepth', 'Search depth', 1, 32, 1),
            this._range('multiPV',     'Multi-PV lines', 1, 4, 1),
            this._toggle('showEvalBar', 'Show eval bar'),
            this._toggle('showArrows',  'Show engine arrows'),
          ]
        },
        {
          title: '⏱ Clock',
          rows: [
            this._select('timeControl', 'Time control', [
              { value: 60,   label: '1 min' },
              { value: 180,  label: '3 min' },
              { value: 300,  label: '5 min' },
              { value: 600,  label: '10 min' },
              { value: 900,  label: '15 min' },
              { value: 1800, label: '30 min' },
              { value: 0,    label: 'Unlimited' },
            ]),
            this._select('increment', 'Increment', [
              { value: 0,  label: 'None' },
              { value: 1,  label: '1s' },
              { value: 2,  label: '2s' },
              { value: 5,  label: '5s' },
              { value: 10, label: '10s' },
              { value: 30, label: '30s' },
            ]),
          ]
        }
      ];

      for (const sec of sections) {
        const h = document.createElement('h3');
        h.className   = 'settings-section-title';
        h.textContent = sec.title;
        this.container.appendChild(h);

        for (const row of sec.rows) {
          this.container.appendChild(row);
        }
      }

      // Reset button
      const resetBtn = document.createElement('button');
      resetBtn.className   = 'settings-reset-btn';
      resetBtn.textContent = '↺ Reset to defaults';
      resetBtn.addEventListener('click', () => this._reset());
      this.container.appendChild(resetBtn);
    }

    // ── Row builders ──────────────────────────────────────────────────────

    _toggle(key, label) {
      const row = this._row(label);
      const tog = document.createElement('label');
      tog.className = 'settings-toggle';
      const inp = document.createElement('input');
      inp.type    = 'checkbox';
      inp.checked = !!this._values[key];
      inp.addEventListener('change', () => this.set(key, inp.checked));
      const knob = document.createElement('span');
      knob.className = 'toggle-knob';
      tog.append(inp, knob);
      row.appendChild(tog);
      return row;
    }

    _range(key, label, min, max, step) {
      const row = this._row(label);
      const wrap = document.createElement('div');
      wrap.className = 'settings-range-wrap';
      const inp = document.createElement('input');
      inp.type  = 'range';
      inp.min   = min; inp.max = max; inp.step = step;
      inp.value = this._values[key];
      const val = document.createElement('span');
      val.className   = 'settings-range-val';
      val.textContent = inp.value;
      inp.addEventListener('input', () => {
        val.textContent = inp.value;
        this.set(key, Number(inp.value));
      });
      wrap.append(inp, val);
      row.appendChild(wrap);
      return row;
    }

    _select(key, label, options) {
      const row = this._row(label);
      const sel = document.createElement('select');
      sel.className = 'settings-select';
      for (const opt of options) {
        const o = document.createElement('option');
        o.value       = opt.value;
        o.textContent = opt.label;
        if (String(this._values[key]) === String(opt.value)) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        const raw = sel.value;
        this.set(key, isNaN(raw) ? raw : Number(raw));
      });
      row.appendChild(sel);
      return row;
    }

    _row(label) {
      const row = document.createElement('div');
      row.className = 'settings-row';
      const lbl = document.createElement('label');
      lbl.className   = 'settings-label';
      lbl.textContent = label;
      row.appendChild(lbl);
      return row;
    }

    // ── Reset ─────────────────────────────────────────────────────────────

    _reset() {
      this._values = Object.assign({}, DEFAULTS);
      this._save();
      this._render();
      this.onChange('*', this._values);
    }
  }

  window.SettingsPanel = SettingsPanel;
  console.log('settings.js: loaded — SettingsPanel available');
})();