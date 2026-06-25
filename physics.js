/**
 * Planet Suika - Verlet Physics Engine (Squash & Stretch Springs & Fruit Drawing)
 */

// =====================================================
// GAME MODE: 'fruit' = original fruit art, 'custom' = face photos
// =====================================================
let GAME_MODE = localStorage.getItem('planet_merge_game_mode') || 'fruit';

// =====================================================
// THAY ANH TUY CHINH O DAY
// Dat file anh cung thu muc voi index.html
// De trong '' = dung hoa qua goc cho tier do
// =====================================================
const CUSTOM_IMAGE_PATHS = [
  'Phong.png',   // Tier 0 (qua nho nhat)
  'Ngoc.png',    // Tier 1
  'Me.png',   // Tier 2 
  'Huy.png',     // Tier 3
  'Giang.png',   // Tier 4
  'Thai.png',     // Tier 5
  'A Tuan Anh.png',  // Tier 6
  'C Phuong.png',   // Tier 7
  'tier4.jpg',            // Tier 8 (de trong)
  'C bac.png',            // Tier 9 (de trong)
  'A linh.png',            // Tier 10 (qua lon nhat - de trong)
];

const _mckImage = new Image();
_mckImage.src = 'mck.png';

const _customImages = [];
CUSTOM_IMAGE_PATHS.forEach((path, i) => {
  if (path) { _customImages[i] = new Image(); _customImages[i].src = path; }
});

// Render a face photo cropped to the fruit's circle.
// Uses object-fit:cover semantics (shorter dimension fills diameter) and
// counter-rotates so the face stays upright while the fruit spins.
function _drawFaceCircle(ctx, img, x, y, r, angle, fallbackColor) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-angle);
  if (img.complete && img.naturalWidth > 0) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = (2 * r) / Math.min(iw, ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, x - dw / 2, y - r, dw, dh);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fill();
  }
}

class PhysicsEngine {
  constructor(cx, cy, planetRadius) {
    this.cx = cx;
    this.cy = cy;
    this.planetRadius = planetRadius;
    // Gravity wells. Default: a single well at the canvas center.
    // A level may replace this with several wells (e.g. 3) — each fruit is pulled to its nearest well.
    this.centers = [{ x: cx, y: cy }];
    this.blackHoles = []; // Mỗi entry: { x, y, radius } — hút và hủy fruit
    this.shrinkZones = []; // Mỗi entry: { x, y, width, height } — giảm tier 1 bậc khi đi qua
    this.portalPairs = []; // Mỗi entry: [portalA, portalB] — teleport fruit, redirect về core
    this.bodies = [];
    this.gravity = 0.038; // Tăng trọng lực để nẩy nhanh dứt khoát
    this.damping = 0.985; // Tăng quán tính (bớt ma sát không khí) để quả bay lướt mượt mà hơn
    this.warningLimit = 255; // Expanded warning limit
    this.mergeAnimations = [];
    this.isPerfMode = localStorage.getItem('planet_merge_perf_mode') === 'true';
  }

  clear() {
    this.bodies = [];
    this.mergeAnimations = [];
  }

  // Return the gravity well nearest to a point (used for multi-center levels)
  getNearestCenter(x, y) {
    let best = this.centers[0];
    let bestSq = Infinity;
    for (const c of this.centers) {
      const dx = x - c.x;
      const dy = y - c.y;
      const sq = dx * dx + dy * dy;
      if (sq < bestSq) { bestSq = sq; best = c; }
    }
    return best;
  }

  addBody(x, y, tier) {
    const config = FRUIT_CONFIGS[tier];
    const body = {
      id: Math.random(),
      x: x,
      y: y,
      px: x,
      py: y,
      r: config.r,
      tier: tier,
      
      // Rotation & self-spinning
      angle: Math.random() * Math.PI * 2,
      idleSpin: (Math.random() > 0.5 ? 1 : -1) * (0.003 + Math.random() * 0.005) * (20 / config.r),

      // Bouncy spawning animation
      scale: 0.1,
      targetScale: 1.15, // Overshoot for juicy pop feel
      
      // Squash & Stretch Spring model
      deformX: 1.0,
      deformY: 1.0,
      deformVelX: 0,
      deformVelY: 0,
      
      merged: false,
      blinkTimer: 80 + Math.random() * 150,
      blinking: false,
      
      expression: 'normal', // 'normal', 'surprised'
      expressionTimer: 0,
      isSettled: false, // prevent false warning alerts when launched from orbit
      growthPhase: false,
      crossedBoundary: false
    };
    this.bodies.push(body);
    return body;
  }

