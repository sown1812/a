class Shop {
  constructor(game) {
    this.game = game;
    this.init();
  }

  init() {
    const shopTab = document.getElementById('tab-shop');
    if (shopTab) {
      shopTab.innerHTML = this.getHTML();
    }
    this.attachListeners();
  }

  getHTML() {
    return `
      <div class="glass-card shop-card animate-pop">
        <h2 class="tab-title">COSMIC SHOP</h2>
        <p class="tab-subtitle">Purchase bundles and coin packages</p>

        <div class="shop-grid">

          <!-- ── FREE / ADS ── -->
          <div class="shop-section-title">Free &amp; Ads</div>

          <div class="shop-item gift-item">
            <div class="item-icon">🎁</div>
            <div class="item-details">
              <span class="item-name">Daily Gift</span>
              <span class="item-desc">+50 🪙 free every 24h</span>
            </div>
            <button id="claim-gift-btn" class="shop-btn btn-free">CLAIM</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">📺</div>
            <div class="item-details">
              <span class="item-name">Watch Ad</span>
              <span class="item-desc">+1 ❤️ free via rewarded ad</span>
            </div>
            <button id="shop-watch-ad-heart-btn" class="shop-btn btn-free">WATCH AD</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🎬</div>
            <div class="item-details">
              <span class="item-name">Ad for Coins</span>
              <span class="item-desc">+30 🪙 via rewarded ad</span>
            </div>
            <button id="shop-watch-ad-coins-btn" class="shop-btn btn-free">WATCH AD</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🎥</div>
            <div class="item-details">
              <span class="item-name">Ad for Booster</span>
              <span class="item-desc">+1 🔨 Hammer via rewarded ad</span>
            </div>
            <button id="shop-watch-ad-booster-btn" class="shop-btn btn-free">WATCH AD</button>
          </div>

          <!-- ── HEARTS ── -->
          <div class="shop-section-title">Hearts</div>

          <div class="shop-item">
            <div class="item-icon">❤️</div>
            <div class="item-details">
              <span class="item-name">Full Hearts</span>
              <span class="item-desc">Refill to 5 ❤️ instantly</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="hearts" data-name="Full Hearts" data-coins="0" data-hearts="5" data-price="$0.99">$0.99</button>
          </div>

          <!-- ── INDIVIDUAL BOOSTERS ── -->
          <div class="shop-section-title">Boosters</div>

          <div class="shop-item">
            <div class="item-icon">🔨</div>
            <div class="item-details">
              <span class="item-name">Hammer ×1</span>
              <span class="item-desc">Destroy any 1 fruit</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="booster" data-name="Hammer ×1" data-coins="0" data-hammer="1" data-price="$0.49">$0.49</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🔨</div>
            <div class="item-details">
              <span class="item-name">Hammer ×3</span>
              <span class="item-desc">3 Hammers — best value</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="booster" data-name="Hammer ×3" data-coins="0" data-hammer="3" data-price="$0.99">$0.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🌪️</div>
            <div class="item-details">
              <span class="item-name">Shaker ×1</span>
              <span class="item-desc">Shuffle all fruits on field</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="booster" data-name="Shaker ×1" data-coins="0" data-shake="1" data-price="$0.49">$0.49</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🌪️</div>
            <div class="item-details">
              <span class="item-name">Shaker ×3</span>
              <span class="item-desc">3 Shakers — best value</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="booster" data-name="Shaker ×3" data-coins="0" data-shake="3" data-price="$0.99">$0.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🛡️</div>
            <div class="item-details">
              <span class="item-name">Shield ×1</span>
              <span class="item-desc">Block 1 overflow timer tick</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="booster" data-name="Shield ×1" data-coins="0" data-shield="1" data-price="$0.49">$0.49</button>
          </div>

          <!-- ── COIN PACKAGES ── -->
          <div class="shop-section-title">Coin Packages</div>

          <div class="shop-item">
            <div class="item-icon">🪙</div>
            <div class="item-details">
              <span class="item-name">Handful of Coins</span>
              <span class="item-desc">+250 gold coins</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="package" data-name="Handful of Coins" data-coins="250" data-price="$0.99">$0.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">📦</div>
            <div class="item-details">
              <span class="item-name">Chest of Coins</span>
              <span class="item-desc">+1,000 gold coins</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="package" data-name="Chest of Coins" data-coins="1000" data-price="$2.99">$2.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🏛️</div>
            <div class="item-details">
              <span class="item-name">Vault of Coins</span>
              <span class="item-desc">+2,500 gold coins</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="package" data-name="Vault of Coins" data-coins="2500" data-price="$5.99">$5.99</button>
          </div>

          <div class="shop-item shop-item-highlight">
            <div class="item-icon">💎</div>
            <div class="item-details">
              <span class="item-name">Galaxy Treasure</span>
              <span class="item-desc">+6,000 coins — 20% bonus!</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="package" data-name="Galaxy Treasure" data-coins="6000" data-price="$9.99">$9.99</button>
          </div>

          <!-- ── SPECIAL BUNDLES ── -->
          <div class="shop-section-title">Special Bundles</div>

          <div class="shop-item">
            <div class="item-icon">⚡</div>
            <div class="item-details">
              <span class="item-name">Starter Bundle</span>
              <span class="item-desc">500 🪙 + 2 🔨 Hammers</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="bundle" data-name="Starter Bundle" data-coins="500" data-hammer="2" data-price="$1.99">$1.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">☄️</div>
            <div class="item-details">
              <span class="item-name">Cosmic Bundle</span>
              <span class="item-desc">1,500 🪙 + 4 🌪️ Shakers</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="bundle" data-name="Cosmic Bundle" data-coins="1500" data-shake="4" data-price="$3.99">$3.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🌈</div>
            <div class="item-details">
              <span class="item-name">Rainbow Bundle</span>
              <span class="item-desc">2,000 🪙 + 3 🔨 + 3 🛡️ Shields</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="bundle" data-name="Rainbow Bundle" data-coins="2000" data-hammer="3" data-shield="3" data-price="$4.99">$4.99</button>
          </div>

          <div class="shop-item shop-item-highlight">
            <div class="item-icon">👑</div>
            <div class="item-details">
              <span class="item-name">Mega Combo Bundle</span>
              <span class="item-desc">4k 🪙 + 5 🔨 + 5 🌪️ — Best Deal!</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="bundle" data-name="Mega Combo Bundle" data-coins="4000" data-hammer="5" data-shake="5" data-price="$7.99">$7.99</button>
          </div>

          <!-- ── VIP PASS ── -->
          <div class="shop-section-title">VIP Pass</div>

          <div class="shop-item shop-item-vip">
            <div class="item-icon">🌟</div>
            <div class="item-details">
              <span class="item-name">Weekly VIP</span>
              <span class="item-desc">No ads · 2× daily coins · VIP badge</span>
            </div>
            <button class="shop-btn buy-btn cost-btn btn-vip" data-type="vip" data-name="Weekly VIP" data-coins="0" data-vip="weekly" data-price="$4.99">$4.99</button>
          </div>

          <div class="shop-item shop-item-vip">
            <div class="item-icon">💫</div>
            <div class="item-details">
              <span class="item-name">Monthly VIP</span>
              <span class="item-desc">No ads · 3× daily coins · Galaxy skin</span>
            </div>
            <button class="shop-btn buy-btn cost-btn btn-vip" data-type="vip" data-name="Monthly VIP" data-coins="0" data-vip="monthly" data-price="$9.99">$9.99</button>
          </div>

          <!-- ── SEASON PASS ── -->
          <div class="shop-section-title">Season Pass</div>

          <div class="shop-item shop-item-season">
            <div class="item-icon">🎫</div>
            <div class="item-details">
              <span class="item-name">Cosmic Season Pass</span>
              <span class="item-desc">40 tiers · Exclusive skins &amp; coins</span>
            </div>
            <button class="shop-btn buy-btn cost-btn btn-season" data-type="season" data-name="Cosmic Season Pass" data-coins="0" data-price="$6.99">$6.99</button>
          </div>

          <div class="shop-season-preview">
            <div class="season-track">
              <div class="season-track-label">FREE</div>
              <div class="season-track-items">
                <span class="season-reward">🪙×100</span>
                <span class="season-arrow">→</span>
                <span class="season-reward">🔨×1</span>
                <span class="season-arrow">→</span>
                <span class="season-reward">🪙×200</span>
                <span class="season-arrow">→</span>
                <span class="season-reward locked-reward">🍉</span>
              </div>
            </div>
            <div class="season-track premium">
              <div class="season-track-label">PREMIUM</div>
              <div class="season-track-items">
                <span class="season-reward">🌪️×2</span>
                <span class="season-arrow">→</span>
                <span class="season-reward">🛡️×3</span>
                <span class="season-arrow">→</span>
                <span class="season-reward">🪙×1k</span>
                <span class="season-arrow">→</span>
                <span class="season-reward premium-reward">👑 Skin</span>
              </div>
            </div>
          </div>

          <!-- ── COSMETICS ── -->
          <div class="shop-section-title">Cosmetics</div>

          <div class="shop-item">
            <div class="item-icon">🎨</div>
            <div class="item-details">
              <span class="item-name">Neon Skin Pack</span>
              <span class="item-desc">Glowing neon fruit outlines</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="skin" data-name="Neon Skin Pack" data-coins="0" data-skin="neon" data-price="$1.99">$1.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🌌</div>
            <div class="item-details">
              <span class="item-name">Galaxy Skin Pack</span>
              <span class="item-desc">Deep space galaxy fruit textures</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="skin" data-name="Galaxy Skin Pack" data-coins="0" data-skin="galaxy" data-price="$2.99">$2.99</button>
          </div>

          <div class="shop-item">
            <div class="item-icon">🍬</div>
            <div class="item-details">
              <span class="item-name">Candy Skin Pack</span>
              <span class="item-desc">Sweet pastel candy fruit look</span>
            </div>
            <button class="shop-btn buy-btn cost-btn" data-type="skin" data-name="Candy Skin Pack" data-coins="0" data-skin="candy" data-price="$1.99">$1.99</button>
          </div>

        </div>
      </div>
    `;
  }

  attachListeners() {
    const giftBtn = document.getElementById('claim-gift-btn');
    if (giftBtn) {
      giftBtn.addEventListener('click', () => {
        this.game.audio.playClick();
        const now = Date.now();
        if (now - this.game.lastGiftTime >= 24 * 60 * 60 * 1000) {
          this.game.coins += 50;
          this.game.lastGiftTime = now;
          localStorage.setItem('planet_merge_coins', this.game.coins);
          localStorage.setItem('planet_merge_last_gift', this.game.lastGiftTime);
          this.game.updateResourceHeader();

          // Confetti celebratory burst
          this.game.particles.spawnConfetti(this.game.width / 2, this.game.width);
        }
      });
    }

    const shopWatchAdBtn = document.getElementById('shop-watch-ad-heart-btn');
    if (shopWatchAdBtn) {
      shopWatchAdBtn.addEventListener('click', () => {
        this.game.audio.playClick();
        if (confirm('[MOCK AD] Watch a short ad to get +1 ❤️?')) {
          this.game.addHeart(1);
          this.game.particles.spawnConfetti(this.game.width / 2, this.game.width);
        }
      });
    }

    const adCoinsBtn = document.getElementById('shop-watch-ad-coins-btn');
    if (adCoinsBtn) {
      adCoinsBtn.addEventListener('click', () => {
        this.game.audio.playClick();
        if (confirm('[MOCK AD] Watch a short ad to earn +30 🪙?')) {
          this.game.coins += 30;
          localStorage.setItem('planet_merge_coins', this.game.coins);
          this.game.updateResourceHeader();
          this.game.particles.spawnConfetti(this.game.width / 2, this.game.width);
        }
      });
    }

    const adBoosterBtn = document.getElementById('shop-watch-ad-booster-btn');
    if (adBoosterBtn) {
      adBoosterBtn.addEventListener('click', () => {
        this.game.audio.playClick();
        if (confirm('[MOCK AD] Watch a short ad to earn +1 🔨 Hammer?')) {
          const count = parseInt(localStorage.getItem('planet_merge_booster_hammer') || '0', 10);
          localStorage.setItem('planet_merge_booster_hammer', count + 1);
          this.game.particles.spawnConfetti(this.game.width / 2, this.game.width);
        }
      });
    }

    document.querySelectorAll('.shop-btn.cost-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.game.audio.playClick();

        const name = btn.getAttribute('data-name');
        const coinsAwarded = parseInt(btn.getAttribute('data-coins'), 10);
        const hammersAwarded = parseInt(btn.getAttribute('data-hammer') || '0', 10);
        const shakersAwarded = parseInt(btn.getAttribute('data-shake') || '0', 10);
        const shieldsAwarded = parseInt(btn.getAttribute('data-shield') || '0', 10);
        const price = btn.getAttribute('data-price');
        const type = btn.getAttribute('data-type');

        const confirmMsg = `[MOCK PAYMENT] Bạn có muốn mua "${name}" với giá ${price} không? (Thanh toán giả lập)`;
        if (confirm(confirmMsg)) {
          this.game.coins += coinsAwarded;
          localStorage.setItem('planet_merge_coins', this.game.coins);

          if (hammersAwarded > 0) {
            const count = parseInt(localStorage.getItem('planet_merge_booster_hammer') || '0', 10);
            localStorage.setItem('planet_merge_booster_hammer', count + hammersAwarded);
          }
          if (shakersAwarded > 0) {
            const count = parseInt(localStorage.getItem('planet_merge_booster_shake') || '0', 10);
            localStorage.setItem('planet_merge_booster_shake', count + shakersAwarded);
          }
          if (shieldsAwarded > 0) {
            const count = parseInt(localStorage.getItem('planet_merge_booster_shield') || '0', 10);
            localStorage.setItem('planet_merge_booster_shield', count + shieldsAwarded);
          }

          const heartsAwarded = parseInt(btn.getAttribute('data-hearts') || '0', 10);
          if (heartsAwarded > 0) {
            this.game.addHeart(heartsAwarded);
          }

          if (type === 'vip') {
            const vipTier = btn.getAttribute('data-vip');
            const vipExpiry = Date.now() + (vipTier === 'monthly' ? 30 : 7) * 24 * 60 * 60 * 1000;
            localStorage.setItem('planet_merge_vip', vipTier);
            localStorage.setItem('planet_merge_vip_expiry', vipExpiry);
            this._refreshVIPBadge();
          }

          if (type === 'season') {
            localStorage.setItem('planet_merge_season_pass', 'premium');
          }

          if (type === 'skin') {
            const skin = btn.getAttribute('data-skin');
            const owned = JSON.parse(localStorage.getItem('planet_merge_skins') || '[]');
            if (!owned.includes(skin)) owned.push(skin);
            localStorage.setItem('planet_merge_skins', JSON.stringify(owned));
            btn.textContent = 'OWNED';
            btn.disabled = true;
          }

          this.game.updateResourceHeader();
          this.game.particles.spawnConfetti(this.game.width / 2, this.game.width);

          const parts = [];
          if (coinsAwarded > 0) parts.push(`+${coinsAwarded} 🪙`);
          if (hammersAwarded > 0) parts.push(`+${hammersAwarded} 🔨`);
          if (shakersAwarded > 0) parts.push(`+${shakersAwarded} 🌪️`);
          if (shieldsAwarded > 0) parts.push(`+${shieldsAwarded} 🛡️`);
          if (heartsAwarded > 0) parts.push(`+${heartsAwarded} ❤️`);
          if (type === 'vip') parts.push('VIP kích hoạt!');
          if (type === 'season') parts.push('Season Pass mở khoá!');
          if (type === 'skin') parts.push('Skin đã được trang bị!');

          const summary = parts.length > 0 ? parts.join(' · ') : 'Phần quà đã được trao!';
          alert(`Thanh toán thành công!\n${summary}`);
        }
      });
    });
  }

  updateGiftButton() {
    const giftBtn = document.getElementById('claim-gift-btn');
    if (giftBtn) {
      const now = Date.now();
      if (now - this.game.lastGiftTime < 24 * 60 * 60 * 1000) {
        giftBtn.textContent = 'CLAIMED';
        giftBtn.classList.add('claimed');
        giftBtn.disabled = true;
      } else {
        giftBtn.textContent = 'CLAIM';
        giftBtn.classList.remove('claimed');
        giftBtn.disabled = false;
      }
    }
  }

  _refreshVIPBadge() {
    const vip = localStorage.getItem('planet_merge_vip');
    const expiry = parseInt(localStorage.getItem('planet_merge_vip_expiry') || '0', 10);
    const isActive = vip && Date.now() < expiry;
    const badge = document.getElementById('vip-badge');
    if (badge) {
      badge.textContent = isActive ? (vip === 'monthly' ? '💫 VIP Monthly' : '🌟 VIP Weekly') : '';
      badge.style.display = isActive ? 'inline-block' : 'none';
    }
  }

  isVIPActive() {
    const expiry = parseInt(localStorage.getItem('planet_merge_vip_expiry') || '0', 10);
    return Date.now() < expiry;
  }
}
