/**
 * Handball Laufchallenge 2026 – script.js
 * Pure vanilla JavaScript, no external dependencies.
 * Data is loaded from data.json.
 */

// ─────────────────────────────────────────────
//  GLOBAL STATE
// ─────────────────────────────────────────────
let data = null;          // raw JSON
let playerSort = { col: 'distance', asc: false };
let countdownInterval = null;

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const RUN_THRESHOLD_KM  = 4;   // minimum distance (km) for a bonus run
const EARLY_BIRD_HOUR   = 8;   // runs starting before this hour count as Early Bird
const NIGHT_RUNNER_HOUR = 20;  // runs starting at or after this hour count as Night Runner

// ─────────────────────────────────────────────
//  BOOTSTRAP
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadData();
});

// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
function setupNavigation() {
  const nav = document.getElementById('mainNav');
  const hamburger = document.getElementById('hamburger');

  hamburger.addEventListener('click', () => nav.classList.toggle('open'));

  nav.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;

    // hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    nav.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // show target
    const sectionId = btn.dataset.section;
    document.getElementById(sectionId).classList.add('active');
    btn.classList.add('active');

    // close mobile menu
    nav.classList.remove('open');
  });
}

// ─────────────────────────────────────────────
//  DATA LOADING
// ─────────────────────────────────────────────
function loadData() {
  fetch('data.json')
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(json => {
      data = json;
      initApp();
    })
    .catch(err => {
      console.error('Failed to load data.json:', err);
      document.querySelectorAll('.section').forEach(s => {
        s.innerHTML = `<div class="error-msg">⚠️ Fehler beim Laden der Daten:<br>${err.message}<br><small>Stelle sicher, dass data.json im selben Ordner liegt.</small></div>`;
        s.classList.remove('active');
      });
      document.getElementById('countdown').classList.add('active');
    });
}

// ─────────────────────────────────────────────
//  INIT – called once data is loaded
// ─────────────────────────────────────────────
function initApp() {
  document.getElementById('challengeName').textContent = data.challenge.name;
  initCountdown();
  renderQuickStats();
  renderTeamLeaderboard();
  renderPlayerLeaderboard();
  renderBonusChallenges();
  renderFinalScore();
}

// ─────────────────────────────────────────────
//  HELPER: get team object by id
// ─────────────────────────────────────────────
function getTeam(id) {
  return data.teams.find(t => t.id === id) || { id, name: id, color: '#888', emoji: '' };
}

// HELPER: get player object by id
function getPlayer(id) {
  return data.players.find(p => p.id === id) || { id, name: id, team: '', gender: 'm' };
}

// HELPER: format date  YYYY-MM-DD → DD.MM.YYYY
function fmtDate(str) {
  const [y, m, d] = str.split('-');
  return `${d}.${m}.${y}`;
}

// HELPER: pad number with leading zero
function pad2(n) { return String(n).padStart(2, '0'); }