  update(dt, onMergeCallback, onCollisionCallback, onBoundaryCrossCallback) {
    const springK = 0.22; // spring stiffness (snappy bounce)
    const springDamping = 0.76; // decay factor (stabilizes faster)

    // 1. Verlet Integration & Spring Dynamics
    for (const b of this.bodies) {
      // Each body is governed by its nearest gravity well (single-well levels just use the one center)
      const _c = (this.centers.length > 1) ? this.getNearestCenter(b.x, b.y) : this.centers[0];
      const ccx = _c.x;
      const ccy = _c.y;

      // 1a. Scale animation with juicy overshoot bounce
      if (b.scale < b.targetScale) {
        b.scale += (b.targetScale - b.scale) * 0.15 * dt;
        if (b.scale >= 1.05 && b.targetScale > 1.0) {
          b.targetScale = 1.0;
        }
      } else if (b.scale > b.targetScale) {
        b.scale += (b.targetScale - b.scale) * 0.10 * dt;
      }

      // Clear growthPhase when scale > 0.95
      if (b.growthPhase && b.scale > 0.95) {
        b.growthPhase = false;
      }

      // 1b. Merge delay for preplaced fruits
      if (b.mergeDelayFrames > 0) {
        b.mergeDelayFrames = Math.max(0, b.mergeDelayFrames - dt);
      }

      // 1c. Expression timer decay
      if (b.expressionTimer > 0) {
        b.expressionTimer -= dt;
        if (b.expressionTimer <= 0) {
          b.expression = 'normal';
        }
      }

      // 1c. Eye Blinking timer
      b.blinkTimer -= dt;
      if (b.blinkTimer <= 0) {
        if (b.blinking) {
          b.blinking = false;
          b.blinkTimer = 180 + Math.random() * 250;
        } else {
          b.blinking = true;
          b.blinkTimer = 8;
        }
      }

      // 1d. Squash & Stretch springs
      const fx = (1.0 - b.deformX) * springK;
      b.deformVelX = (b.deformVelX + fx) * springDamping;
      b.deformX += b.deformVelX * dt;

      const fy = (1.0 - b.deformY) * springK;
      b.deformVelY = (b.deformVelY + fy) * springDamping;
      b.deformY += b.deformVelY * dt;

      // 1e. Radial Gravity & Tangent Damping to stabilize piles
      const dx = b.x - ccx;
      const dy = b.y - ccy;
      const dist = Math.sqrt(dx*dx + dy*dy);

      // First-fruit crossing state machine (radial-velocity-sign detection):
      // fstate 0=approaching, 1=crossed(moving away), 2=returning
      if (b.isFirstFruit && !b.isSettled && dist > 0.1) {
        const rx = dx / dist;
        const ry = dy / dist;
        const vr_now = (b.x - b.px) * rx + (b.y - b.py) * ry; // +ve = moving away from center
        if (b._fstate === undefined) {
          b._fstate = 0;
          b._vrPrev = vr_now;
        } else if (b._fstate === 0 && b._vrPrev < 0 && vr_now >= 0) {
          b._fstate = 1; // just crossed center going outward
        } else if (b._fstate === 1 && b._vrPrev > 0 && vr_now <= 0) {
          b._fstate = 2; // turned around, now returning toward center
        }
        b._vrPrev = vr_now;
      }

      let ax = 0;
      let ay = 0;
      if (dist > 0.1) {
        // Lực hút tăng dần khi càng sát tâm (càng sát tâm rơi càng nhanh giống rơi tự do)
        // Tăng trọng lực đối với quả đang bay (chưa settled) để tạo cảm giác gia tốc rõ rệt hơn
        const gravMult = b.isSettled ? 1.0 : 1.7;
        const gravForce = this.gravity * gravMult * Math.max(0.5, Math.min(2.0, 1.8 - dist / 180));
        ax = -(dx / dist) * gravForce;
        ay = -(dy / dist) * gravForce;
      }

      // Tăng ma sát/giảm quán tính khi đã dừng lại (b.isSettled = true) giúp ít di chuyển/bị trôi (Tăng nhẹ để giữ quán tính tự nhiên)
      // Tắt damping cho quả đầu tiên sau khi qua tâm để bảo toàn năng lượng → tốc độ quay về bằng tốc độ đi qua
      const currentDamping = (b.isFirstFruit && b._fstate >= 1 && !b.isSettled)
        ? 0.95
        : (b.isSettled ? 0.945 : this.damping);
      let vx = (b.x - b.px) * currentDamping;
      let vy = (b.y - b.py) * currentDamping;

      // Apply heavy tangent damping to prevent swirling/rotating around the center
      if (dist > 0.1) {
        const rx = dx / dist;
        const ry = dy / dist;
        // Project velocity onto radial and tangent axes
        const vr = vx * rx + vy * ry;
        let vt = vx * (-ry) + vy * rx;
        
        // Damp tangent component (Tăng nhẹ từ 0.65 lên 0.72 để trượt xoay quanh tâm mượt mà hơn)
        const tDamp = b.isSettled ? 0.72 : 0.88;
        vt *= tDamp;
        
        // Reconstruct velocity
        vx = vr * rx - vt * ry;
        vy = vr * ry + vt * rx;
      }

      // Thêm velocity freeze khi quả settled (bỏ qua khi đang trong growthPhase để có thể di chuyển và lọt khe):
      // Chỉ áp dụng khi cách xa tâm (dist >= 15) để quả có thể tự do đi vào đúng tâm.
      // Tăng ngưỡng tốc độ đóng băng lên 0.15 để khóa vị trí tĩnh dứt khoát hơn.
      if (b.isSettled && !b.growthPhase && dist >= 15) {
        const speed = Math.sqrt(vx*vx + vy*vy);
        if (speed < 0.15) { vx = 0; vy = 0; } // "chốt" hẳn nhanh hơn
      }

      // Pre-snap: quả đầu tiên đang về tâm, snap TRƯỚC khi update vị trí → không nhô qua tâm
      if (b.isFirstFruit && this.centers.length === 1 && b._fstate === 2 && !b.isSettled && dist < 5) {
        b.x = ccx; b.y = ccy; b.px = ccx; b.py = ccy;
        b.isSettled = true;
        continue;
      }

      b.px = b.x;
      b.py = b.y;

      b.x += vx + ax * dt;
      b.y += vy + ay * dt;

      // Phát hiện chạm viền (warningLimit) để kích hoạt hiệu ứng rơi vào nước
      if (!b.isSettled && !b.crossedBoundary) {
        const checkDx = b.x - ccx;
        const checkDy = b.y - ccy;
        const checkDist = Math.sqrt(checkDx * checkDx + checkDy * checkDy);
        if (checkDist <= this.warningLimit) {
          b.crossedBoundary = true;
          if (onBoundaryCrossCallback) {
            onBoundaryCrossCallback(b.x, b.y, FRUIT_CONFIGS[b.tier].color);
          }
        }
      }

      // Calculate actual speed of this step
      const actualVx = b.x - b.px;
      const actualVy = b.y - b.py;
      const actualSpeed = Math.sqrt(actualVx * actualVx + actualVy * actualVy);

      // Hút chặt và khóa đúng tâm nếu fruit đã đến rất sát tâm hình tròn (postDist < 1.6) và tốc độ đã đủ chậm (actualSpeed < 0.15)
      // Điều này cho phép quả đi qua tâm (overshoot) khi có tốc độ cao, sau đó dao động chậm dần rồi mới khóa cứng để có cảm giác quán tính thật.
      const postDx = b.x - ccx;
      const postDy = b.y - ccy;
      const postDist = Math.sqrt(postDx * postDx + postDy * postDy);
      if (postDist < 1.6 && actualSpeed < 0.15) {
        b.x = ccx;
        b.y = ccy;
        b.px = ccx;
        b.py = ccy;
        b.isSettled = true;
      }

      // Quả đầu tiên quay về tâm: snap dừng hẳn (tốc độ quay về = tốc độ đi qua, bảo toàn năng lượng nhờ damping=1)
      if (b.isFirstFruit && this.centers.length === 1 && b._fstate === 2 && !b.isSettled && postDist < 10) {
        b.x = ccx;
        b.y = ccy;
        b.px = ccx;
        b.py = ccy;
        b.isSettled = true;
      }

      // Update rotation angle (idle spin + rolling motion based on tangential displacement)
      let roll = 0;
      if (actualSpeed > 0.01 && dist > 0.1) {
        const tangentialSpeed = (dx * actualVy - dy * actualVx) / dist;
        roll = tangentialSpeed / b.r;
      }
      b.angle = ((b.angle || 0) + (b.idleSpin + roll) * dt) % (Math.PI * 2);

      // Settle if inside the warning limit (safe zone) AND speed is low to allow overshoot anim to play
      // Loại quả đầu tiên: nó có cơ chế settle riêng (snap tâm), không để general check can thiệp
      if (!b.isSettled && !b.isFirstFruit) {
        const dx = b.x - ccx;
        const dy = b.y - ccy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const speed = Math.sqrt(vx*vx + vy*vy);
        if (dist < this.warningLimit - 10 && speed < 0.15) {
          b.isSettled = true;
        }
      }
    }

    // ── Black Hole Absorption ──────────────────────────────────────────────
    // Sau gravity step, trước collision — lặp ngược để splice không bỏ sót body
    if (this.blackHoles && this.blackHoles.length > 0) {
      for (let i = this.bodies.length - 1; i >= 0; i--) {
        const b = this.bodies[i];
        for (const bh of this.blackHoles) {
          const bdx = b.x - bh.x;
          const bdy = b.y - bh.y;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          const effectiveR = b.r * Math.min(1, b.scale);
          if (bdist < bh.radius + effectiveR) {
            if (this._onAbsorb) this._onAbsorb(bh.x, bh.y);
            this.bodies.splice(i, 1);
            break;
          }
        }
      }
    }
    // ── End Black Hole Absorption ──────────────────────────────────────────

    // ── Shrink Zone Check ──────────────────────────────────────────────────
    // Mỗi frame kiểm tra từng body với từng zone hình chữ nhật.
    // inShrinkZone flag ngăn shrink nhiều lần trong 1 lần đi qua; reset khi ra khỏi zone.
    if (this.shrinkZones && this.shrinkZones.length > 0) {
      for (const b of this.bodies) {
        let insideAny = false;
        for (const zone of this.shrinkZones) {
          if (b.x >= zone.x && b.x <= zone.x + zone.width &&
              b.y >= zone.y && b.y <= zone.y + zone.height) {
            insideAny = true;
            if (!b.inShrinkZone) {
              b.inShrinkZone = true;
              if (b.tier > 0 && this._onShrink) this._onShrink(b);
            }
            break;
          }
        }
        if (!insideAny) b.inShrinkZone = false;
      }
    }
    // ── End Shrink Zone Check ──────────────────────────────────────────────

    // ── Portal Check ───────────────────────────────────────────────────────
    // Khi THÂN quả chạm 1 trong 2 portal của cặp (không cần tâm đi qua chính giữa) →
    // teleport sang portal kia, redirect velocity về gravity core (giữ tốc độ).
    // Dùng kiểm tra giao nhau hình tròn–chữ nhật: lấy điểm gần nhất trên cổng tới
    // tâm quả, nếu khoảng cách ≤ bán kính quả thì coi là đã chạm. portalCooldown ngăn ping-pong.
    if (this.portalPairs && this.portalPairs.length > 0) {
      for (const b of this.bodies) {
        if (b.portalCooldown > 0) { b.portalCooldown -= dt; continue; }
        const er = b.r * Math.min(1, b.scale || 1); // bán kính hiệu dụng (tính cả scale lúc sinh)
        for (const pair of this.portalPairs) {
          for (let pi = 0; pi < 2; pi++) {
            const entry = pair[pi];
            const exit  = pair[1 - pi];
            // Điểm trên hình chữ nhật cổng gần tâm quả nhất
            const nx = Math.max(entry.x, Math.min(b.x, entry.x + entry.width));
            const ny = Math.max(entry.y, Math.min(b.y, entry.y + entry.height));
            const gdx = b.x - nx, gdy = b.y - ny;
            if (gdx * gdx + gdy * gdy <= er * er) {
              // Tính tốc độ hiện tại (Verlet: v = pos - prevPos)
              const vx = b.x - b.px;
              const vy = b.y - b.py;
              const speed = Math.sqrt(vx * vx + vy * vy) || 2;

              // Teleport sang center của exit portal
              const ex = exit.x + exit.width  / 2;
              const ey = exit.y + exit.height / 2;
              b.x  = ex;
              b.y  = ey;

              // Hướng velocity vào gravity core gần nhất
              const core = this.getNearestCenter(ex, ey);
              const ddx = core.x - ex;
              const ddy = core.y - ey;
              const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
              b.px = b.x - (ddx / dlen) * speed;
              b.py = b.y - (ddy / dlen) * speed;

              b.isSettled = false;
              b.portalCooldown = 20; // ~0.33s buffer
              b.expression = 'surprised';
              b.expressionTimer = 35;
              if (this._onPortal) this._onPortal(ex, ey);
              break;
            }
          }
        }
      }
    }
    // ── End Portal Check ───────────────────────────────────────────────────

    // 2. Resolve Constraints & Collisions
    const iterations = this.isPerfMode ? 5 : 8;
    const mergesToProcess = [];

    for (let step = 0; step < iterations; step++) {
      // 2a. Fruit-to-Fruit Collisions
      for (let i = 0; i < this.bodies.length; i++) {
        const b1 = this.bodies[i];
        for (let j = i + 1; j < this.bodies.length; j++) {
          const b2 = this.bodies[j];

          const r1 = b1.r * Math.min(1, b1.scale);
          const r2 = b2.r * Math.min(1, b2.scale);
          const target = r1 + r2;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const distSq = dx*dx + dy*dy;
          const targetSq = target * target;

          if (distSq < targetSq) {
            const dist = Math.sqrt(distSq);
            let nx = dx;
            let ny = dy;
            let curDist = dist;
            if (curDist === 0) {
              nx = Math.random() - 0.5;
              ny = Math.random() - 0.5;
              curDist = Math.sqrt(nx*nx + ny*ny);
            }

            const overlap = target - curDist;
            const penetration = overlap * 0.42;
            const pushX = (nx / curDist) * penetration;
            const pushY = (ny / curDist) * penetration;

            // Nếu b đang grow, giảm push lực đi:
            const pushMult1 = b1.growthPhase ? b1.scale : 1.0;
            const pushMult2 = b2.growthPhase ? b2.scale : 1.0;

            // Quả càng to thì khối lượng càng lớn, tác động lực lên quả khác càng nhiều
            // Khối lượng tỉ lệ với kích thước thực tế (bán kính nhân tỷ lệ)
            const m1 = b1.r * b1.scale;
            const m2 = b2.r * b2.scale;
            const mTotal = m1 + m2;
            
            // Tỷ lệ đẩy tỉ lệ nghịch với khối lượng (quả nặng hơn bị đẩy ít đi, quả nhẹ hơn bị đẩy nhiều hơn)
            const ratio1 = (m2 / mTotal) * 2;
            const ratio2 = (m1 / mTotal) * 2;

            const pushX1 = pushX * ratio1 * pushMult1;
            const pushY1 = pushY * ratio1 * pushMult1;
            const pushX2 = pushX * ratio2 * pushMult2;
            const pushY2 = pushY * ratio2 * pushMult2;

            b1.x -= pushX1;
            b1.y -= pushY1;
            b2.x += pushX2;
            b2.y += pushY2;

            // Dampen the velocity gained from collision push to prevent explosive merges.
            // Settled fruits use higher factor (0.97) → only 3% of push becomes velocity → ít trôi hơn
            // Flying fruits use 0.88 → 12% becomes velocity → phản lực va chạm tự nhiên
            const velCarry = (b1.isSettled || b2.isSettled) ? 0.97 : 0.88;
            b1.px -= pushX1 * velCarry;
            b1.py -= pushY1 * velCarry;
            b2.px += pushX2 * velCarry;
            b2.py += pushY2 * velCarry;

            // Settle on contact
            if (b1.isSettled || b2.isSettled) {
              b1.isSettled = true;
              b2.isSettled = true;
            }

            // Apply Squash deform based on impact/overlap
            if (step === 0 && overlap > 0.65) {
              const normalX = nx / curDist;
              const normalY = ny / curDist;
              
              // squash proportional to size and penetration, softer impact
              const deformMag = Math.min(0.16, (overlap / target) * 0.28);
              
              // Compress along normal axis, expand perpendicular
              b1.deformVelX -= Math.abs(normalX) * deformMag * 0.28;
              b1.deformVelY += Math.abs(normalX) * deformMag * 0.28;
              b1.deformVelY -= Math.abs(normalY) * deformMag * 0.28;
              b1.deformVelX += Math.abs(normalY) * deformMag * 0.28;
              
              b2.deformVelX -= Math.abs(normalX) * deformMag * 0.28;
              b2.deformVelY += Math.abs(normalX) * deformMag * 0.28;
              b2.deformVelY -= Math.abs(normalY) * deformMag * 0.28;
              b2.deformVelX += Math.abs(normalY) * deformMag * 0.28;
              
              // Play ASMR plop collision sound with rate limiting (150ms)
              const nowTime = performance.now();
              if (overlap > 0.85 && onCollisionCallback) {
                if (!b1.lastCollisionTime || nowTime - b1.lastCollisionTime > 150) {
                  b1.lastCollisionTime = nowTime;
                  b2.lastCollisionTime = nowTime;
                  onCollisionCallback(b1.r / 86); // ratio relative to Watermelon size
                  if (navigator.vibrate) navigator.vibrate(8); // Rung va chạm nhẹ
                }
              }
            }

          }

          // Merge zone: slightly larger than collision radius so fruits feel responsive
          // even when visually just touching (not overlapping in physics)
          if (step === iterations - 1) {
            const MERGE_TOLERANCE = 2;
            const mergeDist = r1 + r2 + MERGE_TOLERANCE;
            if (distSq < mergeDist * mergeDist) {
              if (b1.tier === b2.tier && !b1.merged && !b2.merged &&
                  !(b1.mergeDelayFrames > 0) && !(b2.mergeDelayFrames > 0)) {
                b1.merged = true;
                b2.merged = true;
                mergesToProcess.push({ b1, b2 });
              }
            }
          }
        }
      }
    }

    // 3. Process merges
    const mergedPairs = new Set();
    for (const merge of mergesToProcess) {
      if (mergedPairs.has(merge.b1) || mergedPairs.has(merge.b2)) continue;
      
      const idx1 = this.bodies.indexOf(merge.b1);
      const idx2 = this.bodies.indexOf(merge.b2);

      if (idx1 !== -1 && idx2 !== -1) {
        mergedPairs.add(merge.b1);
        mergedPairs.add(merge.b2);

        const b1 = this.bodies[idx1];
        const b2 = this.bodies[idx2];

        this.bodies.splice(Math.max(idx1, idx2), 1);
        this.bodies.splice(Math.min(idx1, idx2), 1);

        const nextTier = b1.tier + 1;
        const midX = (b1.x + b2.x) / 2;
        const midY = (b1.y + b2.y) / 2;

        // Start a merge animation instead of immediate creation
        this.mergeAnimations.push({
          x1: b1.x, y1: b1.y,
          x2: b2.x, y2: b2.y,
          angle1: b1.angle || 0,
          angle2: b2.angle || 0,
          midX: midX, midY: midY,
          tier: b1.tier,
          nextTier: nextTier,
          progress: 0
        });
      }
    }

    // Update active merge animations
    for (let i = this.mergeAnimations.length - 1; i >= 0; i--) {
      const anim = this.mergeAnimations[i];
      // Progress from 0.0 to 1.0
      anim.progress += 0.085 * dt;
      if (anim.progress >= 1.0) {
        onMergeCallback(anim.midX, anim.midY, anim.tier, anim.nextTier);
        this.mergeAnimations.splice(i, 1);
      }
    }
  }

