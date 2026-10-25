// Wenztitch Web App — main application
// Requires: dmc.js, quantize.js, wtz.js, JSZip

const SYMBOLS = [
  '■','●','▲','▼','◆','★','✦','✚','✿','❋',
  '◉','◎','▪','▫','◇','△','▽','⬡','⬢','⊕',
  '⊗','⊞','⊠','⊡','✱','✲','⊹','⌘','❖','⁕',
  '◈','◑','◐','◒','◓','⬟','⬠','⊛','⊜','⊝',
];

const AIDA_COUNTS = [11, 14, 16, 18, 22, 28];

const CLOTH_COLORS = {
  'White':        '#FFFFFF',
  'Antique White':'#F5F0E8',
  'Ivory':        '#FFFFF0',
  'Ecru':         '#F0EAD6',
  'Cream':        '#FFFDD0',
  'Light Blue':   '#ADD8E6',
  'Black':        '#111111',
  'Navy':         '#000080',
  'Red':          '#CC2222',
  'Sage Green':   '#BCB88A',
  'Dusty Blue':   '#87AFC7',
  'Pewter':       '#C0C0C0',
  'Oatmeal':      '#D4C59A',
};

const DEFAULT_PRESETS = {
  'Small (40 wide)':   40,
  'Medium (60 wide)':  60,
  'Large (100 wide)': 100,
  'XL (150 wide)':    150,
};

const MAX_HISTORY = 30;

// ─── Global state ────────────────────────────────────────────────────────────

