/**
 * Planet Suika - Fruit Configurations & Level Management
 */

// 1. Fruit Configuration (Brighter & Pop-out colors)
const FRUIT_CONFIGS = [
  { name: "Cherry", emoji: "🍒", r: 12, color: "#ff2e51", highlight: "#ffa6b9" },      // Tier 0 (Red)
  { name: "Strawberry", emoji: "🍓", r: 16, color: "#ff527b", highlight: "#ffb3c6" },  // Tier 1 (Pinkish Red)
  { name: "Grape", emoji: "🍇", r: 21, color: "#8c46ff", highlight: "#dabfff" },       // Tier 2 (Grape Purple)
  { name: "Tangerine", emoji: "🍊", r: 27, color: "#ffa502", highlight: "#ffd4b0" },   // Tier 3 (Tangerine Orange)
  { name: "Persimmon", emoji: "🍅", r: 33, color: "#ff5e36", highlight: "#ffbfb3" },   // Tier 4 (Deep Orange-Red)
  { name: "Apple", emoji: "🍎", r: 40, color: "#d63031", highlight: "#ff9999" },       // Tier 5 (Crimson Red)
  { name: "Pear", emoji: "🍐", r: 48, color: "#fed330", highlight: "#fff1ad" },        // Tier 6 (Lemon Yellow)
  { name: "Peach", emoji: "🍑", r: 56, color: "#ffb8b8", highlight: "#ffd6dd" },       // Tier 7 (Soft Baby Pink)
  { name: "Pineapple", emoji: "🍍", r: 65, color: "#f1c40f", highlight: "#fff3a6" },   // Tier 8 (Golden Yellow)
  { name: "Melon", emoji: "🍈", r: 75, color: "#2ecc71", highlight: "#a3ffc6" },       // Tier 9 (Bright Green)
  { name: "Watermelon", emoji: "🍉", r: 86, color: "#10ac84", highlight: "#7aff9e" }  // Tier 10 (Deep Emerald Green)
];

// 2. Level Configs & Level Manager
class LevelManager {
  constructor() {
    this.currentLevelIndex = 0;
    this.unlockedLevelIndex = 0;

    const saved = localStorage.getItem('planet_merge_unlocked_level');
    if (saved) {
      this.unlockedLevelIndex = parseInt(saved, 10);
    }

    // Config các thông số màn chơi chỉnh tay trực tiếp tại đây!
    this.levels = [
      {
        id: 1,
        name: "Cosmic Intro",
        description: "Tutorial: Merge Cherries to create a Tangerine 🍊.",
        maxSpawnTier: 0, // Chỉ sinh ra Cherry để dễ ghép
        orbitRadius: 147, // Giảm 30% (210 -> 147)
        warningLimit: 122, // Giảm 30% (175 -> 122)
        launcherSpeed: 0.65, // Tốc độ quay phi thuyền chậm để dễ ngắm bắn
        maxSpawns: 18, // Giới hạn số quả được sinh ra ở màn 1
        starScores: [150, 350, 600], // Mốc điểm cho 1★ / 2★ / 3★
        goals: [
          { type: 'fruit', target: 3, count: 1, current: 0 } // Base: tạo 1 quả Cam/Quýt (Tier 3) để qua màn
        ]
      },
      {
        id: 2,
        name: "Sparkling Vineyard",
        description: "Merge 3 Grapes (🍇 Tier 2) & 1 Persimmon (🍅 Tier 4).",
        maxSpawnTier: 3,
        orbitRadius: 195,
        warningLimit: 165,
        launcherSpeed: 0.95,
        maxSpawns: 15,
        starScores: [400, 800, 1300],
        goals: [
          { type: 'fruit', target: 2, count: 2, current: 0 },
          { type: 'fruit', target: 4, count: 1, current: 0 }
        ]
      },
      {
        id: 3,
        name: "Red Apple Gravity",
        description: "Evolve to create 1 Apple (Apple 🍎 is Tier 5).",
        maxSpawnTier: 4,
        orbitRadius: 235,
        warningLimit: 200,
        launcherSpeed: 1.05,
        maxSpawns: 25,
        starScores: [700, 1400, 2200],
        goals: [
          { type: 'fruit', target: 5, count: 1, current: 0 }
        ]
      },
      {
        id: 4,
        name: "Peach Cosmos",
        description: "Score 1500 points and create 1 Peach (Peach 🍑 is Tier 7).",
        maxSpawnTier: 6,
        orbitRadius: 235,
        warningLimit: 200,
        launcherSpeed: 1.15,
        maxSpawns: 40,
        starScores: [1000, 1800, 2800],
        goals: [
          { type: 'fruit', target: 8, count: 1, current: 0 }
        ]
      },
      {
        id: 5,
        name: "Melon Nebula",
        description: "Create 1 Melon (🍈 Tier 9) & merge 8 Strawberries (🍓 Tier 1).",
        maxSpawnTier: 5,
        orbitRadius: 235,
        warningLimit: 200,
        launcherSpeed: 1.25,
        maxSpawns: 50,
        starScores: [1500, 2800, 4500],
        goals: [
          { type: 'fruit', target: 9, count: 1, current: 0 },
          { type: 'fruit', target: 1, count: 8, current: 0 }
        ]
      },
      {
        id: 6,
        name: "Ultimate Cosmos",
        description: "Conquer the ultimate challenge: Create 1 giant Watermelon (🍉 Tier 10)!",
        maxSpawnTier: 5,
        orbitRadius: 235,
        warningLimit: 200,
        launcherSpeed: 1.35,
        maxSpawns: 75,
        starScores: [2500, 5000, 8000],
        goals: [
          { type: 'fruit', target: 10, count: 1, current: 0 }
        ]
      },
      {
        id: 7,
        name: "Triple Gravity",
        description: "3 gravity wells! Fruits fall toward the nearest core. Pre-loaded with fruit.",
        maxSpawnTier: 3,
        orbitRadius: 248,
        warningLimit: 85, // Per-well safe radius (overflow measured from nearest core)
        launcherSpeed: 1.1,
        maxSpawns: 45,
        // Three cores in an equilateral triangle (135px from canvas center), kept clear of
        // each other and tucked inside the orbit ring so no rings overlap.
        centers: [
          { x: 260, y: 205 },
          { x: 143, y: 408 },
          { x: 377, y: 408 }
        ],
        // Fruit already on the field at the start of the level (absolute logical coords)
        // Spacing rules: same-tier fruits must be placed further apart than their combined radii
        // Cherry r=12 (combined 24), Strawberry r=16 (combined 32), Grape r=21 (combined 42)
        preplaced: [
          // Top well (center 260,205): cherries 36px apart > combined 24 ✓
          { tier: 0, x: 242, y: 193 }, { tier: 0, x: 278, y: 193 }, { tier: 1, x: 260, y: 225 },
          // Bottom-left well (center 143,408): strawberries 50px apart > combined 32 ✓
          { tier: 1, x: 118, y: 397 }, { tier: 1, x: 168, y: 397 }, { tier: 0, x: 143, y: 430 },
          // Bottom-right well (center 377,408): grape above, cherries 40px apart > combined 24 ✓
          { tier: 2, x: 377, y: 383 }, { tier: 0, x: 357, y: 415 }, { tier: 0, x: 397, y: 415 }
        ],
        starScores: [800, 1500, 2500],
        goals: [
          { type: 'fruit', target: 3, count: 2, current: 0 }
        ]
      }
    ];

    // Unlock every level for the player
    this.unlockedLevelIndex = this.levels.length - 1;
    localStorage.setItem('planet_merge_unlocked_level', this.unlockedLevelIndex.toString());

    // Best star rating earned per level index, e.g. { "0": 3, "1": 2 }
    this.bestStars = JSON.parse(localStorage.getItem('planet_merge_best_stars') || '{}');
  }