  // Draw planet and fruits
  draw(ctx) {
    for (const b of this.bodies) {
      // Apply Squash and Stretch locally using translation matrix
      ctx.save();
      ctx.translate(b.x, b.y);
      // Scale by physical base size * visual scaling * squash factor
      ctx.scale(b.scale * b.deformX, b.scale * b.deformY);
      // Rotate the fruit inside its squashed boundary
      ctx.rotate(b.angle || 0);
      
      this.drawFruitBody(ctx, 0, 0, b.r, b.tier, b.angle || 0);

      const _isCustomPhoto = GAME_MODE === 'custom' && _customImages[b.tier];
      if (!_isCustomPhoto && b.r > 5 && b.tier !== 10 && b.tier !== 5 && b.tier !== 4 && b.tier !== 3 && b.tier !== 2 && b.tier !== 1) {
        this.drawFace(ctx, 0, 0, b.r, b.blinking, b.expression, b.tier);
      }
      
      ctx.restore();
    }

    // Draw active merge animations (sliding and fusing together)
    for (const anim of this.mergeAnimations) {
      const config = FRUIT_CONFIGS[anim.tier];
      
      // Calculate animated position for Fruit 1
      const x1 = anim.x1 + (anim.midX - anim.x1) * anim.progress;
      const y1 = anim.y1 + (anim.midY - anim.y1) * anim.progress;
      const scale1 = 1.0 - anim.progress; // Shrink as they approach the center
      const rotAngle1 = (anim.angle1 !== undefined) ? (anim.angle1 + anim.progress * 0.05) : 0;

      ctx.save();
      ctx.translate(x1, y1);
      ctx.scale(scale1, scale1);
      ctx.rotate(rotAngle1);
      this.drawFruitBody(ctx, 0, 0, config.r, anim.tier, rotAngle1);
      if (config.r > 5 && anim.tier !== 5 && anim.tier !== 4 && anim.tier !== 3 && anim.tier !== 2 && anim.tier !== 1) {
        this.drawFace(ctx, 0, 0, config.r, false, 'normal', anim.tier);
      }
      ctx.restore();

      // Calculate animated position for Fruit 2
      const x2 = anim.x2 + (anim.midX - anim.x2) * anim.progress;
      const y2 = anim.y2 + (anim.midY - anim.y2) * anim.progress;
      const scale2 = 1.0 - anim.progress; // Shrink as they approach the center
      const rotAngle2 = (anim.angle2 !== undefined) ? (anim.angle2 + anim.progress * 0.05) : 0;

      ctx.save();
      ctx.translate(x2, y2);
      ctx.scale(scale2, scale2);
      ctx.rotate(rotAngle2);
      this.drawFruitBody(ctx, 0, 0, config.r, anim.tier, rotAngle2);
      if (config.r > 5 && anim.tier !== 5 && anim.tier !== 4 && anim.tier !== 3 && anim.tier !== 2 && anim.tier !== 1) {
        this.drawFace(ctx, 0, 0, config.r, false, 'normal', anim.tier);
      }
      ctx.restore();
    }
  }

