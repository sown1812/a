/**
 * Planet Merge — Visual Level Editor
 * Reuses FRUIT_CONFIGS (level.js) + PhysicsEngine rendering (physics.js).
 * Designs a level visually, then writes it straight into level.js via the
 * File System Access API (replacing the region between the editor markers).
 */

GAME_MODE = 'fruit'; // force fruit art for previews regardless of saved skin

const W = 520, H = 680;
const CANVAS_CENTER = { x: 260, y: 340 };
const MAX_TIER = 10;

const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const physics = new PhysicsEngine(CANVAS_CENTER.x, CANVAS_CENTER.y, 0);

// ───────────────────────── State ─────────────────────────
let levels = [];        // all levels (clone of LevelManager.levels)
let editIndex = -1;     // index in `levels` being edited; -1 = brand new level
let L = null;           // working level object
let tool = 'fruit';
let fruitTier = 0;
let bhRadius = 20;
let fileHandle = null;  // FS Access handle to level.js (persisted across saves)

let isDragging = false; // shrink-zone / portal drag
let dragStart = null, dragCur = null;
let portalPending = null; // first rectangle of an in-progress portal pair
let railStart = null;     // first endpoint of an in-progress rail segment
let hoverPos = null;      // current mouse position (for in-progress rail preview)
let dragObj = null;       // object being repositioned with the select tool
let dragOffset = null;    // grab offset so the object follows the cursor smoothly
let dragSegOrig = null;   // original {x1,y1,x2,y2} when dragging a line segment

// ───────────────────────── Helpers ─────────────────────────
const clone = (o) => JSON.parse(JSON.stringify(o));
const round = (n) => (Number.isInteger(n) ? n : Math.round(n * 100) / 100);

function ensureArrays(l) {
  l.centers = l.centers || [];
  l.blackHoles = l.blackHoles || [];
  l.shrinkZones = l.shrinkZones || [];
  l.portalPairs = l.portalPairs || [];
  l.rails = l.rails || [];
  l.preplaced = l.preplaced || [];
  l.goals = l.goals || [];
  l.starScores = l.starScores || [0, 0, 0];
  return l;
}

function nextId() {
  return levels.reduce((m, l) => Math.max(m, l.id || 0), 0) + 1;
}

function blankLevel() {
  return ensureArrays({
    id: nextId(),
    name: 'New Level',
    description: 'Mô tả mục tiêu màn chơi...',
    maxSpawnTier: 3,
    orbitRadius: 235,
    warningLimit: 200,
    launcherSpeed: 1.0,
    maxSpawns: 40,
    starScores: [500, 1000, 1800],
    centers: [],
    blackHoles: [],
    shrinkZones: [],
    portalPairs: [],
    preplaced: [],
    goals: [{ type: 'fruit', target: 5, count: 1, current: 0 }]
  });
}

// ───────────────────────── Init ─────────────────────────
function init() {
  const lm = new LevelManager();
  levels = clone(lm.levels).map(ensureArrays);

  buildTierPalette();
  bindTools();
  bindInputs();
  bindActions();
  bindCanvas();
  buildLevelSelect();

  selectLevel('new');
}

function buildLevelSelect() {
  const sel = document.getElementById('level-select');
  sel.innerHTML = '';
  const optNew = document.createElement('option');
  optNew.value = 'new';
  optNew.textContent = '➕ Level mới';
  sel.appendChild(optNew);
  levels.forEach((l, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `Level ${l.id}`;
    sel.appendChild(o);
  });
  sel.onchange = () => selectLevel(sel.value);
}

function selectLevel(val) {
  if (val === 'new') {
    editIndex = -1;
    L = blankLevel();
  } else {
    editIndex = Number(val);
    L = ensureArrays(clone(levels[editIndex]));
  }
  portalPending = null;
  populateForm();
  renderGoals();
  render();
  updateExport();
}

