/**
 * Planet Suika - Fruit Configurations & Level Management
 */

// 1. Fruit Configuration (Brighter & Pop-out colors)
const FRUIT_CONFIGS = [
  { name: "Cherry", emoji: "🍒", r: 12, color: "#ff2e51", highlight: "#ffa6b9" },      // Tier 0 (Bright Red)
  { name: "Strawberry", emoji: "🍓", r: 16, color: "#ff2d87", highlight: "#ffaad4" },  // Tier 1 (Hot Pink/Magenta)
  { name: "Grape", emoji: "🍇", r: 21, color: "#7c3aed", highlight: "#c4b5fd" },       // Tier 2 (Rich Violet)
  { name: "Tangerine", emoji: "🍊", r: 27, color: "#ffa502", highlight: "#ffd4b0" },   // Tier 3 (Tangerine Orange)
  { name: "Persimmon", emoji: "🍅", r: 33, color: "#ff4d6d", highlight: "#ffb3c2" },   // Tier 4 (Vivid Coral-Pink)
  { name: "Apple", emoji: "🍎", r: 40, color: "#991b1b", highlight: "#fca5a5" },       // Tier 5 (Deep Wine Red)
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
    // <<LEVEL_EDITOR:START>> — Level Editor (editor.html) tự ghi đè vùng này. Đừng sửa/xoá 2 dòng marker START/END.
    this.levels = [
      {
        id: 0,
        maxSpawnTier: 0,
        orbitRadius: 220,
        warningLimit: 200,
        launcherSpeed: 0.95,
        maxSpawns: 999,
        starScores: [0, 0, 0],
        preplaced: [
          { tier: 3, x: 233, y: 310 },
          { tier: 3, x: 287, y: 310 },
          { tier: 2, x: 239, y: 262 },
          { tier: 2, x: 281, y: 262 },
          { tier: 1, x: 244, y: 225 },
          { tier: 1, x: 276, y: 225 },
          { tier: 0, x: 248, y: 197 },
          { tier: 0, x: 272, y: 197 },
          { tier: 5, x: 175, y: 335 },
          { tier: 4, x: 348, y: 330 }
        ],
        goals: []
      },
      {
        id: 1,
        maxSpawnTier: 0,
        orbitRadius: 147,
        warningLimit: 122,
        launcherSpeed: 0.65,
        maxSpawns: 30,
        starScores: [50, 100, 150],
        goals: [
          { type: 'fruit', target: 3, count: 1, current: 0 }
        ]
      },
      {
        id: 2,
        maxSpawnTier: 2,
        orbitRadius: 248,
        warningLimit: 85,
        launcherSpeed: 0.95,
        maxSpawns: 20,
        starScores: [800, 1500, 2500],
        centers: [
          { x: 260, y: 205 },
          { x: 143, y: 408 },
          { x: 377, y: 408 }
        ],
        preplaced: [
          { tier: 0, x: 242, y: 193 },
          { tier: 1, x: 260, y: 225 },
          { tier: 1, x: 118, y: 397 },
          { tier: 0, x: 143, y: 430 },
          { tier: 2, x: 377, y: 383 },
          { tier: 0, x: 357, y: 415 },
          { tier: 2, x: 154, y: 396.8 },
          { tier: 2, x: 277, y: 188.8 },
          { tier: 1, x: 398, y: 425.8 }
        ],
        goals: [
          { type: 'fruit', target: 4, count: 3, current: 0 }
        ]
      },
      {
        id: 3,
        maxSpawnTier: 2,
        orbitRadius: 250,
        warningLimit: 80,
        launcherSpeed: 1.05,
        maxSpawns: 25,
        starScores: [700, 1400, 2200],
        centers: [
          { x: 196, y: 258.8 },
          { x: 348, y: 407.8 }
        ],
        blackHoles: [
          { x: 176.54, y: 479.95, radius: 40 },
          { x: 338.37, y: 187.23, radius: 40 }
        ],
        portalPairs: [
          [
            { x1: 62, y1: 329.95, x2: 62, y2: 423.95 },
            { x1: 458.5, y1: 231.95, x2: 458.5, y2: 337.95 }
          ]
        ],
        rails: [
          { x1: 144, y1: 136.8, x2: 34, y2: 280.8 },
          { x1: 371, y1: 545.8, x2: 487, y2: 413.8 }
        ],
        preplaced: [
          { tier: 4, x: 187, y: 255.8 },
          { tier: 1, x: 312, y: 401.8 }
        ],
        goals: [
          { type: 'fruit', target: 5, count: 1, current: 0 },
          { type: 'fruit', target: 2, count: 3, current: 0 }
        ]
      },
      {
        id: 4,
        maxSpawnTier: 5,
        orbitRadius: 250,
        warningLimit: 200,
        launcherSpeed: 1.1,
        maxSpawns: 25,
        starScores: [700, 1400, 2400],
        centers: [
          { x: 260, y: 350 }
        ],
        portalPairs: [
          [
            { x1: 113, y1: 299.95, x2: 112, y2: 399.95 },
            { x1: 422, y1: 303.95, x2: 422, y2: 403.95 }
          ],
          [
            { x1: 329, y1: 220.95, x2: 198, y2: 219.95 },
            { x1: 211, y1: 470.95, x2: 335, y2: 470.95 }
          ]
        ],
        rails: [
          { x1: 335, y1: 469.8, x2: 423, y2: 405.8 },
          { x1: 212, y1: 470.8, x2: 111, y2: 400.8 },
          { x1: 113, y1: 295.8, x2: 196, y2: 219.8 },
          { x1: 421, y1: 301.8, x2: 330, y2: 221.8 }
        ],
        preplaced: [
          { tier: 5, x: 215, y: 305.8 }
        ],
        goals: [
          { type: 'fruit', target: 6, count: 1, current: 0 },
          { type: 'fruit', target: 5, count: 1, current: 0 }
        ]
      },
      {
        id: 5,
        maxSpawnTier: 2,
        orbitPath: 'figure8',
        orbitA: 180,   // bề ngang mỗi thùy của số 8
        orbitB: 250,   // chiều cao từ thùy trên xuống thùy dưới
        orbitRadius: 250, // fallback nếu cần
        warningLimit: 70,
        launcherSpeed: 0.9,
        maxSpawns: 15,
        starScores: [700, 1400, 2300],
        centers: [
          { x: 260, y: 190 },
          { x: 260, y: 490 }
        ],
                preplaced: [
          // Thùy trên
          { tier: 0, x: 248, y: 178 }, { tier: 0, x: 272, y: 178 }, { tier: 2, x: 260, y: 204 },
          // Thùy dưới
          { tier: 2, x: 248, y: 478 }, { tier: 1, x: 272, y: 478 }, { tier: 0, x: 260, y: 504 }
        ],
        goals: [
          { type: 'fruit', target: 4, count: 2, current: 0 }
        ]
      },
      {
        id: 6,
        maxSpawnTier: 2,
        orbitRadius: 235,
        warningLimit: 200,
        launcherSpeed: 1, 
        maxSpawns: 18,
        starScores: [500, 1000, 1800],
        blackHoles: [
          { x: 161, y: 240.8, radius: 20 },
          { x: 366, y: 244.8, radius: 20 },
          { x: 188, y: 432.8, radius: 25 },
          { x: 347, y: 432.8, radius: 25 }
        ],
        shrinkZones: [
          { x1: 192, y1: 244.3, x2: 334, y2: 244.3 }
        ],
        rails: [
          { x1: 161, y1: 262.95, x2: 192, y2: 405.95 },
          { x1: 375, y1: 265.95, x2: 352, y2: 405.95 }
        ],
        goals: [
          { type: 'fruit', target: 4, count: 1, current: 0 }
        ]
      },
      {
        id: 7,
        maxSpawnTier: 2,
        orbitRadius: 200,
        warningLimit: 170,
        launcherSpeed: 0.95,
        maxSpawns: 15,
        starScores: [100, 200, 300],
        blackHoles: [
          { x: 302, y: 424.8, radius: 25 }
        ],
        shrinkZones: [
          { x1: 141, y1: 292.8, x2: 141, y2: 404.8 }
        ],
        portalPairs: [
          [
            { x1: 165, y1: 245.45, x2: 249, y2: 245.45 },
            { x1: 358.5, y1: 381.95, x2: 358.5, y2: 460.95 }
          ]
        ],
        rails: [
          { x1: 290, y1: 223.8, x2: 398, y2: 324.8 }
        ],
        preplaced: [
          { tier: 0, x: 342, y: 246.8 },
          { tier: 1, x: 369, y: 266.8 },
          { tier: 2, x: 259, y: 325.8 }
        ],
        goals: [
          { type: 'fruit', target: 2, count: 2, current: 0 },
          { type: 'fruit', target: 4, count: 1, current: 0 }
        ]
      },
      {
        id: 8,
        maxSpawnTier: 4,
        orbitRadius: 250,
        warningLimit: 200,
        launcherSpeed: 1,
        maxSpawns: 25,
        starScores: [500, 1000, 1800],
        portalPairs: [
          [
            { x1: 385, y1: 218.95, x2: 422, y2: 277.95 },
            { x1: 120, y1: 378.95, x2: 161, y2: 435.95 }
          ],
          [
            { x1: 144, y1: 208.95, x2: 102, y2: 264.95 },
            { x1: 353, y1: 452.95, x2: 395, y2: 396.95 }
          ]
        ],
        ringGates: [
          { cx: 260, cy: 336.8, r: 160, gaps: [{ from: 257.5, to: 282.5 }, { from: 77.5, to: 102.5 }] }
        ],
        preplaced: [
          { tier: 2, x: 228, y: 319.8 },
          { tier: 5, x: 306, y: 323.8 }
        ],
        goals: [
          { type: 'fruit', target: 7, count: 1, current: 0 },
          { type: 'fruit', target: 3, count: 1, current: 0 }
        ]
      },
      {
        id: 9,
        maxSpawnTier: 5,
        orbitRadius: 248,
        warningLimit: 200,
        launcherSpeed: 1.1,
        maxSpawns: 65,
        starScores: [600, 1200, 2000],
        centers: [
          { x: 260, y: 360 }
        ],
        shrinkZones: [
          { x1: 100, y1: 210, x2: 250, y2: 210 }
        ],
        goals: [
          { type: 'fruit', target: 7, count: 1, current: 0 },
          { type: 'fruit', target: 4, count: 2, current: 0 }
        ]
      },
    ];
    // <<LEVEL_EDITOR:END>>

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
   * Sync fruit goals by counting bodies currently alive on the field.
   * A goal is satisfied only while the required fruits exist simultaneously.
   * If they merge away, the goal drops back — no ratcheting.
   * @param {Array} bodies - live physics bodies from PhysicsEngine
   */
  syncFruitGoals(bodies) {
    const lvl = this.getCurrentLevel();
    lvl.goals.forEach(g => {
      if (g.type === 'fruit') {
        const liveCount = bodies.filter(b => b.tier === g.target && !b.merged).length;
        g.current = Math.min(liveCount, g.count);
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