  // Draw fruit shape (circles, teardrops, bells, clusters) with premium white outlines and 3D glossy shading
  drawFruitBody(ctx, x, y, r, tier, angle = 0) {
    const config = FRUIT_CONFIGS[tier];
    ctx.save();
    
    // Establish shadow (soft ambient occlusion or dynamic glowing aura)
    if (!this.isPerfMode) {
      if (tier >= 8) {
        const pulse = 10 + Math.sin(Date.now() / 150) * 4;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = pulse;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowColor = 'rgba(115, 95, 145, 0.22)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
      }
    }

    // Face photo overrides (Custom mode only)
    if (GAME_MODE === 'custom' && _customImages[tier]) {
      _drawFaceCircle(ctx, _customImages[tier], x, y, r, angle, FRUIT_CONFIGS[tier].color);
      ctx.restore();
      return;
    }

    // Special rendering for Grape (tier 2) to look extremely cute, premium and bubbly
    if (tier === 2) {
      const bulbRad = r * 0.43;
      const bulbs = [
        {ox: -r*0.28, oy: -r*0.28}, {ox: r*0.28, oy: -r*0.28},
        {ox: -r*0.35, oy: r*0.18}, {ox: r*0.35, oy: r*0.18},
        {ox: 0, oy: r*0.48}, {ox: 0, oy: -r*0.42}
      ];

      const whiteOutline = Math.max(2.5, r * 0.08);

      // 1. Draw backing white outline silhouette (slightly larger bulbs)
      ctx.fillStyle = '#ffffff';
      bulbs.forEach(b => {
        ctx.beginPath();
        ctx.arc(x + b.ox, y + b.oy, bulbRad + whiteOutline, 0, Math.PI*2);
        ctx.fill();
      });

      // Reset shadow for actual body
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 2. Draw actual bulbs with grape gradient and individual gloss highlights
      bulbs.forEach(b => {
        ctx.beginPath();
        ctx.arc(x + b.ox, y + b.oy, bulbRad, 0, Math.PI*2);

        // Advanced multi-stop radial gradient for 3D sphere illusion
        const grad = ctx.createRadialGradient(
          x + b.ox - bulbRad * 0.25, y + b.oy - bulbRad * 0.25, bulbRad * 0.04,
          x + b.ox, y + b.oy, bulbRad
        );
        grad.addColorStop(0, '#ffffff'); // specular highlight source
        grad.addColorStop(0.15, config.highlight);
        grad.addColorStop(0.65, config.color);
        grad.addColorStop(0.92, this.darkenColor(config.color, 35));
        grad.addColorStop(1.0, this.darkenColor(config.color, 45));

        ctx.fillStyle = grad;
        ctx.fill();

        // Draw specular glares and rim lights with angle cancelled out
        ctx.save();
        ctx.translate(x + b.ox, y + b.oy);
        ctx.rotate(-angle);

        // Specular gloss capsule on each grape bulb (pointing top-left)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.ellipse(
          -bulbRad * 0.32, -bulbRad * 0.32,
          bulbRad * 0.24, bulbRad * 0.12,
          -Math.PI / 4, 0, Math.PI * 2
        );
        ctx.fill();

        // Specular secondary dot reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(
          -bulbRad * 0.12, -bulbRad * 0.48,
          bulbRad * 0.08, 0, Math.PI * 2
        );
        ctx.fill();

        // Rim light reflection on bottom-right of each grape bulb
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = Math.max(1, bulbRad * 0.08);
        ctx.beginPath();
        ctx.arc(
          0, 0,
          bulbRad - ctx.lineWidth * 0.5,
          0.12 * Math.PI, 0.38 * Math.PI
        );
        ctx.stroke();

        ctx.restore();
      });