// HELPER: ISO week number (Mon = day 1)
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// HELPER: week key string "YYYY-Www"
function weekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}-W${pad2(getISOWeek(d))}`;
}

// HELPER: compute per-player stats from runs
function computePlayerStats() {
  const stats = {};
  data.players.forEach(p => {
    stats[p.id] = {
      id: p.id,
      name: p.name,
      team: p.team,
      gender: p.gender,
      runs: 0,
      distance: 0,
      elevation: 0,
      longestDist: 0,
      longestTime: 0,
      runObjects: []
    };
  });

  data.runs.forEach(r => {
    const s = stats[r.player];
    if (!s) return;
    s.runs++;
    s.distance += r.distance;
    s.elevation += r.elevation;
    if (r.distance > s.longestDist) s.longestDist = r.distance;
    if (r.duration > s.longestTime) s.longestTime = r.duration;
    s.runObjects.push(r);
  });

  // round distances
  Object.values(stats).forEach(s => {
    s.distance = Math.round(s.distance * 10) / 10;
  });

  return stats;
}

// HELPER: compute per-team stats
function computeTeamStats(playerStats) {
  const stats = {};
  data.teams.forEach(t => {
    stats[t.id] = { id: t.id, runs: 0, distance: 0, elevation: 0, runsOver4: 0 };
  });

  data.runs.forEach(r => {
    const p = getPlayer(r.player);
    const ts = stats[p.team];
    if (!ts) return;
    ts.runs++;
    ts.distance += r.distance;
    ts.elevation += r.elevation;
    if (r.distance > RUN_THRESHOLD_KM) ts.runsOver4++;
  });

  Object.values(stats).forEach(s => {
    s.distance = Math.round(s.distance * 10) / 10;
  });

  return stats;
}

// ─────────────────────────────────────────────
//  COUNTDOWN
// ─────────────────────────────────────────────
function initCountdown() {
  const startDate = new Date(data.challenge.startDate + 'T00:00:00');
  const endDate   = new Date(data.challenge.endDate   + 'T00:00:00');

  document.getElementById('cdStartDate').textContent   = fmtDate(data.challenge.startDate);
  document.getElementById('cdEndDate').textContent     = fmtDate(data.challenge.endDate);
  document.getElementById('progressStart').textContent = fmtDate(data.challenge.startDate);
  document.getElementById('progressEnd').textContent   = fmtDate(data.challenge.endDate);

  const totalDays = Math.round((endDate - startDate) / 86400000);
  document.getElementById('cdTotalDays').textContent = totalDays + ' Tage';

  function tick() {
    const now = new Date();
    let targetDate, statusText;

    if (now < startDate) {
      // Before challenge starts – count down to start
      targetDate = startDate;
      statusText = '🔔 Challenge startet in …';
    } else if (now <= endDate) {
      // Challenge is running – count down to end
      targetDate = endDate;
      statusText = '🏃 Challenge läuft!';
    } else {
      // Challenge finished
      statusText = '🏁 Challenge beendet!';
      document.getElementById('cdDays').textContent    = '00';
      document.getElementById('cdHours').textContent   = '00';
      document.getElementById('cdMinutes').textContent = '00';
      document.getElementById('cdSeconds').textContent = '00';
      document.getElementById('countdownStatus').textContent = statusText;
      clearInterval(countdownInterval);
      return;
    }

    const diff = targetDate - now;
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    document.getElementById('cdDays').textContent    = pad2(days);
    document.getElementById('cdHours').textContent   = pad2(hours);
    document.getElementById('cdMinutes').textContent = pad2(minutes);
    document.getElementById('cdSeconds').textContent = pad2(seconds);
    document.getElementById('countdownStatus').textContent = statusText;

    // Days remaining until end
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / 86400000));
    document.getElementById('cdDaysRemaining').textContent = daysRemaining;

    // Progress bar
    if (now < startDate) {
      document.getElementById('progressBar').style.width = '0%';
      document.getElementById('progressPercent').textContent = '0%';
    } else if (now > endDate) {
      document.getElementById('progressBar').style.width = '100%';
      document.getElementById('progressPercent').textContent = '100%';
    } else {
      const pct = Math.min(100, ((now - startDate) / (endDate - startDate)) * 100);
      const pctRounded = Math.round(pct);
      document.getElementById('progressBar').style.width = pct + '%';
      document.getElementById('progressPercent').textContent = pctRounded + '%';
    }
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ─────────────────────────────────────────────
//  QUICK STATS (in countdown section)
// ─────────────────────────────────────────────
function renderQuickStats() {
  const container = document.getElementById('quickStats');
  const totalRuns = data.runs.length;
  const totalKm   = Math.round(data.runs.reduce((s, r) => s + r.distance, 0) * 10) / 10;
  const totalElev = data.runs.reduce((s, r) => s + r.elevation, 0);
  const players   = new Set(data.runs.map(r => r.player)).size;

  const items = [
    { value: totalRuns, label: 'Läufe gesamt' },
    { value: totalKm + ' km', label: 'Kilometer gesamt' },
    { value: totalElev.toLocaleString('de-DE') + ' m', label: 'Höhenmeter gesamt' },
    { value: players, label: 'Aktive Läufer' },
    { value: data.teams.length, label: 'Teams' },
    { value: data.players.length, label: 'Teilnehmer' }
  ];

  container.innerHTML = items.map(i => `
    <div class="quick-stat-card">
      <div class="quick-stat-value">${i.value}</div>
      <div class="quick-stat-label">${i.label}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
