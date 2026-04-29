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
const LIVE_DATA_FILE    = 'data.json';
const DEMO_DATA_FILE    = 'demo.json';
const DATA_SOURCE_KEY   = 'laufchallenge_data_source';

// ─────────────────────────────────────────────
//  BOOTSTRAP
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupDataSourceToggle();
  loadData();
});

function getSelectedDataFile() {
  const mode = localStorage.getItem(DATA_SOURCE_KEY);
  return mode === 'demo' ? DEMO_DATA_FILE : LIVE_DATA_FILE;
}

function setupDataSourceToggle() {
  const btn = document.getElementById('dataSwitchBtn');
  if (!btn) return;

  const refreshBtn = () => {
    const isDemo = getSelectedDataFile() === DEMO_DATA_FILE;
    btn.textContent = isDemo ? '🧪 Demo' : '🟢 Live';
    btn.classList.toggle('active', isDemo);
  };

  refreshBtn();

  btn.addEventListener('click', () => {
    const isDemo = getSelectedDataFile() === DEMO_DATA_FILE;
    localStorage.setItem(DATA_SOURCE_KEY, isDemo ? 'live' : 'demo');
    location.reload();
  });
}

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
  const dataFile = getSelectedDataFile();

  fetch(dataFile)
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(json => {
      data = json;
      initApp();
    })
    .catch(err => {
      console.error(`Failed to load ${dataFile}:`, err);
      document.querySelectorAll('.section').forEach(s => {
        s.innerHTML = `<div class="error-msg">⚠️ Fehler beim Laden der Daten:<br>${err.message}<br><small>Stelle sicher, dass ${dataFile} im selben Ordner liegt.</small></div>`;
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
  renderLastUpdated();
  renderVisitCounter();
  initCountdown();
  renderQuickStats();
  renderTeamLeaderboard();
  renderTeamRosters();
  renderPlayerLeaderboard();
  renderBonusChallenges();
  renderTeamBonuses();
  renderFinalScore();
}

function renderVisitCounter() {
  const el = document.getElementById('visitCounterText');
  if (!el) return;

  const STORAGE_KEY = 'laufchallenge_visit_count';
  let count = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  if (!Number.isFinite(count) || count < 0) count = 0;
  count += 1;
  localStorage.setItem(STORAGE_KEY, String(count));

  el.textContent = `• Website-Aufrufe: ${count}`;
}

function renderLastUpdated() {
  const el = document.getElementById('lastUpdatedText');
  if (!el) return;

  const sourceValue = data.lastUpdated || getLatestRunDateTime();
  if (!sourceValue) {
    el.textContent = 'Zuletzt aktualisiert: --';
    return;
  }

  const parsedDate = parseDateTime(sourceValue);
  if (!parsedDate) {
    el.textContent = 'Zuletzt aktualisiert: --';
    return;
  }

  el.textContent = `Zuletzt aktualisiert: ${formatDateTime(parsedDate)}`;
}

function getLatestRunDateTime() {
  if (!Array.isArray(data.runs) || data.runs.length === 0) return null;

  let latest = null;
  data.runs.forEach(run => {
    if (!run.date) return;
    const isoDateTime = `${run.date}T${run.startTime || '00:00'}:00`;
    const d = new Date(isoDateTime);
    if (Number.isNaN(d.getTime())) return;
    if (!latest || d > latest) latest = d;
  });

  return latest;
}

function parseDateTime(value) {
  if (value instanceof Date) return value;
  if (typeof value !== 'string' || !value.trim()) return null;

  let normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized += 'T00:00:00';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    normalized += ':00';
  }

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(date) {
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

/** Get player display name with team pill */
function playerDisplay(pid) {
  const p = getPlayer(pid);
  const t = getTeam(p.team);
  return `${p.name} <span class="team-pill" style="background:${t.color};font-size:.65rem">${t.emoji}</span>`;
}

// HELPER: format date  YYYY-MM-DD → DD.MM.YYYY
function fmtDate(str) {
  const [y, m, d] = str.split('-');
  return `${d}.${m}.${y}`;
}

// HELPER: pad number with leading zero
function pad2(n) { return String(n).padStart(2, '0'); }

function isOtherSportActivity(run) {
  const activity = String(run.activity || run.type || run.sport || '').trim().toLowerCase();
  if (!activity) return false;
  const runningKeywords = new Set(['lauf', 'laufen', 'run', 'running', 'jog', 'jogging', 'lauftraining']);
  return !runningKeywords.has(activity);
}

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
      otherActivities: 0,
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
    if (isOtherSportActivity(r)) s.otherActivities++;
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
    stats[t.id] = { id: t.id, runs: 0, distance: 0, elevation: 0, runsOver4: 0, otherActivities: 0 };
  });

  data.runs.forEach(r => {
    const p = getPlayer(r.player);
    const ts = stats[p.team];
    if (!ts) return;
    ts.runs++;
    ts.distance += r.distance;
    ts.elevation += r.elevation;
    if (r.distance > RUN_THRESHOLD_KM) ts.runsOver4++;
    if (isOtherSportActivity(r)) ts.otherActivities++;
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

  if (!document.getElementById('cdStartDate')) return;

  document.getElementById('cdStartDate').textContent   = fmtDate(data.challenge.startDate);
  document.getElementById('cdEndDate').textContent     = fmtDate(data.challenge.endDate);
  document.getElementById('progressStart').textContent = fmtDate(data.challenge.startDate);
  document.getElementById('progressEnd').textContent   = fmtDate(data.challenge.endDate);

  const totalDays = Math.round((endDate - startDate) / 86400000);
  document.getElementById('cdTotalDays').textContent = totalDays + ' Tage';

  function tick() {
    if (!document.getElementById('cdDays')) {
      clearInterval(countdownInterval);
      return;
    }

    const now = new Date();
    let targetDate, statusText;

    if (now < startDate) {
      // Before challenge starts – count down to start
      targetDate = startDate;
      statusText = '🔔 Challenge startet in:';
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

function renderTeamRosters() {
  const container = document.getElementById('teamRosters');
  if (!container) return;

  const rosterCards = data.teams.map(team => {
    const teamPlayers = data.players
      .filter(p => p.team === team.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    const playerList = teamPlayers.length > 0
      ? teamPlayers.map(player => `<li class="team-roster-player">${player.name}</li>`).join('')
      : '<li class="team-roster-player text-muted">Keine Spieler</li>';

    return `
      <article class="team-roster-card" style="border-top-color:${team.color}">
        <div class="team-roster-header">
          <span class="team-roster-title">${team.emoji} ${team.name}</span>
          <span class="team-roster-count">${teamPlayers.length}</span>
        </div>
        <ul class="team-roster-list">
          ${playerList}
        </ul>
      </article>
    `;
  });

  container.innerHTML = rosterCards.join('');
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
        <td>${p.otherActivities}</td>
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

/**
 * Compute which 2 bonus challenges are the best for each player.
 * Returns: { playerId: [{ challenge, points }, { challenge, points }] }
 */
function computePlayerTopBonusChallenges() {
  const playerChallengePoints = {};
  data.players.forEach(p => { playerChallengePoints[p.id] = []; });

  function registerPoints(rankedPairs, pointsTable, challengeName) {
    rankedPairs.slice(0, 3).forEach(([pid], i) => {
      const pts = pointsTable[i] || 0;
      if (!pts) return;
      if (!playerChallengePoints[pid]) playerChallengePoints[pid] = [];
      playerChallengePoints[pid].push({ challenge: challengeName, points: pts });
    });
  }

  // ── Longest dist
  const bestDist = {};
  data.runs.forEach(r => { if (!bestDist[r.player] || r.distance > bestDist[r.player]) bestDist[r.player] = r.distance; });
  registerPoints(Object.entries(bestDist).sort((a, b) => b[1] - a[1]), BONUS_STD, 'Längster Lauf (Distanz)');

  // ── Longest time
  const bestTime = {};
  data.runs.forEach(r => { if (!bestTime[r.player] || r.duration > bestTime[r.player]) bestTime[r.player] = r.duration; });
  registerPoints(Object.entries(bestTime).sort((a, b) => b[1] - a[1]), BONUS_STD, 'Längster Lauf (Zeit)');

  // ── Total elevation
  const totElev = {};
  data.players.forEach(p => { totElev[p.id] = 0; });
  data.runs.forEach(r => { if (totElev[r.player] !== undefined) totElev[r.player] += r.elevation; });
  registerPoints(Object.entries(totElev).sort((a, b) => b[1] - a[1]), BONUS_STD, 'Gesamthöhenmeter');

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
  registerPoints(Object.entries(bestDuo).sort((a,b)=>b[1]-a[1]), BONUS_STD, 'Bestes Duo');

  // ── Team rotation
  const partnerSets = {};
  data.players.forEach(p => { partnerSets[p.id] = new Set(); });
  data.runs.forEach(r => {
    if (!partnerSets[r.player]) return;
    r.partners.forEach(pid => partnerSets[r.player].add(pid));
  });
  registerPoints(
    Object.entries(partnerSets).map(([pid, s]) => [pid, s.size]).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),
    BONUS_ROTATIE, 'Team Rotation'
  );

  // ── Double agent
  const crossRuns = {};
  data.players.forEach(p => { crossRuns[p.id] = 0; });
  data.runs.forEach(r => {
    const pt = getPlayer(r.player).team;
    if (r.partners.some(pid => getPlayer(pid).team !== pt)) crossRuns[r.player]++;
  });
  registerPoints(Object.entries(crossRuns).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), BONUS_DOUBLE, 'Double Agent');

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
  registerPoints(Object.entries(streaks).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]), BONUS_STD, 'Längster Streak');

  // ── Early bird
  registerPoints(
    Object.entries(countRunsByTimeThreshold(h => h < EARLY_BIRD_HOUR))
      .filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),
    BONUS_STD, 'Early Bird'
  );

  // ── Night runner
  registerPoints(
    Object.entries(countRunsByTimeThreshold(h => h >= NIGHT_RUNNER_HOUR))
      .filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),
    BONUS_STD, 'Night Runner'
  );

  // Für jeden Spieler: nur die TOP 2 behalten
  const playerTopTwo = {};
  Object.entries(playerChallengePoints).forEach(([pid, entries]) => {
    if (entries.length === 0) {
      playerTopTwo[pid] = [];
    } else {
      const sorted = entries.slice().sort((a, b) => b.points - a.points);
      playerTopTwo[pid] = sorted.slice(0, 2);
    }
  });

  return playerTopTwo;
}


function awardBonusRanking(rankedPairs, pointsTable, playerBonusCount) {
  const awarded = [];
  for (const [pid, value] of rankedPairs) {
    // Skip if player already has 2 bonus awards
    if ((playerBonusCount[pid] || 0) >= 2) continue;
    
    if (awarded.length >= 3) break;
    const pts = pointsTable[awarded.length] || 0;
    awarded.push({ pid, value, pts });
    playerBonusCount[pid] = (playerBonusCount[pid] || 0) + 1;
  }
  return awarded;
}



function renderBonusChallenges() {
  const grid = document.getElementById('bonusGrid');
  const bonusEval = evaluateBonusChallenges(2);
  const cards = bonusEval.displayOrder.map(ch => {
    const rows = ch.awardedRows.map(r => ({
      name: r.nameHtml || playerDisplay(r.pid),
      sub: r.sub,
      value: r.valueLabel,
      pts: r.pts
    }));

    return makeBonusCard(
      ch.title,
      ch.icon,
      ch.pointsLabel,
      rows,
      ch.description
    );
  });
  grid.innerHTML = cards.join('');
}

function renderTeamBonuses() {
  const grid = document.getElementById('teamBonusGrid');
  if (!grid) return;

  const bonuses = getTeamBonusDefinitions();
  grid.innerHTML = bonuses.map(bonus => {
    const rows = data.teams.map(team => ({
      name: `${team.emoji} ${team.name}`,
      value: bonus.achieved[team.id] ? 'Erreicht' : 'Ausstehend',
      pts: bonus.achieved[team.id] ? bonus.points : 0
    }));

    return makeBonusCard(
      bonus.title,
      bonus.icon,
      `${bonus.points} Punkte`,
      rows,
      bonus.description
    );
  }).join('');
}

/** Build a bonus card HTML string */
function makeBonusCard(title, icon, pointsLabel, rows, description = '') {
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

  const empty = Array(Math.max(0, 3 - rows.length)).fill(0).map((_, i) => `
    <div class="bonus-row">
      <div class="bonus-pos rank-badge rank-n">${rows.length + i + 1}</div>
      <div class="bonus-name text-muted">-</div>
      <div class="bonus-value text-muted">-</div>
    </div>
  `).join('');

  const descHtml = description ? `<p class="bonus-description">${description}</p>` : '';

  return `
    <div class="bonus-card">
      <div class="bonus-card-header">
        <span class="bonus-icon">${icon}</span>
        <span class="bonus-card-title">${title}</span>
        <span class="bonus-card-points">${pointsLabel}</span>
      </div>
      ${descHtml}
      <div class="bonus-card-body">
        ${rowsHtml}${empty}
      </div>
    </div>
  `;
}

function getTeamBonusDefinitions() {
  const weekKeys = getChallengeWeekKeys();
  const playersByTeam = {};
  data.players.forEach(p => {
    playersByTeam[p.team] = playersByTeam[p.team] || [];
    playersByTeam[p.team].push(p.id);
  });

  const runsByTeam = {};
  data.teams.forEach(t => { runsByTeam[t.id] = new Set(); });
  data.runs.forEach(r => {
    const teamId = getPlayer(r.player).team;
    if (runsByTeam[teamId]) runsByTeam[teamId].add(r.player);
  });

  const weeksByPlayer = {};
  data.players.forEach(p => { weeksByPlayer[p.id] = new Set(); });
  data.runs.forEach(r => {
    const key = weekKey(r.date);
    if (weeksByPlayer[r.player]) weeksByPlayer[r.player].add(key);
  });

  const definitions = [
    {
      id: 'team-run-each-player',
      title: 'Alle Teammitglieder mindestens 1 Lauf',
      icon: '🏃‍♀️',
      points: 10,
      description: 'Jedes Team erhält diesen Bonus, wenn alle Teammitglieder mindestens einen Lauf eingereicht haben.',
      achieved: data.teams.reduce((acc, team) => {
        const expectedPlayers = playersByTeam[team.id] || [];
        const actualPlayers = Array.from(runsByTeam[team.id] || []);
        acc[team.id] = expectedPlayers.length > 0 && expectedPlayers.every(pid => actualPlayers.includes(pid));
        return acc;
      }, {})
    },
    {
      id: 'team-weekly-run',
      title: 'Jede Woche mindestens 1 Lauf',
      icon: '📅',
      points: 20,
      description: 'Jedes Team erhält diesen Bonus, wenn alle Teammitglieder in jeder Challenge-Woche mindestens einen Lauf absolviert haben.',
      achieved: data.teams.reduce((acc, team) => {
        const expectedPlayers = playersByTeam[team.id] || [];
        acc[team.id] = expectedPlayers.length > 0 && expectedPlayers.every(pid => {
          const playerWeeks = weeksByPlayer[pid] || new Set();
          return weekKeys.every(key => playerWeeks.has(key));
        });
        return acc;
      }, {})
    },
    {
      id: 'team-renamed',
      title: 'Neuer Teamname',
      icon: '📝',
      points: 10,
      description: 'Dieser Bonus wird vergeben, wenn das Team einen neuen Namen ausgewählt hat.',
      achieved: data.teams.reduce((acc, team) => {
        acc[team.id] = Boolean(team.nameSelected);
        return acc;
      }, {})
    },
    {
      id: 'team-logo',
      title: 'Teamlogo entworfen',
      icon: '🎨',
      points: 15,
      description: 'Dieser Bonus wird vergeben, wenn das Team ein eigenes Logo erstellt hat.',
      achieved: data.teams.reduce((acc, team) => {
        acc[team.id] = Boolean(team.logoDesigned);
        return acc;
      }, {})
    },
    {
      id: 'team-photo',
      title: 'Gemeinsames Gruppenbild',
      icon: '📸',
      points: 20,
      description: 'Dieser Bonus wird vergeben, wenn das Team ein gemeinsames Gruppenfoto gemacht hat.',
      achieved: data.teams.reduce((acc, team) => {
        acc[team.id] = Boolean(team.groupPhoto);
        return acc;
      }, {})
    },
    {
      id: 'team-coach-icecream',
      title: 'Trainer zum Eis eingeladen',
      icon: '🍦',
      points: 10,
      description: 'Dieser Bonus wird vergeben, wenn das Team seinen Trainer zum Eis eingeladen hat.',
      achieved: data.teams.reduce((acc, team) => {
        acc[team.id] = Boolean(team.coachIceCream);
        return acc;
      }, {})
    }
  ];

  return definitions;
}

function getChallengeWeekKeys() {
  const keys = new Set();
  const start = new Date(data.challenge.startDate + 'T00:00:00');
  const end = new Date(data.challenge.endDate + 'T00:00:00');
  const current = new Date(start);
  while (current <= end) {
    keys.add(weekKey(current.toISOString().slice(0, 10)));
    current.setDate(current.getDate() + 1);
  }
  return Array.from(keys).sort();
}

// Longest Run – Distance
function buildBonusLongestDist(playerBonusCount) {
  const best = {};
  data.runs.forEach(r => {
    if (!best[r.player] || r.distance > best[r.player]) best[r.player] = r.distance;
  });
  const ranked = Object.entries(best).sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_STD, playerBonusCount);
  return makeBonusCard('Längster Lauf (Distanz)', '📏', '1→20 | 2→10 | 3→5',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: a.value.toFixed(1) + ' km', pts: a.pts })),
    'Der längste einzelne Lauf in Kilometern pro Spieler.'
  );
}