// ───────────────────────── Form ─────────────────────────
function populateForm() {
  const set = (id, v) => { document.getElementById(id).value = v; };
  set('f-id', L.id);
  set('f-orbitRadius', L.orbitRadius);
  set('f-warningLimit', L.warningLimit);
  set('f-launcherSpeed', L.launcherSpeed);
  set('f-maxSpawns', L.maxSpawns);
  set('f-maxSpawnTier', L.maxSpawnTier);
  set('f-star1', L.starScores[0]);
  set('f-star2', L.starScores[1]);
  set('f-star3', L.starScores[2]);
}

function bindInputs() {
  const numField = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      L[key] = parseFloat(e.target.value) || 0;
      render(); updateExport();
    });
  };
  document.getElementById('f-id').addEventListener('input', e => { L.id = parseInt(e.target.value, 10) || 0; updateExport(); });
  numField('f-orbitRadius', 'orbitRadius');
  numField('f-warningLimit', 'warningLimit');
  numField('f-launcherSpeed', 'launcherSpeed');
  numField('f-maxSpawns', 'maxSpawns');
  numField('f-maxSpawnTier', 'maxSpawnTier');
  document.getElementById('f-star1').addEventListener('input', e => { L.starScores[0] = parseInt(e.target.value, 10) || 0; updateExport(); });
  document.getElementById('f-star2').addEventListener('input', e => { L.starScores[1] = parseInt(e.target.value, 10) || 0; updateExport(); });
  document.getElementById('f-star3').addEventListener('input', e => { L.starScores[2] = parseInt(e.target.value, 10) || 0; updateExport(); });
  document.getElementById('f-bhRadius').addEventListener('input', e => { bhRadius = parseInt(e.target.value, 10) || 20; });
}

// ───────────────────────── Goals UI ─────────────────────────
function renderGoals() {
  const wrap = document.getElementById('goals-list');
  wrap.innerHTML = '';
  L.goals.forEach((g, i) => {
    const row = document.createElement('div');
    row.className = 'goal-row';

    const typeSel = document.createElement('select');
    ['fruit', 'score'].forEach(t => {
      const o = document.createElement('option');
      o.value = t; o.textContent = t === 'fruit' ? '🍉 Tạo quả' : '🌟 Điểm';
      if (g.type === t) o.selected = true;
      typeSel.appendChild(o);
    });
    typeSel.onchange = () => {
      g.type = typeSel.value;
      if (g.type === 'fruit') { g.target = g.target ?? 5; g.count = g.count ?? 1; }
      else { g.target = g.target ?? 1000; delete g.count; }
      renderGoals(); updateExport();
    };
    row.appendChild(typeSel);

    if (g.type === 'fruit') {
      const tierSel = document.createElement('select');
      FRUIT_CONFIGS.forEach((f, t) => {
        const o = document.createElement('option');
        o.value = String(t); o.textContent = `${f.emoji} T${t}`;
        if (g.target === t) o.selected = true;
        tierSel.appendChild(o);
      });
      tierSel.onchange = () => { g.target = parseInt(tierSel.value, 10); updateExport(); };
      row.appendChild(tierSel);

      const cnt = document.createElement('input');
      cnt.type = 'number'; cnt.min = 1; cnt.value = g.count || 1; cnt.title = 'Số lượng';
      cnt.style.maxWidth = '60px';
      cnt.oninput = () => { g.count = parseInt(cnt.value, 10) || 1; updateExport(); };
      row.appendChild(cnt);
    } else {
      const tgt = document.createElement('input');
      tgt.type = 'number'; tgt.value = g.target || 0; tgt.title = 'Điểm cần đạt';
      tgt.oninput = () => { g.target = parseInt(tgt.value, 10) || 0; updateExport(); };
      row.appendChild(tgt);
    }

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '✕';
    del.onclick = () => { L.goals.splice(i, 1); renderGoals(); updateExport(); };
    row.appendChild(del);

    wrap.appendChild(row);
  });
}