const S = {
  origDataUrl: null,
  gridPixels:  null,
  palette:     [],
  overrides:   {},    // "paletteIdx" -> [code, name, r, g, b]
  symbolMap:   {},    // dmc_code -> symbol char
  gridW: 60, gridH: 60, colorN: 10,
  circular: false, aspect: true,
  aidaCount: 14, clothColor: '#F5F0E8',
  view: 'both',
  stitched: {},       // "row_col" -> true
  showStitched: true,

  cellSize: 14,
  panX: 0, panY: 0,
  isPanning: false, lastMX: 0, lastMY: 0,
  pinchDist: null,

  history: [], histIdx: -1,
  inventory: new Set(),
  presets: { ...DEFAULT_PRESETS },

  // track aspect ratio of original image for locking
  origAspect: 1,
  lockingSlider: false,
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', init);

function init() {
  loadLocalData();
  buildClothDropdown();
  buildAidaDropdown();
  syncUIFromState();
  setupUIEvents();
  setupCanvas();
  setupDropZone();
  resizeCanvas();
  render();
  window.addEventListener('resize', () => { resizeCanvas(); render(); });
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadLocalData() {
  try {
    const inv = JSON.parse(localStorage.getItem('wtz_inventory') || '[]');
    S.inventory = new Set(inv);
    const pres = JSON.parse(localStorage.getItem('wtz_presets') || 'null');
    if (pres && typeof pres === 'object') S.presets = pres;
  } catch {}
}

function saveInventory() {
  try { localStorage.setItem('wtz_inventory', JSON.stringify([...S.inventory])); } catch {}
}

function savePresets() {
  try { localStorage.setItem('wtz_presets', JSON.stringify(S.presets)); } catch {}
}

function autosaveProgress() {
  if (!S.gridPixels) return;
  const key = progressKey();
  if (!key) return;
  try {
    const data = {
      stitched:  S.stitched,
      overrides: S.overrides,
      symbolMap: S.symbolMap,
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function loadProgress() {
  const key = progressKey();
  if (!key) return;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.stitched)  S.stitched  = data.stitched;
    if (data.overrides) S.overrides = data.overrides;
    if (data.symbolMap) S.symbolMap = data.symbolMap;
  } catch {}
}

function progressKey() {
  if (!S.gridPixels || !S.palette.length) return null;
  // Stable key: hash of first row + palette codes
  const codes = S.palette.map(p => p[0]).join(',');
  const row0  = (S.gridPixels[0] || []).slice(0, 10).join(',');
  return `wtz_progress_${S.gridW}x${S.gridH}_${btoa(codes + row0).slice(0, 24)}`;
}

// ─── UI setup ─────────────────────────────────────────────────────────────────

function buildClothDropdown() {
  const sel = document.getElementById('cloth-select');
  sel.innerHTML = '';
  for (const [name, hex] of Object.entries(CLOTH_COLORS)) {
    const opt = document.createElement('option');
    opt.value = hex;
    opt.textContent = name;
    if (hex === S.clothColor) opt.selected = true;
    sel.appendChild(opt);
  }
}

function buildAidaDropdown() {
  const sel = document.getElementById('aida-select');
  sel.innerHTML = '';
  const labels = { 11:'11-count (NORMAL)', 14:'14-count', 16:'16-count',
                   18:'18-count', 22:'22-count', 28:'28-count' };
  for (const c of AIDA_COUNTS) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = labels[c];
    if (c === S.aidaCount) opt.selected = true;
    sel.appendChild(opt);
  }
}

function syncUIFromState() {
  document.getElementById('slider-w').value  = S.gridW;
  document.getElementById('num-w').value     = S.gridW;
  document.getElementById('slider-h').value  = S.gridH;
  document.getElementById('num-h').value     = S.gridH;
  document.getElementById('slider-colors').value = S.colorN;
  document.getElementById('color-n-val').textContent = S.colorN;
  document.getElementById('aspect-lock').checked   = S.aspect;
  document.getElementById('circular-toggle').checked = S.circular;
  document.getElementById('show-stitched').checked = S.showStitched;
  document.getElementById('aida-select').value  = S.aidaCount;
  document.getElementById('cloth-select').value = S.clothColor;
  updateAidaDisplay();
  setActiveView(S.view);
}

function setupUIEvents() {
  // Import image
  document.getElementById('btn-import').addEventListener('click', () =>
    document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) importImageFile(f);
    e.target.value = '';
  });

  // Grid W slider + number
  const slW = document.getElementById('slider-w');
  const numW = document.getElementById('num-w');
  slW.addEventListener('input',  () => { if (!S.lockingSlider) { S.gridW = +slW.value;  numW.value = S.gridW;  lockAspectH(); } });
  numW.addEventListener('change', () => { S.gridW = clamp(+numW.value,10,150); slW.value = S.gridW; lockAspectH(); });

  const slH = document.getElementById('slider-h');
  const numH = document.getElementById('num-h');
  slH.addEventListener('input',  () => { if (!S.lockingSlider) { S.gridH = +slH.value;  numH.value = S.gridH;  lockAspectW(); } });
  numH.addEventListener('change', () => { S.gridH = clamp(+numH.value,10,150); slH.value = S.gridH; lockAspectW(); });

  document.getElementById('aspect-lock').addEventListener('change', e => {
    S.aspect = e.target.checked;
    if (S.aspect && S.origDataUrl) captureAspect();
  });

  // Color count
  const slC = document.getElementById('slider-colors');
  slC.addEventListener('input', () => {
    S.colorN = +slC.value;
    document.getElementById('color-n-val').textContent = S.colorN;
  });

  // Generate button
  document.getElementById('btn-generate').addEventListener('click', generateGrid);

  // View mode
  document.getElementById('view-symbols').addEventListener('click', () => setActiveView('symbols'));
  document.getElementById('view-colors').addEventListener('click',  () => setActiveView('colors'));
  document.getElementById('view-both').addEventListener('click',    () => setActiveView('both'));

  // Circular
  document.getElementById('circular-toggle').addEventListener('change', e => {
    S.circular = e.target.checked;
    render();
  });

  // Show stitched overlay
  document.getElementById('show-stitched').addEventListener('change', e => {
    S.showStitched = e.target.checked;
    render();
  });

  // AIDA / cloth
  document.getElementById('aida-select').addEventListener('change', e => {
    S.aidaCount = +e.target.value;
    updateAidaDisplay();
  });
  document.getElementById('cloth-select').addEventListener('change', e => {
    S.clothColor = e.target.value;
    render();
  });

  // Undo / redo
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });

  // Inventory / presets
  document.getElementById('btn-inventory').addEventListener('click', openInventoryModal);
  document.getElementById('btn-presets').addEventListener('click', openPresetsModal);

  // Save / load .wtz
  document.getElementById('btn-save').addEventListener('click', handleSave);
  document.getElementById('btn-load').addEventListener('click', () =>
    document.getElementById('wtz-input').click());
  document.getElementById('wtz-input').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) handleLoad(f);
    e.target.value = '';
  });

  // Preview
  document.getElementById('btn-preview').addEventListener('click', openPreview);

  // Easter egg
  document.getElementById('btn-cat').addEventListener('click', showCatFact);

  // Clear stitched
  document.getElementById('btn-clear-stitched').addEventListener('click', () => {
    if (!S.gridPixels) return;
    if (Object.keys(S.stitched).length && !confirm('Clear all stitching progress?')) return;
    S.stitched = {};
    autosaveProgress();
    render();
    renderLegend();
  });

  // Mobile sidebar toggle
  document.getElementById('btn-menu').addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('sidebar-overlay').addEventListener('click', () =>
    document.getElementById('sidebar').classList.remove('open'));
}