  getCurrentLevel() {
    return this.levels[this.currentLevelIndex];
  }

  // How many stars a given score earns on a level (0–3), based on its starScores thresholds
  getStars(score, lvl = this.getCurrentLevel()) {
    if (!lvl || !lvl.starScores) return 0;
    let stars = 0;
    for (const threshold of lvl.starScores) {
      if (score >= threshold) stars++;
    }
    return Math.min(3, stars);
  }

  getBestStars(idx) {
    return this.bestStars[idx] || 0;
  }

  // Persist the best (highest) star rating for a level; returns the improvement over previous best
  recordStars(idx, stars) {
    const prev = this.bestStars[idx] || 0;
    const gained = Math.max(0, stars - prev);
    if (stars > prev) {
      this.bestStars[idx] = stars;
      localStorage.setItem('planet_merge_best_stars', JSON.stringify(this.bestStars));
    }
    return gained;
  }

  resetCurrentGoals() {
    const lvl = this.getCurrentLevel();
    lvl.goals.forEach(g => g.current = 0);
    this.remainingSpawns = lvl.maxSpawns || 999;
  }

  /**
   * Track when a fruit tier is created via merge.
   * Goal type 'fruit' is a cumulative counter - tracks how many times
   * a fruit of target tier has been created (not current state).
   * @param {Number} createdTier - the tier that was just created
   */
  trackMergeGoal(createdTier) {
    const lvl = this.getCurrentLevel();
    lvl.goals.forEach(g => {
      if (g.type === 'fruit' && g.target === createdTier) {
        g.current = Math.min(g.current + 1, g.count);
      }
    });
  }

  /**
   * Sync fruit goals by counting bodies currently alive on the field.
   * Goal type 'fruit' requires `count` fruits of exactly `target` tier
   * to exist simultaneously on the field — NOT a cumulative merge counter.
   * @param {Array} bodies - live physics bodies from PhysicsEngine
   */
  syncFruitGoals(bodies) {
    const lvl = this.getCurrentLevel();
    lvl.goals.forEach(g => {
      if (g.type === 'fruit') {
        // Count how many settled bodies with tier === target exist RIGHT NOW
        const liveCount = bodies.filter(
          b => b.isSettled && b.tier === g.target && !b.merged
        ).length;
        // Keep the max of the accumulated merge count and the live count
        g.current = Math.max(g.current || 0, Math.min(liveCount, g.count));
      }
    });
  }

  trackScore(score) {
    const lvl = this.getCurrentLevel();
    lvl.goals.forEach(g => {
      if (g.type === 'score') {
        g.current = score;
      }
    });
  }

  checkVictory() {
    const lvl = this.getCurrentLevel();
    if (!lvl || !lvl.goals || lvl.goals.length === 0) return false;

    for (const g of lvl.goals) {
      if (g.type === 'score') {
        if (!(g.current >= g.target)) return false;
      } else if (g.type === 'fruit') {
        if (!(g.current >= g.count)) return false;
      } else {
        return false;
      }
    }
    return true;
  }

  unlockNextLevel() {
    if (this.currentLevelIndex === this.unlockedLevelIndex) {
      this.unlockedLevelIndex = Math.min(this.levels.length - 1, this.unlockedLevelIndex + 1);
      localStorage.setItem('planet_merge_unlocked_level', this.unlockedLevelIndex.toString());
    }
  }

  selectLevel(idx) {
    if (idx <= this.unlockedLevelIndex) {
      this.currentLevelIndex = idx;
      return true;
    }
    return false;
  }
}