// ───────────────────────── Tool palette ─────────────────────────
function bindTools() {
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });
  setTool('fruit');
}

function setTool(t) {
  tool = t;
  portalPending = null;
  railStart = null;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  document.getElementById('tier-wrap').style.display = (t === 'fruit') ? '' : 'none';
  document.getElementById('bh-radius-wrap').style.display = (t === 'blackhole') ? '' : 'none';
  updateHint();
  render();
}

function buildTierPalette() {
  const pal = document.getElementById('tier-palette');
  pal.innerHTML = '';
  FRUIT_CONFIGS.forEach((f, t) => {
    const cell = document.createElement('div');
    cell.className = 'tier-cell' + (t === fruitTier ? ' active' : '');
    cell.textContent = f.emoji;
    cell.title = `${f.name} (Tier ${t})`;
    cell.onclick = () => {
      fruitTier = t;
      pal.querySelectorAll('.tier-cell').forEach((c, i) => c.classList.toggle('active', i === t));
    };
    pal.appendChild(cell);
  });
}

const HINTS = {
  fruit: 'Click vào sân để <b>đặt quả</b> (tier đang chọn). Click lên quả có sẵn để <b>tăng tier</b>. Chuột phải để xoá.',
  center: 'Click để đặt <b>lõi hấp dẫn</b>. Không đặt lõi nào = dùng tâm mặc định (260,340). Chuột phải để xoá.',
  blackhole: 'Click để đặt <b>hố đen</b> (quả chạm vào biến mất). Chuột phải để xoá.',
  shrink: '<b>Kéo</b> để vẽ <b>vùng co</b> (quả đi qua bị giảm 1 tier). Chuột phải để xoá.',
  portal: '<b>Kéo lần 1</b> vẽ cổng <b style="color:#ff6b35">A</b>, <b>kéo lần 2</b> vẽ cổng <b style="color:#ff6b35">B</b> → thành 1 cặp. Kéo ngang = portal ngang, kéo dọc = portal dọc. Chuột phải xoá cả cặp.',
  rail: '<b>Click điểm đầu</b>, rồi <b>click điểm cuối</b> để vẽ <b style="color:#a8edff">thanh deflector</b>. Quả bật vào thanh sẽ đổi hướng. Chuột phải hoặc <kbd>Del</kbd> để xoá.',
  select: '<b>Kéo</b> vật thể để di chuyển vị trí. Chuột phải hoặc <kbd>Del</kbd> để xoá.'
};
function updateHint() {
  document.getElementById('hint-bar').innerHTML =
    `<b>${L ? 'Level ' + L.id + ' · ' : ''}</b>` + (HINTS[tool] || '') +
    ' &nbsp;|&nbsp; Bàn phím: <kbd>Del</kbd> xoá vật thể dưới con trỏ.';
}

// ───────────────────────── Canvas interaction ─────────────────────────
function evtToLogical(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: round((e.clientX - r.left) / r.width * W),
    y: round((e.clientY - r.top) / r.height * H)
  };
}

function pointInRect(p, rc) {
  return p.x >= rc.x && p.x <= rc.x + rc.width && p.y >= rc.y && p.y <= rc.y + rc.height;
}

function findFruitAt(p) {
  let best = null, bd = Infinity;
  for (const f of L.preplaced) {
    const r = FRUIT_CONFIGS[f.tier].r;
    const d = Math.hypot(p.x - f.x, p.y - f.y);
    if (d <= r && d < bd) { bd = d; best = f; }
  }
  return best;
}

function distToSegment(p, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) return Math.hypot(p.x - x1, p.y - y1);
  const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq));
  return Math.hypot(p.x - (x1 + t * dx), p.y - (y1 + t * dy));
}