function setActiveView(v) {
  S.view = v;
  for (const id of ['view-symbols','view-colors','view-both']) {
    document.getElementById(id).classList.remove('active');
  }
  const map = { symbols:'view-symbols', colors:'view-colors', both:'view-both' };
  document.getElementById(map[v]).classList.add('active');
  render();
}

function updateAidaDisplay() {
  if (!S.gridPixels) { document.getElementById('aida-size').textContent = '— × — inches'; return; }
  const wi = (S.gridW / S.aidaCount).toFixed(1);
  const hi = (S.gridH / S.aidaCount).toFixed(1);
  document.getElementById('aida-size').textContent = `${wi}" × ${hi}"`;
}

// ─── Aspect ratio helpers ─────────────────────────────────────────────────────

function captureAspect() {
  S.origAspect = S.gridW / S.gridH;
}

function lockAspectH() {
  if (!S.aspect) return;
  S.lockingSlider = true;
  S.gridH = clamp(Math.round(S.gridW / S.origAspect), 10, 150);
  document.getElementById('slider-h').value = S.gridH;
  document.getElementById('num-h').value    = S.gridH;
  S.lockingSlider = false;
}

function lockAspectW() {
  if (!S.aspect) return;
  S.lockingSlider = true;
  S.gridW = clamp(Math.round(S.gridH * S.origAspect), 10, 150);
  document.getElementById('slider-w').value = S.gridW;
  document.getElementById('num-w').value    = S.gridW;
  S.lockingSlider = false;
}

// ─── Image import ─────────────────────────────────────────────────────────────

function importImageFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    S.origDataUrl = e.target.result;
    // Measure original aspect ratio
    const img = new Image();
    img.onload = () => {
      S.origAspect = img.width / img.height;
      if (S.aspect) lockAspectH();
      generateGrid();
    };
    img.src = S.origDataUrl;
  };
  reader.readAsDataURL(file);
}

async function generateGrid() {
  if (!S.origDataUrl) { alert('Import an image first.'); return; }

  const btn = document.getElementById('btn-generate');
  btn.textContent = '⏳ Working…';
  btn.disabled = true;

  try {
    await new Promise(r => setTimeout(r, 0)); // yield to repaint

    const { palette, gridPixels } = await processImageToGrid(
      S.origDataUrl, S.gridW, S.gridH, S.colorN, S.aspect, S.circular
    );

    pushHistory();

    S.palette    = palette;
    S.gridPixels = gridPixels;
    S.overrides  = {};
    S.stitched   = {};
    S.symbolMap  = buildSymbolMap(palette);

    loadProgress();           // restore any saved progress for this exact pattern
    S.history = []; S.histIdx = -1; // fresh history after generation

    resetView();
    updateAidaDisplay();
    render();
    renderLegend();
    autosaveProgress();
  } catch (err) {
    console.error(err);
    alert('Could not process image: ' + err.message);
  } finally {
    btn.textContent = '▶ Generate';
    btn.disabled = false;
  }
}

function buildSymbolMap(palette) {
  const map = {};
  let idx = 0;
  for (const [code] of palette) {
    if (!(code in map)) map[code] = SYMBOLS[idx++ % SYMBOLS.length];
  }
  return map;
}

// ─── Canvas setup & rendering ─────────────────────────────────────────────────

function setupCanvas() {
  const canvas = document.getElementById('grid-canvas');

  // Mouse
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup',   onMouseUp);
  canvas.addEventListener('mouseleave',onMouseUp);
  canvas.addEventListener('click',     onCanvasClick);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Touch
  canvas.addEventListener('touchstart',  onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',   onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',    onTouchEnd);
}

