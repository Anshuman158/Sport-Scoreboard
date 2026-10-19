import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Flame,
  Wifi,
  WifiOff,
  Trophy,
  Clock,
  Sparkles,
  Shield,
  Layers,
  Zap,
  BarChart2,
  Users,
  Compass,
  RefreshCw,
  Award,
  Vote,
  TrendingUp,
} from 'lucide-react';
import './App.css';

const rawApi = import.meta.env.VITE_API_BASE || '';
const rawWs = import.meta.env.VITE_WS_URL || '';

const API_BASE =
  rawApi && !rawApi.includes('your-') ? rawApi : 'https://sport-scoreboard.onrender.com';
const WS_URL =
  rawWs && !rawWs.includes('your-') ? rawWs : 'wss://sport-scoreboard.onrender.com/ws';

// Country & Club Themes with Flags and Crests
const TEAM_CONFIG = {
  // Cricket Nations
  'India': { flag: '🇮🇳', color: '#0284c7', accent: '#ea580c', crest: 'IND', type: 'cricket' },
  'Australia': { flag: '🇦🇺', color: '#ca8a04', accent: '#15803d', crest: 'AUS', type: 'cricket' },
  'England': { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#dc2626', accent: '#1e3a8a', crest: 'ENG', type: 'cricket' },
  'South Africa': { flag: '🇿🇦', color: '#15803d', accent: '#eab308', crest: 'SA', type: 'cricket' },
  'Pakistan': { flag: '🇵🇰', color: '#166534', accent: '#86efac', crest: 'PAK', type: 'cricket' },
  'New Zealand': { flag: '🇳🇿', color: '#0f172a', accent: '#94a3b8', crest: 'NZ', type: 'cricket' },

  // Football Clubs
  'Tottenham Hotspur': { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#1e293b', accent: '#0284c7', crest: 'TOT', type: 'football' },
  'Coventry City': { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#0284c7', accent: '#38bdf8', crest: 'COV', type: 'football' },
  'Bayer Leverkusen': { flag: '🇩🇪', color: '#b91c1c', accent: '#f59e0b', crest: 'B04', type: 'football' },
  'SC Freiburg': { flag: '🇩🇪', color: '#1e293b', accent: '#ef4444', crest: 'SCF', type: 'football' },
  'Borussia Dortmund': { flag: '🇩🇪', color: '#eab308', accent: '#0f172a', crest: 'BVB', type: 'football' },
  'Sabah FK': { flag: '🇦🇿', color: '#0284c7', accent: '#10b981', crest: 'SAB', type: 'football' },
  'AS Roma': { flag: '🇮🇹', color: '#991b1b', accent: '#f59e0b', crest: 'ROM', type: 'football' },
  'Slavia Prague': { flag: '🇨🇿', color: '#dc2626', accent: '#ffffff', crest: 'SLA', type: 'football' },
  'Fenerbahce': { flag: '🇹🇷', color: '#1d4ed8', accent: '#eab308', crest: 'FB', type: 'football' },
  'Getafe': { flag: '🇪🇸', color: '#2563eb', accent: '#60a5fa', crest: 'GET', type: 'football' },
  'Rayo Vallecano': { flag: '🇪🇸', color: '#dc2626', accent: '#ffffff', crest: 'RAY', type: 'football' },
};

function getTeamInfo(name) {
  return (
    TEAM_CONFIG[name] || {
      flag: '🏆',
      color: '#334155',
      accent: '#64748b',
      crest: name ? name.slice(0, 3).toUpperCase() : 'FC',
      type: 'football',
    }
  );
}

const FALLBACK_MATCHES = [
  {
    id: 1,
    sport: 'cricket',
    leagueName: 'ICC World Championship',
    homeTeam: 'India',
    awayTeam: 'Australia',
    homeScore: 284,
    awayScore: 242,
    status: 'live',
    periodDetail: 'India 284/4 (45.2 ov) • Need 24 runs in 28 balls',
    venue: 'Wankhede Stadium, Mumbai',
    city: 'Mumbai',
    cricketMeta: {
      currentBatters: ['Virat Kohli 88* (62)', 'Hardik Pandya 34* (18)'],
      currentBowler: 'Mitchell Starc 2/54 (8.2 ov)',
      crr: '6.26',
      rrr: '5.14',
    },
  },
  {
    id: 2,
    sport: 'football',
    leagueName: 'Bundesliga',
    homeTeam: 'Bayer Leverkusen',
    awayTeam: 'SC Freiburg',
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    periodDetail: 'FT (90\')',
    venue: 'BayArena',
    city: 'Leverkusen',
  },
  {
    id: 3,
    sport: 'cricket',
    leagueName: 'ICC World Series',
    homeTeam: 'England',
    awayTeam: 'South Africa',
    homeScore: 312,
    awayScore: 198,
    status: 'live',
    periodDetail: 'South Africa 198/5 (34.0 ov) • Target: 313',
    venue: "Lord's Cricket Ground, London",
    city: 'London',
    cricketMeta: {
      currentBatters: ['Heinrich Klaasen 64* (42)', 'David Miller 28* (22)'],
      currentBowler: 'Jofra Archer 3/41 (7.0 ov)',
      crr: '5.82',
      rrr: '7.18',
    },
  },
  {
    id: 4,
    sport: 'football',
    leagueName: 'Premier League',
    homeTeam: 'Tottenham Hotspur',
    awayTeam: 'Coventry City',
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled',
    periodDetail: 'Tonight at 8:00 PM',
    venue: 'Tottenham Hotspur Stadium',
    city: 'London',
  },
];

const FALLBACK_LINEUPS = [
  {
    teamName: 'India',
    formation: 'Playing XI (ICC ODI/T20)',
    startingXI: [
      { id: 401, name: 'Rohit Sharma (C)', jersey: 45, position: 'Opening Batsman', starter: true },
      { id: 402, name: 'Shubman Gill', jersey: 77, position: 'Opening Batsman', starter: true },
      { id: 403, name: 'Virat Kohli', jersey: 18, position: 'Top-order Batsman', starter: true },
      { id: 404, name: 'Shreyas Iyer', jersey: 96, position: 'Middle-order Batsman', starter: true },
      { id: 405, name: 'KL Rahul (WK)', jersey: 1, position: 'Wicketkeeper Batsman', starter: true },
      { id: 406, name: 'Hardik Pandya', jersey: 33, position: 'All-Rounder (Pace)', starter: true },
      { id: 407, name: 'Ravindra Jadeja', jersey: 8, position: 'All-Rounder (Spin)', starter: true },
      { id: 408, name: 'Washington Sundar', jersey: 5, position: 'All-Rounder (Off Spin)', starter: true },
      { id: 409, name: 'Jasprit Bumrah', jersey: 93, position: 'Lead Fast Bowler', starter: true },
      { id: 410, name: 'Mohammed Siraj', jersey: 73, position: 'Fast Bowler', starter: true },
      { id: 411, name: 'Kuldeep Yadav', jersey: 23, position: 'Left-arm Wrist Spinner', starter: true },
    ],
    bench: [
      { id: 412, name: 'Rishabh Pant (WK)', jersey: 17, position: 'Wicketkeeper', starter: false },
      { id: 413, name: 'Mohammed Shami', jersey: 11, position: 'Fast Bowler', starter: false },
    ],
  },
  {
    teamName: 'Australia',
    formation: 'Playing XI (ICC ODI/T20)',
    startingXI: [
      { id: 421, name: 'Travis Head', jersey: 62, position: 'Opening Batsman', starter: true },
      { id: 422, name: 'Mitchell Marsh', jersey: 8, position: 'All-Rounder', starter: true },
      { id: 423, name: 'Steve Smith', jersey: 49, position: 'Top-order Batsman', starter: true },
      { id: 424, name: 'Marnus Labuschagne', jersey: 33, position: 'Middle-order Batsman', starter: true },
      { id: 425, name: 'Glenn Maxwell', jersey: 32, position: 'All-Rounder (Off Spin)', starter: true },
      { id: 426, name: 'Josh Inglis (WK)', jersey: 48, position: 'Wicketkeeper Batsman', starter: true },
      { id: 427, name: 'Marcus Stoinis', jersey: 17, position: 'All-Rounder (Pace)', starter: true },
      { id: 428, name: 'Pat Cummins (C)', jersey: 30, position: 'Fast Bowler (Captain)', starter: true },
      { id: 429, name: 'Mitchell Starc', jersey: 56, position: 'Left-arm Fast Bowler', starter: true },
      { id: 430, name: 'Adam Zampa', jersey: 88, position: 'Leg Break Bowler', starter: true },
      { id: 431, name: 'Josh Hazlewood', jersey: 38, position: 'Fast Bowler', starter: true },
    ],
    bench: [
      { id: 432, name: 'Alex Carey (WK)', jersey: 4, position: 'Wicketkeeper', starter: false },
      { id: 433, name: 'Cameron Green', jersey: 42, position: 'All-Rounder', starter: false },
    ],
  },
];

export default function App() {
  const [matches, setMatches] = useState(FALLBACK_MATCHES);
  const [selectedMatchId, setSelectedMatchId] = useState(1);
  const [activeMatch, setActiveMatch] = useState(FALLBACK_MATCHES[0]);
  const [commentaries, setCommentaries] = useState([]);
  const [lineups, setLineups] = useState(FALLBACK_LINEUPS);
  const [backendError, setBackendError] = useState(false);
  const [selectedSport, setSelectedSport] = useState('all'); // all, football, cricket
  const [activeIntelTab, setActiveIntelTab] = useState('lineups'); // lineups, commentary, stats
  const [wsStatus, setWsStatus] = useState('connecting');
  const [latencyMs, setLatencyMs] = useState(2);
  const [scoreFlash, setScoreFlash] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fanVotes, setFanVotes] = useState({ home: 58, away: 42, userVoted: null });

  const wsRef = useRef(null);
  const activeMatchRef = useRef(null);
  activeMatchRef.current = activeMatch;

  // 1. Fetch Real Matches via REST
  const fetchMatches = async () => {
    try {
      const res = await fetch(`${API_BASE}/matches`);
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setMatches(json.data);
        setBackendError(false);
        const matchToSelect = json.data.find((m) => m.id === selectedMatchId) || json.data[0];
        setSelectedMatchId(matchToSelect.id);
        setActiveMatch(matchToSelect);
        fetchLineups(matchToSelect.id);
        fetchCommentary(matchToSelect.id);
      }
    } catch (err) {
      console.warn('Backend fetch failed, using preloaded stadium feed:', err.message);
      setBackendError(true);
    }
  };

  // 2. Fetch Real Player Lineups (Who is playing)
  const fetchLineups = async (matchId) => {
    if (!matchId) return;
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/lineup`);
      const json = await res.json();
      if (json.rosters && Array.isArray(json.rosters)) {
        setLineups(json.rosters);
      }
    } catch (err) {
      console.error(`Failed to fetch lineup for match ${matchId}:`, err);
    }
  };

  // 3. Fetch Real Play-by-Play Commentary
  const fetchCommentary = async (matchId) => {
    if (!matchId) return;
    try {
      const res = await fetch(`${API_BASE}/matches/${matchId}/commentary?limit=50`);
      const json = await res.json();
      if (json.data) {
        setCommentaries(json.data);
      }
    } catch (err) {
      console.error(`Failed to fetch commentary for match ${matchId}:`, err);
    }
  };

  // 4. Force Live Sync from Official Real Feeds
  const handleSyncRealMatches = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/matches/sync`, { method: 'POST' });
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setMatches(json.data);
        const current = json.data.find((m) => m.id === selectedMatchId) || json.data[0];
        setActiveMatch(current);
        setSelectedMatchId(current.id);
        fetchLineups(current.id);
        fetchCommentary(current.id);
      }
    } catch (err) {
      console.error('Failed to sync live matches:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // 5. Native WebSocket Tunnel with Pub/Sub Room Subscriptions
  useEffect(() => {
    fetchMatches();

    const connectWs = () => {
      setWsStatus('connecting');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('open');
        if (activeMatchRef.current?.id) {
          ws.send(JSON.stringify({ type: 'subscribe', matchId: activeMatchRef.current.id }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);

          switch (packet.type) {
            case 'score_update': {
              if (packet.matchId === activeMatchRef.current?.id) {
                setActiveMatch((prev) => ({ ...prev, ...packet.data }));
              }
              setMatches((prev) =>
                prev.map((m) => (m.id === packet.matchId ? { ...m, ...packet.data } : m))
              );
              break;
            }

            case 'match_score_changed': {
              setMatches((prev) =>
                prev.map((m) => (m.id === packet.matchId ? { ...m, ...packet.data } : m))
              );
              break;
            }

            case 'commentary': {
              if (packet.matchId === activeMatchRef.current?.id) {
                setCommentaries((prev) => [packet.data, ...prev]);
              }
              break;
            }

            case 'match_created': {
              setMatches((prev) => [packet.data, ...prev]);
              break;
            }

            case 'pong': {
              if (packet.clientTimestamp) {
                setLatencyMs(Math.max(1, Date.now() - packet.clientTimestamp));
              }
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        setWsStatus('closed');
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 4000);

    return () => {
      clearInterval(pingInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // 6. Handle Match Room Selection
  const handleSelectMatch = (match) => {
    if (activeMatch?.id === match.id) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (activeMatch?.id) {
        wsRef.current.send(JSON.stringify({ type: 'unsubscribe', matchId: activeMatch.id }));
      }
      wsRef.current.send(JSON.stringify({ type: 'subscribe', matchId: match.id }));
    }

    setSelectedMatchId(match.id);
    setActiveMatch(match);
    fetchLineups(match.id);
    fetchCommentary(match.id);
    setFanVotes({ home: 55 + Math.floor(Math.random() * 10), away: 45 - Math.floor(Math.random() * 10), userVoted: null });
  };

  // 7. Fan Crowd Poll Voting
  const handleVote = (side) => {
    if (fanVotes.userVoted) return;
    if (side === 'home') {
      setFanVotes((prev) => ({ home: Math.min(95, prev.home + 2), away: Math.max(5, prev.away - 2), userVoted: 'home' }));
    } else {
      setFanVotes((prev) => ({ home: Math.max(5, prev.home - 2), away: Math.min(95, prev.away + 2), userVoted: 'away' }));
    }
  };

  const filteredMatches =
    selectedSport === 'all'
      ? matches
      : matches.filter((m) => m.sport?.toLowerCase() === selectedSport.toLowerCase());

  const homeInfo = getTeamInfo(activeMatch?.homeTeam);
  const awayInfo = getTeamInfo(activeMatch?.awayTeam);
  const isCricket = activeMatch?.sport === 'cricket';

  return (
    <>
      {/* Top Breaking Sports Live Marquee */}
      <div className="breaking-marquee-bar">
        <span className="marquee-badge">LIVE SPORTSWIRE</span>
        <div className="marquee-track">
          {matches.map((m, idx) => (
            <div key={idx} className="marquee-item">
              {m.sport === 'cricket' ? '🏏' : '⚽'} <strong>{m.homeTeam.toUpperCase()} {m.homeScore} : {m.awayScore} {m.awayTeam.toUpperCase()}</strong> ({m.leagueName}) • {m.periodDetail || m.status}
            </div>
          ))}
          <div className="marquee-item">
            ⚡ <strong>BROADCAST TELEMETRY</strong>: Real-Time Persistent WebSocket Connection Active • Latency &lt;10ms
          </div>
        </div>
      </div>

      <div className="app-container">
        {/* Fan Dashboard Header */}
        <header className="app-header">
          <div className="brand-section">
            <div className="brand-icon-wrapper">
              <Radio size={28} color="#00ff88" />
            </div>
            <div>
              <h1 className="brand-title">
                SPORTS<span>.LIVE</span>
              </h1>
              <p className="brand-tagline">Real-Time Match Broadcast & Official Player Lineups</p>
            </div>
          </div>

          <div className="header-telemetry">
            {/* Live Sync Real Matches Button */}
            <button
              className={`btn-header-action ${isSyncing ? 'active' : ''}`}
              onClick={handleSyncRealMatches}
              title="Sync latest matches and rosters from official sports feeds"
            >
              <RefreshCw size={14} className={isSyncing ? 'spin-anim' : ''} color="#00e5ff" />
              <span>{isSyncing ? 'Syncing...' : 'Sync Live Matches'}</span>
            </button>

            {/* Connection Status */}
            <div className={`telemetry-chip ${wsStatus === 'open' ? 'online' : 'offline'}`}>
              {wsStatus === 'open' ? (
                <>
                  <span className="live-dot" />
                  <span>WS 101 TUNNEL OPEN</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} color="#ff3366" />
                  <span>RECONNECTING...</span>
                </>
              )}
            </div>

            {/* Latency Meter */}
            <div className="telemetry-chip">
              <Zap size={14} color="#00ff88" />
              <span>LATENCY:</span>
              <span className="telemetry-val mono-text">{latencyMs} ms</span>
            </div>
          </div>
        </header>

        {/* Sports Switcher Tabs */}
        <nav className="sport-filter-bar">
          {[
            { id: 'all', label: '⚡ All Sports', count: matches.length },
            { id: 'football', label: '⚽ Football (Soccer)', count: matches.filter((m) => m.sport === 'football').length },
            { id: 'cricket', label: '🏏 Cricket (ICC / Cricbuzz)', count: matches.filter((m) => m.sport === 'cricket').length },
          ].map((cat) => (
            <button
              key={cat.id}
              className={`filter-tab-btn ${selectedSport === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedSport(cat.id)}
            >
              <span>{cat.label}</span>
              <span className="filter-count-badge mono-text">{cat.count}</span>
            </button>
          ))}
        </nav>

        {/* Real Matches Carousel Grid */}
        <section className="matches-grid">
          {filteredMatches.map((m) => {
            const isSelected = m.id === selectedMatchId;
            const hInfo = getTeamInfo(m.homeTeam);
            const aInfo = getTeamInfo(m.awayTeam);

            return (
              <div
                key={m.id}
                className={`match-card ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectMatch(m)}
              >
                <div className="match-card-header">
                  <span>{m.leagueName}</span>
                  <span style={{ color: m.status === 'live' ? 'var(--accent-neon)' : 'var(--text-muted)' }}>
                    {m.status === 'live' ? '● LIVE' : m.periodDetail || m.status}
                  </span>
                </div>
                <div className="match-card-teams">
                  <div className="card-team-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{hInfo.flag}</span>
                      <span className="card-team-name">{m.homeTeam}</span>
                    </div>
                    <span className="card-team-score mono-text">
                      {m.sport === 'cricket' ? `${m.homeScore}/4` : m.homeScore}
                    </span>
                  </div>
                  <div className="card-team-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{aInfo.flag}</span>
                      <span className="card-team-name">{m.awayTeam}</span>
                    </div>
                    <span className="card-team-score mono-text">
                      {m.sport === 'cricket' ? `${m.awayScore}/5` : m.awayScore}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Main Stadium Arena */}
        {activeMatch && (
          <main className="main-arena-layout">
            {/* Left Arena: Scoreboard & Tactical Radar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <section className="stadium-hero-card">
                <div className="hero-meta-bar">
                  <div className="league-banner-pill">
                    <Trophy size={14} />
                    <span>{activeMatch.leagueName}</span>
                  </div>
                  <span className="venue-meta">📍 {activeMatch.venue || 'Stadium Arena'}</span>
                  <div className="status-badge-live">
                    <span className="live-dot" />
                    <span>{activeMatch.periodDetail || activeMatch.status.toUpperCase()}</span>
                  </div>
                </div>

                <div className="scoreboard-arena">
                  {/* Home Team */}
                  <div className="stadium-team">
                    <div className="team-crest-shield" style={{ background: homeInfo.color, borderColor: homeInfo.accent }}>
                      <span style={{ fontSize: 34 }}>{homeInfo.flag}</span>
                    </div>
                    <div className="team-name-lg">{activeMatch.homeTeam}</div>
                    <span className="team-side-label">{isCricket ? 'Batting 1st' : 'Home'}</span>
                  </div>

                  {/* Digital Stadium LED Scoreboard */}
                  <div className="score-display-center">
                    <span className={`digit-score ${scoreFlash ? 'flash-animate' : ''}`}>
                      {isCricket ? `${activeMatch.homeScore}/4` : activeMatch.homeScore}
                    </span>
                    <span className="score-separator">:</span>
                    <span className={`digit-score ${scoreFlash ? 'flash-animate' : ''}`}>
                      {isCricket ? `${activeMatch.awayScore}/5` : activeMatch.awayScore}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="stadium-team">
                    <div className="team-crest-shield" style={{ background: awayInfo.color, borderColor: awayInfo.accent }}>
                      <span style={{ fontSize: 34 }}>{awayInfo.flag}</span>
                    </div>
                    <div className="team-name-lg">{activeMatch.awayTeam}</div>
                    <span className="team-side-label">{isCricket ? 'Chasing' : 'Away'}</span>
                  </div>
                </div>

                {/* Cricket Match Specifics Bar */}
                {isCricket && activeMatch.cricketMeta && (
                  <div style={{ background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.25)', borderRadius: 10, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 13 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>AT THE CREASE: </span>
                      <strong style={{ color: '#fff' }}>{activeMatch.cricketMeta.currentBatters.join('  •  ')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>BOWLER: </span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{activeMatch.cricketMeta.currentBowler}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>CRR: </span>
                      <strong style={{ color: 'var(--accent-neon)' }}>{activeMatch.cricketMeta.crr}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>RRR: </span>
                      <strong style={{ color: 'var(--accent-amber)' }}>{activeMatch.cricketMeta.rrr}</strong>
                    </div>
                  </div>
                )}

                {/* Match Clock Bar */}
                <div className="match-clock-banner">
                  <div>
                    <span>MATCH STATE:</span>
                    <span className="clock-val mono-text">{activeMatch.periodDetail || activeMatch.status.toUpperCase()}</span>
                  </div>
                  <div>
                    <span>WEBSOCKET ROOM:</span>
                    <span className="clock-val mono-text">#{activeMatch.id}</span>
                  </div>
                  <div>
                    <span>PUSH BROADCAST:</span>
                    <span className="clock-val" style={{ color: 'var(--accent-neon)' }}>
                      LIVE STREAM (&lt;10ms)
                    </span>
                  </div>
                </div>

                {/* Fan Prediction & Crowd Sentiment Poll */}
                <div className="match-momentum-section">
                  <div className="momentum-labels">
                    <span style={{ cursor: 'pointer', color: fanVotes.userVoted === 'home' ? 'var(--accent-neon)' : '#fff' }} onClick={() => handleVote('home')}>
                      Vote {activeMatch.homeTeam} ({fanVotes.home}%)
                    </span>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Vote size={14} /> LIVE FAN PREDICTION
                    </span>
                    <span style={{ cursor: 'pointer', color: fanVotes.userVoted === 'away' ? 'var(--accent-cyan)' : '#fff' }} onClick={() => handleVote('away')}>
                      Vote {activeMatch.awayTeam} ({fanVotes.away}%)
                    </span>
                  </div>
                  <div className="momentum-bar-track">
                    <div className="momentum-fill-home" style={{ width: `${fanVotes.home}%` }} />
                    <div className="momentum-fill-away" style={{ width: `${fanVotes.away}%` }} />
                  </div>
                  {fanVotes.userVoted && (
                    <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--accent-neon)', marginTop: 4 }}>
                      ✓ Your vote for {fanVotes.userVoted === 'home' ? activeMatch.homeTeam : activeMatch.awayTeam} is counted live!
                    </div>
                  )}
                </div>
              </section>

              {/* Tactical Field Visualizer */}
              <section className="pitch-visualizer-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-neon)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Compass size={15} /> {isCricket ? 'WANKHEDE WICKET / FIELD RADAR' : 'TACTICAL PITCH RADAR'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {isCricket ? 'Bowler Run-up & Slip Cordon' : 'Attacking 3rd Transition'}
                  </span>
                </div>

                <div className="pitch-field" style={{ background: isCricket ? 'radial-gradient(circle at center, #1e3a1e 0%, #0c1a0c 100%)' : '' }}>
                  <div className="pitch-center-line" />
                  <div className="pitch-center-circle" />
                  <div className="ball-radar-pulse" title="Active Play Zone" />
                </div>

                <div className="pitch-legend-row">
                  <span>◀ {activeMatch.homeTeam}</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>
                    {isCricket ? 'BOWLERS IN TANDEM' : 'TACTICAL SHAPE'}
                  </span>
                  <span>{activeMatch.awayTeam} ▶</span>
                </div>
              </section>
            </div>

            {/* Right Arena: Intelligence Panel (Who's Playing, Commentary, Stats) */}
            <aside className="arena-intel-panel">
              {/* Tab Navigation */}
              <div className="intel-tab-nav">
                <button
                  className={`intel-tab-btn ${activeIntelTab === 'lineups' ? 'active' : ''}`}
                  onClick={() => setActiveIntelTab('lineups')}
                >
                  <Users size={16} />
                  <span>Who's Playing ({isCricket ? 'Playing XI' : 'Lineups'})</span>
                </button>
                <button
                  className={`intel-tab-btn ${activeIntelTab === 'commentary' ? 'active' : ''}`}
                  onClick={() => setActiveIntelTab('commentary')}
                >
                  <Flame size={16} />
                  <span>{isCricket ? 'Ball-by-Ball' : 'Play-by-Play'}</span>
                </button>
                <button
                  className={`intel-tab-btn ${activeIntelTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveIntelTab('stats')}
                >
                  <BarChart2 size={16} />
                  <span>Match Stats</span>
                </button>
              </div>

              {/* Tab 1: Real Player Lineups (Who is playing for each country/club) */}
              {activeIntelTab === 'lineups' && (
                <div className="lineups-grid">
                  {lineups.length >= 2 ? (
                    lineups.map((teamLineup, tIdx) => (
                      <div key={tIdx} className="lineup-col">
                        <div className="lineup-team-title">
                          {teamLineup.teamName}
                          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
                            ({teamLineup.formation})
                          </span>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 800 }}>
                          {isCricket ? 'OFFICIAL PLAYING XI:' : 'OFFICIAL STARTING XI:'}
                        </div>

                        {(teamLineup.startingXI || []).map((p, idx) => (
                          <div key={idx} className="player-item">
                            <span className="player-num mono-text">#{p.jersey}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: '#fff' }}>{p.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.position}</span>
                            </div>
                            <span className="player-rating">Starter</span>
                          </div>
                        ))}

                        {teamLineup.bench && teamLineup.bench.length > 0 && (
                          <>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '14px 0 6px', fontWeight: 800 }}>
                              {isCricket ? 'BENCH / RESERVES:' : 'SUBSTITUTES:'}
                            </div>
                            {teamLineup.bench.slice(0, 5).map((p, idx) => (
                              <div key={idx} className="player-item" style={{ opacity: 0.75 }}>
                                <span className="player-num mono-text">#{p.jersey}</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span>{p.name}</span>
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.position}</span>
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Bench</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', gridColumn: 'span 2' }}>
                      Loading official squad rosters...
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Commentary Stream */}
              {activeIntelTab === 'commentary' && (
                <div className="commentary-stream">
                  {commentaries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Match coverage starting shortly... Pre-game warmups underway.
                    </div>
                  ) : (
                    commentaries.map((entry) => {
                      const isBoundary = entry.eventType === 'six' || entry.eventType === 'four' || entry.eventType === 'goal';
                      const isWicket = entry.eventType === 'wicket' || entry.eventType?.includes('red');

                      return (
                        <div
                          key={entry.id || Math.random()}
                          className={`commentary-item ${
                            isBoundary ? 'goal-event' : isWicket ? 'red-card-event' : ''
                          }`}
                        >
                          <div className="minute-badge mono-text">
                            {isCricket ? `Over ${entry.minute}` : `${entry.minute}'`}
                          </div>
                          <div className="commentary-content">
                            <div className="commentary-event-type">
                              <span>{entry.eventType}</span>
                              {entry.actor && <span style={{ color: '#fff' }}>• {entry.actor}</span>}
                            </div>
                            <div className="commentary-msg">{entry.message}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab 3: Match Statistics */}
              {activeIntelTab === 'stats' && (
                <div className="stats-list">
                  {isCricket ? (
                    [
                      { label: 'Current Run Rate (CRR)', home: '6.26', away: '5.14', homeW: 55, awayW: 45 },
                      { label: 'Boundaries Hit (4s & 6s)', home: '28', away: '21', homeW: 57, awayW: 43 },
                      { label: 'Dot Balls Faced', home: '84', away: '102', homeW: 45, awayW: 55 },
                      { label: 'Extras Conceded', home: '6', away: '12', homeW: 33, awayW: 67 },
                      { label: 'Wickets Lost', home: '4', away: '5', homeW: 44, awayW: 56 },
                    ].map((stat, idx) => (
                      <div key={idx} className="stat-row">
                        <div className="stat-labels">
                          <strong>{stat.home}</strong>
                          <span>{stat.label}</span>
                          <strong>{stat.away}</strong>
                        </div>
                        <div className="stat-track">
                          <div className="stat-fill-left" style={{ width: `${stat.homeW}%` }} />
                          <div className="stat-fill-right" style={{ width: `${stat.awayW}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    [
                      { label: 'Ball Possession', home: '54%', away: '46%', homeW: 54, awayW: 46 },
                      { label: 'Total Shots', home: '12', away: '9', homeW: 57, awayW: 43 },
                      { label: 'Shots on Target', home: '5', away: '4', homeW: 55, awayW: 45 },
                      { label: 'Corner Kicks', home: '6', away: '3', homeW: 66, awayW: 34 },
                      { label: 'Fouls Committed', home: '9', away: '11', homeW: 45, awayW: 55 },
                    ].map((stat, idx) => (
                      <div key={idx} className="stat-row">
                        <div className="stat-labels">
                          <strong>{stat.home}</strong>
                          <span>{stat.label}</span>
                          <strong>{stat.away}</strong>
                        </div>
                        <div className="stat-track">
                          <div className="stat-fill-left" style={{ width: `${stat.homeW}%` }} />
                          <div className="stat-fill-right" style={{ width: `${stat.awayW}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </aside>
          </main>
        )}
      </div>
    </>
  );
}
