/**
 * Planet Suika - Particle System (Stars, Confetti, and Juice Splashes)
 */
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.isPerfMode = localStorage.getItem('planet_merge_perf_mode') === 'true';
  }

  spawnMergeEffect(x, y, color, count = 18) {
    if (this.isPerfMode) count = Math.ceil(count * 0.5);
    // Add expanding shockwave ring (Clean neutral white)
    this.rings.push({
      x: x,
      y: y,
      r: 6,
      maxR: 35 + Math.random() * 10,
      color: '#ffffff',
      life: 1.0,
      decay: 0.05,
      isFlash: false
    });

    // Spawn speedy star & circle particles (ASMR Satisfaction)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 6.0; // Speedy movements
      const isStar = Math.random() < 0.45;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3 + Math.random() * 5,
        color: color,
        life: 1.0,
        decay: 0.045 + Math.random() * 0.035, // Decays faster
        gravity: 0.02,
        isStar: isStar,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.25
      });
    }

    // Spawn Juice Splash Blobs (Vệt bắn loang màu của nước ép)
    const splashCount = 10;
    for (let i = 0; i < splashCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 5.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 4.5 + Math.random() * 6.0,
        color: color,
        life: 1.0,
        decay: 0.05 + Math.random() * 0.04, // Snappy fade out
        gravity: 0.18, // Falls faster like liquid splash
        isSplash: true,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.1
      });
    }
  }

  spawnComboJuiceEffect(x, y, color, combo = 2) {
    const comboRings = Math.min(3, combo + 1);
    for (let i = 0; i < comboRings; i++) {
      this.rings.push({
        x: x,
        y: y,
        r: 6 + i * 4,
        maxR: 30 + i * 12 + combo * 6,
        color: '#ffffff', // Use clean neutral white for all shockwave rings
        life: 0.75,
        decay: 0.07,
        isFlash: false
      });
    }

    let burstCount = 12 + combo * 8;
    if (this.isPerfMode) burstCount = Math.ceil(burstCount * 0.5);
    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.8 + Math.random() * 6.8;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3 + Math.random() * 5,
        color: color,
        life: 0.85,
        decay: 0.04 + Math.random() * 0.02,
        gravity: 0.12,
        isSplash: true,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.18
      });
    }
  }

  spawnWatermelonExplosion(x, y) {
    // Large shockwave
    this.rings.push({
      x: x,
      y: y,
      r: 20,
      maxR: 120,
      color: '#2ed573',
      life: 1.0,
      decay: 0.04
    });

    const colors = ['#ff3366', '#ffa502', '#ffe4a6', '#2ed573', '#2d9cdb', '#a55eea'];
    const count = this.isPerfMode ? 20 : 45;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5.0 + Math.random() * 9.0;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 4 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.03 + Math.random() * 0.03,
        gravity: 0.05,
        isStar: Math.random() < 0.6,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.35
      });
    }
  }

  spawnConfetti(cx, width) {
    const colors = ['#ff3366', '#ffa502', '#ffe4a6', '#2ed573', '#2d9cdb', '#a55eea', '#ff5e97'];
    const count = this.isPerfMode ? 20 : 45;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 4.5,
        vy: 2.5 + Math.random() * 3.5,
        r: 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.8 + Math.random() * 1.2,
        decay: 0.006 + Math.random() * 0.006,
        gravity: 0.03,
        isConfetti: true,
        rot: Math.random() * Math.PI,
        rotSpeed: 0.08 + Math.random() * 0.12,
        w: 6 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        swayFreq: 0.05 + Math.random() * 0.08,
        swayPhase: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt, cx = 200, cy = 260) {
    // Update rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += (r.maxR - r.r) * 0.2 * dt; // Expands faster
      r.life -= r.decay * dt;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
      }
    }

    // Update particles
    const now = performance.now();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      if (p.isConfetti) {
        // Confetti: Slow fall with sine wave sway
        p.rot += p.rotSpeed * dt;
        p.x += (p.vx + Math.sin(now * p.swayFreq + p.swayPhase) * 1.5) * dt;
        p.y += (p.vy + p.gravity) * dt;
      }
      else if (p.isSplash) {
        // Juice Splash: Quick drops fall under gravity
        p.x += p.vx * dt;
        p.y += (p.vy + p.gravity * 8) * dt; // Stronger gravity force
      }
      else {
        // Normal particles: gently orbit towards gravity center
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.rotSpeed * dt;
        
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 10) {
          p.vx += (dx / dist) * p.gravity * dt;
          p.vy += (dy / dist) * p.gravity * dt;
        }
      }
      
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Draw rings
    for (const r of this.rings) {
      if (r.isFlash) {
        ctx.globalAlpha = Math.max(0, r.life) * 0.45;
        const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, r.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.max(0, r.life);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.color === '#ffffff' ? 2.0 : 4.0;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1.0, p.life));
      ctx.fillStyle = p.color;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      
      if (p.isConfetti) {
        // Draw small rotating ribbon rectangles
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } 
      else if (p.isSplash) {
        // Draw satisfying thạch juice splash drops
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        // Highlight white dot on top left
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      else {
        // Star glow or circle
        if (!this.isPerfMode) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
        }
        if (p.isStar) {
          this.drawStarPath(ctx, 0, 0, 5, p.r, p.r * 0.4);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    
    ctx.restore();
  }

  drawStarPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  spawnSplashEffect(x, y, color) {
    // 1. Water ripple rings (Expanding circles representing water entry)
    this.rings.push({
      x: x,
      y: y,
      r: 2,
      maxR: 24 + Math.random() * 8,
      color: 'rgba(255, 255, 255, 0.7)',
      life: 0.9,
      decay: 0.04,
      isFlash: false
    });
    
    this.rings.push({
      x: x,
      y: y,
      r: 4,
      maxR: 35 + Math.random() * 12,
      color: color,
      life: 0.8,
      decay: 0.05,
      isFlash: false
    });

    // 2. Splash droplets shooting outwards (water-like droplets)
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.5;
      const isWater = Math.random() > 0.5;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2.0 + Math.random() * 3.0,
        color: isWater ? 'rgba(255, 255, 255, 0.85)' : color,
        life: 1.0,
        decay: 0.045 + Math.random() * 0.03,
        gravity: 0.12, // Gravity pulls droplets down
        isSplash: true,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.1
      });
    }
  }
}