function resizeCanvas() {
  const canvas = document.getElementById('grid-canvas');
  const container = canvas.parentElement;
  canvas.width  = container.clientWidth;
  canvas.height = container.clientHeight;
}

function resetView() {
  const canvas = document.getElementById('grid-canvas');
  const totalW = S.gridW * S.cellSize;
  const totalH = S.gridH * S.cellSize;
  S.panX = Math.max(0, (canvas.width  - totalW) / 2);
  S.panY = Math.max(0, (canvas.height - totalH) / 2);
}

function render() {
  const canvas = document.getElementById('grid-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  if (!S.gridPixels) {
    renderEmpty(ctx, W, H);
    return;
  }

  const cell = S.cellSize;
  const gW = S.gridW, gH = S.gridH;

  // Cloth background
  ctx.fillStyle = S.clothColor;
  ctx.fillRect(S.panX, S.panY, gW * cell, gH * cell);

  // Visible cell range
  const startC = Math.max(0, Math.floor(-S.panX / cell));
  const startR = Math.max(0, Math.floor(-S.panY / cell));
  const endC   = Math.min(gW, Math.ceil((W - S.panX) / cell) + 1);
  const endR   = Math.min(gH, Math.ceil((H - S.panY) / cell) + 1);

  const fontSize = Math.max(5, Math.floor(cell * 0.62));
  ctx.font = `${fontSize}px "Segoe UI Symbol","Apple Symbols","DejaVu Sans",sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  for (let r = startR; r < endR; r++) {
    for (let c = startC; c < endC; c++) {
      const idx = S.gridPixels[r][c];
      if (idx < 0) continue;
      if (S.circular) {
        const cx = S.gridW / 2, cy = S.gridH / 2;
        const dx = c + 0.5 - cx, dy = r + 0.5 - cy;
        if ((dx / (S.gridW / 2)) ** 2 + (dy / (S.gridH / 2)) ** 2 > 1) continue;
      }

      const dmc = S.overrides[idx] ?? S.palette[idx];
      if (!dmc) continue;
      const [code,, dr, dg, db] = dmc;

      const px = S.panX + c * cell;
      const py = S.panY + r * cell;

      // Background
      if (S.view !== 'symbols') {
        ctx.fillStyle = `rgb(${dr},${dg},${db})`;
      } else {
        ctx.fillStyle = '#fff';
      }
      ctx.fillRect(px, py, cell, cell);

      // Symbol
      if (S.view !== 'colors' && cell >= 7) {
        const sym = S.symbolMap[code] ?? '?';
        const lum = 0.299 * dr + 0.587 * dg + 0.114 * db;
        ctx.fillStyle = S.view === 'symbols' ? '#111'
                      : (lum > 140 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)');
        ctx.fillText(sym, px + cell * 0.5, py + cell * 0.52);
      }

      // Stitch overlay
      if (S.showStitched && S.stitched[`${r}_${c}`]) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(px, py, cell, cell);
        if (cell >= 7) {
          const m  = cell * 0.14;
          const lw = Math.max(1, cell / 9);
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth   = lw;
          ctx.beginPath();
          ctx.moveTo(px + m, py + m); ctx.lineTo(px + cell - m, py + cell - m);
          ctx.moveTo(px + cell - m, py + m); ctx.lineTo(px + m, py + cell - m);
          ctx.stroke();
        }
      }
    }
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.5;
  for (let r = startR; r <= endR; r++) {
    const y = S.panY + r * cell;
    ctx.beginPath(); ctx.moveTo(S.panX + startC * cell, y); ctx.lineTo(S.panX + endC * cell, y); ctx.stroke();
  }
  for (let c = startC; c <= endC; c++) {
    const x = S.panX + c * cell;
    ctx.beginPath(); ctx.moveTo(x, S.panY + startR * cell); ctx.lineTo(x, S.panY + endR * cell); ctx.stroke();
  }

  // Bold every-10 lines
  if (cell >= 4) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let r = Math.floor(startR / 10) * 10; r <= endR; r += 10) {
      if (r < 0 || r > gH) continue;
      const y = S.panY + r * cell;
      ctx.beginPath(); ctx.moveTo(S.panX + startC * cell, y); ctx.lineTo(S.panX + endC * cell, y); ctx.stroke();
    }
    for (let c = Math.floor(startC / 10) * 10; c <= endC; c += 10) {
      if (c < 0 || c > gW) continue;
      const x = S.panX + c * cell;
      ctx.beginPath(); ctx.moveTo(x, S.panY + startR * cell); ctx.lineTo(x, S.panY + endR * cell); ctx.stroke();
    }
  }

  updateProgressBar();
}

function renderEmpty(ctx, W, H) {
  ctx.fillStyle = '#2d2b28';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#6b6560';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Import an image and press Generate', W / 2, H / 2 - 12);
  ctx.font = '13px sans-serif';
  ctx.fillText('or drag & drop an image here', W / 2, H / 2 + 16);
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';

  if (!S.palette.length) return;

  const totals = countStitchedPerColor();

  for (let idx = 0; idx < S.palette.length; idx++) {
    const dmc = S.overrides[idx] ?? S.palette[idx];
    const [code, name, r, g, b] = dmc;
    const sym  = S.symbolMap[code] ?? '?';
    const inInv = S.inventory.has(code);
    const { done, total } = totals[idx] ?? { done: 0, total: 0 };
    const lum  = 0.299 * r + 0.587 * g + 0.114 * b;

    const item = document.createElement('div');
    item.className = 'legend-item' + (inInv ? ' in-inv' : '');
    item.title = `Click to substitute DMC ${code}`;

    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = `rgb(${r},${g},${b})`;
    swatch.style.color = lum > 140 ? '#000' : '#fff';
    swatch.textContent = sym;

    const info = document.createElement('div');
    info.className = 'legend-info';
    info.innerHTML =
      `<span class="dmc-code">DMC ${code}</span>` +
      `<span class="dmc-name">${name}</span>` +
      `<span class="stitch-count">${done}/${total}</span>`;

    if (inInv) {
      const tick = document.createElement('span');
      tick.className = 'inv-tick';
      tick.textContent = '✓';
      item.appendChild(tick);
    }

    item.appendChild(swatch);
    item.appendChild(info);
    item.addEventListener('click', () => openSubstituteModal(idx));
    legend.appendChild(item);
  }
}

function countStitchedPerColor() {
  const counts = {};
  if (!S.gridPixels) return counts;

  for (let r = 0; r < S.gridH; r++) {
    for (let c = 0; c < S.gridW; c++) {
      const idx = S.gridPixels[r][c];
      if (idx < 0) continue;
      if (!counts[idx]) counts[idx] = { done: 0, total: 0 };
      counts[idx].total++;
      if (S.stitched[`${r}_${c}`]) counts[idx].done++;
    }
  }
  return counts;
}

function updateProgressBar() {
  if (!S.gridPixels) { document.getElementById('progress-wrap').style.display = 'none'; return; }
  document.getElementById('progress-wrap').style.display = '';
  let total = 0, done = 0;
  for (let r = 0; r < S.gridH; r++) {
    for (let c = 0; c < S.gridW; c++) {
      if (S.gridPixels[r][c] < 0) continue;
      total++;
      if (S.stitched[`${r}_${c}`]) done++;
    }
  }
  const pct = total ? (done / total * 100).toFixed(1) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done} / ${total} stitched (${pct}%)`;
}