// Longest Run – Time
function buildBonusLongestTime(playerBonusCount) {
  const best = {};
  data.runs.forEach(r => {
    if (!best[r.player] || r.duration > best[r.player]) best[r.player] = r.duration;
  });
  const ranked = Object.entries(best).sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_STD, playerBonusCount);
  return makeBonusCard('Längster Lauf (Zeit)', '⏱', '1→20 | 2→10 | 3→5',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: a.value + ' min', pts: a.pts })),
    'Der längste einzelne Lauf in Minuten pro Spieler.'
  );
}

// Most Total Elevation
function buildBonusTotalElev(playerBonusCount) {
  const totals = {};
  data.players.forEach(p => { totals[p.id] = 0; });
  data.runs.forEach(r => { if (totals[r.player] !== undefined) totals[r.player] += r.elevation; });
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_STD, playerBonusCount);
  return makeBonusCard('Gesamthöhenmeter', '⛰️', '1→20 | 2→10 | 3→5',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: a.value.toLocaleString('de-DE') + ' m', pts: a.pts })),
    'Spieler mit den meisten Höhenmetern über alle Läufe hinweg.'
  );
}


// Best Duo – most runs with the same partner
function buildBonusBestDuo(playerBonusCount) {
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
    .map(([pid, data]) => [pid, data.count]);
  const awarded = awardBonusRanking(ranked, BONUS_STD, playerBonusCount);
  // Map back to add partner info
  const finalAwarded = awarded.map(a => ({
    ...a,
    partnerId: best[a.pid]?.partnerId
  }));

  return makeBonusCard('Bestes Duo', '👫', '1→20 | 2→10 | 3→5',
    finalAwarded.map(a => {
      const partner = getPlayer(a.partnerId);
      return {
        name: playerDisplay(a.pid),
        sub: `mit ${partner.name}`,
        value: a.value + ' gemeinsame Läufe',
        pts: a.pts
      };
    }),
    'Spieler mit den meisten gemeinsamen Läufen mit demselben Partner.'
  );
}

