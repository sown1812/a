/**
 * Planet Suika - Main Game Controller & Orchestrator
 */
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.previewCanvas = document.getElementById('preview-canvas');
    this.previewCtx = this.previewCanvas.getContext('2d');

    // Layout boundaries (Expanded play area!)
    this.width = 520;
    this.height = 680;
    this.cx = 260;
    this.cy = 340;

    this.planetRadius = 0; // No planet core, stack at exact center
    this.orbitRadius = 235; // Thắt quỹ đạo để quả không bị bay ra ngoài rìa màn hình
    this.warningLimit = 200; // Giảm tương ứng để giữ tỉ lệ giới hạn

    this.physics = new PhysicsEngine(this.cx, this.cy, this.planetRadius);
    this.audio = new AudioSynth();
    this.particles = new ParticleSystem();
    this.levelManager = new LevelManager();

    this.state = 'menu';

    // Screen Juice Shake effect variables
    this.shakeIntensity = 0;
    this.shakeDecay = 0.86;
    this.mergeComboCount = 0;
    this.lastMergeTime = 0;

    // Floating text points (+15, +30)
    this.floatingTexts = [];

    // Planet rotations
    this.planetRotation = 0;

    // Orbit launcher
    this.launcherAngle = 0;
    this.launcherSpeed = 0.95;

    this.currentFruitTier = 0;
    this.nextFruitTier = 0;
    this.launchCooldown = false;
    this.cooldownTime = 750; // Tăng delay từ 350ms lên 750ms để tránh user spam bắn quả liên tục

    this.overflowTimer = 0;
    this.overflowDuration = 3.0;
    this.isOverflowing = false;

    this.score = 0;
    this.lastTime = 0;

    // Economy and progression variables
    this.coins = parseInt(localStorage.getItem('planet_merge_coins') || '100', 10);
    this.stars = parseInt(localStorage.getItem('planet_merge_stars') || '0', 10);
    this.lives = parseInt(localStorage.getItem('planet_merge_lives') || '5', 10);
    this.maxHearts = 5;
    this.heartRegenMs = 30 * 60 * 1000;
    this.lastHeartRegenTime = parseInt(localStorage.getItem('planet_merge_last_heart_regen') || Date.now().toString(), 10);
    this.joinedTeam = localStorage.getItem('planet_merge_joined_team') || null;
    this.lastGiftTime = parseInt(localStorage.getItem('planet_merge_last_gift') || '0', 10);

    // In-game boosters: shrink (thu nhỏ), grow (phóng to), slow (làm chậm vòng quay), shuffle (xáo trộn)
    this.boosterDefs = {
      shrink:  { icon: '🔽', hint: 'Chạm 1 quả để THU NHỎ xuống 1 size', target: true },
      grow:    { icon: '🔼', hint: 'Chạm 1 quả để TĂNG size lên 1 bậc', target: true },
      slow:    { icon: '🐢', hint: '', target: false },
      shuffle: { icon: '🔀', hint: '', target: false }
    };
    this.boosters = {
      shrink:  parseInt(localStorage.getItem('planet_merge_ib_shrink')  || '3', 10),
      grow:    parseInt(localStorage.getItem('planet_merge_ib_grow')    || '3', 10),
      slow:    parseInt(localStorage.getItem('planet_merge_ib_slow')    || '3', 10),
      shuffle: parseInt(localStorage.getItem('planet_merge_ib_shuffle') || '3', 10)
    };
    this.activeBooster = null; // type currently waiting for a fruit tap (shrink/grow)
    this.slowTimer = 0;        // ms remaining of the slow-orbit effect

    // Save defaults
    localStorage.setItem('planet_merge_coins', this.coins);
    localStorage.setItem('planet_merge_stars', this.stars);
    localStorage.setItem('planet_merge_lives', this.lives);
    localStorage.setItem('planet_merge_perf_mode', 'false');

    this.setupUI();
    this.checkHeartRegen();
    setInterval(() => this.checkHeartRegen(), 60 * 1000);
    this.shop = new Shop(this);
    this.teams = new Teams(this);
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Draw initial HUD previews for menu background
    this.currentFruitTier = this.getRandomSpawnTier();
    this.nextFruitTier = this.getRandomSpawnTier();
    this.updatePreviewCanvas();
    this.drawEvolutionCircle();

    // Initial resource bar update
    this.updateResourceHeader();
  }

  setupUI() {
    document.getElementById('start-btn').addEventListener('click', () => {
      this.audio.playClick();
      this.startLevel(0); // PLAY NOW always starts at Level 1
    });

    document.getElementById('level-select-btn').addEventListener('click', () => {
      this.audio.playClick();
      this.showScreen('level-screen');
      this.renderLevelGrid();
    });

    document.getElementById('level-back-btn').addEventListener('click', () => {
      this.audio.playClick();
      this.showScreen('menu-screen');
    });

    document.getElementById('next-level-btn').addEventListener('click', () => {
      this.audio.playClick();
      const nextIdx = this.levelManager.currentLevelIndex + 1;
      if (nextIdx < this.levelManager.levels.length) {
        this.startLevel(nextIdx);
      } else {
        this.showScreen('menu-screen');
      }
    });

    document.getElementById('victory-menu-btn').addEventListener('click', () => {
      this.audio.playClick();
      this.showScreen('menu-screen');
    });

    document.getElementById('retry-btn').addEventListener('click', () => {
      this.audio.playClick();
      this.startLevel(this.levelManager.currentLevelIndex);
    });

    document.getElementById('gameover-menu-btn').addEventListener('click', () => {
      this.audio.playClick();
      this.showScreen('menu-screen');
    });

    document.getElementById('watch-ad-heart-btn').addEventListener('click', () => {
      this.audio.playClick();
      if (confirm('[MOCK AD] Watch a short ad to get +1 ❤️?')) {
        this.addHeart(1);
        this.showScreen('menu-screen');
      }
    });

    document.getElementById('no-hearts-menu-btn').addEventListener('click', () => {
      this.audio.playClick();
      this.showScreen('menu-screen');
    });

    // Bottom tab switching logic
    const tabs = ['shop', 'home', 'teams'];
    tabs.forEach(tab => {
      const btn = document.getElementById(`nav-${tab}-btn`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.audio.playClick();

          document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
          btn.classList.add('active');

          document.querySelectorAll('.menu-tab-content').forEach(content => content.classList.add('hidden'));
          const targetTab = document.getElementById(`tab-${tab}`);
          if (targetTab) targetTab.classList.remove('hidden');
        });
      }
    });

    // Shop events and logic are handled by the Shop class in shop.js

    // Teams events and logic are handled by the Teams class in teams.js

    // Performance Mode check & change listener
    const perfChk = document.getElementById('perf-mode-chk');
    if (perfChk) {
      perfChk.checked = localStorage.getItem('planet_merge_perf_mode') === 'true';
      perfChk.addEventListener('change', () => {
        const isChecked = perfChk.checked;
        localStorage.setItem('planet_merge_perf_mode', isChecked ? 'true' : 'false');
        this.physics.isPerfMode = isChecked;
        this.particles.isPerfMode = isChecked;
      });
    }

    // Booster bar buttons
    document.querySelectorAll('.booster-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.playClick();
        this.useBooster(btn.getAttribute('data-booster'));
      });
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.state !== 'playing') return;

      // If a targeting booster (shrink/grow) is armed, the tap selects a fruit instead of launching
      if (this.activeBooster) {
        const pt = this.getCanvasPoint(e);
        this.applyTargetBooster(pt.x, pt.y);
        return;
      }

      this.launchFruit();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.state === 'playing') {
        e.preventDefault();
        this.launchFruit();
      }
    });
  }

  getComboWord(combo) {
    const words2 = ["JUICY!", "SWEET!", "POP!", "BOUNCE!"];
    const words3 = ["CASCADE!", "FLOW!", "DOUBLE!"];
    const words4 = ["SLAM!", "CRUSH!", "SPLASH!"];
    const words5 = ["COSMIC!", "UNBELIEVABLE!", "MARVELOUS!"];

    if (combo === 2) return words2[Math.floor(Math.random() * words2.length)];
    if (combo === 3) return words3[Math.floor(Math.random() * words3.length)];
    if (combo === 4) return words4[Math.floor(Math.random() * words4.length)];
    return words5[Math.floor(Math.random() * words5.length)];
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    const rect = parent.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const drawScaleX = this.canvas.width / (this.width * dpr);
    const drawScaleY = this.canvas.height / (this.height * dpr);
    this.ctx.scale(drawScaleX * dpr, drawScaleY * dpr);
  }

  showScreen(screenId) {
    if (this._noHeartsInterval && screenId !== 'no-hearts-screen') {
      clearInterval(this._noHeartsInterval);
      this._noHeartsInterval = null;
    }
    document.querySelectorAll('.overlay-screen').forEach(scr => scr.classList.add('hidden'));
    // Any overlay (menu, victory, gameover, level select…) means we're no longer in active play
    if (screenId !== 'none') this.showBoosterBar(false);
    if (screenId === 'none') return;
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.remove('hidden');

    if (screenId === 'menu-screen') {
      this.updateResourceHeader();
    }
  }

  updateResourceHeader() {
    const coinsEl = document.getElementById('coins-count');
    const starsEl = document.getElementById('stars-count');
    const livesEl = document.getElementById('lives-count');

    if (coinsEl) coinsEl.textContent = this.coins;
    if (starsEl) starsEl.textContent = this.stars;
    if (livesEl) livesEl.textContent = this.lives;

    const currentLevel = this.levelManager.getCurrentLevel() || this.levelManager.levels[0];
    const lvlNameEl = document.getElementById('menu-current-level-name');
    const lvlDescEl = document.getElementById('menu-current-level-desc');

    if (lvlNameEl) lvlNameEl.textContent = `Level ${currentLevel.id}: ${currentLevel.name}`;
    if (lvlDescEl) lvlDescEl.textContent = currentLevel.description;

    if (this.shop) {
      this.shop.updateGiftButton();
    }

    if (this.teams) {
      this.teams.updateTeamsButtons();
    }
  }

  renderLevelGrid() {
    const grid = document.getElementById('levels-grid');
    grid.innerHTML = '';

    this.levelManager.levels.forEach((lvl, idx) => {
      const card = document.createElement('div');
      const isUnlocked = idx <= this.levelManager.unlockedLevelIndex;
      const isCompleted = idx < this.levelManager.unlockedLevelIndex;

      card.className = `level-item ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''}`;

      if (isUnlocked) {
        const best = this.levelManager.getBestStars(idx);
        const starHtml = `<span class="on">${'★'.repeat(best)}</span><span class="off">${'★'.repeat(3 - best)}</span>`;
        card.innerHTML = `
          <div class="level-num">${lvl.id}</div>
          <div class="level-stars">${starHtml}</div>
          <div class="level-status">${isCompleted ? '⭐ CLEAR' : '🔓 PLAY'}</div>
        `;
        card.addEventListener('click', () => {
          this.audio.playClick();
          this.startLevel(idx);
        });
      } else {
        card.innerHTML = `
          <div class="level-num" style="opacity: 0.35;">${lvl.id}</div>
          <div class="level-status">🔒 LOCKED</div>
        `;
      }
      grid.appendChild(card);
    });
  }

  drawEvolutionCircle() {
    const canvas = document.getElementById('evolution-canvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const spacing = (canvas.width - 28) / 10;
    const fy = canvas.height / 2;

    // Draw background guide line
    ctx.strokeStyle = 'rgba(155, 81, 224, 0.08)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(14, fy);
    ctx.lineTo(canvas.width - 14, fy);
    ctx.stroke();

    for (let i = 0; i < 11; i++) {
      const fx = 14 + i * spacing;
      const fr = 8 + i * 0.7; // Tăng dần nhẹ kích thước quả từ 8 -> 15 để trông có tiến trình

      // Vẽ quả (sử dụng hàm vẽ vector của PhysicsEngine)
      this.physics.drawFruitBody(ctx, fx, fy, fr, i);
      this.physics.drawFace(ctx, fx, fy, fr, false, 'normal', i);

      // Vẽ mũi tên chỉ hướng tiến hóa tiếp theo
      if (i < 10) {
        const arrowX = fx + spacing / 2;
        ctx.fillStyle = 'rgba(155, 81, 224, 0.4)';
        ctx.font = '8px Fredoka';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('➔', arrowX, fy);
      }
    }
  }

  startLevel(idx) {
    if (this.lives <= 0) {
      this.showNoHeartsScreen();
      return;
    }

    this.levelManager.selectLevel(idx);
    this.levelManager.resetCurrentGoals();

    this.physics.clear();
    this.particles.particles = [];
    this.particles.rings = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.score = 0;
    this.lastTime = performance.now();
    this.state = 'playing';
    this.isOverflowing = false;
    this.overflowTimer = 0;
    this.activeBooster = null;
    this.slowTimer = 0;

    const lvl = this.levelManager.getCurrentLevel();
    this.orbitRadius = lvl.orbitRadius || 295;
    this.warningLimit = lvl.warningLimit || 255;
    this.launcherSpeed = lvl.launcherSpeed || (0.95 + idx * 0.12);
    this.physics.warningLimit = this.warningLimit;

    // Multi-center support: a level may define several gravity wells; otherwise use the single canvas center
    if (lvl.centers && lvl.centers.length) {
      this.physics.centers = lvl.centers.map(c => ({ x: c.x, y: c.y }));
    } else {
      this.physics.centers = [{ x: this.cx, y: this.cy }];
    }

    // Pre-placed fruits: seed the field with already-settled fruit defined by the level
    if (lvl.preplaced && lvl.preplaced.length) {
      for (const p of lvl.preplaced) {
        const body = this.physics.addBody(p.x, p.y, p.tier);
        body.scale = 1.0;
        body.targetScale = 1.0;
        body.isSettled = true;
        body.px = p.x;
        body.py = p.y;
      }
    }

    if (lvl.id === 1) {
      this.tutorialMode = true;
      this.tutorialStep = 0;
      this.launcherAngle = -Math.PI / 2;
    } else {
      this.tutorialMode = false;
    }

    this.currentFruitTier = this.getRandomSpawnTier();
    this.nextFruitTier = this.getRandomSpawnTier();

    this._pendingVictory = false;
    this._victoryDelay = null;
    this._loseDelay = null;

    document.getElementById('level-display').innerText = this.levelManager.getCurrentLevel().id;
    document.getElementById('score-display').innerText = 0;
    document.getElementById('warning-overlay').classList.add('hidden');

    this.updateHUDGoals();
    this.updateHUDSpawns();
    this.updateStarTrack();
    this.updatePreviewCanvas();
    this.drawEvolutionCircle();
    this.showScreen('none');
    this.showBoosterBar(true);
  }

  getRandomSpawnTier() {
    const currentLvl = this.levelManager.getCurrentLevel();
    const maxTier = currentLvl.maxSpawnTier;
    const r = Math.random();
    let tier;
    if (r < 0.45) tier = 0;      // Cherry (45%)
    else if (r < 0.75) tier = 1; // Strawberry (30%)
    else if (r < 0.90) tier = 2; // Grape (15%)
    else tier = 3;               // Orange

    return Math.min(tier, maxTier);
  }

  updateHUDGoals() {
    const container = document.getElementById('goal-container');
    container.innerHTML = '';

    const lvl = this.levelManager.getCurrentLevel();
    lvl.goals.forEach(goal => {
      const badge = document.createElement('div');
      badge.className = 'goal-badge';

      if (goal.type === 'score') {
        const isMet = goal.current >= goal.target;
        if (isMet) badge.classList.add('completed');
        badge.innerHTML = `🌟 ${goal.current}/${goal.target}`;
      }
      else if (goal.type === 'fruit') {
        const config = FRUIT_CONFIGS[goal.target];
        const isMet = goal.current >= goal.count;
        if (isMet) badge.classList.add('completed');
        badge.innerHTML = `
          <span style="font-size:14px; margin-right:4px;">${config.emoji}</span>
          <span>${goal.current}/${goal.count}</span>
        `;
      }
      container.appendChild(badge);
    });
  }

  updateHUDSpawns() {
    const el = document.getElementById('spawn-display');
    if (el) {
      el.innerText = this.levelManager.remainingSpawns;

      // Highlight in red/pulse when low on spawns
      if (this.levelManager.remainingSpawns <= 3) {
        el.style.color = '#ff2e51';
        el.style.textShadow = '0 0 8px rgba(255, 46, 81, 0.4)';
      } else {
        el.style.color = '';
        el.style.textShadow = '';
      }
    }
  }

  // Live HUD stars: fill based on how many score thresholds the current score has crossed
  updateStarTrack() {
    const cont = document.getElementById('star-track');
    if (!cont) return;
    const stars = this.levelManager.getStars(this.score);
    const els = cont.querySelectorAll('.star');
    els.forEach((el, i) => el.classList.toggle('filled', i < stars));
  }

  // Victory screen: light up the stars the player earned
  renderVictoryStars(stars) {
    const cont = document.getElementById('victory-stars');
    if (!cont) return;
    const els = cont.querySelectorAll('.vstar');
    els.forEach((el, i) => el.classList.toggle('earned', i < stars));
  }

  updatePreviewCanvas() {
    const ctx = this.previewCtx;
    ctx.clearRect(0, 0, 60, 60);

    // Scale preview size based on tier (fits nicely inside 60x60 box)
    const r = 12 + this.nextFruitTier * 1.5;

    ctx.save();
    // Vẽ trực tiếp bằng hàm vector chính chủ để có đầy đủ hình dạng đặc thù (Strawberry teardrop, Grape cluster, stripes...)
    this.physics.drawFruitBody(ctx, 30, 30, r, this.nextFruitTier);
    this.physics.drawFace(ctx, 30, 30, r, false, 'normal', this.nextFruitTier);
    ctx.restore();
  }

  launchFruit() {
    if (this.launchCooldown || this.levelManager.remainingSpawns <= 0) return;
    this.launchCooldown = true;

    if (this.tutorialMode && this.tutorialStep === 0) {
      this.tutorialStep = 1;
    }

    const lx = this.cx + Math.cos(this.launcherAngle) * this.orbitRadius;
    const ly = this.cy + Math.sin(this.launcherAngle) * this.orbitRadius;

    const body = this.physics.addBody(lx, ly, this.currentFruitTier);
    body.deformVelX = -0.15;
    body.deformVelY = 0.15;

    if (this.physics.bodies.length === 1) {
      body.isFirstFruit = true;
    }

    const dx = this.cx - lx;
    const dy = this.cy - ly;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Tốc độ phóng ban đầu rất chậm để nhìn rõ hoạt ảnh tăng tốc khi rơi vào tâm
    const baseSpeed = Math.sqrt(2 * this.physics.gravity * 300 * dist / 400);
    const speed = Math.max(0.1, Math.min(baseSpeed * 0.2, 1.2));
    // Quả lớn hơi chậm hơn chút:
    const massFactor = 1 - (this.currentFruitTier * 0.015);
    const finalSpeed = speed * massFactor;

    const vx = (dx / dist) * finalSpeed;
    const vy = (dy / dist) * finalSpeed;

    body.px = lx - vx;
    body.py = ly - vy;

    this.audio.playDrop();
    if (navigator.vibrate) navigator.vibrate(10); // Rung chạm bắn siêu nhẹ

    this.levelManager.remainingSpawns--;

    this.currentFruitTier = this.nextFruitTier;
    this.nextFruitTier = this.getRandomSpawnTier();

    // Defer UI update to prevent stutter on main thread touch event
    requestAnimationFrame(() => {
      this.updateHUDSpawns();
      this.updatePreviewCanvas();
    });

    setTimeout(() => {
      this.launchCooldown = false;
    }, this.cooldownTime);
  }

  // ───────────────────────── BOOSTERS ─────────────────────────

  // Convert a pointer event into logical game coordinates (this.width × this.height space)
  getCanvasPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * this.width,
      y: (e.clientY - rect.top) / rect.height * this.height
    };
  }

  refreshBoosterUI() {
    Object.keys(this.boosterDefs).forEach(type => {
      const countEl = document.getElementById(`booster-count-${type}`);
      if (countEl) countEl.textContent = this.boosters[type];

      const btn = document.querySelector(`.booster-btn[data-booster="${type}"]`);
      if (btn) {
        btn.classList.toggle('depleted', this.boosters[type] <= 0);
        btn.classList.toggle('active', this.activeBooster === type);
      }
    });

    const hint = document.getElementById('booster-hint');
    const hintText = document.getElementById('booster-hint-text');
    if (hint && hintText) {
      if (this.activeBooster && this.boosterDefs[this.activeBooster].target) {
        hintText.textContent = this.boosterDefs[this.activeBooster].hint;
        hint.classList.remove('hidden');
      } else {
        hint.classList.add('hidden');
      }
    }
  }

  showBoosterBar(show) {
    const bar = document.getElementById('booster-bar');
    if (bar) bar.classList.toggle('hidden', !show);
    if (!show) {
      this.activeBooster = null;
      const hint = document.getElementById('booster-hint');
      if (hint) hint.classList.add('hidden');
    }
    this.refreshBoosterUI();
  }

  useBooster(type) {
    if (this.state !== 'playing' || !this.boosterDefs[type]) return;

    if (this.boosters[type] <= 0) {
      // Out of this booster — flash the depleted button, do nothing else
      const btn = document.querySelector(`.booster-btn[data-booster="${type}"]`);
      if (btn) {
        btn.classList.remove('shake');
        void btn.offsetWidth; // restart animation
        btn.classList.add('shake');
      }
      return;
    }

    const def = this.boosterDefs[type];

    if (def.target) {
      // Toggle targeting mode — next fruit tap consumes the booster
      this.activeBooster = (this.activeBooster === type) ? null : type;
    } else {
      // Instant boosters
      if (type === 'slow') this.activateSlow();
      else if (type === 'shuffle') this.shuffleFruits();
      this.activeBooster = null;
    }
    this.refreshBoosterUI();
  }

  consumeBooster(type) {
    this.boosters[type] = Math.max(0, this.boosters[type] - 1);
    localStorage.setItem(`planet_merge_ib_${type}`, this.boosters[type]);
    this.refreshBoosterUI();
  }

  // Find the settled fruit whose body contains the tapped point (nearest wins)
  getFruitAt(gx, gy) {
    let best = null;
    let bestDist = Infinity;
    for (const b of this.physics.bodies) {
      if (b.merged) continue;
      const dx = gx - b.x;
      const dy = gy - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitR = b.r * Math.max(0.5, b.scale);
      if (dist <= hitR && dist < bestDist) {
        bestDist = dist;
        best = b;
      }
    }
    return best;
  }

  applyTargetBooster(gx, gy) {
    const type = this.activeBooster;
    if (!type) return;

    const body = this.getFruitAt(gx, gy);
    if (!body) return; // missed — keep targeting mode active so the player can retry

    if (type === 'shrink') {
      if (body.tier <= 0) {
        // Cherry is already the smallest — nothing to shrink
        this.floatingTexts.push({
          x: body.x, y: body.y - 10, text: 'MIN SIZE',
          color: '#ff5e97', life: 1.0, scale: 0.08, vy: -1.6, rot: 0
        });
        return;
      }
      this.morphFruit(body, body.tier - 1);
    } else if (type === 'grow') {
      if (body.tier >= FRUIT_CONFIGS.length - 1) {
        // Watermelon is already the largest — nothing to grow
        this.floatingTexts.push({
          x: body.x, y: body.y - 10, text: 'MAX SIZE',
          color: '#ff5e97', life: 1.0, scale: 0.08, vy: -1.6, rot: 0
        });
        return;
      }
      this.morphFruit(body, body.tier + 1);
      this.levelManager.trackMergeGoal(body.tier);
      this.updateHUDGoals();
    }

    this.consumeBooster(type);
    this.activeBooster = null;
    this.refreshBoosterUI();
  }

  // Transform a fruit body to a new tier in place with a juicy pop animation
  morphFruit(body, newTier) {
    const config = FRUIT_CONFIGS[newTier];
    body.tier = newTier;
    body.r = config.r;
    body.scale = 0.35;
    body.targetScale = 1.15;
    body.growthPhase = true;
    body.merged = false;
    body.expression = 'surprised';
    body.expressionTimer = 40;

    this.particles.spawnMergeEffect(body.x, body.y, config.color, 14 + newTier * 2);
    this.audio.playMerge && this.audio.playMerge(newTier);
    if (navigator.vibrate) navigator.vibrate(16);
  }

  // Booster 3: temporarily slow the orbiting launcher
  activateSlow() {
    this.slowTimer = 6000; // 6 seconds of slow orbit
    this.consumeBooster('slow');
    this.floatingTexts.push({
      x: this.cx, y: this.cy - 40, text: '🐢 SLOW!',
      color: '#2d9cdb', life: 1.4, scale: 0.08, vy: -2.0, rot: 0
    });
    if (navigator.vibrate) navigator.vibrate(12);
  }

  // Booster 4: blast every fruit into a chaotic tumble — they fly around, then the wells pull them back
  shuffleFruits() {
    const movable = this.physics.bodies.filter(b => !b.merged);
    if (movable.length === 0) return;

    for (const b of movable) {
      // Release the fruit so the physics engine can fling it around
      b.isSettled = false;
      b.growthPhase = false;

      // Strong random impulse — encoded as a previous-position offset for Verlet integration
      const ang = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4.5;
      b.px = b.x - Math.cos(ang) * speed;
      b.py = b.y - Math.sin(ang) * speed;

      // Temporary fast tumble + jelly wobble for chaos; restore the gentle idle spin afterwards
      const origSpin = b.idleSpin;
      b.idleSpin = (Math.random() - 0.5) * 0.35;
      b.deformVelX = (Math.random() - 0.5) * 0.7;
      b.deformVelY = (Math.random() - 0.5) * 0.7;
      b.expression = 'surprised';
      b.expressionTimer = 70;
      setTimeout(() => { b.idleSpin = origSpin; }, 1500);

      // Small juice burst at each fruit
      this.particles.spawnMergeEffect(b.x, b.y, FRUIT_CONFIGS[b.tier].color, 6);
    }

    this.consumeBooster('shuffle');
    this.floatingTexts.push({
      x: this.cx, y: this.cy - 40, text: '🔀 SHUFFLE!',
      color: '#9b51e0', life: 1.3, scale: 0.08, vy: -2.0, rot: 0
    });
    this.audio.playDrop && this.audio.playDrop();
    if (navigator.vibrate) navigator.vibrate([15, 30, 15, 30, 15]);
  }

  addScore(points, x = this.cx, y = this.cy, color = '#ff5e97', showFloatingText = true) {
    this.score += points;
    document.getElementById('score-display').innerText = this.score;
    this.levelManager.trackScore(this.score);
    this.updateHUDGoals();
    this.updateStarTrack();

    if (showFloatingText) {
      this.floatingTexts.push({
        x: x,
        y: y - 10,
        text: `+${points}`,
        color: color,
        life: 1.0,
        scale: 0.1,
        vy: -1.4,
        rot: (Math.random() - 0.5) * 0.4
      });
    }

    if (this.levelManager.checkVictory()) {
      this.triggerWin();
    }
  }

  handleMerge(midX, midY, currentTier, nextTier) {
    this.audio.playMerge(nextTier);

    if (this.tutorialMode && this.tutorialStep === 1) {
      this.tutorialStep = 2;
    }

    if (navigator.vibrate) {
      if (nextTier >= 3) {
        navigator.vibrate([25, 35, 20]); // Double haptic rumble for larger fruit
      } else {
        navigator.vibrate(18); // Single snap rumble for smaller fruit
      }
    }

    const now = performance.now();
    if (now - this.lastMergeTime < 450) {
      this.mergeComboCount += 1;
    } else {
      this.mergeComboCount = 1;
    }
    this.lastMergeTime = now;

    const config = FRUIT_CONFIGS[currentTier];
    this.particles.spawnMergeEffect(midX, midY, config.color, 16 + currentTier * 2);

    // Choose what visual combo feedback to apply (No screen shake or wobbly neighbor deform)
    if (this.mergeComboCount > 1) {
      this.particles.spawnComboJuiceEffect(midX, midY, config.color, this.mergeComboCount);
    }

    const points = (currentTier + 1) * 15;

    // Resolve single reward shoutout text (Priority: size feedback > combo feedback > standard score feedback)
    let feedbackText = '';
    let feedbackColor = config.color;
    let textYOffset = -30;
    let textScale = 0.08;

    if (nextTier >= 3) {
      // Big size congratulations
      if (nextTier >= 9) {
        feedbackText = Math.random() < 0.5 ? '🌟 LEGENDARY!' : '🚀 ULTIMATE!';
        feedbackColor = '#ffd700';
        textScale = 0.09;
      } else if (nextTier >= 6) {
        feedbackText = Math.random() < 0.5 ? '✨ AMAZING!' : '💫 FANTASTIC!';
        feedbackColor = '#ff6b9d';
      } else {
        feedbackText = Math.random() < 0.5 ? '🎉 GREAT!' : '⭐ EXCELLENT!';
        feedbackColor = '#a55eea';
      }
    } else if (this.mergeComboCount > 1) {
      // Combo feedback
      const shout = this.getComboWord(this.mergeComboCount);
      feedbackText = `${shout} x${this.mergeComboCount}`;
      feedbackColor = '#ffd56b';
      textYOffset = -40;
    }

    if (feedbackText) {
      // Show special shoutout, do not draw standard +15 score text to prevent clutter
      this.addScore(points, midX, midY, config.color, false);

      this.floatingTexts.push({
        x: midX,
        y: midY + textYOffset,
        text: feedbackText,
        color: feedbackColor,
        life: 1.4,
        scale: textScale,
        vy: -2.5,
        rot: (Math.random() - 0.5) * 0.3
      });
    } else {
      // Just show standard score text
      this.addScore(points, midX, midY, config.color, true);
    }

    if (nextTier < FRUIT_CONFIGS.length) {
      const newBody = this.physics.addBody(midX, midY, nextTier);
      newBody.isSettled = true;
      newBody.scale = 0.1;
      newBody.targetScale = 1.0;
      newBody.growthPhase = true; // Khi scale < 0.95, không apply full collision force

      // Track merge goal: increment counter when tier is created
      this.levelManager.trackMergeGoal(nextTier);
      this.updateHUDGoals();
    } else {
      this.particles.spawnWatermelonExplosion(midX, midY);
      this.shakeIntensity = 15;
      this.addScore(1000, midX, midY, '#2ed573');

      // Ultimate feedback for max fruit
      this.floatingTexts.push({
        x: midX,
        y: midY - 50,
        text: '👑 ULTIMATE VICTORY!',
        color: '#ffd700',
        life: 1.5,
        scale: 0.08,
        vy: -2.5,
        rot: (Math.random() - 0.5) * 0.4
      });

      // Track merge goal for max tier
      this.levelManager.trackMergeGoal(nextTier);
      this.updateHUDGoals();
    }

    if (this.levelManager.checkVictory()) {
      this.triggerWin();
    }
  }

  handleBoundarySplash(x, y, color) {
    if (this.audio && this.audio.playSplash) {
      this.audio.playSplash();
    }
    if (this.particles && this.particles.spawnSplashEffect) {
      this.particles.spawnSplashEffect(x, y, color);
    }
  }

  triggerWin() {
    if (this.state !== 'playing') return;
    this.state = 'win';
    this.levelManager.unlockNextLevel();
    this.audio.playWin();
    if (navigator.vibrate) navigator.vibrate([50, 50, 50, 50, 100]); // Celebrate!

    // Stars earned are decided by the score thresholds; fruit goals were the base pass requirement
    const idx = this.levelManager.currentLevelIndex;
    const earnedStars = this.levelManager.getStars(this.score);
    const gainedStars = this.levelManager.recordStars(idx, earnedStars); // only the improvement over best

    // Reward coins and stars (star currency reflects the sum of best ratings)
    const rewardCoins = 50 + idx * 20;
    this.coins += rewardCoins;
    this.stars += gainedStars;
    localStorage.setItem('planet_merge_coins', this.coins);
    localStorage.setItem('planet_merge_stars', this.stars);

    this.particles.spawnConfetti(this.cx, this.width);
    this.particles.spawnConfetti(this.cx, this.width);

    this.renderVictoryStars(earnedStars);
    document.getElementById('victory-score').innerText = this.score;

    // Chờ hết tất cả merge animations rồi mới hiện popup (tracked in update())
    this._pendingVictory = true;
    this._victoryDelay = null;
  }

  triggerLose() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.audio.playLose();
    if (navigator.vibrate) navigator.vibrate([100, 80, 150]); // Sad rumble

    const wasFullBefore = this.lives === this.maxHearts;
    this.lives = Math.max(0, this.lives - 1);
    localStorage.setItem('planet_merge_lives', this.lives);
    if (wasFullBefore) {
      this.lastHeartRegenTime = Date.now();
      localStorage.setItem('planet_merge_last_heart_regen', this.lastHeartRegenTime);
    }

    const goalCont = document.getElementById('defeat-goals');
    goalCont.innerHTML = '';
    const lvl = this.levelManager.getCurrentLevel();
    lvl.goals.forEach(g => {
      const badge = document.createElement('div');
      badge.className = 'goal-badge';
      if (g.type === 'score' && g.current < g.target) {
        badge.innerHTML = `🌟 ${g.current}/${g.target}`;
        goalCont.appendChild(badge);
      } else if (g.type === 'fruit' && g.current < g.count) {
        const config = FRUIT_CONFIGS[g.target];
        badge.innerHTML = `${config.emoji} ${g.current}/${g.count}`;
        goalCont.appendChild(badge);
      }
    });

    // Hiện ngay — update() đã chờ 2s trước khi gọi triggerLose()
    this.showScreen('gameover-screen');
  }

  update(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    let dt = (timestamp - this.lastTime) / 16.666;
    if (dt > 4.0) dt = 4.0;
    this.lastTime = timestamp;

    if (this.state === 'playing' || this.state === 'win') {
      this.planetRotation += 0.008 * dt;

      if (this.state === 'playing') {
        let currentSpeed = this.launcherSpeed;
        if (this.tutorialMode) {
          if (this.tutorialStep === 0) {
            currentSpeed = 0;
            this.launcherAngle = -Math.PI / 2;
          } else if (this.tutorialStep === 1) {
            currentSpeed = this.launcherSpeed * 0.35;
          }
        }

        // Booster 3: slow the orbit while the timer is active
        if (this.slowTimer > 0) {
          this.slowTimer -= 0.016 * dt * 1000;
          currentSpeed *= 0.3;
          if (this.slowTimer <= 0) this.slowTimer = 0;
        }

        this.launcherAngle += currentSpeed * 0.016 * dt;
        if (this.launcherAngle >= Math.PI * 2) {
          this.launcherAngle -= Math.PI * 2;
        }
      }

      // Vẫn cập nhật vật lý khi thắng để quả tiếp tục rơi/phồng to/nẩy
      this.physics.update(
        dt,
        (midX, midY, cTier, nTier) => this.handleMerge(midX, midY, cTier, nTier),
        (sizeFactor) => this.audio.playCollision(sizeFactor),
        (x, y, color) => this.handleBoundarySplash(x, y, color)
      );

      if (this.state === 'playing') {
        // Sync fruit goal checks in real-time
        this.levelManager.syncFruitGoals(this.physics.bodies);
        this.updateHUDGoals();

        if (this.levelManager.checkVictory()) {
          this.triggerWin();
        }

        let overflowDetected = false;
        for (const b of this.physics.bodies) {
          // Measure overflow from the body's nearest gravity well (handles multi-center levels)
          const c = this.physics.getNearestCenter(b.x, b.y);
          const dx = b.x - c.x;
          const dy = b.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (b.isSettled && dist > this.warningLimit) {
            overflowDetected = true;
            break;
          }
        }

        if (overflowDetected) {
          this.isOverflowing = true;
          this.overflowTimer += 0.016 * dt * 1000;

          const remaining = Math.max(0, Math.ceil((3000 - this.overflowTimer) / 1000));
          document.getElementById('warning-timer').innerText = remaining;
          document.getElementById('warning-overlay').classList.remove('hidden');

          if (this.overflowTimer >= 3000) {
            this.triggerLose();
          }
        } else {
          this.isOverflowing = false;
          this.overflowTimer = 0;
          document.getElementById('warning-overlay').classList.add('hidden');
        }

        // Kiểm tra thua cuộc khi hết lượt bắn fruit (spawns limit)
        if (this.levelManager.remainingSpawns <= 0 && !this.launchCooldown) {
          const allSettled = this.physics.bodies.every(b => b.isSettled);
          const noMerges = this.physics.mergeAnimations.length === 0;
          if (allSettled && noMerges) {
            if (!this.levelManager.checkVictory()) {
              // Chờ 2s sau khi tất cả ổn định rồi mới hiện popup thua cuộc
              if (!this._loseDelay) this._loseDelay = timestamp;
              if (timestamp - this._loseDelay >= 2000) {
                this._loseDelay = null;
                this.triggerLose();
              }
            } else {
              this._loseDelay = null;
            }
          } else {
            this._loseDelay = null; // reset nếu vẫn còn merge/chưa settled
          }
        }
      }
    }

    if (this.state === 'win') {
      // Hiện popup victory khi hết tất cả merge animations + 800ms cooldown
      if (this._pendingVictory) {
        if (this.physics.mergeAnimations.length === 0) {
          if (!this._victoryDelay) this._victoryDelay = timestamp;
          if (timestamp - this._victoryDelay >= 800) {
            this._pendingVictory = false;
            this._victoryDelay = null;
            this.showScreen('victory-screen');
          }
        }
      }

      if (!this.confettiSpawnTimer) this.confettiSpawnTimer = 0;
      this.confettiSpawnTimer += dt;
      if (this.confettiSpawnTimer > 25) {
        this.confettiSpawnTimer = 0;
        this.particles.spawnConfetti(this.cx, this.width);
      }
    }

    if (this.shakeIntensity > 0.1) {
      this.shakeIntensity *= Math.pow(this.shakeDecay, dt);
    } else {
      this.shakeIntensity = 0;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= 0.025 * dt;
      if (ft.scale < 1.0) ft.scale += 0.15 * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    this.particles.update(dt, this.cx, this.cy);
    this.draw();

    requestAnimationFrame((t) => this.update(t));
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    if (this.shakeIntensity > 0.1) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(sx, sy);
    }

    this.drawOrbitGuidelines(ctx);
    this.drawPlanetCore(ctx);
    this.physics.draw(ctx);
    this.particles.draw(ctx);
    this.drawFloatingTexts(ctx);

    if (this.state === 'playing') {
      this.drawLauncher(ctx);
    }

    this.drawTutorial(ctx);
    ctx.restore();
  }

  drawOrbitGuidelines(ctx) {
    ctx.save();

    // Orbit path ring — the circular border the launcher rotates along
    ctx.strokeStyle = 'rgba(155, 81, 224, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Warning boundary line (dashed pink ring) — one per gravity well
    if (this.isOverflowing) {
      ctx.strokeStyle = 'rgba(255, 94, 151, 0.6)';
      ctx.shadowColor = 'rgba(255, 94, 151, 0.4)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = 'rgba(155, 81, 224, 0.18)';
    }
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 6]);
    for (const c of this.physics.centers) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, this.warningLimit, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset line dash to prevent leakage to physical bodies drawing
    ctx.restore();
  }

  drawPlanetCore(ctx) {
    for (const c of this.physics.centers) {
      this.drawCoreAt(ctx, c.x, c.y);
    }
  }

  drawCoreAt(ctx, x, y) {
    ctx.save();

    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 32);
    glowGrad.addColorStop(0, 'rgba(155, 81, 224, 0.28)');
    glowGrad.addColorStop(0.5, 'rgba(155, 81, 224, 0.08)');
    glowGrad.addColorStop(1, 'rgba(155, 81, 224, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y);
    ctx.rotate(this.planetRotation * 1.5);

    ctx.shadowColor = '#9b51e0';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffffff';

    ctx.beginPath();
    this.particles.drawStarPath(ctx, 0, 0, 4, 6, 2.5);
    ctx.fill();
    ctx.restore();
  }

  drawLauncher(ctx) {
    ctx.save();

    const lx = this.cx + Math.cos(this.launcherAngle) * this.orbitRadius;
    const ly = this.cy + Math.sin(this.launcherAngle) * this.orbitRadius;

    const config = FRUIT_CONFIGS[this.currentFruitTier];
    const laserColor = config.color;
    const time = Date.now();
    const pulseWidth = Math.sin(time / 120) * 1.5;

    // Single-center: laser stops at the safe-zone edge. Multi-center: aim at the shared centroid.
    const guideLen = (this.physics.centers.length > 1) ? this.orbitRadius : this.warningLimit;
    const guideEndX = this.cx + Math.cos(this.launcherAngle) * guideLen;
    const guideEndY = this.cy + Math.sin(this.launcherAngle) * guideLen;

    // Layer 1: Thick Outer Laser Glow
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 5.5 + pulseWidth;
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(guideEndX, guideEndY);
    ctx.stroke();

    // Layer 2: Medium Laser Glow
    ctx.strokeStyle = laserColor;
    ctx.lineWidth = 2.8 + pulseWidth * 0.5;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(guideEndX, guideEndY);
    ctx.stroke();

    // Layer 3: Thin White Laser Core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(guideEndX, guideEndY);
    ctx.stroke();

    // Reset alpha for rest of drawing
    ctx.globalAlpha = 1.0;

    // Glowing Target Indicator at the warning limit
    const endPulse = 3.5 + Math.sin(time / 80) * 1.8;
    ctx.save();
    if (!this.physics.isPerfMode) {
      ctx.shadowColor = laserColor;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = laserColor;
    ctx.beginPath();
    ctx.arc(guideEndX, guideEndY, endPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw the fruit directly at lx, ly since there is no spaceship (drawn upright)
    this.physics.drawFruitBody(ctx, lx, ly, config.r, this.currentFruitTier, 0);
    this.physics.drawFace(ctx, lx, ly, config.r, false, 'normal', this.currentFruitTier);

    ctx.restore();
  }

  drawHandPointer(ctx, hx, hy) {
    ctx.save();
    ctx.translate(hx, hy);
    // Bouncing effect
    const bounce = Math.sin(Date.now() / 150) * 6;
    ctx.translate(0, bounce);
    ctx.rotate(-Math.PI / 8);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3d2f6d';
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Simple cute vector pointer hand path
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -20);
    ctx.arc(3, -20, 3, Math.PI, 0);
    ctx.lineTo(6, -10);
    ctx.arc(9, -10, 3, Math.PI, 0);
    ctx.lineTo(12, -10);
    ctx.arc(15, -10, 3, Math.PI, 0);
    ctx.lineTo(18, -10);
    ctx.arc(21, -10, 3, Math.PI, 0);
    ctx.lineTo(24, 0);
    ctx.quadraticCurveTo(24, 10, 12, 10);
    ctx.quadraticCurveTo(0, 10, 0, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawTutorial(ctx) {
    if (!this.tutorialMode) return;

    ctx.save();
    const cx = this.cx;
    const cy = this.cy;

    const lx = cx + Math.cos(this.launcherAngle) * this.orbitRadius;
    const ly = cy + Math.sin(this.launcherAngle) * this.orbitRadius;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
    ctx.strokeStyle = '#9b51e0';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';

    ctx.shadowColor = 'rgba(155, 81, 224, 0.25)';
    ctx.shadowBlur = 10;

    const boxW = 360;
    const boxH = 115; // Expanded height to hold visual mini-merge anim
    const boxX = cx - boxW / 2;
    const boxY = 25; // Shifted up to clear visual gameplay area

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.font = 'bold 13.5px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3d2f6d';

    let textLine1 = "";
    let textLine2 = "";

    if (this.tutorialStep === 0) {
      textLine1 = "👉 TAP ANYWHERE to shoot the Cherry into the core!";
      textLine2 = "Goal: Evolve fruits to create a Tangerine 🍊";

      // Draw launching path guide line
      const t = (Date.now() / 250) % 2;
      ctx.strokeStyle = '#ff5e97';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([6, 8]);

      ctx.beginPath();
      const arrowLength = this.orbitRadius - 32 - t * 8;
      ctx.moveTo(lx, ly);
      ctx.lineTo(cx, cy - arrowLength);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ff5e97';
      ctx.beginPath();
      ctx.arc(cx, cy - arrowLength, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Hand tap ripple effect at center
      const rip = (Date.now() / 800) % 1.0;
      ctx.strokeStyle = `rgba(155, 81, 224, ${1.0 - rip})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy + 90, rip * 35, 0, Math.PI * 2);
      ctx.stroke();

      // Tapping pointer hand bouncing
      this.drawHandPointer(ctx, cx + 18, cy + 102);
    }
    else if (this.tutorialStep === 1) {
      textLine1 = "👉 Launcher rotates automatically...";
      textLine2 = "TAP to shoot when aligned with the first Cherry!";

      // Draw alignment arrow
      ctx.strokeStyle = 'rgba(255, 94, 151, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulsing target ring around the first resting cherry
      const firstCherry = this.physics.bodies[0];
      if (firstCherry) {
        const pulse = 1.0 + Math.sin(Date.now() / 150) * 0.15;
        ctx.strokeStyle = '#ff5e97';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(firstCherry.x, firstCherry.y, firstCherry.r * pulse * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Hand pointer guide
      this.drawHandPointer(ctx, cx + 18, cy + 120);
    }
    else if (this.tutorialStep === 2) {
      textLine1 = "🎉 SUCCESS! Evolved into a Strawberry 🍓";
      textLine2 = "Keep merging to upgrade to Tangerine 🍊 to clear!";
    }

    ctx.fillText(textLine1, cx, boxY + 22);
    ctx.font = '600 11.5px Outfit';
    ctx.fillStyle = '#7d6e9d';
    ctx.fillText(textLine2, cx, boxY + 44);

    // Render interactive mini-merge timeline animation inside the bubble box
    const animTime = (Date.now() / 2400) % 1.0;
    const ax = cx;
    const ay = boxY + 84;

    if (animTime < 0.45) {
      // Two Cherries moving together
      const p = animTime / 0.45;
      const offset = 42 * (1.0 - p);
      this.physics.drawFruitBody(ctx, ax - offset, ay, 9, 0);
      this.physics.drawFace(ctx, ax - offset, ay, 9, false, 'normal', 0);
      this.physics.drawFruitBody(ctx, ax + offset, ay, 9, 0);
      this.physics.drawFace(ctx, ax + offset, ay, 9, false, 'normal', 0);
    }
    else if (animTime < 0.60) {
      // Impact spark
      ctx.save();
      ctx.fillStyle = '#fffa7a';
      ctx.shadowColor = '#ffd36b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      this.particles.drawStarPath(ctx, ax, ay, 5, 12, 5.5);
      ctx.fill();
      ctx.restore();
    }
    else {
      // Evolved Strawberry pulsing
      const p = (animTime - 0.60) / 0.40;
      const scale = p < 0.25 ? 0.3 + (p / 0.25) * 0.7 : 1.0 + Math.sin((p - 0.25) * Math.PI) * 0.15;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.scale(scale, scale);
      this.physics.drawFruitBody(ctx, 0, 0, 11, 1);
      this.physics.drawFace(ctx, 0, 0, 11, false, 'normal', 1);
      ctx.restore();
    }

    ctx.restore();
  }

  drawFloatingTexts(ctx) {
    ctx.save();
    ctx.font = 'bold 15px Fredoka';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = ft.life;
      ctx.save();
      ctx.translate(ft.x, ft.y);
      ctx.rotate(ft.rot);
      ctx.scale(ft.scale, ft.scale);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4.5;
      ctx.strokeText(ft.text, 0, 0);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  checkHeartRegen() {
    if (this.lives >= this.maxHearts) return;
    const now = Date.now();
    const elapsed = now - this.lastHeartRegenTime;
    if (elapsed >= this.heartRegenMs) {
      const heartsToAdd = Math.floor(elapsed / this.heartRegenMs);
      this.lives = Math.min(this.maxHearts, this.lives + heartsToAdd);
      this.lastHeartRegenTime = now - (elapsed % this.heartRegenMs);
      localStorage.setItem('planet_merge_lives', this.lives);
      localStorage.setItem('planet_merge_last_heart_regen', this.lastHeartRegenTime);
      this.updateResourceHeader();
    }
  }

  addHeart(count = 1) {
    this.lives = Math.min(this.maxHearts, this.lives + count);
    if (this.lives >= this.maxHearts) {
      this.lastHeartRegenTime = Date.now();
      localStorage.setItem('planet_merge_last_heart_regen', this.lastHeartRegenTime);
    }
    localStorage.setItem('planet_merge_lives', this.lives);
    this.updateResourceHeader();
  }

  showNoHeartsScreen() {
    if (this._noHeartsInterval) {
      clearInterval(this._noHeartsInterval);
      this._noHeartsInterval = null;
    }
    this.showScreen('no-hearts-screen');
    this._noHeartsInterval = setInterval(() => this.updateNoHeartsTimer(), 1000);
    this.updateNoHeartsTimer();
  }

  updateNoHeartsTimer() {
    const el = document.getElementById('heart-regen-timer');
    if (!el) return;
    this.checkHeartRegen();
    if (this.lives > 0) {
      clearInterval(this._noHeartsInterval);
      this._noHeartsInterval = null;
      this.showScreen('menu-screen');
      return;
    }
    const now = Date.now();
    const remaining = Math.max(0, this.lastHeartRegenTime + this.heartRegenMs - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// 7. Initialize Game
function initializeGame() {
  window.game = new Game();
  requestAnimationFrame((t) => window.game.update(t));
}

// Try multiple ways to ensure initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  // DOM already ready
  initializeGame();
}

// Fallback for load event
window.addEventListener('load', initializeGame);