// ─── Canvas interaction ───────────────────────────────────────────────────────

function hitCell(mx, my) {
  if (!S.gridPixels) return null;
  const c = Math.floor((mx - S.panX) / S.cellSize);
  const r = Math.floor((my - S.panY) / S.cellSize);
  if (c < 0 || c >= S.gridW || r < 0 || r >= S.gridH) return null;
  if (S.gridPixels[r][c] < 0) return null;
  return { r, c };
}

let clickDragMoved = false;

function onMouseDown(e) {
  if (e.button !== 0) return;
  S.isPanning    = true;
  S.lastMX       = e.offsetX;
  S.lastMY       = e.offsetY;
  clickDragMoved = false;
}

function onMouseMove(e) {
  if (!S.isPanning) return;
  const dx = e.offsetX - S.lastMX, dy = e.offsetY - S.lastMY;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) clickDragMoved = true;
  S.panX += dx; S.panY += dy;
  S.lastMX = e.offsetX; S.lastMY = e.offsetY;
  render();
}

function onMouseUp() { S.isPanning = false; }

function onCanvasClick(e) {
  if (clickDragMoved || !S.gridPixels) return;
  const hit = hitCell(e.offsetX, e.offsetY);
  if (!hit) return;
  const key = `${hit.r}_${hit.c}`;
  if (S.stitched[key]) { delete S.stitched[key]; }
  else                 { S.stitched[key] = true; }
  autosaveProgress();
  render();
  renderLegend();
}