// Team Rotation – most runs with different partners
function buildBonusTeamRotation(playerBonusCount) {
  const partnerSets = {}; // { pid: Set<partnerId> }
  data.players.forEach(p => { partnerSets[p.id] = new Set(); });

  data.runs.forEach(r => {
    if (!partnerSets[r.player]) return;
    r.partners.forEach(partnerId => partnerSets[r.player].add(partnerId));
  });

  const ranked = Object.entries(partnerSets)
    .map(([pid, set]) => [pid, set.size])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_ROTATIE, playerBonusCount);

  return makeBonusCard('Team Rotation', '🔄', '1→30 | 2→15 | 3→10',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: a.value + ' verschiedene Partner', pts: a.pts })),
    'Spieler mit den meisten verschiedenen Laufpartnern – für Flexibilität im Team.'
  );
}

// Double Agent – most runs with partners from other teams
function buildBonusDoubleAgent(playerBonusCount) {
  const crossRuns = {}; // { pid: count }
  data.players.forEach(p => { crossRuns[p.id] = 0; });

  data.runs.forEach(r => {
    const playerTeam = getPlayer(r.player).team;
    const hasCrossTeam = r.partners.some(pid => getPlayer(pid).team !== playerTeam);
    if (hasCrossTeam) crossRuns[r.player]++;
  });

  const ranked = Object.entries(crossRuns)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_DOUBLE, playerBonusCount);

  return makeBonusCard('Double Agent', '🕵️', '1→25 | 2→15 | 3→10',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: a.value + ' teamfremde Läufe', pts: a.pts })),
    'Spieler mit den meisten Läufen mit Partnern aus anderen Teams – für Teamgeist.'
  );
}

