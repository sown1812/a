class Teams {
  constructor(game) {
    this.game = game;
    this.init();
  }

  init() {
    const teamsTab = document.getElementById('tab-teams');
    if (teamsTab) {
      teamsTab.innerHTML = this.getHTML();
    }
    this.attachListeners();
  }

  getHTML() {
    const joined = this.game.joinedTeam;
    return `
      <div class="glass-card teams-card animate-pop">
        <h2 class="tab-title">TEAMS</h2>
        <p class="tab-subtitle">Join a clan and compete globally</p>

        <div class="teams-container">

          ${joined ? `
          <!-- ── MY TEAM PANEL ── -->
          <div class="shop-section-title">My Team</div>
          <div class="my-team-panel">
            <div class="my-team-header">
              <span class="my-team-badge">🏆</span>
              <div class="my-team-info">
                <span class="my-team-name">${joined}</span>
                <span class="my-team-rank">Rank #3 this week</span>
              </div>
            </div>
            <div class="my-team-stats">
              <div class="team-stat"><span class="ts-val">1,240</span><span class="ts-label">Team Stars</span></div>
              <div class="team-stat"><span class="ts-val">38</span><span class="ts-label">Members</span></div>
              <div class="team-stat"><span class="ts-val">Lv 5</span><span class="ts-label">Team Level</span></div>
            </div>
          </div>

          <!-- ── TEAM CHEST ── -->
          <div class="shop-section-title">Team Chest</div>
          <div class="team-chest-panel">
            <div class="chest-icon">🎁</div>
            <div class="chest-info">
              <span class="chest-title">Weekly Team Chest</span>
              <span class="chest-desc">Earn 500 team stars to unlock</span>
              <div class="chest-progress-bar">
                <div class="chest-progress-fill" style="width:72%"></div>
              </div>
              <span class="chest-pct">360 / 500 ⭐</span>
            </div>
            <button id="open-chest-btn" class="shop-btn btn-free" disabled>LOCKED</button>
          </div>

          <!-- ── TEAM CHALLENGE ── -->
          <div class="shop-section-title">Weekly Challenge</div>
          <div class="team-challenge-panel">
            <div class="challenge-row">
              <span class="challenge-icon">🍉</span>
              <div class="challenge-info">
                <span class="challenge-name">Merge 50 Watermelons</span>
                <span class="challenge-progress">23 / 50 merged by team</span>
              </div>
              <span class="challenge-reward">+200 ⭐</span>
            </div>
            <div class="challenge-row">
              <span class="challenge-icon">🏅</span>
              <div class="challenge-info">
                <span class="challenge-name">Score 10,000 points total</span>
                <span class="challenge-progress">7,420 / 10,000 pts</span>
              </div>
              <span class="challenge-reward">+150 ⭐</span>
            </div>
            <div class="challenge-row">
              <span class="challenge-icon">🔥</span>
              <div class="challenge-info">
                <span class="challenge-name">Win 15 levels this week</span>
                <span class="challenge-progress">9 / 15 wins</span>
              </div>
              <span class="challenge-reward">+100 ⭐</span>
            </div>
          </div>
          ` : ''}

          <!-- ── JOIN A TEAM ── -->
          <div class="shop-section-title">${joined ? 'Other Teams' : 'Join a Team'}</div>
          <div class="teams-list">
            <div class="team-row">
              <div class="team-badge">🍉</div>
              <div class="team-info">
                <span class="team-name">Melon Knights</span>
                <span class="team-members">48/50 · Lv 7 · ⭐ 4,820</span>
              </div>
              <button class="join-team-btn" data-team="Melon Knights">${joined === 'Melon Knights' ? 'LEAVE' : 'JOIN'}</button>
            </div>
            <div class="team-row">
              <div class="team-badge">🍊</div>
              <div class="team-info">
                <span class="team-name">Citrus Clan</span>
                <span class="team-members">35/50 · Lv 5 · ⭐ 3,210</span>
              </div>
              <button class="join-team-btn" data-team="Citrus Clan">${joined === 'Citrus Clan' ? 'LEAVE' : 'JOIN'}</button>
            </div>
            <div class="team-row">
              <div class="team-badge">🍇</div>
              <div class="team-info">
                <span class="team-name">Grape Galaxy</span>
                <span class="team-members">50/50 · Lv 8 · ⭐ 5,100</span>
              </div>
              <button class="join-team-btn locked" disabled>FULL</button>
            </div>
            <div class="team-row">
              <div class="team-badge">🍓</div>
              <div class="team-info">
                <span class="team-name">Berry Blasters</span>
                <span class="team-members">22/50 · Lv 3 · ⭐ 1,540</span>
              </div>
              <button class="join-team-btn" data-team="Berry Blasters">${joined === 'Berry Blasters' ? 'LEAVE' : 'JOIN'}</button>
            </div>
            <div class="team-row">
              <div class="team-badge">🍑</div>
              <div class="team-info">
                <span class="team-name">Peach Squadron</span>
                <span class="team-members">41/50 · Lv 6 · ⭐ 3,870</span>
              </div>
              <button class="join-team-btn" data-team="Peach Squadron">${joined === 'Peach Squadron' ? 'LEAVE' : 'JOIN'}</button>
            </div>
          </div>

          <!-- ── GLOBAL LEADERBOARD ── -->
          <div class="teams-leaderboard">
            <h3>🏆 TOP TEAM LEAGUE</h3>
            <div class="leaderboard-row">
              <span class="rank">🥇</span>
              <span class="name">Watermelon Warriors</span>
              <span class="stars-val">⭐ 6,200</span>
            </div>
            <div class="leaderboard-row">
              <span class="rank">🥈</span>
              <span class="name">Grape Galaxy</span>
              <span class="stars-val">⭐ 5,100</span>
            </div>
            <div class="leaderboard-row">
              <span class="rank">🥉</span>
              <span class="name">Melon Knights</span>
              <span class="stars-val">⭐ 4,820</span>
            </div>
            <div class="leaderboard-row">
              <span class="rank">4</span>
              <span class="name">Peach Squadron</span>
              <span class="stars-val">⭐ 3,870</span>
            </div>
            <div class="leaderboard-row">
              <span class="rank">5</span>
              <span class="name">Citrus Clan</span>
              <span class="stars-val">⭐ 3,210</span>
            </div>
            <div class="leaderboard-row">
              <span class="rank">6</span>
              <span class="name">Berry Blasters</span>
              <span class="stars-val">⭐ 1,540</span>
            </div>
          </div>

          <!-- ── TEAM WAR (COMING SOON) ── -->
          <div class="shop-section-title">Team War</div>
          <div class="team-war-panel">
            <div class="war-icon">⚔️</div>
            <div class="war-info">
              <span class="war-title">Team War — Coming Soon!</span>
              <span class="war-desc">Challenge rival clans in 24-hour wars. Winner takes 500 🪙 from the loser's treasury.</span>
            </div>
            <span class="war-badge">SOON</span>
          </div>

        </div>
      </div>
    `;
  }

  attachListeners() {
    document.querySelectorAll('.join-team-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.game.audio.playClick();
        const teamName = btn.getAttribute('data-team');
        if (this.game.joinedTeam === teamName) {
          this.game.joinedTeam = null;
          localStorage.removeItem('planet_merge_joined_team');
        } else {
          this.game.joinedTeam = teamName;
          localStorage.setItem('planet_merge_joined_team', teamName);
        }
        this.game.updateResourceHeader();
        this._rebuild();
      });
    });
  }

  _rebuild() {
    const teamsTab = document.getElementById('tab-teams');
    if (teamsTab) {
      teamsTab.innerHTML = this.getHTML();
      this.attachListeners();
    }
  }

  updateTeamsButtons() {
    document.querySelectorAll('.join-team-btn').forEach(btn => {
      const teamName = btn.getAttribute('data-team');
      if (this.game.joinedTeam === teamName) {
        btn.textContent = 'LEAVE';
        btn.classList.add('joined');
      } else if (!btn.classList.contains('locked')) {
        btn.textContent = 'JOIN';
        btn.classList.remove('joined');
      }
    });
  }
}