function onWheel(e) {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  const newCell = clamp(Math.round(S.cellSize * factor), 3, 48);
  if (newCell === S.cellSize) return;
  // Zoom toward cursor
  const mx = e.offsetX, my = e.offsetY;
  const gridX = (mx - S.panX) / S.cellSize;
  const gridY = (my - S.panY) / S.cellSize;
  S.cellSize = newCell;
  S.panX = mx - gridX * S.cellSize;
  S.panY = my - gridY * S.cellSize;
  render();
}

// Touch
function onTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    S.isPanning    = true;
    S.lastMX       = e.touches[0].clientX;
    S.lastMY       = e.touches[0].clientY;
    S.pinchDist    = null;
    clickDragMoved = false;
  } else if (e.touches.length === 2) {
    S.isPanning = false;
    S.pinchDist = pinchDistance(e);
  }
}

function onTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 2 && S.pinchDist !== null) {
    const d   = pinchDistance(e);
    const factor = d / S.pinchDist;
    S.pinchDist  = d;
    const cx  = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy  = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const rect = document.getElementById('grid-canvas').getBoundingClientRect();
    const mx  = cx - rect.left, my = cy - rect.top;
    const newCell = clamp(Math.round(S.cellSize * factor), 3, 48);
    const gridX = (mx - S.panX) / S.cellSize;
    const gridY = (my - S.panY) / S.cellSize;
    S.cellSize = newCell;
    S.panX = mx - gridX * S.cellSize;
    S.panY = my - gridY * S.cellSize;
    render();
  } else if (e.touches.length === 1 && S.isPanning) {
    const dx = e.touches[0].clientX - S.lastMX;
    const dy = e.touches[0].clientY - S.lastMY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) clickDragMoved = true;
    S.panX += dx; S.panY += dy;
    S.lastMX = e.touches[0].clientX; S.lastMY = e.touches[0].clientY;
    render();
  }
}

function onTouchEnd(e) {
  if (e.touches.length < 2) S.pinchDist = null;
  if (e.touches.length === 0) {
    S.isPanning = false;
    if (!clickDragMoved && e.changedTouches.length === 1) {
      const t    = e.changedTouches[0];
      const rect = document.getElementById('grid-canvas').getBoundingClientRect();
      const hit  = hitCell(t.clientX - rect.left, t.clientY - rect.top);
      if (hit) {
        const key = `${hit.r}_${hit.c}`;
        if (S.stitched[key]) { delete S.stitched[key]; }
        else                 { S.stitched[key] = true; }
        autosaveProgress();
        render();
        renderLegend();
      }
    }
  }
}

function pinchDistance(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.hypot(dx, dy);
}

// ─── Drag & drop ──────────────────────────────────────────────────────────────

function setupDropZone() {
  const canvas = document.getElementById('grid-canvas');
  canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  canvas.addEventListener('drop',     e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.name.endsWith('.wtz')) { handleLoad(f); }
    else                        { importImageFile(f); }
  });
}

// ─── Undo / Redo ──────────────────────────────────────────────────────────────

function snapshotCore() {
  return {
    gridPixels: S.gridPixels ? S.gridPixels.map(r => [...r]) : null,
    palette:    JSON.parse(JSON.stringify(S.palette)),
    overrides:  { ...S.overrides },
    symbolMap:  { ...S.symbolMap },
    gridW: S.gridW, gridH: S.gridH, colorN: S.colorN,
    circular: S.circular,
  };
}

function pushHistory() {
  const snap = snapshotCore();
  if (S.histIdx < S.history.length - 1) S.history.splice(S.histIdx + 1);
  S.history.push(snap);
  if (S.history.length > MAX_HISTORY) S.history.shift();
  S.histIdx = S.history.length - 1;
}