// Longest Streak – most consecutive running days
function buildBonusLongestStreak(playerBonusCount) {
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
    .sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_STD, playerBonusCount);

  return makeBonusCard('Längste Serie', '🔥', '1→20 | 2→10 | 3→5',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: a.value + ' Tage in Folge', pts: a.pts })),
    'Spieler mit den meisten hintereinander folgenden Lauftagen – für Konsistenz.'
  );
}

// Early Bird – most runs before EARLY_BIRD_HOUR
function buildBonusEarlyBird(playerBonusCount) {
  const counts = countRunsByTimeThreshold((h) => h < EARLY_BIRD_HOUR);
  const ranked = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_STD, playerBonusCount);
  return makeBonusCard('Early Bird', '🌅', '1→20 | 2→10 | 3→5',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: `${a.value} Läufe vor ${pad2(EARLY_BIRD_HOUR)}:00`, pts: a.pts })),
    `Spieler mit den meisten Läufen vor ${pad2(EARLY_BIRD_HOUR)}:00 Uhr – für die Frühaufsteher.`
  );
}

// Night Runner – most runs after NIGHT_RUNNER_HOUR
function buildBonusNightRunner(playerBonusCount) {
  const counts = countRunsByTimeThreshold((h) => h >= NIGHT_RUNNER_HOUR);
  const ranked = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const awarded = awardBonusRanking(ranked, BONUS_STD, playerBonusCount);
  return makeBonusCard('Night Runner', '🌙', '1→20 | 2→10 | 3→5',
    awarded.map(a => ({ name: playerDisplay(a.pid), value: `${a.value} Läufe nach ${pad2(NIGHT_RUNNER_HOUR)}:00`, pts: a.pts })),
    `Spieler mit den meisten Läufen nach ${pad2(NIGHT_RUNNER_HOUR)}:00 Uhr – für die Nachtscheulen.`
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

/** Build all bonus challenge definitions including sorted rankings. */
function getBonusChallengeDefinitions() {
  const definitions = [];

  // Longest Run (Distance)
  const bestDist = {};
  data.runs.forEach(r => {
    if (!bestDist[r.player] || r.distance > bestDist[r.player]) bestDist[r.player] = r.distance;
  });
  definitions.push({
    id: 'longest-dist',
    title: 'Längster Lauf (Distanz)',
    icon: '📏',
    pointsTable: BONUS_STD,
    pointsLabel: '1→20 | 2→10 | 3→5',
    description: 'Der längste einzelne Lauf in Kilometern pro Spieler.',
    ranked: Object.entries(bestDist)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, value]) => ({ pid, metric: value, valueLabel: value.toFixed(1) + ' km' }))
  });

  // Longest Run (Time)
  const bestTime = {};
  data.runs.forEach(r => {
    if (!bestTime[r.player] || r.duration > bestTime[r.player]) bestTime[r.player] = r.duration;
  });
  definitions.push({
    id: 'longest-time',
    title: 'Längster Lauf (Zeit)',
    icon: '⏱',
    pointsTable: BONUS_STD,
    pointsLabel: '1→20 | 2→10 | 3→5',
    description: 'Der längste einzelne Lauf in Minuten pro Spieler.',
    ranked: Object.entries(bestTime)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, value]) => ({ pid, metric: value, valueLabel: value + ' min' }))
  });

  // Total elevation
  const totals = {};
  data.players.forEach(p => { totals[p.id] = 0; });
  data.runs.forEach(r => { if (totals[r.player] !== undefined) totals[r.player] += r.elevation; });
  definitions.push({
    id: 'total-elevation',
    title: 'Gesamthöhenmeter',
    icon: '⛰️',
    pointsTable: BONUS_STD,
    pointsLabel: '1→20 | 2→10 | 3→5',
    description: 'Spieler mit den meisten Höhenmetern über alle Läufe hinweg.',
    ranked: Object.entries(totals)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, value]) => ({ pid, metric: value, valueLabel: value.toLocaleString('de-DE') + ' m' }))
  });

  // Best duo (pair ranking: both players share one place)
  const pairCounts = {};
  const seenPairEvents = new Set();
  data.runs.forEach(r => {
    r.partners.forEach(partnerId => {
      const pair = [r.player, partnerId].sort();
      const pairKey = pair.join('|');
      // Deduplicate mirrored run entries from both players.
      const eventKey = [
        pairKey,
        r.date,
        r.startTime || '',
        r.distance,
        r.duration
      ].join('|');

      if (seenPairEvents.has(eventKey)) return;
      seenPairEvents.add(eventKey);
      pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
    });
  });

  const bestDuo = Object.entries(pairCounts)
    .map(([pairKey, count]) => {
      const [pA, pB] = pairKey.split('|');
      return {
        id: pairKey,
        participants: [pA, pB],
        metric: count,
        valueLabel: count + ' gemeinsame Läufe',
        sub: 'geteilt von 2 Spielern',
        nameHtml: `${playerDisplay(pA)} &amp; ${playerDisplay(pB)}`
      };
    })
    .filter(entry => entry.metric > 0);

  definitions.push({
    id: 'best-duo',
    title: 'Bestes Duo',
    icon: '👫',
    pointsTable: BONUS_STD,
    pointsLabel: '1→20 | 2→10 | 3→5',
    description: 'Duo-Wertung: Das Paar belegt gemeinsam einen Platz und beide Spieler erhalten die Platzpunkte.',
    ranked: bestDuo.sort((a, b) => b.metric - a.metric)
  });

  // Team rotation
  const partnerSets = {};
  data.players.forEach(p => { partnerSets[p.id] = new Set(); });
  data.runs.forEach(r => {
    if (!partnerSets[r.player]) return;
    r.partners.forEach(partnerId => partnerSets[r.player].add(partnerId));
  });
  definitions.push({
    id: 'team-rotation',
    title: 'Team Rotation',
    icon: '🔄',
    pointsTable: BONUS_ROTATIE,
    pointsLabel: '1→30 | 2→15 | 3→10',
    description: 'Spieler mit den meisten verschiedenen Laufpartnern – für Flexibilität im Team.',
    ranked: Object.entries(partnerSets)
      .map(([pid, set]) => ({ pid, metric: set.size, valueLabel: set.size + ' verschiedene Partner' }))
      .filter(e => e.metric > 0)
      .sort((a, b) => b.metric - a.metric)
  });

  // Double agent
  const crossRuns = {};
  data.players.forEach(p => { crossRuns[p.id] = 0; });
  data.runs.forEach(r => {
    const playerTeam = getPlayer(r.player).team;
    const hasCrossTeam = r.partners.some(pid => getPlayer(pid).team !== playerTeam);
    if (hasCrossTeam) crossRuns[r.player]++;
  });
  definitions.push({
    id: 'double-agent',
    title: 'Double Agent',
    icon: '🕵️',
    pointsTable: BONUS_DOUBLE,
    pointsLabel: '1→25 | 2→15 | 3→10',
    description: 'Spieler mit den meisten Läufen mit Partnern aus anderen Teams – für Teamgeist.',
    ranked: Object.entries(crossRuns)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, value]) => ({ pid, metric: value, valueLabel: value + ' teamfremde Läufe' }))
  });

  // Longest streak
  const datesByPlayer = {};
  data.players.forEach(p => { datesByPlayer[p.id] = new Set(); });
  data.runs.forEach(r => {
    if (datesByPlayer[r.player]) datesByPlayer[r.player].add(r.date);
  });
  const streaks = [];
  Object.entries(datesByPlayer).forEach(([pid, dateSet]) => {
    if (dateSet.size === 0) return;
    const dates = Array.from(dateSet).sort();
    let maxStreak = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) {
        current++;
        if (current > maxStreak) maxStreak = current;
      } else {
        current = 1;
      }
    }
    streaks.push({ pid, metric: maxStreak, valueLabel: maxStreak + ' Tage in Folge' });
  });
  definitions.push({
    id: 'longest-streak',
    title: 'Längste Serie',
    icon: '🔥',
    pointsTable: BONUS_STD,
    pointsLabel: '1→20 | 2→10 | 3→5',
    description: 'Spieler mit den meisten hintereinander folgenden Lauftagen – für Konsistenz.',
    ranked: streaks.sort((a, b) => b.metric - a.metric)
  });

  // Early Bird
  definitions.push({
    id: 'early-bird',
    title: 'Early Bird',
    icon: '🌅',
    pointsTable: BONUS_STD,
    pointsLabel: '1→20 | 2→10 | 3→5',
    description: `Spieler mit den meisten Läufen vor ${pad2(EARLY_BIRD_HOUR)}:00 Uhr – für die Frühaufsteher.`,
    ranked: Object.entries(countRunsByTimeThreshold(h => h < EARLY_BIRD_HOUR))
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, value]) => ({ pid, metric: value, valueLabel: `${value} Läufe vor ${pad2(EARLY_BIRD_HOUR)}:00` }))
  });

  // Night Runner
  definitions.push({
    id: 'night-runner',
    title: 'Night Runner',
    icon: '🌙',
    pointsTable: BONUS_STD,
    pointsLabel: '1→20 | 2→10 | 3→5',
    description: `Spieler mit den meisten Läufen nach ${pad2(NIGHT_RUNNER_HOUR)}:00 Uhr – für die Nachtscheulen.`,
    ranked: Object.entries(countRunsByTimeThreshold(h => h >= NIGHT_RUNNER_HOUR))
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([pid, value]) => ({ pid, metric: value, valueLabel: `${value} Läufe nach ${pad2(NIGHT_RUNNER_HOUR)}:00` }))
  });

  // Normalize ranked entries so allocation can handle single players and duos uniformly.
  definitions.forEach(ch => {
    ch.ranked = ch.ranked.map((entry, index) => {
      const participants = entry.participants || (entry.pid ? [entry.pid] : []);
      return {
        ...entry,
        participants,
        id: entry.id || entry.pid || `${ch.id}-${index}`
      };
    });
  });

  return definitions;
}