//  TEAM LEADERBOARD
// ─────────────────────────────────────────────
function renderTeamLeaderboard() {
  const pStats = computePlayerStats();
  const tStats = computeTeamStats(pStats);

  // Sort by distance desc
  const ranked = data.teams
    .map(t => ({ ...t, ...tStats[t.id] }))
    .sort((a, b) => b.distance - a.distance);

  const mainPoints = { 1: 100, 2: 50, 3: 30 };

  // Cards
  const cardsEl = document.getElementById('teamCards');
  const cardOrder = [1, 0, 2]; // show 2nd, 1st, 3rd visually (podium order)
  cardsEl.innerHTML = ranked.map((t, idx) => {
    const rank = idx + 1;
    const pts  = mainPoints[rank] || 0;
    return `
      <div class="team-card" style="border-top-color: ${t.color}">
        <div class="team-card-rank">${rank}</div>
        <div class="team-card-name">
          <span>${t.emoji}</span>
          <span>${t.name}</span>
          <span class="rank-badge rank-${rank <= 3 ? rank : 'n'}" style="background:${rank===1?'var(--gold)':rank===2?'var(--silver)':'var(--bronze)'}; color:${rank===1?'#000':'#fff'}">${rank}</span>
        </div>
        <div class="team-card-stats">
          <div class="team-stat">
            <div class="team-stat-value" style="color:${t.color}">${t.distance} km</div>
            <div class="team-stat-label">Kilometer</div>
          </div>
          <div class="team-stat">
            <div class="team-stat-value">${t.elevation.toLocaleString('de-DE')} m</div>
            <div class="team-stat-label">Höhenmeter</div>
          </div>
          <div class="team-stat">
            <div class="team-stat-value">${t.runs}</div>
            <div class="team-stat-label">Läufe</div>
          </div>
          <div class="team-stat">
            <div class="team-stat-value">${t.runsOver4}</div>
            <div class="team-stat-label">Läufe &gt; 4km</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Table
  const tbody = document.getElementById('teamTableBody');
  tbody.innerHTML = ranked.map((t, idx) => {
    const rank = idx + 1;
    const pts  = mainPoints[rank] || 0;
    return `
      <tr>
        <td><span class="rank-badge rank-${rank <= 3 ? rank : 'n'}">${rank}</span></td>
        <td>
          <span style="font-size:1.2rem">${t.emoji}</span>
          <strong style="color:${t.color}">${t.name}</strong>
        </td>
        <td class="fw-bold">${t.distance} km</td>
        <td>${t.elevation.toLocaleString('de-DE')} m</td>
        <td>${t.runs}</td>
        <td>${t.runsOver4}</td>
        <td><strong style="color:var(--gold)">${pts}</strong></td>
      </tr>
    `;
  }).join('');

  // Chart: km comparison
  renderBarChart('teamChart', ranked.map(t => ({
    label: `${t.emoji} ${t.name}`,
    value: t.distance,
    color: t.color,
    suffix: ' km'
  })));
}

// ─────────────────────────────────────────────
//  PLAYER LEADERBOARD
// ─────────────────────────────────────────────
function renderPlayerLeaderboard() {
  const pStats = computePlayerStats();
  const players = Object.values(pStats);

  // Attach sort handler
  document.getElementById('playerTable').querySelectorAll('.sortable-col').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (playerSort.col === col) {
        playerSort.asc = !playerSort.asc;
      } else {
        playerSort.col = col;
        playerSort.asc = col === 'name' || col === 'team';
      }
      renderPlayerTable(players);
    });
  });

  renderPlayerTable(players);

  // Player chart
  const top10 = players.slice().sort((a, b) => b.distance - a.distance).slice(0, 10);
  renderBarChart('playerChart', top10.map(p => ({
    label: p.name,
    value: p.distance,
    color: getTeam(p.team).color,
    suffix: ' km'
  })));
}

function renderPlayerTable(players) {
  // Sort
  const col = playerSort.col;
  const asc = playerSort.asc;
  const sorted = players.slice().sort((a, b) => {
    let va = a[col], vb = b[col];
    if (typeof va === 'string') return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    return asc ? va - vb : vb - va;
  });

  // Update header styling using data-label to avoid fragile text parsing
  document.querySelectorAll('.sortable-col').forEach(th => {
    th.classList.remove('active-sort');
    const label = th.dataset.label || '';
    th.textContent = label + ' ↕';
  });
  const activeHeader = document.querySelector(`.sortable-col[data-sort="${col}"]`);
  if (activeHeader) {
    activeHeader.classList.add('active-sort');
    const label = activeHeader.dataset.label || '';
    activeHeader.textContent = label + (asc ? ' ↑' : ' ↓');
  }

  const tbody = document.getElementById('playerTableBody');
  tbody.innerHTML = sorted.map((p, idx) => {
    const team = getTeam(p.team);
    return `
      <tr>
        <td><span class="rank-badge ${idx < 3 ? 'rank-' + (idx + 1) : 'rank-n'}">${idx + 1}</span></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="team-pill" style="background:${team.color}">${team.emoji} ${team.name}</span></td>
        <td class="fw-bold">${p.distance} km</td>
        <td>${p.elevation.toLocaleString('de-DE')} m</td>
        <td>${p.runs}</td>
        <td>${p.longestDist.toFixed(1)} km</td>
        <td>${p.longestTime} min</td>
      </tr>
    `;
  }).join('');
}

// ─────────────────────────────────────────────
//  BONUS CHALLENGES
// ─────────────────────────────────────────────

/* Bonus point tables */
const BONUS_STD     = [20, 10, 5];
const BONUS_ROTATIE = [30, 15, 10];
const BONUS_DOUBLE  = [25, 15, 10];
const BONUS_IRON    = [25, 15, 10];

function renderBonusChallenges() {
  const grid = document.getElementById('bonusGrid');
  const cards = [
    buildBonusLongestDist(),
    buildBonusLongestTime(),
    buildBonusTotalElev(),
    buildBonusHillHero(),
    buildBonusBestDuo(),
    buildBonusTeamRotation(),
    buildBonusDoubleAgent(),
    buildBonusIronMan(),
    buildBonusIronWoman(),
    buildBonusLongestStreak(),
    buildBonusConsistencyKing(),
    buildBonusEarlyBird(),
    buildBonusNightRunner()
  ];
  grid.innerHTML = cards.join('');
}

/** Build a bonus card HTML string */
function makeBonusCard(title, icon, pointsLabel, rows) {
  const rowsHtml = rows.slice(0, 3).map((r, i) => {
    const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : 'rank-3';
    const pts = r.pts !== undefined ? `+${r.pts} Pkt` : '';
    return `
      <div class="bonus-row">
        <div class="bonus-pos rank-badge ${rankCls}">${i + 1}</div>
        <div class="bonus-name">${r.name}${r.sub ? `<br><small class="text-muted">${r.sub}</small>` : ''}</div>
        <div class="bonus-value">${r.value}</div>
        ${pts ? `<div class="bonus-pts">${pts}</div>` : ''}
      </div>
    `;
  }).join('');

  // fill empty slots if < 3 entries
  const empty = Array(Math.max(0, 3 - rows.length)).fill(0).map((_, i) => `
    <div class="bonus-row">
      <div class="bonus-pos rank-badge rank-n">${rows.length + i + 1}</div>
      <div class="bonus-name text-muted">–</div>
      <div class="bonus-value text-muted">–</div>
    </div>
  `).join('');

  return `
    <div class="bonus-card">
      <div class="bonus-card-header">
        <span class="bonus-icon">${icon}</span>
        <span class="bonus-card-title">${title}</span>
        <span class="bonus-card-points">${pointsLabel}</span>
      </div>
      <div class="bonus-card-body">
        ${rowsHtml}${empty}
      </div>
    </div>
  `;
}

/** Get player display name with team pill */
function playerDisplay(pid) {
  const p = getPlayer(pid);
  const t = getTeam(p.team);
  return `${p.name} <span class="team-pill" style="background:${t.color};font-size:.65rem">${t.emoji}</span>`;
}

// Longest Run – Distance
function buildBonusLongestDist() {
  const best = {};
  data.runs.forEach(r => {
    if (!best[r.player] || r.distance > best[r.player]) best[r.player] = r.distance;
  });
  const ranked = Object.entries(best).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return makeBonusCard('Längster Lauf (Distanz)', '📏', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v.toFixed(1) + ' km', pts: BONUS_STD[i] }))
  );
}

// Longest Run – Time
function buildBonusLongestTime() {
  const best = {};
  data.runs.forEach(r => {
    if (!best[r.player] || r.duration > best[r.player]) best[r.player] = r.duration;
  });
  const ranked = Object.entries(best).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return makeBonusCard('Längster Lauf (Zeit)', '⏱', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v + ' min', pts: BONUS_STD[i] }))
  );
}

// Most Total Elevation
function buildBonusTotalElev() {
  const totals = {};
  data.players.forEach(p => { totals[p.id] = 0; });
  data.runs.forEach(r => { if (totals[r.player] !== undefined) totals[r.player] += r.elevation; });
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return makeBonusCard('Meiste Höhenmeter', '⛰️', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v.toLocaleString('de-DE') + ' m', pts: BONUS_STD[i] }))
  );
}

// Hill Hero – most elevation in ONE week
function buildBonusHillHero() {
  // For each player, compute elevation per week, then take their best week
  const weekElev = {}; // { pid: { weekKey: elevation } }
  data.players.forEach(p => { weekElev[p.id] = {}; });

  data.runs.forEach(r => {
    if (!weekElev[r.player]) return;
    const wk = weekKey(r.date);
    weekElev[r.player][wk] = (weekElev[r.player][wk] || 0) + r.elevation;
  });

  const best = {};
  Object.entries(weekElev).forEach(([pid, weeks]) => {
    const vals = Object.values(weeks);
    best[pid] = vals.length > 0 ? Math.max(...vals) : 0;
  });

  const ranked = Object.entries(best).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return makeBonusCard('Hill Hero (Woche)', '🏔️', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v.toLocaleString('de-DE') + ' m / Woche', pts: BONUS_STD[i] }))
  );
}

// Best Duo – most runs with the same partner
function buildBonusBestDuo() {
  // For each player, count runs per partner, find max
  const pairCounts = {}; // { pid: { partnerPid: count } }
  data.players.forEach(p => { pairCounts[p.id] = {}; });

  data.runs.forEach(r => {
    if (!pairCounts[r.player]) return;
    r.partners.forEach(partnerId => {
      pairCounts[r.player][partnerId] = (pairCounts[r.player][partnerId] || 0) + 1;
    });
  });

  // For each player find best duo partner and count
  const best = {}; // { pid: { count, partnerId } }
  Object.entries(pairCounts).forEach(([pid, partners]) => {
    let maxCount = 0, bestPartner = null;
    Object.entries(partners).forEach(([partnerId, cnt]) => {
      if (cnt > maxCount) { maxCount = cnt; bestPartner = partnerId; }
    });
    if (maxCount > 0) best[pid] = { count: maxCount, partnerId: bestPartner };
  });

  const ranked = Object.entries(best)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  return makeBonusCard('Best Duo', '👫', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, { count, partnerId }], i) => ({
      name: playerDisplay(pid),
      sub: `mit ${getPlayer(partnerId).name}`,
      value: count + ' gemeinsame Läufe',
      pts: BONUS_STD[i]
    }))
  );
}

// Team Rotation – most runs with different partners
function buildBonusTeamRotation() {
  const partnerSets = {}; // { pid: Set<partnerId> }
  data.players.forEach(p => { partnerSets[p.id] = new Set(); });

  data.runs.forEach(r => {
    if (!partnerSets[r.player]) return;
    r.partners.forEach(partnerId => partnerSets[r.player].add(partnerId));
  });

  const ranked = Object.entries(partnerSets)
    .map(([pid, set]) => [pid, set.size])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return makeBonusCard('Team Rotation', '🔄', '1→30 | 2→15 | 3→10',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v + ' verschiedene Partner', pts: BONUS_ROTATIE[i] }))
  );
}

// Double Agent – most runs with partners from other teams
function buildBonusDoubleAgent() {
  const crossRuns = {}; // { pid: count }
  data.players.forEach(p => { crossRuns[p.id] = 0; });

  data.runs.forEach(r => {
    const playerTeam = getPlayer(r.player).team;
    const hasCrossTeam = r.partners.some(pid => getPlayer(pid).team !== playerTeam);
    if (hasCrossTeam) crossRuns[r.player]++;
  });

  const ranked = Object.entries(crossRuns)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return makeBonusCard('Double Agent', '🕵️', '1→25 | 2→15 | 3→10',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v + ' teamfremde Läufe', pts: BONUS_DOUBLE[i] }))
  );
}

// Iron Man – male players, most weeks with 3+ runs
function buildBonusIronMan() {
  return buildBonusIron('m', 'Iron Man', '💪');
}

// Iron Woman – female players, most weeks with 3+ runs
function buildBonusIronWoman() {
  return buildBonusIron('f', 'Iron Woman', '💪');
}

function buildBonusIron(gender, title, icon) {
  // Group runs by player → by week
  const weekRuns = {}; // { pid: { weekKey: count } }
  data.players
    .filter(p => p.gender === gender)
    .forEach(p => { weekRuns[p.id] = {}; });

  data.runs.forEach(r => {
    if (!weekRuns[r.player]) return;
    const wk = weekKey(r.date);
    weekRuns[r.player][wk] = (weekRuns[r.player][wk] || 0) + 1;
  });

  const qualified = {}; // { pid: weeks_with_3plus }
  Object.entries(weekRuns).forEach(([pid, weeks]) => {
    qualified[pid] = Object.values(weeks).filter(cnt => cnt >= 3).length;
  });

  const ranked = Object.entries(qualified)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return makeBonusCard(title, icon, '1→25 | 2→15 | 3→10',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v + ' Wochen mit 3+ Läufen', pts: BONUS_IRON[i] }))
  );
}

// Longest Streak – most consecutive running days
function buildBonusLongestStreak() {
  const streaks = {};
  data.players.forEach(p => { streaks[p.id] = 0; });

  // Group run dates by player
  const datesByPlayer = {};
  data.players.forEach(p => { datesByPlayer[p.id] = new Set(); });
  data.runs.forEach(r => {
    if (datesByPlayer[r.player]) datesByPlayer[r.player].add(r.date);
  });

  Object.entries(datesByPlayer).forEach(([pid, dateSet]) => {
    if (dateSet.size === 0) return;
    const dates = Array.from(dateSet).sort();
    let maxStreak = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) {
        cur++;
        if (cur > maxStreak) maxStreak = cur;
      } else {
        cur = 1;
      }
    }
    streaks[pid] = maxStreak;
  });

  const ranked = Object.entries(streaks)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return makeBonusCard('Längste Serie', '🔥', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v + ' Tage in Folge', pts: BONUS_STD[i] }))
  );
}

// Consistency King – most weeks with at least 2 runs
function buildBonusConsistencyKing() {
  const weekRuns = {};
  data.players.forEach(p => { weekRuns[p.id] = {}; });

  data.runs.forEach(r => {
    if (!weekRuns[r.player]) return;
    const wk = weekKey(r.date);
    weekRuns[r.player][wk] = (weekRuns[r.player][wk] || 0) + 1;
  });

  const qualified = {};
  Object.entries(weekRuns).forEach(([pid, weeks]) => {
    qualified[pid] = Object.values(weeks).filter(cnt => cnt >= 2).length;
  });

  const ranked = Object.entries(qualified)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return makeBonusCard('Consistency King', '👑', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: v + ' Wochen mit 2+ Läufen', pts: BONUS_STD[i] }))
  );
}

// Early Bird – most runs before EARLY_BIRD_HOUR
function buildBonusEarlyBird() {
  const counts = countRunsByTimeThreshold((h) => h < EARLY_BIRD_HOUR);
  const ranked = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return makeBonusCard('Early Bird', '🌅', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: `${v} Läufe vor ${pad2(EARLY_BIRD_HOUR)}:00`, pts: BONUS_STD[i] }))
  );
}

// Night Runner – most runs after NIGHT_RUNNER_HOUR
function buildBonusNightRunner() {
  const counts = countRunsByTimeThreshold((h) => h >= NIGHT_RUNNER_HOUR);
  const ranked = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return makeBonusCard('Night Runner', '🌙', '1→20 | 2→10 | 3→5',
    ranked.map(([pid, v], i) => ({ name: playerDisplay(pid), value: `${v} Läufe nach ${pad2(NIGHT_RUNNER_HOUR)}:00`, pts: BONUS_STD[i] }))
  );
}

/** Count runs per player where the start-hour satisfies the given predicate. */
function countRunsByTimeThreshold(hourPredicate) {
  const counts = {};
  data.players.forEach(p => { counts[p.id] = 0; });
  data.runs.forEach(r => {
    if (!r.startTime) return;
    const h = parseInt(r.startTime.split(':')[0], 10);
    if (hourPredicate(h)) counts[r.player]++;
  });
  return counts;
}

// ─────────────────────────────────────────────
//  FINAL SCORE CALCULATION
// ─────────────────────────────────────────────

/**
 * Compute total bonus points per team from all bonus challenges.
 * Bonus points are attributed to the player's team.
 */
function computeBonusPointsPerTeam() {
  const teamPts = {};
  data.teams.forEach(t => { teamPts[t.id] = 0; });

  // Helper: add points for a ranked list of [pid, value] pairs with a points table
  function addBonusPoints(rankedPairs, pointsTable) {
    rankedPairs.slice(0, 3).forEach(([pid], i) => {
      const team = getPlayer(pid).team;
      if (teamPts[team] !== undefined) teamPts[team] += pointsTable[i] || 0;
    });
  }

  // ── Longest dist
  const bestDist = {};
  data.runs.forEach(r => { if (!bestDist[r.player] || r.distance > bestDist[r.player]) bestDist[r.player] = r.distance; });
  addBonusPoints(Object.entries(bestDist).sort((a, b) => b[1] - a[1]), BONUS_STD);

  // ── Longest time
  const bestTime = {};
  data.runs.forEach(r => { if (!bestTime[r.player] || r.duration > bestTime[r.player]) bestTime[r.player] = r.duration; });
  addBonusPoints(Object.entries(bestTime).sort((a, b) => b[1] - a[1]), BONUS_STD);

  // ── Total elevation
  const totElev = {};
  data.players.forEach(p => { totElev[p.id] = 0; });
  data.runs.forEach(r => { if (totElev[r.player] !== undefined) totElev[r.player] += r.elevation; });
  addBonusPoints(Object.entries(totElev).sort((a, b) => b[1] - a[1]), BONUS_STD);

  // ── Hill hero
  const weekElev = {};
  data.players.forEach(p => { weekElev[p.id] = {}; });
  data.runs.forEach(r => {
    if (!weekElev[r.player]) return;
    const wk = weekKey(r.date);
    weekElev[r.player][wk] = (weekElev[r.player][wk] || 0) + r.elevation;
  });
  const bestWeekElev = {};
  Object.entries(weekElev).forEach(([pid, weeks]) => {
    const vals = Object.values(weeks);
    bestWeekElev[pid] = vals.length > 0 ? Math.max(...vals) : 0;
  });
  addBonusPoints(Object.entries(bestWeekElev).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), BONUS_STD);

  // ── Best duo
  const pairCounts = {};
  data.players.forEach(p => { pairCounts[p.id] = {}; });
  data.runs.forEach(r => {
    if (!pairCounts[r.player]) return;
    r.partners.forEach(pid => { pairCounts[r.player][pid] = (pairCounts[r.player][pid] || 0) + 1; });
  });
  const bestDuo = {};
  Object.entries(pairCounts).forEach(([pid, partners]) => {
    const max = Math.max(0, ...Object.values(partners));
    if (max > 0) bestDuo[pid] = max;
  });
  addBonusPoints(Object.entries(bestDuo).sort((a,b)=>b[1]-a[1]), BONUS_STD);

  // ── Team rotation
  const partnerSets = {};
  data.players.forEach(p => { partnerSets[p.id] = new Set(); });
  data.runs.forEach(r => {
    if (!partnerSets[r.player]) return;
    r.partners.forEach(pid => partnerSets[r.player].add(pid));
  });
  addBonusPoints(
    Object.entries(partnerSets).map(([pid, s]) => [pid, s.size]).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),
    BONUS_ROTATIE
  );

  // ── Double agent
  const crossRuns = {};
  data.players.forEach(p => { crossRuns[p.id] = 0; });
  data.runs.forEach(r => {
    const pt = getPlayer(r.player).team;
    if (r.partners.some(pid => getPlayer(pid).team !== pt)) crossRuns[r.player]++;
  });
  addBonusPoints(Object.entries(crossRuns).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), BONUS_DOUBLE);

  // ── Iron Man
  (['m', 'f']).forEach((gender, gi) => {
    const weekRuns = {};
    data.players.filter(p => p.gender === gender).forEach(p => { weekRuns[p.id] = {}; });
    data.runs.forEach(r => {
      if (!weekRuns[r.player]) return;
      const wk = weekKey(r.date);
      weekRuns[r.player][wk] = (weekRuns[r.player][wk] || 0) + 1;
    });
    const qualified = {};
    Object.entries(weekRuns).forEach(([pid, weeks]) => {
      qualified[pid] = Object.values(weeks).filter(cnt => cnt >= 3).length;
    });
    addBonusPoints(Object.entries(qualified).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), BONUS_IRON);
  });

  // ── Longest streak
  const datesByPlayer = {};
  data.players.forEach(p => { datesByPlayer[p.id] = new Set(); });
  data.runs.forEach(r => { if (datesByPlayer[r.player]) datesByPlayer[r.player].add(r.date); });
  const streaks = {};
  Object.entries(datesByPlayer).forEach(([pid, dateSet]) => {
    if (dateSet.size === 0) { streaks[pid] = 0; return; }
    const dates = Array.from(dateSet).sort();
    let max = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.round((new Date(dates[i]+'T00:00:00') - new Date(dates[i-1]+'T00:00:00')) / 86400000);
      if (diff === 1) { cur++; if (cur > max) max = cur; } else cur = 1;
    }
    streaks[pid] = max;
  });
  addBonusPoints(Object.entries(streaks).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), BONUS_STD);

  // ── Consistency king
  const weekRunsCK = {};
  data.players.forEach(p => { weekRunsCK[p.id] = {}; });
  data.runs.forEach(r => {
    if (!weekRunsCK[r.player]) return;
    const wk = weekKey(r.date);
    weekRunsCK[r.player][wk] = (weekRunsCK[r.player][wk] || 0) + 1;
  });
  const qualCK = {};
  Object.entries(weekRunsCK).forEach(([pid, weeks]) => {
    qualCK[pid] = Object.values(weeks).filter(cnt => cnt >= 2).length;
  });
  addBonusPoints(Object.entries(qualCK).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), BONUS_STD);

  // ── Early bird
  addBonusPoints(
    Object.entries(countRunsByTimeThreshold(h => h < EARLY_BIRD_HOUR))
      .filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),
    BONUS_STD
  );

  // ── Night runner
  addBonusPoints(
    Object.entries(countRunsByTimeThreshold(h => h >= NIGHT_RUNNER_HOUR))
      .filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),
    BONUS_STD
  );

  return teamPts;
}

// ─────────────────────────────────────────────
//  FINAL SCORE RENDER
// ─────────────────────────────────────────────
function renderFinalScore() {
  const pStats = computePlayerStats();
  const tStats = computeTeamStats(pStats);

  // Main points from km ranking
  const tRankedByKm = data.teams
    .map(t => ({ ...t, ...tStats[t.id] }))
    .sort((a, b) => b.distance - a.distance);

  const mainPtsTable = { 1: 100, 2: 50, 3: 30 };
  const mainPts = {};
  tRankedByKm.forEach((t, i) => { mainPts[t.id] = mainPtsTable[i + 1] || 0; });

  // Bonus points
  const bonusPts = computeBonusPointsPerTeam();

  // Runs >4km points
  const run4Pts = {};
  data.teams.forEach(t => { run4Pts[t.id] = tStats[t.id].runsOver4; });

  // Final totals
  const finals = data.teams.map(t => ({
    ...t,
    mainPts:  mainPts[t.id]  || 0,
    bonusPts: bonusPts[t.id] || 0,
    run4Pts:  run4Pts[t.id]  || 0,
    total:    (mainPts[t.id] || 0) + (bonusPts[t.id] || 0) + (run4Pts[t.id] || 0)
  })).sort((a, b) => b.total - a.total);

  // Podium
  const podiumEl = document.getElementById('podium');
  const podiumOrder = finals.length >= 2 ? [finals[1], finals[0], finals[2]] : finals;
  const podiumClasses = ['podium-2nd', 'podium-1st', 'podium-3rd'];
  const medals = ['🥈', '🥇', '🥉'];
  podiumEl.innerHTML = podiumOrder.map((t, i) => `
    <div class="podium-place ${podiumClasses[i]}">
      <div class="podium-medal">${medals[i]}</div>
      <div class="podium-team-name" style="color:${t.color}">${t.emoji} ${t.name}</div>
      <div class="podium-score">${t.total}</div>
      <div class="podium-score-label">Punkte gesamt</div>
    </div>
  `).join('');

  // Table
  const tbody = document.getElementById('finalTableBody');
  tbody.innerHTML = finals.map((t, idx) => {
    const rank = idx + 1;
    return `
      <tr>
        <td><span class="rank-badge rank-${rank <= 3 ? rank : 'n'}">${rank}</span></td>
        <td><span style="font-size:1.2rem">${t.emoji}</span> <strong style="color:${t.color}">${t.name}</strong></td>
        <td>${t.mainPts}</td>
        <td>${t.bonusPts}</td>
        <td>${t.run4Pts}</td>
        <td class="fw-bold" style="color:var(--gold)">${t.total}</td>
      </tr>
    `;
  }).join('');

  // Stacked chart
  const maxTotal = Math.max(...finals.map(t => t.total), 1);
  const chartEl = document.getElementById('finalChart');
  chartEl.innerHTML = finals.map(t => {
    const mainW  = (t.mainPts  / maxTotal * 100).toFixed(1);
    const bonusW = (t.bonusPts / maxTotal * 100).toFixed(1);
    const run4W  = (t.run4Pts  / maxTotal * 100).toFixed(1);
    return `
      <div class="chart-row">
        <div class="chart-label">${t.emoji} ${t.name}</div>
        <div class="chart-bar-stacked">
          <div class="chart-bar-segment" style="width:${mainW}%; background:${t.color}" title="Hauptpunkte: ${t.mainPts}"></div>
          <div class="chart-bar-segment" style="width:${bonusW}%; background:${t.color}aa" title="Bonuspunkte: ${t.bonusPts}"></div>
          <div class="chart-bar-segment" style="width:${run4W}%;  background:${t.color}55" title=">4km Punkte: ${t.run4Pts}"></div>
        </div>
        <div class="fw-bold" style="min-width:40px; text-align:right; font-size:.9rem">${t.total}</div>
      </div>
    `;
  }).join('') + `
    <div class="chart-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#888"></div> Hauptpunkte</div>
      <div class="legend-item"><div class="legend-dot" style="background:#888a"></div> Bonuspunkte</div>
      <div class="legend-item"><div class="legend-dot" style="background:#8885"></div> Läufe &gt;4km Punkte</div>
    </div>
  `;
}

// ─────────────────────────────────────────────
//  GENERIC BAR CHART (CSS-based)
// ─────────────────────────────────────────────
function renderBarChart(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container || items.length === 0) return;

  const maxVal = Math.max(...items.map(i => i.value), 1);

  container.innerHTML = items.map(item => {
    const pct = (item.value / maxVal * 100).toFixed(1);
    const label = item.value + (item.suffix || '');
    return `
      <div class="chart-row">
        <div class="chart-label" title="${item.label}">${item.label}</div>
        <div class="chart-bar-bg">
          <div class="chart-bar" style="width:${pct}%; background:${item.color || 'var(--accent)'}">
            <span class="chart-bar-value">${label}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