function restoreSnapshot(snap) {
  S.gridPixels = snap.gridPixels ? snap.gridPixels.map(r => [...r]) : null;
  S.palette    = JSON.parse(JSON.stringify(snap.palette));
  S.overrides  = { ...snap.overrides };
  S.symbolMap  = { ...snap.symbolMap };
  S.gridW = snap.gridW; S.gridH = snap.gridH; S.colorN = snap.colorN;
  S.circular = snap.circular;
  syncUIFromState();
  render();
  renderLegend();
}

function undo() {
  if (S.histIdx <= 0) return;
  S.histIdx--;
  restoreSnapshot(S.history[S.histIdx]);
}

function redo() {
  if (S.histIdx >= S.history.length - 1) return;
  S.histIdx++;
  restoreSnapshot(S.history[S.histIdx]);
}

// ─── Save / Load ──────────────────────────────────────────────────────────────

function handleSave() {
  if (!S.gridPixels) { alert('No pattern to save.'); return; }
  const name = prompt('Filename:', 'my-pattern') ?? 'my-pattern';
  if (!name) return;
  saveWtz(S, name);
}

async function handleLoad(file) {
  try {
    const loaded = await loadWtz(file);
    pushHistory();
    Object.assign(S, loaded);
    S.origAspect = S.gridW / S.gridH;
    syncUIFromState();
    resetView();
    updateAidaDisplay();
    render();
    renderLegend();
  } catch (err) {
    alert('Could not open file: ' + err.message);
  }
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function openPreview() {
  if (!S.gridPixels) return;

  const overlay = document.getElementById('preview-overlay');
  const canvas  = document.getElementById('preview-canvas');
  overlay.style.display = 'flex';

  const cell = 12;
  canvas.width  = S.gridW * cell;
  canvas.height = S.gridH * cell;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = S.clothColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < S.gridH; r++) {
    for (let c = 0; c < S.gridW; c++) {
      const idx = S.gridPixels[r][c];
      if (idx < 0) continue;
      const dmc = S.overrides[idx] ?? S.palette[idx];
      if (S.circular) {
        const cx2 = S.gridW / 2, cy2 = S.gridH / 2;
        const dx = c + 0.5 - cx2, dy = r + 0.5 - cy2;
        if ((dx / (S.gridW / 2)) ** 2 + (dy / (S.gridH / 2)) ** 2 > 1) continue;
      }
      ctx.fillStyle = `rgb(${dmc[2]},${dmc[3]},${dmc[4]})`;
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('preview-close').addEventListener('click', () => {
    document.getElementById('preview-overlay').style.display = 'none';
  });
  document.getElementById('preview-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('preview-overlay'))
      document.getElementById('preview-overlay').style.display = 'none';
  });
});

// ─── Inventory modal ──────────────────────────────────────────────────────────

function openInventoryModal() {
  const modal  = document.getElementById('inventory-modal');
  const grid   = document.getElementById('inv-grid');
  const search = document.getElementById('inv-search');
  modal.style.display = 'flex';

  function populate(colors) {
    grid.innerHTML = '';
    for (const [code, name, r, g, b] of colors) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const item = document.createElement('label');
      item.className = 'inv-item';
      item.innerHTML = `
        <span class="inv-swatch" style="background:rgb(${r},${g},${b});color:${lum>140?'#000':'#fff'}">&#9632;</span>
        <input type="checkbox" value="${code}" ${S.inventory.has(code) ? 'checked' : ''}>
        <span class="inv-label">DMC ${code}<br><small>${name}</small></span>`;
      grid.appendChild(item);
    }
  }

  populate(DMC_COLORS);

  search.value = '';
  search.oninput = () => {
    const q = search.value.toLowerCase();
    populate(q ? DMC_COLORS.filter(([c, n]) => c.includes(q) || n.toLowerCase().includes(q)) : DMC_COLORS);
  };

  document.getElementById('inv-select-all').onclick = () =>
    grid.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
  document.getElementById('inv-clear-all').onclick = () =>
    grid.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
  document.getElementById('inv-save').onclick = () => {
    S.inventory = new Set([...grid.querySelectorAll('input:checked')].map(cb => cb.value));
    saveInventory();
    modal.style.display = 'none';
    renderLegend();
  };
  document.getElementById('inv-cancel').onclick = () => modal.style.display = 'none';
}