// Topmost object under the cursor (returns the live reference so its x/y can be moved).
// For zones/portal rects, x/y is the top-left corner; dragging shifts the whole rect.
// Rails are not draggable (they have x1/y1/x2/y2) — select tool skips them.
function pickObjectAt(p) {
  const f = findFruitAt(p);
  if (f) return f;
  for (const bh of L.blackHoles) if (Math.hypot(p.x - bh.x, p.y - bh.y) <= bh.radius) return bh;
  for (const c of L.centers) if (Math.hypot(p.x - c.x, p.y - c.y) <= 18) return c;
  for (const pair of L.portalPairs) for (const seg of pair) if (distToSegment(p, seg.x1, seg.y1, seg.x2, seg.y2) <= 10) return seg;
  for (const z of L.shrinkZones) if (distToSegment(p, z.x1, z.y1, z.x2, z.y2) <= 10) return z;
  return null;
}

// Delete the topmost object under the cursor, across all categories
function deleteAt(p) {
  const f = findFruitAt(p);
  if (f) { L.preplaced.splice(L.preplaced.indexOf(f), 1); return commit(); }
  for (const bh of L.blackHoles) {
    if (Math.hypot(p.x - bh.x, p.y - bh.y) <= bh.radius) { L.blackHoles.splice(L.blackHoles.indexOf(bh), 1); return commit(); }
  }
  for (const c of L.centers) {
    if (Math.hypot(p.x - c.x, p.y - c.y) <= 18) { L.centers.splice(L.centers.indexOf(c), 1); return commit(); }
  }
  for (let i = 0; i < L.portalPairs.length; i++) {
    if (L.portalPairs[i].some(seg => distToSegment(p, seg.x1, seg.y1, seg.x2, seg.y2) <= 10)) { L.portalPairs.splice(i, 1); return commit(); }
  }
  for (const z of L.shrinkZones) {
    if (distToSegment(p, z.x1, z.y1, z.x2, z.y2) <= 10) { L.shrinkZones.splice(L.shrinkZones.indexOf(z), 1); return commit(); }
  }
  for (let i = 0; i < (L.rails || []).length; i++) {
    const r = L.rails[i];
    if (distToSegment(p, r.x1, r.y1, r.x2, r.y2) <= 8) { L.rails.splice(i, 1); return commit(); }
  }
}

function leftClick(p) {
  if (tool === 'fruit') {
    const f = findFruitAt(p);
    if (f) f.tier = (f.tier + 1) % (MAX_TIER + 1);
    else L.preplaced.push({ tier: fruitTier, x: p.x, y: p.y });
    return commit();
  }
  if (tool === 'center') { L.centers.push({ x: p.x, y: p.y }); return commit(); }
  if (tool === 'blackhole') { L.blackHoles.push({ x: p.x, y: p.y, radius: bhRadius }); return commit(); }
  // portal: handled by drag in bindCanvas
  if (tool === 'rail') {
    if (railStart) {
      L.rails = L.rails || [];
      L.rails.push({ x1: railStart.x, y1: railStart.y, x2: p.x, y2: p.y });
      railStart = null;
      return commit();
    } else {
      railStart = { x: p.x, y: p.y };
      render();
      return;
    }
  }
  if (tool === 'select') return deleteAt(p);
}

function commit() { render(); updateExport(); }