/**
 * Evaluate bonus awards with these rules:
 * - each challenge awards max top 3 places by its points table
 * - each player can be counted in maxPerPlayer challenges
 * - if a player drops out due to the cap, others move up automatically
 * - expensive challenges are prioritized first during allocation
 */
function evaluateBonusChallenges(maxPerPlayer = 2) {
  const displayOrder = getBonusChallengeDefinitions();
  const allocationOrder = displayOrder.slice().sort((a, b) => {
    const maxA = Math.max(...a.pointsTable);
    const maxB = Math.max(...b.pointsTable);
    if (maxB !== maxA) return maxB - maxA;
    return b.pointsTable[1] - a.pointsTable[1];
  });

  const rankedEntryById = {};
  allocationOrder.forEach(ch => {
    rankedEntryById[ch.id] = {};
    ch.ranked.forEach(entry => { rankedEntryById[ch.id][entry.id] = entry; });
  });

  const assignmentByChallenge = {};
  allocationOrder.forEach(ch => {
    assignmentByChallenge[ch.id] = ch.ranked.slice(0, 3).map(entry => entry.id);
  });

  for (let guard = 0; guard < 50; guard++) {
    let changed = false;

    const awardsByPlayer = {};
    allocationOrder.forEach(ch => {
      const winners = assignmentByChallenge[ch.id];
      winners.forEach((winnerId, index) => {
        const entry = rankedEntryById[ch.id][winnerId];
        if (!entry) return;
        const pts = ch.pointsTable[index] || 0;
        entry.participants.forEach(pid => {
          if (!awardsByPlayer[pid]) awardsByPlayer[pid] = [];
          awardsByPlayer[pid].push({ challengeId: ch.id, winnerId, pts, index });
        });
      });
    });

    Object.entries(awardsByPlayer).forEach(([pid, awards]) => {
      if (awards.length <= maxPerPlayer) return;
      awards.sort((a, b) => b.pts - a.pts || a.index - b.index);
      awards.slice(maxPerPlayer).forEach(drop => {
        const winners = assignmentByChallenge[drop.challengeId];
        const removeIndex = winners.indexOf(drop.winnerId);
        if (removeIndex !== -1) {
          winners.splice(removeIndex, 1);
          changed = true;
        }
      });
    });

    const currentCount = {};
    data.players.forEach(p => { currentCount[p.id] = 0; });
    allocationOrder.forEach(ch => {
      assignmentByChallenge[ch.id].forEach(winnerId => {
        const entry = rankedEntryById[ch.id][winnerId];
        if (!entry) return;
        entry.participants.forEach(pid => {
          currentCount[pid] = (currentCount[pid] || 0) + 1;
        });
      });
    });

    allocationOrder.forEach(ch => {
      const winners = assignmentByChallenge[ch.id];
      for (const candidate of ch.ranked) {
        if (winners.length >= 3) break;
        if (winners.includes(candidate.id)) continue;
        const fitsLimit = candidate.participants.every(pid => (currentCount[pid] || 0) < maxPerPlayer);
        if (!fitsLimit) continue;
        winners.push(candidate.id);
        candidate.participants.forEach(pid => {
          currentCount[pid] = (currentCount[pid] || 0) + 1;
        });
        changed = true;
      }
    });

    if (!changed) break;
  }

  const byId = {};
  displayOrder.forEach(ch => {
    const rankIndex = {};
    ch.ranked.forEach((entry, index) => { rankIndex[entry.id] = index; });

    const orderedWinners = assignmentByChallenge[ch.id]
      .slice()
      .sort((a, b) => (rankIndex[a] ?? Number.MAX_SAFE_INTEGER) - (rankIndex[b] ?? Number.MAX_SAFE_INTEGER));

    const awardedRows = orderedWinners.slice(0, 3).map((winnerId, index) => {
      const entry = rankedEntryById[ch.id][winnerId];
      return {
        pid: entry.participants[0] || '',
        participants: entry.participants,
        nameHtml: entry.nameHtml || '',
        pts: ch.pointsTable[index] || 0,
        metric: entry.metric,
        valueLabel: entry.valueLabel,
        sub: entry.sub || ''
      };
    });

    byId[ch.id] = {
      ...ch,
      awardedRows
    };
  });

  return {
    displayOrder: displayOrder.map(ch => byId[ch.id]),
    byId,
    allocationOrder: allocationOrder.map(ch => byId[ch.id])
  };
}