// ─── Presets modal ────────────────────────────────────────────────────────────

function openPresetsModal() {
  const modal = document.getElementById('presets-modal');
  const list  = document.getElementById('preset-list');
  modal.style.display = 'flex';

  function refresh() {
    list.innerHTML = '';
    for (const [name, w] of Object.entries(S.presets)) {
      const li = document.createElement('div');
      li.className = 'preset-row';
      li.innerHTML = `<span>${name} — ${w} stitches wide</span>`;
      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.onclick = () => {
        S.gridW = w; S.origAspect = S.gridW / S.gridH; lockAspectH();
        document.getElementById('slider-w').value = S.gridW;
        document.getElementById('num-w').value    = S.gridW;
        modal.style.display = 'none';
      };
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.onclick = () => {
        if (!confirm(`Delete "${name}"?`)) return;
        delete S.presets[name]; savePresets(); refresh();
      };
      li.appendChild(loadBtn); li.appendChild(delBtn);
      list.appendChild(li);
    }
  }

  refresh();

  document.getElementById('preset-add').onclick = () => {
    const name = prompt('Preset name:');
    if (!name) return;
    const w = parseInt(prompt('Grid width (10-150):'));
    if (!w || w < 10 || w > 150) return;
    S.presets[name] = w; savePresets(); refresh();
  };
  document.getElementById('presets-close').onclick = () => modal.style.display = 'none';
}

// ─── Substitute modal ─────────────────────────────────────────────────────────

function openSubstituteModal(palIdx) {
  const modal = document.getElementById('sub-modal');
  const current = S.overrides[palIdx] ?? S.palette[palIdx];
  const [code, name, r, g, b] = current;

  document.getElementById('sub-title').textContent = `Substitute for DMC ${code} — ${name}`;

  const orig = document.getElementById('sub-original');
  orig.style.background = `rgb(${r},${g},${b})`;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  orig.style.color = lum > 140 ? '#000' : '#fff';
  orig.textContent = S.symbolMap[code] ?? '■';

  const candidates = nearestInInventory(r, g, b, S.inventory, 8);
  const grid = document.getElementById('sub-candidates');
  grid.innerHTML = '';

  for (const [[c2, n2, r2, g2, b2], dist] of candidates) {
    if (c2 === code) continue;
    const lum2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
    const btn  = document.createElement('button');
    btn.className = 'sub-candidate';
    btn.style.background = `rgb(${r2},${g2},${b2})`;
    btn.style.color = lum2 > 140 ? '#000' : '#fff';
    btn.innerHTML = `${S.symbolMap[c2] ?? '■'}<span>DMC ${c2}<br>${n2}</span>`;
    btn.title = `DMC ${c2} — ${n2}`;
    btn.onclick = () => {
      pushHistory();
      S.overrides[palIdx] = [c2, n2, r2, g2, b2];
      if (!S.symbolMap[c2]) S.symbolMap[c2] = S.symbolMap[code] ?? SYMBOLS[palIdx % SYMBOLS.length];
      autosaveProgress();
      render(); renderLegend();
      modal.style.display = 'none';
    };
    grid.appendChild(btn);
  }

  // Reset override
  document.getElementById('sub-reset').onclick = () => {
    pushHistory();
    delete S.overrides[palIdx];
    autosaveProgress();
    render(); renderLegend();
    modal.style.display = 'none';
  };

  document.getElementById('sub-cancel').onclick = () => modal.style.display = 'none';
  modal.style.display = 'flex';
}

// ─── Cat fact easter egg ──────────────────────────────────────────────────────

function showCatFact() {
  const modal = document.getElementById('cat-modal');
  const text  = document.getElementById('cat-text');
  text.textContent = 'Fetching cat wisdom…';
  modal.style.display = 'flex';

  fetch('https://catfact.ninja/fact', {
    headers: { 'User-Agent': 'Wenztitch/1.0' }
  })
    .then(r => r.json())
    .then(d => { text.textContent = d.fact; })
    .catch(() => { text.textContent = '🐱 Cats are too busy to respond right now.'; });

  document.getElementById('cat-close').onclick = () => modal.style.display = 'none';
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