function bindCanvas() {
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = evtToLogical(e);
    if (e.button === 2) return; // right-click handled by contextmenu
    if (tool === 'shrink' || tool === 'portal') { isDragging = true; dragStart = p; dragCur = p; return; }
    if (tool === 'select') {
      const obj = pickObjectAt(p);
      if (obj) {
        dragObj = obj;
        if (obj.x1 !== undefined) {
          // Line segment (shrink zone or portal): track offset from x1/y1 and store original endpoints
          dragOffset = { x: p.x - obj.x1, y: p.y - obj.y1 };
          dragSegOrig = { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2 };
        } else {
          dragOffset = { x: p.x - obj.x, y: p.y - obj.y };
          dragSegOrig = null;
        }
      }
      return; // select tool only moves/deletes — never places
    }
    leftClick(p);
  });
  canvas.addEventListener('pointermove', (e) => {
    hoverPos = evtToLogical(e);
    if (isDragging) { dragCur = hoverPos; render(); }
    else if (dragObj) {
      if (dragSegOrig) {
        // Moving a line segment: shift both endpoints by the same delta
        const newX1 = round(hoverPos.x - dragOffset.x);
        const newY1 = round(hoverPos.y - dragOffset.y);
        dragObj.x1 = newX1;
        dragObj.y1 = newY1;
        dragObj.x2 = round(dragSegOrig.x2 + (newX1 - dragSegOrig.x1));
        dragObj.y2 = round(dragSegOrig.y2 + (newY1 - dragSegOrig.y1));
      } else {
        dragObj.x = round(hoverPos.x - dragOffset.x);
        dragObj.y = round(hoverPos.y - dragOffset.y);
      }
      render();
    } else if (tool === 'rail' && railStart) {
      render(); // redraw in-progress rail preview on every mouse move
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (dragObj) { dragObj = null; dragOffset = null; dragSegOrig = null; commit(); return; }
    if (isDragging) {
      isDragging = false;
      const seg = { x1: dragStart.x, y1: dragStart.y, x2: dragCur.x, y2: dragCur.y };
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      if (tool === 'shrink' && len > 8) {
        L.shrinkZones.push(seg); commit();
      }
      if (tool === 'portal' && len > 8) {
        if (portalPending) { L.portalPairs.push([portalPending, seg]); portalPending = null; }
        else portalPending = seg;
        commit();
      }
      dragStart = dragCur = null;
    }
  });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); deleteAt(evtToLogical(e)); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && hoverPos) deleteAt(hoverPos);
    if (e.key === 'Escape') { railStart = null; portalPending = null; render(); }
  });
}