// ─────────────────────────────────────────────
//  FINAL SCORE CALCULATION
// ─────────────────────────────────────────────

/**
 * Compute total bonus points per team from all bonus challenges.
 * Rule: each player can receive bonus points in at most 2 challenges.
 * If a player reached 2 awards, they are excluded from later challenges and others move up.
 */
function computePlayerBonusPointsPerTeam() {
  const teamPts = {};
  data.teams.forEach(t => { teamPts[t.id] = 0; });

  const bonusEval = evaluateBonusChallenges(2);
  bonusEval.displayOrder.forEach(ch => {
    ch.awardedRows.forEach(row => {
      const participants = row.participants || (row.pid ? [row.pid] : []);
      participants.forEach(pid => {
        const team = getPlayer(pid).team;
        if (teamPts[team] !== undefined) teamPts[team] += row.pts;
      });
    });
  });

  return teamPts;
}

function computeTeamBonusPoints() {
  const bonusPoints = {};
  data.teams.forEach(t => { bonusPoints[t.id] = 0; });
  const bonuses = getTeamBonusDefinitions();
  bonuses.forEach(bonus => {
    data.teams.forEach(team => {
      if (bonus.achieved[team.id]) {
        bonusPoints[team.id] += bonus.points;
      }
    });
  });
  return bonusPoints;
}