      // 3. Draw thin dark-purple boundaries between bulbs to add cartoon depth
      ctx.strokeStyle = '#4b0082';
      ctx.lineWidth = Math.max(1.2, r * 0.04);
      bulbs.forEach(b => {
        ctx.beginPath();
        ctx.arc(x + b.ox, y + b.oy, bulbRad, 0, Math.PI*2);
        ctx.stroke();
      });

      // 4. Draw decorations (stem) on top
      this.drawFruitDecorations(ctx, x, y, r, tier);

      ctx.restore();
      return;
    }

    // Special rendering for tier 5 (Apple): draw mck.png image clipped to circle (Custom mode only)
    if (GAME_MODE === 'custom' && tier === 5) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      if (_mckImage.complete && _mckImage.naturalWidth > 0) {
        ctx.drawImage(_mckImage, x - r, y - r, r * 2, r * 2);
      } else {
        ctx.fillStyle = '#ffa502';
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Default shapes: Strawberry, Pear, or simple circles
    let customPath = false;
    
    if (tier === 1) { // Strawberry: teardrop shape
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.bezierCurveTo(x + r * 1.15, y - r * 0.8, x + r * 0.95, y + r * 0.65, x, y + r * 1.05);
      ctx.bezierCurveTo(x - r * 0.95, y + r * 0.65, x - r * 1.15, y - r * 0.8, x, y - r);
      ctx.closePath();
      customPath = true;
    } 
    else if (tier === 6) { // Pear: bell shape
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.bezierCurveTo(x + r * 0.45, y - r, x + r * 0.7, y - r * 0.25, x + r * 0.9, y + r * 0.4);
      ctx.bezierCurveTo(x + r * 0.9, y + r * 1.02, x - r * 0.9, y + r * 1.02, x - r * 0.9, y + r * 0.4);
      ctx.bezierCurveTo(x - r * 0.7, y - r * 0.25, x - r * 0.45, y - r, x, y - r);
      ctx.closePath();
      customPath = true;
    }

    // Rich multi-stop radial gradient for spherical lighting
    const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.04, x, y, r);
    grad.addColorStop(0, '#ffffff'); // bright light reflection center
    grad.addColorStop(0.15, config.highlight);
    grad.addColorStop(0.65, config.color);
    grad.addColorStop(0.92, this.darkenColor(config.color, 35));
    grad.addColorStop(1.0, this.darkenColor(config.color, 45));
    ctx.fillStyle = grad;

    if (customPath) {
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset shadow for outline
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw Premium White Outline BEFORE decorations
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2.5, r * 0.08);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    if (customPath) {
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw unique textures (decorations) on top
    this.drawFruitDecorations(ctx, x, y, r, tier);

    // --- STATIC 3D GLOSS & SHADOW SHADING ---
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle); // Cancel out rotation!

    // 1. Soft crescent dark shadow at the bottom-right (adds depth)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.arc(0, 0, r - ctx.lineWidth * 0.5, 0.1 * Math.PI, 0.4 * Math.PI);
    ctx.stroke();

    // 2. Crescent glass glare at the top-left (adds shiny wet look)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = r * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.76, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();

    // 3. Specular Highlight 1: Large Glossy Oval
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.24, r * 0.12, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 4. Specular Highlight 2: Tiny Secondary Reflection Dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(-r * 0.15, -r * 0.5, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 5. Soft Rim Light on bottom-right edge to simulate ambient bounce light
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = Math.max(1.2, r * 0.06);
    ctx.beginPath();
    ctx.arc(0, 0, r - ctx.lineWidth * 0.8, 0.12 * Math.PI, 0.38 * Math.PI);
    ctx.stroke();

    ctx.restore();
    
    ctx.restore();
  }


  drawFruitDecorations(ctx, x, y, r, tier) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = Math.max(1, r * 0.04);

    if (tier === 0) { // Cherry: green stem
      ctx.strokeStyle = '#27ae60';
      ctx.lineWidth = Math.max(1.8, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.85);
      ctx.quadraticCurveTo(x + r * 0.5, y - r * 1.5, x + r * 0.7, y - r * 1.6);
      ctx.stroke();
    } 
    else if (tier === 1) { // Strawberry: green cap + seeds
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.65, y - r * 0.6);
      ctx.lineTo(x, y - r * 0.95);
      ctx.lineTo(x + r * 0.65, y - r * 0.6);
      ctx.quadraticCurveTo(x, y - r * 0.35, x - r * 0.65, y - r * 0.6);
      ctx.fill();

      ctx.fillStyle = '#ffea79';
      const seeds = [
        [-0.45, -0.2], [0.45, -0.2], [-0.2, 0.25], [0.2, 0.25], [0, -0.05], [-0.15, 0.55], [0.15, 0.55]
      ];
      for (const s of seeds) {
        ctx.beginPath();
        ctx.arc(x + s[0] * r, y + s[1] * r, Math.max(0.6, r * 0.04), 0, Math.PI * 2);
        ctx.fill();
      }
    } 
    else if (tier === 2) { // Grape: small stem
      ctx.strokeStyle = '#4b0082';
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.9);
      ctx.lineTo(x, y - r * 1.3);
      ctx.stroke();
    } 
    else if (tier === 3) { // Dekopon (Orange): textured leaf
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.2, y - r * 0.95, r * 0.25, r * 0.12, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (tier === 5) { // Apple: Stem and leaf
      ctx.strokeStyle = '#4e3629'; 
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.85);
      ctx.quadraticCurveTo(x + r * 0.18, y - r * 1.15, x + r * 0.25, y - r * 1.25);
      ctx.stroke();

      ctx.fillStyle = '#2ecc71'; 
      ctx.beginPath();
      ctx.ellipse(x + r * 0.08, y - r * 1.08, r * 0.18, r * 0.09, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (tier === 7) { // Peach: Crease line
      ctx.strokeStyle = 'rgba(235, 75, 110, 0.32)';
      ctx.lineWidth = Math.max(1.8, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.95);
      ctx.quadraticCurveTo(x - r * 0.18, y, x, y + r * 0.95);
      ctx.stroke();
    } 
    else if (tier === 8) { // Pineapple: grid hatch
      ctx.strokeStyle = 'rgba(120, 85, 0, 0.25)';
      ctx.lineWidth = Math.max(1, r * 0.025);
      const grid = 6;
      for (let i = -grid; i <= grid; i++) {
        const offset = (i / grid) * r;
        ctx.beginPath();
        ctx.moveTo(x - r + offset, y - r);
        ctx.lineTo(x + r + offset, y + r);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x + r + offset, y - r);
        ctx.lineTo(x - r + offset, y + r);
        ctx.stroke();
      }
    } 
    else if (tier === 9) { // Melon: Web network
      ctx.strokeStyle = '#f3ffea';
      ctx.lineWidth = Math.max(1, r * 0.028);
      ctx.globalAlpha = 0.55;
      
      const arcs = 5;
      for (let i = 1; i < arcs; i++) {
        ctx.beginPath();
        ctx.arc(x, y, r * (i / arcs), 0, Math.PI * 2);
        ctx.stroke();
      }
      const lines = 12;
      for (let i = 0; i < lines; i++) {
        const angle = (i / lines) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    } 
    else if (tier === 10) { // Watermelon: dark green waves
      ctx.strokeStyle = '#0e6d2c';
      ctx.lineWidth = Math.max(3, r * 0.08);
      
      const drawStripe = (ox) => {
        ctx.beginPath();
        ctx.moveTo(x + ox, y - r * 0.9);
        ctx.bezierCurveTo(
          x + ox - r * 0.12, y - r * 0.4, 
          x + ox + r * 0.12, y + r * 0.4, 
          x + ox, y + r * 0.9
        );
        ctx.stroke();
      };
      
      drawStripe(-r * 0.6);
      drawStripe(-r * 0.3);
      drawStripe(0);
      drawStripe(r * 0.3);
      drawStripe(r * 0.6);
    }
    ctx.restore();
  }

  // Draw cute interactive facial expressions
  drawFace(ctx, x, y, r, blinking, expression, tier = 0) {
    ctx.save();
    
    const eyeSize = Math.max(1.8, r * 0.095);
    const eyeSpacing = r * 0.33;
    const eyeY = y - r * 0.06;
    
    ctx.fillStyle = '#261b4d';
    
    if (expression === 'surprised') {
      // Surprised: large round open eyes + small round O mouth
      ctx.strokeStyle = '#261b4d';
      ctx.lineWidth = Math.max(1.5, r * 0.06);
      ctx.fillStyle = '#ffffff';
      
      ctx.beginPath();
      ctx.arc(x - eyeSpacing, eyeY, eyeSize * 1.4, 0, Math.PI * 2);
      ctx.arc(x + eyeSpacing, eyeY, eyeSize * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Pupil dots
      ctx.fillStyle = '#261b4d';
      ctx.beginPath();
      ctx.arc(x - eyeSpacing, eyeY, eyeSize * 0.6, 0, Math.PI * 2);
      ctx.arc(x + eyeSpacing, eyeY, eyeSize * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Surprised small 'O' mouth
      ctx.fillStyle = '#261b4d';
      ctx.beginPath();
      ctx.arc(x, y + r * 0.12, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    else {
      // Normal expression - CUSTOMIZED BY TIER
      if (blinking) {
        // Blinking is simple closed curve eyes
        ctx.strokeStyle = '#261b4d';
        ctx.lineWidth = Math.max(1.5, r * 0.07);
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.arc(x - eyeSpacing, eyeY, eyeSize * 1.1, 0, Math.PI);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x + eyeSpacing, eyeY, eyeSize * 1.1, 0, Math.PI);
        ctx.stroke();
        
        // Smile mouth
        ctx.strokeStyle = '#261b4d';
        ctx.lineWidth = Math.max(1.5, r * 0.05);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y + r * 0.06, r * 0.12, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.stroke();
      } else {
        // Active expressions
        if (tier === 1) { // Strawberry: Angry (> <)
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2, r * 0.08);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Left eye '>'
          ctx.beginPath();
          ctx.moveTo(x - eyeSpacing - eyeSize, eyeY - eyeSize);
          ctx.lineTo(x - eyeSpacing, eyeY);
          ctx.lineTo(x - eyeSpacing - eyeSize, eyeY + eyeSize);
          ctx.stroke();
          
          // Right eye '<'
          ctx.beginPath();
          ctx.moveTo(x + eyeSpacing + eyeSize, eyeY - eyeSize);
          ctx.lineTo(x + eyeSpacing, eyeY);
          ctx.lineTo(x + eyeSpacing + eyeSize, eyeY + eyeSize);
          ctx.stroke();
          
          // Angry mouth (small open triangle/sad arc)
          ctx.beginPath();
          ctx.arc(x, y + r * 0.15, r * 0.1, Math.PI, 0); // frown open mouth
          ctx.stroke();
        } 
        else if (tier === 2) { // Grape: Cool/Slightly Dour (-_-)
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2, r * 0.08);
          ctx.lineCap = 'round';
          
          // Flat horizontal lines
          ctx.beginPath();
          ctx.moveTo(x - eyeSpacing - eyeSize, eyeY);
          ctx.lineTo(x - eyeSpacing + eyeSize, eyeY);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + eyeSpacing - eyeSize, eyeY);
          ctx.lineTo(x + eyeSpacing + eyeSize, eyeY);
          ctx.stroke();
          
          // Dour mouth (flat line or slight curve)
          ctx.beginPath();
          ctx.moveTo(x - r*0.12, y + r*0.08);
          ctx.lineTo(x + r*0.12, y + r*0.08);
          ctx.stroke();
        }
        else if (tier === 4) { // Persimmon: Happy eyes (^ ^)
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2, r * 0.08);
          ctx.lineCap = 'round';
          
          // Left arc up
          ctx.beginPath();
          ctx.arc(x - eyeSpacing, eyeY + eyeSize*0.5, eyeSize, Math.PI, 0);
          ctx.stroke();
          
          // Right arc up
          ctx.beginPath();
          ctx.arc(x + eyeSpacing, eyeY + eyeSize*0.5, eyeSize, Math.PI, 0);
          ctx.stroke();
          
          // Wide smile mouth
          ctx.beginPath();
          ctx.arc(x, y + r * 0.05, r * 0.15, 0, Math.PI);
          ctx.stroke();
        }
        else if (tier === 6) { // Pear: Mischievous squint
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2, r * 0.08);
          ctx.lineCap = 'round';
          
          // Squinting eyes (angled lines like \ /)
          ctx.beginPath();
          ctx.moveTo(x - eyeSpacing - eyeSize, eyeY - eyeSize*0.5);
          ctx.lineTo(x - eyeSpacing + eyeSize, eyeY + eyeSize*0.5);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + eyeSpacing + eyeSize, eyeY - eyeSize*0.5);
          ctx.lineTo(x + eyeSpacing - eyeSize, eyeY + eyeSize*0.5);
          ctx.stroke();
          
          // Mischievous open smirk
          ctx.fillStyle = '#261b4d';
          ctx.beginPath();
          ctx.arc(x, y + r * 0.06, r * 0.12, 0, Math.PI);
          ctx.fill();
        }
        else if (tier === 7) { // Peach: Super happy laughing
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2.2, r * 0.09);
          ctx.lineCap = 'round';
          
          // Curved laughing eyes (like > < but curved)
          ctx.beginPath();
          ctx.arc(x - eyeSpacing, eyeY + eyeSize*0.6, eyeSize*1.1, Math.PI, 0);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(x + eyeSpacing, eyeY + eyeSize*0.6, eyeSize*1.1, Math.PI, 0);
          ctx.stroke();
          
          // Large happy open mouth
          ctx.fillStyle = '#261b4d';
          ctx.beginPath();
          ctx.arc(x, y + r * 0.05, r * 0.16, 0, Math.PI);
          ctx.fill();
        }
        else if (tier === 8) { // Pineapple: Cute annoyed/angry
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2, r * 0.08);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Slanted eyebrows/eyes (V-shape)
          ctx.beginPath();
          ctx.moveTo(x - eyeSpacing - eyeSize, eyeY - eyeSize*0.5);
          ctx.lineTo(x - eyeSpacing + eyeSize, eyeY + eyeSize*0.5);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x + eyeSpacing + eyeSize, eyeY - eyeSize*0.5);
          ctx.lineTo(x + eyeSpacing - eyeSize, eyeY + eyeSize*0.5);
          ctx.stroke();
          
          // Annoyed small 'o' mouth
          ctx.fillStyle = '#261b4d';
          ctx.beginPath();
          ctx.arc(x, y + r * 0.14, r * 0.07, 0, Math.PI * 2);
          ctx.fill();
        }
        else if (tier === 9) { // Melon: Surprised/Amazed
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(1.8, r * 0.07);
          ctx.fillStyle = '#ffffff';
          
          // Big round eyes
          ctx.beginPath();
          ctx.arc(x - eyeSpacing, eyeY, eyeSize * 1.3, 0, Math.PI * 2);
          ctx.arc(x + eyeSpacing, eyeY, eyeSize * 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Pupils looking down/center
          ctx.fillStyle = '#261b4d';
          ctx.beginPath();
          ctx.arc(x - eyeSpacing + eyeSize*0.2, eyeY + eyeSize*0.2, eyeSize * 0.65, 0, Math.PI * 2);
          ctx.arc(x + eyeSpacing - eyeSize*0.2, eyeY + eyeSize*0.2, eyeSize * 0.65, 0, Math.PI * 2);
          ctx.fill();
          
          // Tiny open mouth
          ctx.beginPath();
          ctx.arc(x, y + r * 0.12, r * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
        else if (tier === 10) { // Watermelon: Winking!
          // Left eye: winking (curved closed or > shape)
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2.2, r * 0.09);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Left eye '>' winking
          ctx.beginPath();
          ctx.moveTo(x - eyeSpacing - eyeSize, eyeY - eyeSize*0.8);
          ctx.lineTo(x - eyeSpacing + eyeSize*0.2, eyeY + eyeSize*0.2);
          ctx.lineTo(x - eyeSpacing - eyeSize, eyeY + eyeSize*0.8);
          ctx.stroke();
          
          // Right eye: open with shining star/sparkle
          ctx.fillStyle = '#261b4d';
          ctx.beginPath();
          ctx.arc(x + eyeSpacing, eyeY, eyeSize * 1.2, 0, Math.PI * 2);
          ctx.fill();
          
          // Sparkle reflection
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + eyeSpacing - eyeSize * 0.28, eyeY - eyeSize * 0.28, eyeSize * 0.38, 0, Math.PI * 2);
          ctx.fill();
          
          // Smile mouth
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(2, r * 0.07);
          ctx.beginPath();
          ctx.arc(x, y + r * 0.06, r * 0.14, 0.05 * Math.PI, 0.95 * Math.PI);
          ctx.stroke();
        }
        else { // Default normal eyes + smile (Cherry, Orange, Apple, etc.)
          ctx.beginPath();
          ctx.arc(x - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.arc(x + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Sparkling reflections
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x - eyeSpacing - eyeSize * 0.22, eyeY - eyeSize * 0.22, eyeSize * 0.32, 0, Math.PI * 2);
          ctx.arc(x + eyeSpacing - eyeSize * 0.22, eyeY - eyeSize * 0.22, eyeSize * 0.32, 0, Math.PI * 2);
          ctx.fill();
          
          // Smile mouth
          ctx.strokeStyle = '#261b4d';
          ctx.lineWidth = Math.max(1.8, r * 0.05);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(x, y + r * 0.06, r * 0.12, 0.08 * Math.PI, 0.92 * Math.PI);
          ctx.stroke();
        }
      }
    }
    
    // Always draw soft pink cheeks
    ctx.fillStyle = 'rgba(255, 94, 151, 0.42)';
    ctx.beginPath();
    ctx.arc(x - eyeSpacing * 1.35, eyeY + eyeSize, eyeSize * 1.25, 0, Math.PI * 2);
    ctx.arc(x + eyeSpacing * 1.35, eyeY + eyeSize, eyeSize * 1.25, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  darkenColor(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) - amt,
    G = (num >> 8 & 0x00FF) - amt,
    B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<0?0:R>255?255:R)*0x10000 + (G<0?0:G>255?255:G)*0x100 + (B<0?0:B>255?255:B)).toString(16).slice(1);
  }
}