// ───────────────────────── Rendering ─────────────────────────
function render() {
  if (!L) return; // nothing to draw until a level is loaded (avoids a null crash during init)
  ctx.clearRect(0, 0, W, H);
  // background
  ctx.fillStyle = '#0c0420';
  ctx.fillRect(0, 0, W, H);

  const centers = L.centers.length ? L.centers : [CANVAS_CENTER];

  // warning rings per center
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = 'rgba(255,94,151,0.5)';
  ctx.lineWidth = 1.5;
  centers.forEach(c => { ctx.beginPath(); ctx.arc(c.x, c.y, L.warningLimit, 0, Math.PI * 2); ctx.stroke(); });

  // orbit ring (launcher path) around canvas center
  ctx.strokeStyle = 'rgba(155,107,255,0.45)';
  ctx.beginPath(); ctx.arc(CANVAS_CENTER.x, CANVAS_CENTER.y, L.orbitRadius, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // shrink zones
  L.shrinkZones.forEach(z => {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,220,255,0.8)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); ctx.stroke();
    ctx.setLineDash([]);
    // Endpoint dots
    for (const [ex, ey] of [[z.x1, z.y1], [z.x2, z.y2]]) {
      ctx.fillStyle = 'rgba(0,220,255,0.8)';
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
    }
    label(ctx, '▼ SHRINK', (z.x1 + z.x2) / 2, (z.y1 + z.y2) / 2 - 12, '#7fe6ff');
    ctx.restore();
  });

  // portals
  const PC = ['#ff6b35', '#a855f7', '#22c55e'];
  const drawEditorPortal = (seg, lbl, col) => {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke();
    ctx.setLineDash([]);
    for (const [ex, ey] of [[seg.x1, seg.y1], [seg.x2, seg.y2]]) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    const cx = (seg.x1 + seg.x2) / 2, cy = (seg.y1 + seg.y2) / 2;
    const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    const perpX = len > 0 ? -(seg.y2 - seg.y1) / len * 14 : 0;
    const perpY = len > 0 ? (seg.x2 - seg.x1) / len * 14 : -14;
    label(ctx, lbl, cx + perpX, cy + perpY, col, 12);
    ctx.restore();
  };
  L.portalPairs.forEach((pair, pi) => {
    const col = PC[pi % PC.length];
    pair.forEach((seg, si) => drawEditorPortal(seg, si === 0 ? 'A' : 'B', col));
  });
  if (portalPending) {
    drawEditorPortal(portalPending, 'A (chờ B)', '#ffd700');
  }

  // rails
  (L.rails || []).forEach(r => {
    ctx.save();
    ctx.shadowColor = '#a8edff'; ctx.shadowBlur = 6;
    ctx.strokeStyle = '#a8edff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r.x1, r.y1); ctx.lineTo(r.x2, r.y2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#a8edff';
    for (const [ex, ey] of [[r.x1, r.y1], [r.x2, r.y2]]) {
      ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // Midpoint label
    label(ctx, '↔', (r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2 - 10, '#a8edff', 10);
    ctx.restore();
  });
  // in-progress rail (railStart → hover)
  if (railStart && hoverPos) {
    ctx.save();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(railStart.x, railStart.y); ctx.lineTo(hoverPos.x, hoverPos.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(railStart.x, railStart.y, 5, 0, Math.PI * 2); ctx.fill();
    const dist = Math.round(Math.hypot(hoverPos.x - railStart.x, hoverPos.y - railStart.y));
    label(ctx, `${dist}px — click để chốt B`, (railStart.x + hoverPos.x) / 2, (railStart.y + hoverPos.y) / 2 - 10, '#ffd700', 10);
    ctx.restore();
  }

  // black holes
  L.blackHoles.forEach(bh => {
    const g = ctx.createRadialGradient(bh.x, bh.y, 1, bh.x, bh.y, bh.radius);
    g.addColorStop(0, '#1a0030'); g.addColorStop(1, '#000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,100,220,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bh.x, bh.y, bh.radius * 1.4, 0, Math.PI * 2); ctx.stroke();
  });

  // gravity cores
  centers.forEach(c => {
    const isDefault = !L.centers.length;
    ctx.fillStyle = isDefault ? 'rgba(255,255,255,0.35)' : '#fff';
    ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(155,107,255,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, Math.PI * 2); ctx.stroke();
    if (isDefault) label(ctx, 'tâm mặc định', c.x, c.y + 26, '#9b8fd0');
  });

  // preplaced fruits (reuse the game's vector art)
  L.preplaced.forEach(f => {
    const cfg = FRUIT_CONFIGS[f.tier];
    physics.drawFruitBody(ctx, f.x, f.y, cfg.r, f.tier, 0);
    label(ctx, 'T' + f.tier, f.x, f.y, 'rgba(0,0,0,0.55)', 10);
  });

  // drag preview (shrink or portal)
  if (isDragging && dragStart && dragCur) {
    if (tool === 'portal') {
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(dragStart.x, dragStart.y); ctx.lineTo(dragCur.x, dragCur.y); ctx.stroke();
      ctx.setLineDash([]);
      const dist = Math.round(Math.hypot(dragCur.x - dragStart.x, dragCur.y - dragStart.y));
      label(ctx, `${portalPending ? 'B?' : 'A?'} ${dist}px`, (dragStart.x + dragCur.x) / 2, (dragStart.y + dragCur.y) / 2 - 10, '#ff6b35', 12);
    } else {
      ctx.strokeStyle = '#7fe6ff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(dragStart.x, dragStart.y); ctx.lineTo(dragCur.x, dragCur.y); ctx.stroke();
      ctx.setLineDash([]);
      const dist = Math.round(Math.hypot(dragCur.x - dragStart.x, dragCur.y - dragStart.y));
      label(ctx, `${dist}px`, (dragStart.x + dragCur.x) / 2, (dragStart.y + dragCur.y) / 2 - 10, '#7fe6ff', 10);
    }
  }

  updateHint();
}

function label(ctx, text, x, y, color, size = 11) {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.restore();
}

// ───────────────────────── Serialization ─────────────────────────
const PI = '        ';   // 8-space property indent
const II = '      ';     // 6-space array-item indent
const q = (s) => JSON.stringify(String(s));
const n = (v) => String(round(Number(v) || 0));

function objArray(items, keys) {
  const rows = items.map(it => `${PI}  { ${keys.map(k => `${k}: ${typeof it[k] === 'string' ? q(it[k]) : n(it[k])}`).join(', ')} }`);
  return `[\n${rows.join(',\n')}\n${PI}]`;
}
function portalArray(pairs) {
  const rows = pairs.map(pair => {
    const rs = pair.map(p => `{ x1: ${n(p.x1)}, y1: ${n(p.y1)}, x2: ${n(p.x2)}, y2: ${n(p.y2)} }`);
    return `${PI}  [\n${PI}    ${rs[0]},\n${PI}    ${rs[1]}\n${PI}  ]`;
  });
  return `[\n${rows.join(',\n')}\n${PI}]`;
}

function serializeLevel(l) {
  const lines = [];
  lines.push(`${PI}id: ${n(l.id)},`);
  lines.push(`${PI}maxSpawnTier: ${n(l.maxSpawnTier)},`);
  lines.push(`${PI}orbitRadius: ${n(l.orbitRadius)},`);
  lines.push(`${PI}warningLimit: ${n(l.warningLimit)},`);
  lines.push(`${PI}launcherSpeed: ${n(l.launcherSpeed)},`);
  lines.push(`${PI}maxSpawns: ${n(l.maxSpawns)},`);
  if (l.shotBonusMultiplier != null) lines.push(`${PI}shotBonusMultiplier: ${n(l.shotBonusMultiplier)},`);
  lines.push(`${PI}starScores: [${l.starScores.map(n).join(', ')}],`);
  if (l.centers && l.centers.length) lines.push(`${PI}centers: ${objArray(l.centers, ['x', 'y'])},`);
  if (l.blackHoles && l.blackHoles.length) lines.push(`${PI}blackHoles: ${objArray(l.blackHoles, ['x', 'y', 'radius'])},`);
  if (l.shrinkZones && l.shrinkZones.length) lines.push(`${PI}shrinkZones: ${objArray(l.shrinkZones, ['x1', 'y1', 'x2', 'y2'])},`);
  if (l.portalPairs && l.portalPairs.length) lines.push(`${PI}portalPairs: ${portalArray(l.portalPairs)},`);
  if (l.rails && l.rails.length) lines.push(`${PI}rails: ${objArray(l.rails, ['x1', 'y1', 'x2', 'y2'])},`);
  if (l.preplaced && l.preplaced.length) lines.push(`${PI}preplaced: ${objArray(l.preplaced, ['tier', 'x', 'y'])},`);
  lines.push(`${PI}goals: [`);
  l.goals.forEach((g, i) => {
    const tail = i < l.goals.length - 1 ? ',' : '';
    if (g.type === 'fruit') lines.push(`${PI}  { type: 'fruit', target: ${n(g.target)}, count: ${n(g.count)}, current: 0 }${tail}`);
    else lines.push(`${PI}  { type: 'score', target: ${n(g.target)}, current: 0 }${tail}`);
  });
  lines.push(`${PI}]`);
  return `${II}{\n${lines.join('\n')}\n${II}}`;
}

function serializeLevelsArray(arr) {
  return `[\n${arr.map(serializeLevel).join(',\n')}\n    ]`;
}

// Working level → clean output object (drop empty optional arrays, reset goal progress)
function cleanLevel(l) {
  const c = clone(l);
  ['centers', 'blackHoles', 'shrinkZones', 'portalPairs', 'rails', 'preplaced'].forEach(k => {
    if (!c[k] || !c[k].length) delete c[k];
  });
  c.goals = (c.goals || []).map(g => g.type === 'fruit'
    ? { type: 'fruit', target: g.target, count: g.count || 1, current: 0 }
    : { type: 'score', target: g.target, current: 0 });
  return c;
}

function buildOutputLevels() {
  const out = levels.map(clone);
  const cur = cleanLevel(L);
  if (editIndex >= 0) out[editIndex] = cur; else out.push(cur);
  return out;
}

function updateExport() {
  const ta = document.getElementById('export');
  ta.value = `    this.levels = ${serializeLevelsArray(buildOutputLevels())};`;
}

// ───────────────────────── Actions ─────────────────────────
function setStatus(msg, isErr) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = isErr ? 'err' : '';
}

function bindActions() {
  document.getElementById('add-goal-btn').onclick = () => {
    L.goals.push({ type: 'fruit', target: 5, count: 1, current: 0 });
    renderGoals(); updateExport();
  };
  document.getElementById('clear-field-btn').onclick = () => {
    L.centers = []; L.blackHoles = []; L.shrinkZones = []; L.portalPairs = []; L.rails = []; L.preplaced = [];
    portalPending = null; commit();
    setStatus('Đã xoá hết vật thể trên sân.');
  };
  document.getElementById('export-btn').onclick = () => {
    const ta = document.getElementById('export');
    ta.style.display = ta.style.display === 'none' ? '' : 'none';
    updateExport();
    if (ta.style.display !== 'none') { ta.select(); document.execCommand && document.execCommand('copy'); setStatus('Đã copy code vào clipboard.'); }
  };
  document.getElementById('test-btn').onclick = () => {
    try {
      localStorage.setItem('planet_merge_test_level', JSON.stringify(cleanLevel(L)));
      window.open('index.html?test=1', '_blank');
      setStatus('Đã mở tab test với level hiện tại.');
    } catch (e) { setStatus('Lỗi mở test: ' + e.message, true); }
  };
  document.getElementById('save-btn').onclick = saveToFile;
}

async function saveToFile() {
  const newLevels = buildOutputLevels();
  const body = `    this.levels = ${serializeLevelsArray(newLevels)};\n`;

  if (!window.showOpenFilePicker) {
    // Fallback: download a snippet for browsers without File System Access API
    const blob = new Blob([body], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'levels-snippet.js'; a.click();
    setStatus('Trình duyệt không hỗ trợ ghi file trực tiếp — đã tải snippet về. Hãy dùng Chrome/Edge để ghi thẳng.', true);
    return;
  }

  try {
    if (!fileHandle) {
      [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'level.js', accept: { 'text/javascript': ['.js'] } }]
      });
    }
    const file = await fileHandle.getFile();
    const text = await file.text();

    const START = '// <<LEVEL_EDITOR:START>>';
    const END = '// <<LEVEL_EDITOR:END>>';
    const si = text.indexOf(START);
    const ei = text.indexOf(END);
    if (si === -1 || ei === -1) {
      setStatus('Không tìm thấy marker START/END trong file đã chọn. Bạn đã chọn đúng level.js chưa?', true);
      fileHandle = null;
      return;
    }
    const afterStartNL = text.indexOf('\n', si);          // keep the whole START line
    const endLineStart = text.lastIndexOf('\n', ei) + 1;  // start of the END marker line
    const newText = text.slice(0, afterStartNL + 1) + body + text.slice(endLineStart);

    const writable = await fileHandle.createWritable();
    await writable.write(newText);
    await writable.close();

    // Reflect the save in local state so further edits build on it
    levels = newLevels.map(ensureArrays);
    if (editIndex < 0) editIndex = levels.length - 1;
    buildLevelSelect();
    document.getElementById('level-select').value = String(editIndex);
    setStatus(`✅ Đã ghi ${newLevels.length} level vào level.js. Reload game để thấy thay đổi.`);
  } catch (e) {
    if (e.name === 'AbortError') return;
    setStatus('Lỗi ghi file: ' + e.message, true);
  }
}

init();