function computeBonusPointsPerTeam() {
  const playerBonusPts = computePlayerBonusPointsPerTeam();
  const teamBonusPts = computeTeamBonusPoints();
  data.teams.forEach(t => {
    playerBonusPts[t.id] = (playerBonusPts[t.id] || 0) + (teamBonusPts[t.id] || 0);
  });
  return playerBonusPts;
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
  const activityPts = {};
  data.teams.forEach(t => {
    run4Pts[t.id] = tStats[t.id].runsOver4;
    activityPts[t.id] = tStats[t.id].otherActivities;
  });

  // Final totals
  const finals = data.teams.map(t => ({
    ...t,
    mainPts:      mainPts[t.id]  || 0,
    bonusPts:     bonusPts[t.id] || 0,
    run4Pts:      run4Pts[t.id]  || 0,
    activityPts:  activityPts[t.id] || 0,
    total:        (mainPts[t.id] || 0) + (bonusPts[t.id] || 0) + (run4Pts[t.id] || 0) + (activityPts[t.id] || 0)
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
        <td>${t.activityPts}</td>
        <td class="fw-bold" style="color:var(--gold)">${t.total}</td>
      </tr>
    `;
  }).join('');

  // Stacked chart
  const maxTotal = Math.max(...finals.map(t => t.total), 1);
  const chartEl = document.getElementById('finalChart');
  chartEl.innerHTML = finals.map(t => {
    const mainW      = (t.mainPts  / maxTotal * 100).toFixed(1);
    const bonusW     = (t.bonusPts / maxTotal * 100).toFixed(1);
    const run4W      = (t.run4Pts  / maxTotal * 100).toFixed(1);
    const activityW  = (t.activityPts / maxTotal * 100).toFixed(1);
    return `
      <div class="chart-row">
        <div class="chart-label">${t.emoji} ${t.name}</div>
        <div class="chart-bar-stacked">
          <div class="chart-bar-segment" style="width:${mainW}%; background:${t.color}" title="Hauptpunkte: ${t.mainPts}"></div>
          <div class="chart-bar-segment" style="width:${bonusW}%; background:${t.color}aa" title="Bonuspunkte: ${t.bonusPts}"></div>
          <div class="chart-bar-segment" style="width:${run4W}%;  background:${t.color}55" title=">4km Punkte: ${t.run4Pts}"></div>
          <div class="chart-bar-segment" style="width:${activityW}%; background:${t.color}33" title="Aktivitäts-Punkte: ${t.activityPts}"></div>
        </div>
        <div class="fw-bold" style="min-width:40px; text-align:right; font-size:.9rem">${t.total}</div>
      </div>
    `;
  }).join('') + `
    <div class="chart-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#888"></div> Hauptpunkte</div>
      <div class="legend-item"><div class="legend-dot" style="background:#888a"></div> Bonuspunkte</div>
      <div class="legend-item"><div class="legend-dot" style="background:#8885"></div> Läufe &gt;4km Punkte</div>
      <div class="legend-item"><div class="legend-dot" style="background:#88833"></div> Aktivitäts-Punkte</div>
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
