// Next, React
import { FC, useEffect, useState, useRef } from 'react';
import pkg from '../../../package.json';

// ❌ DO NOT EDIT ANYTHING ABOVE THIS LINE

// --- GAME CONFIGURATION ---
const GOD_MODE = false; 
const SHOW_JUMP_LINE = false;

// PHYSICS
const GRAVITY = 0.85;           
const JUMP_FORCE = -11.5;
const DIVE_FORCE = 2.0;       
const BASE_SPEED = 7.5;         
const SPEED_MULTIPLIER = 1.25;  
const SPAWN_RATE_BASE = 75;     
const PLAYER_SIZE = 24;
const HITBOX_PADDING = 5;
const JUMP_BUFFER_TIME = 150; 

// WATER TUNING (The Real Threat)
const WATER_START_Y = 550;           // Visible at start!
const WATER_RISE_BASE = 0.15;        // Aggressive base speed
const WATER_RISE_ACCEL = 0.1;        // +10% speed per level
const WATER_PUSH_ORB = 150;          // Reward
const WATER_PUSH_GLITCH = 250;       // Big Reward
const WATER_PUSH_LEVEL = 120;        // Level up breather

// PROGRESSION
const METERS_PER_LEVEL = 300;   
const PIXELS_TO_METERS = 0.015; 

// ASSETS
const SOUNDS = {
    JUMP: '/sounds/jump.wav',
    CRASH: '/sounds/crash.wav',
    LEVEL: '/sounds/levelup.mp3',
    BGM: '/sounds/bgm.mp3',
};

const ACHIEVEMENTS = [
    { id: 'novice', name: 'SURFACE BREACHER', score: 300, icon: '🌊' },
    { id: 'pro',    name: 'TRENCH ESCAPEE',   score: 900, icon: '🦈' },
    { id: 'god',    name: 'THE UNSINKABLE',   score: 1500, icon: '👑' },
];

const ENVIRONMENTS = [
    { name: "THE ABYSS",    type: 'UNDERWATER', bgTop: '#000000', bgBot: '#0a0a2a', accent: '#00ffff' },
    { name: "MID-DEPTH",    type: 'UNDERWATER', bgTop: '#0a0a2a', bgBot: '#004488', accent: '#39ff14' },
    { name: "THE REEF",     type: 'UNDERWATER', bgTop: '#004488', bgBot: '#44aaff', accent: '#ffffff' },
    { name: "SURFACE",      type: 'SKY',        bgTop: '#44aaff', bgBot: '#88ccff', accent: '#ffff00' },
    { name: "STROSPHERE",   type: 'SKY',        bgTop: '#001133', bgBot: '#44aaff', accent: '#ff00ff' },
    { name: "VOID",         type: 'SPACE',      bgTop: '#000000', bgBot: '#000000', accent: '#ff0000' }
];

// TYPES
type Player = { y: number; vy: number; grounded: boolean; color: string; jumps: number; flash: number; jumpBuffer: number; holding: boolean };
type Obstacle = { x: number; y: number; w: number; h: number; type: 'BLOCK' | 'ORB' | 'GHOST' | 'GLITCH'; lane: 'LEFT' | 'RIGHT'; passed: boolean; collided: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; type?: 'PULSE' | 'DUST' | 'BUBBLE' };
type BgProp = { x: number; y: number; size: number; speed: number; type: 'BUBBLE' | 'CLOUD' | 'STAR' };
type FloatingText = { x: number; y: number; text: string; life: number; color: string };
type GameMode = 'LINKED' | 'DUAL';
type GameState = 'START' | 'COUNTDOWN' | 'TUTORIAL' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

// --- 1. THE APP SHELL (HomeView) ---
export const HomeView: FC = ({ }) => {
  const [activeTab, setActiveTab] = useState('Play');

  return (
    <div className="flex flex-col h-screen w-full bg-black justify-center items-center font-mono select-none text-white overflow-hidden">
        
        {/* --- SCROLLY FAKE HEADER --- */}
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 mb-4 z-50 border border-white/10">
          {['Play', 'Rank', 'Shop'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1 text-xs font-bold transition-all duration-200 ${
                activeTab === tab 
                  ? 'bg-slate-800 text-white shadow-lg scale-105' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="relative w-full max-w-[400px] h-full max-h-[800px] border-x-4 border-gray-900 bg-black shadow-2xl overflow-hidden rounded-3xl">
            {/* GAME VIEW */}
            <div className={`${activeTab === 'Play' ? 'block' : 'hidden'} h-full`}>
                <GameSandbox />
            </div>

            {/* LEADERBOARD VIEW */}
            {activeTab === 'Rank' && <LeaderboardView />}

            {/* SHOP VIEW */}
            {activeTab === 'Shop' && (
              <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-black space-y-4">
                <span className="text-4xl mb-4">🛒</span>
                <h2 className="text-xl font-bold mb-2">DRONE SHOP</h2>
                <p className="text-gray-500 text-xs mb-6">Unlock skins by reaching milestones!</p>
                <div className="space-y-2 w-full max-w-[280px]">
                  <div className="bg-white/5 border border-gray-700 p-3 rounded flex justify-between items-center">
                    <span className="text-xs text-gray-500">🔒 NEON SKIN</span>
                    <span className="text-[10px] text-gray-600">Reach 500m</span>
                  </div>
                  <div className="bg-white/5 border border-gray-700 p-3 rounded flex justify-between items-center">
                    <span className="text-xs text-gray-500">🔒 GOLD SKIN</span>
                    <span className="text-[10px] text-gray-600">Reach 1000m</span>
                  </div>
                </div>
              </div>
            )}
        </div>
    </div>
  );
};

// --- 2. LEADERBOARD COMPONENT ---
const LeaderboardView: FC = () => {
    const [scores, setScores] = useState<any[]>([]);

    useEffect(() => {
        const fakeScores = [
            { username: "SyncMaster", score: 1540 },
            { username: "DeepDiver", score: 1200 },
            { username: "Pilot_01", score: 850 },
            { username: "GlitchHunter", score: 620 },
        ];
        const localHigh = localStorage.getItem('syncOrSinkHigh');
        const localName = localStorage.getItem('syncOrSinkName') || "YOU";
        if (localHigh) {
            const userScore = parseInt(localHigh);
            fakeScores.push({ username: localName, score: userScore });
        }
        fakeScores.sort((a, b) => b.score - a.score);
        setScores(fakeScores);
    }, []);

    return (
        <div className="flex flex-col h-full bg-black p-6 overflow-y-auto">
            <h2 className="text-2xl font-black italic text-center mb-6 text-yellow-400">TOP PILOTS</h2>
            <div className="space-y-2">
                {scores.map((s, i) => {
                    const isUser = s.username === (localStorage.getItem('syncOrSinkName') || "YOU");
                    return (
                        <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${isUser ? 'bg-white/20 border-cyan-400' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold w-6 ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{i+1}</span>
                                <span className={`text-sm font-bold ${isUser ? 'text-cyan-400' : 'text-white'}`}>{s.username}</span>
                            </div>
                            <span className="text-sm font-mono text-white">{s.score}m</span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-8 text-center">
                <button onClick={() => window.location.reload()} className="text-xs text-gray-500 underline hover:text-white transition-colors">Refresh Scores</button>
            </div>
        </div>
    );
};

// --- 3. THE GAME LOGIC (GameSandbox) ---
const GameSandbox: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI State
  const [gameState, setGameState] = useState<GameState>('START');
  const [gameMode, setGameMode] = useState<GameMode>('LINKED');
  const [score, setScore] = useState(0); 
  const [highScore, setHighScore] = useState(0);
  const [currentEnv, setCurrentEnv] = useState(ENVIRONMENTS[0]);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [ghostTimeRemaining, setGhostTimeRemaining] = useState(0); 
  const [countdown, setCountdown] = useState(3);
  const [isMuted, setIsMuted] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [username, setUsername] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  
  // NEW: Water Distance State for HUD
  const [waterDist, setWaterDist] = useState(999);
  const [totalRuns, setTotalRuns] = useState(0);

  // Game Logic Refs
  const gameStateRef = useRef<GameState>('START');
  const gameModeRef = useRef<GameMode>('LINKED');
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);
  const distanceRef = useRef(0);
  const levelRef = useRef(0);

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const frameCount = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const shakeRef = useRef(0);
  const waterLevelRef = useRef(WATER_START_Y); // START VISIBLE
  
  // Powerup Refs
  const shieldActive = useRef(false);
  const shieldTimer = useRef(0);
  const ghostActive = useRef(false); 
  const ghostTimer = useRef(0);
  const glitchActive = useRef(false); 
  const glitchTimer = useRef(0);

  const audioCtx = useRef<Record<string, HTMLAudioElement>>({});
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  const transitionProgress = useRef(1); 
  const prevEnvIdx = useRef(0);
  const nextEnvIdx = useRef(0);

  const pLeft = useRef<Player>({ y: 0, vy: 0, grounded: true, color: '#fff', jumps: 0, flash: 0, jumpBuffer: 0, holding: false });
  const pRight = useRef<Player>({ y: 0, vy: 0, grounded: true, color: '#fff', jumps: 0, flash: 0, jumpBuffer: 0, holding: false });
  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);
  const texts = useRef<FloatingText[]>([]);
  const bgProps = useRef<BgProp[]>([]);

  // --- INIT ---
  useEffect(() => {
      const savedScore = localStorage.getItem('syncOrSinkHigh');
      if (savedScore) {
          setHighScore(parseInt(savedScore));
          highScoreRef.current = parseInt(savedScore); 
      }
      const savedRuns = localStorage.getItem('syncOrSinkRuns');
      if (savedRuns) setTotalRuns(parseInt(savedRuns));

      const savedName = localStorage.getItem('syncOrSinkName');
      if (savedName) {
          setUsername(savedName);
          setShowNameInput(false);
      }
      const savedBadges = localStorage.getItem('syncOrSinkBadges');
      if (savedBadges) setUnlockedBadges(JSON.parse(savedBadges));

      audioCtx.current['jump'] = new Audio(SOUNDS.JUMP);
      audioCtx.current['crash'] = new Audio(SOUNDS.CRASH);
      audioCtx.current['level'] = new Audio(SOUNDS.LEVEL);
      Object.values(audioCtx.current).forEach(a => a.volume = 0.4);

      const bgm = new Audio(SOUNDS.BGM);
      bgm.loop = true; 
      bgm.volume = 0.6; 
      bgmRef.current = bgm;

      const handlePauseTrigger = () => {
        if (gameStateRef.current === 'PLAYING') {
            gameStateRef.current = 'PAUSED';
            setGameState('PAUSED');
            if (bgmRef.current) bgmRef.current.pause();
        }
      };
      document.addEventListener('visibilitychange', () => { if (document.hidden) handlePauseTrigger(); });
      window.addEventListener('blur', handlePauseTrigger);
      return () => { window.removeEventListener('blur', handlePauseTrigger); };
  }, []);

  useEffect(() => {
      const bgm = bgmRef.current;
      if (!bgm) return;
      if (isMuted) { bgm.pause(); return; }
      if (gameState === 'PLAYING') {
          const playPromise = bgm.play();
          if (playPromise !== undefined) playPromise.catch(error => console.log("Audio play failed:", error));
      } else {
          bgm.pause();
          if (gameState === 'GAMEOVER') bgm.currentTime = 0;
      }
  }, [gameState, isMuted]);

  const pulse = (ms: number) => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
  };

  const triggerEvent = (key: string, x: number, y: number, color: string) => {
      if (!isMuted) {
          const sound = audioCtx.current[key];
          if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
      }
      particles.current.push({ x: x, y: y, vx: 0, vy: 0, life: 1.0, color: color, size: 10, type: 'PULSE' });
  }

  const checkAchievements = (finalScore: number) => {
      const newBadges = [...unlockedBadges];
      let changed = false;
      ACHIEVEMENTS.forEach(ach => {
          if (finalScore >= ach.score && !newBadges.includes(ach.id)) { newBadges.push(ach.id); changed = true; }
      });
      if (changed) {
          setUnlockedBadges(newBadges);
          localStorage.setItem('syncOrSinkBadges', JSON.stringify(newBadges));
      }
      if (finalScore > highScoreRef.current) {
          setHighScore(finalScore);
          highScoreRef.current = finalScore;
          localStorage.setItem('syncOrSinkHigh', finalScore.toString());
      }
      const newRuns = (parseInt(localStorage.getItem('syncOrSinkRuns') || '0')) + 1;
      localStorage.setItem('syncOrSinkRuns', newRuns.toString());
      setTotalRuns(newRuns);
  };

  const initWorld = () => {
    levelRef.current = 0; distanceRef.current = 0; scoreRef.current = 0; setScore(0);
    prevEnvIdx.current = 0; nextEnvIdx.current = 0; transitionProgress.current = 1; 
    setCurrentEnv(ENVIRONMENTS[0]); speedRef.current = BASE_SPEED;
    pLeft.current = { y: 450, vy: 0, grounded: true, color: ENVIRONMENTS[0].accent, jumps: 0, flash: 0, jumpBuffer: 0, holding: false };
    pRight.current = { y: 450, vy: 0, grounded: true, color: ENVIRONMENTS[0].accent, jumps: 0, flash: 0, jumpBuffer: 0, holding: false };
    obstacles.current = []; particles.current = []; texts.current = []; bgProps.current = [];
    waterLevelRef.current = WATER_START_Y; // VISIBLE START
    shieldActive.current = false; shieldTimer.current = 0;
    ghostActive.current = false; ghostTimer.current = 0;
    glitchActive.current = false; glitchTimer.current = 0;
    setGhostTimeRemaining(0); lastTimeRef.current = 0;
  };

  const spawnBgProp = (envType: string) => {
    const x = Math.random() * 400; const y = -50;
    let size = 0, speed = 0, type: any = 'BUBBLE';
    if (envType === 'UNDERWATER') { type = 'BUBBLE'; size = Math.random() * 4 + 2; speed = Math.random() * 1 + 0.5; } 
    else if (envType === 'SKY') { type = 'CLOUD'; size = Math.random() * 40 + 20; speed = Math.random() * 0.5 + 0.2; } 
    else { type = 'STAR'; size = Math.random() * 2 + 1; speed = Math.random() * 3 + 1; }
    bgProps.current.push({ x, y, size, speed, type });
  };

  const spawnExplosion = (x: number, y: number, color: string, count: number = 15) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x: x + 10, y: y + 10, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
        life: 1.0, color: color, size: Math.random() * 4 + 2
      });
    }
  };

  const spawnDust = (x: number, y: number) => {
      for (let i = 0; i < 5; i++) {
          particles.current.push({
              x: x + (Math.random() * 20 - 10), y: y, 
              vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 2,
              life: 0.6, color: '#fff', size: Math.random() * 3 + 1, type: 'DUST'
          });
      }
  };

  const spawnText = (x: number, y: number, text: string, color: string) => {
    texts.current.push({ x, y, text, life: 1.0, color });
  };

  // --- GAME LOOP ---
  const update = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = Math.min((time - lastTimeRef.current) / 16, 2);
    lastTimeRef.current = time;

    const W = 400, H = 600, MID = 200, FLOOR = 500;

    if (gameStateRef.current === 'PLAYING') {
      const currentSpeed = speedRef.current * (glitchActive.current ? 1.5 : 1.0);
      distanceRef.current += (currentSpeed * deltaTime) * PIXELS_TO_METERS;
      const currentAltitude = Math.floor(distanceRef.current);
      if (currentAltitude > scoreRef.current) { setScore(currentAltitude); scoreRef.current = currentAltitude; }

      // === THE REAL THREAT WATER LOGIC ===
      // 1. Calculate Aggressive Rise
      const baseRise = currentSpeed * WATER_RISE_BASE * deltaTime;
      const levelMultiplier = 1 + (levelRef.current * WATER_RISE_ACCEL);
      const totalRise = baseRise * levelMultiplier;
      
      waterLevelRef.current -= totalRise; 
      
      // 2. Cap water at top (don't let it go infinitely up)
      if (waterLevelRef.current < 50) { waterLevelRef.current = 50; }

      // 3. Update HUD State
      const leftDist = waterLevelRef.current - pLeft.current.y;
      const rightDist = waterLevelRef.current - pRight.current.y;
      setWaterDist(Math.floor(Math.min(leftDist, rightDist)));

      // 4. DROWNING CHECK
      if (pLeft.current.y > waterLevelRef.current - 20 || pRight.current.y > waterLevelRef.current - 20) {
          triggerEvent('crash', MID, waterLevelRef.current, '#00F');
          spawnText(MID, 300, "💀 DROWNED!", '#00BFFF');
          spawnExplosion(MID, waterLevelRef.current, '#00BFFF', 50);
          
          if (!GOD_MODE) {
                gameStateRef.current = 'GAMEOVER'; 
                setGameState('GAMEOVER'); 
                checkAchievements(scoreRef.current); 
                pulse(400); 
                if (bgmRef.current) { bgmRef.current.pause(); bgmRef.current.currentTime = 0; }
          }
      }

      if (transitionProgress.current < 1) {
        transitionProgress.current += 0.015 * deltaTime; if (transitionProgress.current >= 1) transitionProgress.current = 1;
      }

      const newLevel = Math.floor(currentAltitude / METERS_PER_LEVEL);
      if (newLevel > levelRef.current) {
        levelRef.current = newLevel; prevEnvIdx.current = nextEnvIdx.current;
        nextEnvIdx.current = Math.min(newLevel, ENVIRONMENTS.length - 1);
        transitionProgress.current = 0; setCurrentEnv(ENVIRONMENTS[nextEnvIdx.current]);
        speedRef.current = BASE_SPEED * Math.pow(SPEED_MULTIPLIER, newLevel);
        
        // REWARD: LEVEL UP PUSH
        waterLevelRef.current += WATER_PUSH_LEVEL; 
        
        spawnText(MID, 200, "DEPTH UP!", '#FFF'); triggerEvent('level', MID, 300, '#FFF');
        pulse(100); 
      }

      if (shieldActive.current) { shieldTimer.current -= deltaTime; if (shieldTimer.current <= 0) shieldActive.current = false; }
      if (ghostActive.current) {
        ghostTimer.current -= deltaTime; const remaining = Math.ceil(ghostTimer.current / 60);
        setGhostTimeRemaining(remaining > 0 ? remaining : 0); 
        if (ghostTimer.current <= 0) { ghostActive.current = false; setGhostTimeRemaining(0); spawnText(MID, 300, "PHASE ENDED", '#FFF'); pulse(50); }
      }
      if (glitchActive.current) {
          glitchTimer.current -= deltaTime; shakeRef.current = 5; 
          if (glitchTimer.current <= 0) { glitchActive.current = false; spawnText(MID, 300, "FLOW STABLE", '#FFF'); pulse(50); }
      }

      const activeEnv = ENVIRONMENTS[nextEnvIdx.current];
      if (Math.random() < 0.05) spawnBgProp(activeEnv.type);
      bgProps.current.forEach(p => p.y += (currentSpeed * 0.5 * p.speed) * deltaTime);
      bgProps.current = bgProps.current.filter(p => p.y < H + 50);

      [pLeft.current, pRight.current].forEach(p => {
        if (!p.holding && p.vy < 0) { p.vy *= 0.85; }
        
        p.vy += GRAVITY * deltaTime; 
        p.y += p.vy * deltaTime;
        if (p.flash > 0) p.flash -= deltaTime;
        if (p.jumpBuffer > 0) p.jumpBuffer -= deltaTime * 16; 

        if (p.y > FLOOR - PLAYER_SIZE) {
          if (!p.grounded) { spawnDust(p === pLeft.current ? MID/2 : MID + MID/2, FLOOR); }
          p.y = FLOOR - PLAYER_SIZE; p.vy = 0; p.grounded = true; p.jumps = 0;
          if (p.jumpBuffer > 0) {
              p.vy = JUMP_FORCE; p.jumps++; p.grounded = false; p.jumpBuffer = 0;
              spawnExplosion(p === pLeft.current ? 100 : 300, p.y + 20, '#fff', 5);
          }
        } else {
            p.grounded = false;
        }
      });

      frameCount.current += deltaTime;
      const currentSpawnRate = Math.max(30, SPAWN_RATE_BASE - (levelRef.current * 5));
      if (frameCount.current > currentSpawnRate) {
        const spawnLeft = (yOffset = 0) => obstacles.current.push({ x: MID/2 - 25, y: -50 + yOffset, w: 50, h: 30, type: 'BLOCK', lane: 'LEFT', passed: false, collided: false });
        const spawnRight = (yOffset = 0) => obstacles.current.push({ x: MID + (MID/2) - 25, y: -50 + yOffset, w: 50, h: 30, type: 'BLOCK', lane: 'RIGHT', passed: false, collided: false });
        const spawnSpecial = (type: 'ORB'|'GHOST'|'GLITCH') => {
            const lane = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
            obstacles.current.push({ x: lane === 'LEFT' ? MID/2 - 25 : MID + MID/2 - 25, y: -50, w: 50, h: 25, type: type, lane: lane, passed: false, collided: false });
        };
        const rand = Math.random();
        if (rand < 0.008 && !ghostActive.current) spawnSpecial('GHOST'); 
        else if (rand < 0.03 && !glitchActive.current) spawnSpecial('GLITCH');
        else if (rand < 0.08 && !shieldActive.current) spawnSpecial('ORB'); 
        else {
            const blockRand = Math.random();
            if (blockRand < 0.35) spawnLeft(); else if (blockRand < 0.70) spawnRight();  
            else { const shaveGap = -(currentSpeed * 22); if (Math.random() > 0.5) { spawnLeft(0); spawnRight(shaveGap); } else { spawnRight(0); spawnLeft(shaveGap); } }
        }
        frameCount.current = 0;
      }

      obstacles.current.forEach((obs, i) => {
        obs.y += currentSpeed * deltaTime;
        const p = obs.lane === 'LEFT' ? pLeft.current : pRight.current;
        const pX = obs.lane === 'LEFT' ? (MID/2 - PLAYER_SIZE/2) : (MID + MID/2 - PLAYER_SIZE/2);
        
        let hitPadding = HITBOX_PADDING;
        if (obs.type === 'GLITCH') hitPadding = 18; 

        const pHitX = pX + hitPadding; const pHitY = p.y + hitPadding;
        const pHitW = PLAYER_SIZE - (hitPadding * 2); const pHitH = PLAYER_SIZE - (hitPadding * 2);
        const obsHitX = obs.x + 2; const obsHitY = obs.y + 2;
        const obsHitW = obs.w - 4; const obsHitH = obs.h - 4;
        const isJumpingOver = !p.grounded && p.y < FLOOR - PLAYER_SIZE - 20;

        // COLLISION CHECK
        if (pHitX < obsHitX + obsHitW && pHitX + pHitW > obsHitX && pHitY < obsHitY + obsHitH && pHitY + pHitH > obsHitY) {
          if (obs.type === 'ORB') {
            if (!p.grounded) return; 
            shieldActive.current = true; shieldTimer.current = 300; 
            waterLevelRef.current += WATER_PUSH_ORB; // REWARD
            spawnText(pX, p.y - 40, "AIR UP!", '#00BFFF');
            spawnExplosion(pX, p.y, '#00BFFF', 30);
            obstacles.current.splice(i, 1); triggerEvent('level', pX, p.y, '#FFF'); pulse(50);
            return;
          }
          if (obs.type === 'GHOST') {
            if (!p.grounded) return; 
            ghostActive.current = true; ghostTimer.current = 480; spawnText(MID, 300, "PHASE SHIFT!", '#d946ef');
            obstacles.current.splice(i, 1); triggerEvent('level', pX, p.y, '#d946ef'); pulse(50);
            return;
          }
          if (obs.type === 'GLITCH') {
              if (glitchActive.current) return;
              glitchActive.current = true; glitchTimer.current = 360; 
              waterLevelRef.current += WATER_PUSH_GLITCH; // BIG REWARD
              spawnText(MID, 300, "SURGE! +250m!", '#ff0000'); shakeRef.current = 20;
              spawnExplosion(MID, 300, '#ff0000', 50);
              triggerEvent('crash', pX, p.y, '#F00'); obstacles.current.splice(i, 1); pulse(150);
              return;
          }
          else if (!isJumpingOver) {
            if (ghostActive.current) return; 
            obs.collided = true;
            if (shieldActive.current) {
              shieldActive.current = false; spawnExplosion(pX, p.y, '#FFF', 20); spawnText(MID, 300, "BUBBLE POPPED", '#F00');
              obstacles.current.splice(i, 1); shakeRef.current = 10; triggerEvent('crash', pX, p.y, '#F00'); pulse(100);
            } else if (p.flash <= 0) {
              // DAMAGE = WATER RISES
              shakeRef.current = 30; 
              spawnExplosion(pX, p.y, activeEnv.accent, 30); 
              triggerEvent('crash', pX, p.y, '#F00');
              
              waterLevelRef.current -= 150; // PUNISHMENT
              
              spawnText(MID, 300, "HULL BREACH!", '#FF0000');
              pulse(300); 
              p.flash = 30; 
              obstacles.current.splice(i, 1); 
            }
          }
        }
        
        if (!obs.collided && !obs.passed && obs.type === 'BLOCK') {
             const distX = Math.abs(pHitX - obsHitX);
             const distY = Math.abs(pHitY - obsHitY);
             if (distX < 40 && distY < 40 && !isJumpingOver) { /* Close Call */ }
        }

        if (!obs.passed && !obs.collided && obs.y > p.y + PLAYER_SIZE) obs.passed = true;
      });
      obstacles.current = obstacles.current.filter(o => o.y < H + 50);
    }

    if (gameStateRef.current === 'GAMEOVER') { 
        // Don't animate water on gameover, just freeze or slow rise
        if (waterLevelRef.current > -50) waterLevelRef.current -= 50 * deltaTime;
    }

    // --- RENDER ---
    ctx.save();
    
    // DANGER VIGNETTE
    if (gameStateRef.current === 'PLAYING' && waterDist < 100) {
        const dangerLevel = 1 - (waterDist / 100);
        ctx.fillStyle = `rgba(255, 0, 0, ${dangerLevel * 0.4})`;
        ctx.fillRect(0, 0, W, H);
        if (Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.font = "bold 12px monospace"; ctx.fillStyle = '#FF0000'; ctx.textAlign = 'center';
            ctx.fillText("⚠️ DANGER ZONE ⚠️", MID, 50); ctx.textAlign = 'start';
        }
    }

    if (glitchActive.current) { ctx.fillStyle = `rgba(50, 0, 0, ${Math.random() * 0.3})`; ctx.fillRect(0, 0, W, H); } 
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }

    // Speed Lines Effect
    if (glitchActive.current) {
        ctx.strokeStyle = `rgba(255, 255, 255, 0.2)`; ctx.lineWidth = 2;
        for(let i=0; i<5; i++) {
            const lx = Math.random() * W; const ly = Math.random() * H;
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 50); ctx.stroke();
        }
    }

    if (shakeRef.current > 0) { ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current); shakeRef.current *= 0.9; }

    const prevEnv = ENVIRONMENTS[prevEnvIdx.current];
    const prevGrad = ctx.createLinearGradient(0, 0, 0, H); prevGrad.addColorStop(0, prevEnv.bgTop); prevGrad.addColorStop(1, prevEnv.bgBot);
    ctx.fillStyle = prevGrad; ctx.fillRect(-1, -1, W + 2, H + 2); 

    if (transitionProgress.current > 0) {
        const nextEnv = ENVIRONMENTS[nextEnvIdx.current];
        const nextGrad = ctx.createLinearGradient(0, 0, 0, H); nextGrad.addColorStop(0, nextEnv.bgTop); nextGrad.addColorStop(1, nextEnv.bgBot);
        ctx.fillStyle = nextGrad;
        if (transitionProgress.current < 1) { const splitY = Math.ceil(H * transitionProgress.current) + 2; ctx.fillRect(-1, -1, W + 2, splitY); } 
        else ctx.fillRect(-1, -1, W + 2, H + 2);
    }

    // DRAW WATER (BETTER)
    const abyssY = Math.max(waterLevelRef.current, 0); 
    const waveOffset = Math.sin(Date.now() / 200) * 3;
    const waterGrad = ctx.createLinearGradient(0, abyssY, 0, H);
    waterGrad.addColorStop(0, 'rgba(0, 150, 255, 0.6)');   
    waterGrad.addColorStop(0.3, 'rgba(0, 100, 200, 0.8)'); 
    waterGrad.addColorStop(1, 'rgba(0, 20, 80, 1.0)');     
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, abyssY, W, H - abyssY);

    // WAVE LINE
    ctx.strokeStyle = '#00BFFF'; ctx.lineWidth = 3; ctx.shadowBlur = 10; ctx.shadowColor = '#00BFFF';
    ctx.beginPath();
    for (let x = 0; x < W; x += 10) {
        const y = abyssY + Math.sin((x + Date.now() / 100)) * waveOffset;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;

    // RISING BUBBLES
    if (Math.random() < 0.1 && abyssY < H) {
        particles.current.push({ x: Math.random() * W, y: abyssY + 10, vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 2 - 1, life: 1.0, color: '#00BFFF', size: Math.random() * 3 + 2, type: 'BUBBLE' });
    }

    // BG PROPS
    bgProps.current.forEach(p => {
      if (p.type === 'BUBBLE') { ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); } 
      else if (p.type === 'CLOUD') { ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(p.x, p.y, p.size * 2, p.size); } 
      else { ctx.fillStyle = '#FFF'; ctx.fillRect(p.x, p.y, p.size, p.size); }
    });

    if (abyssY > FLOOR) { ctx.fillStyle = '#fff'; ctx.fillRect(0, FLOOR, W, 2); }

    // DRAW DIVIDER LINE
    ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.strokeStyle = '#fff'; 
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(MID, 0); ctx.lineTo(MID, H); ctx.stroke(); ctx.shadowBlur = 0;

    if (SHOW_JUMP_LINE && gameStateRef.current === 'PLAYING') {
      const jumpY = FLOOR - 110; ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(0, jumpY); ctx.lineTo(W, jumpY); ctx.stroke(); ctx.setLineDash([]);
    }

    obstacles.current.forEach(obs => {
      if (obs.type === 'ORB') { ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(obs.x + obs.w/2, obs.y + obs.h/2, 10, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; } 
      else if (obs.type === 'GHOST') { ctx.shadowBlur = 20; ctx.shadowColor = '#d946ef'; ctx.fillStyle = '#d946ef'; ctx.beginPath(); ctx.arc(obs.x + obs.w/2, obs.y + obs.h/2, 10, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; } 
      else if (obs.type === 'GLITCH') { ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000'; ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.moveTo(obs.x + obs.w/2, obs.y); ctx.lineTo(obs.x + obs.w, obs.y + obs.h); ctx.lineTo(obs.x, obs.y + obs.h); ctx.fill(); ctx.shadowBlur = 0; }
      else { ctx.shadowBlur = 15; const activeEnv = ENVIRONMENTS[nextEnvIdx.current]; const color = obs.lane === 'LEFT' ? activeEnv.accent : '#FFF'; ctx.shadowColor = color; ctx.fillStyle = color; ctx.fillRect(obs.x, obs.y, obs.w, obs.h); ctx.fillStyle = '#000'; ctx.fillRect(obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4); }
    });

    const drawPlayer = (p: Player, xOffset: number, color: string) => {
      if (p.y > waterLevelRef.current + 20) return;

      const x = xOffset - PLAYER_SIZE / 2;
      if (p.flash > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;
      if (ghostActive.current) { ctx.globalAlpha = 0.4; ctx.shadowBlur = 0; } else { ctx.shadowBlur = 20; ctx.shadowColor = color; }
      ctx.fillStyle = color;
      if (shieldActive.current) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        if (shieldTimer.current < 120 && Math.floor(Date.now() / 50) % 2 === 0) { /* Flicker */ } 
        else { ctx.beginPath(); ctx.arc(x + PLAYER_SIZE/2, p.y + PLAYER_SIZE/2, PLAYER_SIZE, 0, Math.PI*2); ctx.stroke(); }
      }
      let w = PLAYER_SIZE, h = PLAYER_SIZE; if (!p.grounded) { h = PLAYER_SIZE + 4; w = PLAYER_SIZE - 4; }
      ctx.fillRect(x + (PLAYER_SIZE - w) / 2, p.y, w, h); ctx.globalAlpha = 1.0; 
    };
    drawPlayer(pLeft.current, MID / 2, ENVIRONMENTS[nextEnvIdx.current].accent); drawPlayer(pRight.current, MID + MID / 2, '#FFF');

    particles.current.forEach((p, i) => {
      if (p.type === 'PULSE') { p.size += 3; p.life -= 0.05; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x + 10, p.y + 10, p.size, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1.0; } 
      else if (p.type === 'DUST') { p.y += p.vy; p.x += p.vx; p.life -= 0.05; ctx.strokeStyle = `rgba(255,255,255,${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.stroke(); }
      else if (p.type === 'BUBBLE') { p.y += p.vy; p.x += p.vx; p.life -= 0.02; p.size *= 0.99; ctx.strokeStyle = `rgba(0, 191, 255, ${p.life})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); }
      else { p.x += p.vx; p.y += p.vy; p.life -= 0.05; if (p.life > 0) { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1.0; } }
      if (p.life <= 0) particles.current.splice(i, 1);
    });

    texts.current.forEach((t, i) => { t.y -= 1; t.life -= 0.02; if (t.life > 0) { ctx.font = "bold 16px monospace"; ctx.fillStyle = t.color; ctx.globalAlpha = t.life; ctx.fillText(t.text, t.x - 20, t.y); ctx.globalAlpha = 1.0; } else texts.current.splice(i, 1); });

    ctx.restore(); requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    initWorld(); requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  // --- INPUT HANDLERS (UPDATED FOR DIVE) ---
  const doJump = (p: Player, xPos: number) => {
      p.jumpBuffer = JUMP_BUFFER_TIME;
      p.holding = true; 
      if (gameStateRef.current === 'PLAYING' && p.jumps < 2) { 
          p.vy = JUMP_FORCE; p.jumps++; p.grounded = false; p.jumpBuffer = 0; 
          spawnExplosion(xPos, p.y + 20, '#fff', 5); triggerEvent('jump', xPos, p.y + 20, '#fff');
      }
  };

  const doDive = () => {
      // EMERGENCY DIVE
      pLeft.current.vy += DIVE_FORCE;
      pRight.current.vy += DIVE_FORCE;
  }

  const releaseJump = (p: Player) => { p.holding = false; };

  const handlePointerDown = (e: any) => {
    if (gameStateRef.current !== 'PLAYING') return;
    if (gameModeRef.current === 'LINKED') { doJump(pLeft.current, 100); doJump(pRight.current, 300); }
    else {
      const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
      const touches = e.touches ? Array.from(e.touches) : [{ clientX: e.clientX }];
      touches.forEach((t: any) => { if (t.clientX - rect.left < rect.width / 2) doJump(pLeft.current, 100); else doJump(pRight.current, 300); });
    }
  };

  const handlePointerUp = (e: any) => {
      releaseJump(pLeft.current); releaseJump(pRight.current); 
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; 
      if (e.key === 'Escape' && gameStateRef.current === 'PLAYING') { gameStateRef.current = 'PAUSED'; setGameState('PAUSED'); if (bgmRef.current) bgmRef.current.pause(); return; }
      if (gameStateRef.current === 'PLAYING') {
        if (e.key === 'ArrowDown' || e.key === 's') doDive();
        else if (gameModeRef.current === 'LINKED') { if (e.code === 'Space' || e.key === 'ArrowUp') { doJump(pLeft.current, 100); doJump(pRight.current, 300); } } 
        else { if (e.key === 'ArrowLeft' || e.key === 'a') doJump(pLeft.current, 100); if (e.key === 'ArrowRight' || e.key === 'd') doJump(pRight.current, 300); }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (gameModeRef.current === 'LINKED') { if (e.code === 'Space' || e.key === 'ArrowUp') { releaseJump(pLeft.current); releaseJump(pRight.current); } }
        else { if (e.key === 'ArrowLeft' || e.key === 'a') releaseJump(pLeft.current); if (e.key === 'ArrowRight' || e.key === 'd') releaseJump(pRight.current); }
    };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const toggleMode = (e: React.MouseEvent) => { e.stopPropagation(); const newMode = gameMode === 'LINKED' ? 'DUAL' : 'LINKED'; setGameMode(newMode); gameModeRef.current = newMode; };
  
  const handleStartGame = () => {
      if (bgmRef.current && !isMuted) { bgmRef.current.currentTime = 0; bgmRef.current.play().catch(() => {}); }
      if (showNameInput && username.trim().length > 0) { localStorage.setItem('syncOrSinkName', username); setShowNameInput(false); }
      
      setGameState('COUNTDOWN');
      gameStateRef.current = 'COUNTDOWN';
      setCountdown(3);
      
      let count = 3;
      const timer = setInterval(() => {
          count--;
          if (count > 0) setCountdown(count);
          else {
              clearInterval(timer);
              setGameState('PLAYING');
              gameStateRef.current = 'PLAYING';
              initWorld();
          }
      }, 600);
  };

  const finishTutorial = () => { handleStartGame(); }; 
  const handleHome = (e: React.MouseEvent) => { e.stopPropagation(); gameStateRef.current = 'START'; setGameState('START'); initWorld(); if (bgmRef.current) bgmRef.current.pause(); }
  const handlePause = (e: React.MouseEvent) => { e.stopPropagation(); gameStateRef.current = 'PAUSED'; setGameState('PAUSED'); if (bgmRef.current) bgmRef.current.pause(); }
  const handleResume = (e: React.MouseEvent) => { e.stopPropagation(); gameStateRef.current = 'PLAYING'; setGameState('PLAYING'); lastTimeRef.current = 0; if (bgmRef.current && !isMuted) bgmRef.current.play(); }
  const handleShare = () => { const text = `I survived ${score}m in #SyncOrSink! Can you beat the rising tide? 🌊🚀 #SolanaGame`; window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank'); };

  return (
    <>
      {/* HUD */}
      <div className="absolute top-16 w-full max-w-[400px] flex justify-between px-4 z-10 pointer-events-none">
        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/20 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 tracking-[0.3em]">ESCAPED</span>
          <span className="text-xl font-bold font-mono text-white">{score}m</span>
        </div>

        {/* TIDE INDICATOR */}
        <div className={`backdrop-blur px-4 py-2 rounded-full border flex flex-col items-center transition-all ${
            waterDist < 50 ? 'bg-red-500/30 border-red-500 animate-pulse' : 
            waterDist < 100 ? 'bg-orange-500/20 border-orange-500' : 
            'bg-black/50 border-white/20'
        }`}>
            <span className="text-[10px] text-gray-400 tracking-[0.3em]">TIDE</span>
            <span className={`text-sm font-bold font-mono ${waterDist < 50 ? 'text-red-400' : 'text-cyan-400'}`}>
                {waterDist < 200 ? `${waterDist}m` : 'SAFE'}
            </span>
        </div>

        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/20 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 tracking-[0.3em]">ZONE</span>
          <span className="text-xs font-bold font-mono text-white">{currentEnv.name}</span>
        </div>
      </div>

      {/* GHOST TIMER HUD */}
      {ghostTimeRemaining > 0 && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-purple-500/20 border border-purple-500 px-4 py-1 rounded-full text-xs font-bold text-purple-300 z-10 animate-pulse">
            👻 PHASE SHIFT: {ghostTimeRemaining}s
        </div>
      )}

      {/* MUTE BUTTON (Top Right) */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className={`absolute top-16 left-1/2 -translate-x-12 z-20 p-2 rounded-full backdrop-blur border pointer-events-auto transition-all ${isMuted ? 'bg-red-500/20 border-red-500' : 'bg-white/10 border-white/20'}`}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* PAUSE */}
      {gameState === 'PLAYING' && (
        <button onClick={handlePause} className="absolute top-16 right-1/2 translate-x-12 z-20 bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur border border-white/20 pointer-events-auto">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        </button>
      )}

      {/* GAME CANVAS */}
      <canvas ref={canvasRef} width={400} height={600} className="w-full h-full object-cover touch-none" style={{ background: '#000' }} 
        onPointerDown={handlePointerDown} 
        onPointerUp={handlePointerUp} 
      />

        {/* MENUS */}
        {(gameState !== 'PLAYING') && (
          <div className="absolute inset-0 bg-black/85 flex flex-col justify-center items-center backdrop-blur-sm z-20 animate-fade-in p-4">

            {/* COUNTDOWN OVERLAY */}
            {gameState === 'COUNTDOWN' && (
                <div className="text-8xl font-black text-white animate-ping">
                    {countdown}
                </div>
            )}

            {gameState === 'PAUSED' && (
              <div className="flex flex-col gap-4 pointer-events-auto w-full max-w-[200px]">
                <h2 className="text-3xl font-bold italic mb-4 text-center">PAUSED</h2>
                <button onClick={handleResume} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200">RESUME</button>
                <button onClick={handleHome} className="bg-gray-700 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-600">QUIT</button>
              </div>
            )}

            {gameState === 'TUTORIAL' && (
               <div className="flex flex-col items-center text-center max-w-[300px] pointer-events-auto">
                   <h2 className="text-2xl font-bold text-cyan-400 mb-4">SURVIVAL GUIDE</h2>
                   <div className="space-y-4 text-sm text-gray-300 mb-8">
                       <p>👆 <strong className="text-white">TAP</strong> to Jump.</p>
                       <p>⏬ <strong className="text-white">SWIPE DOWN</strong> to Dive Fast.</p>
                       <p>⚠️ The <strong className="text-blue-500">TIDE</strong> rises if you are slow.</p>
                       <p>🫧 Collect <strong className="text-cyan-400">BUBBLES</strong> to push water back.</p>
                       <p>🎮 <strong className="text-white">LINKED MODE:</strong> One tap moves BOTH.</p>
                   </div>
                   <button onClick={finishTutorial} className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg animate-pulse">I&apos;M READY</button>
               </div>
            )}

            {/* SYSTEM GUIDE OVERLAY */}
            {showGuide && (
                <div className="absolute inset-0 bg-black/95 flex flex-col justify-center items-center p-6 z-30 pointer-events-auto">
                    <h2 className="text-xl font-bold text-cyan-400 mb-4 border-b border-cyan-400 pb-2">SYSTEM LOG</h2>
                    <div className="space-y-4 text-xs text-gray-300 w-full max-w-[280px]">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚪</span>
                            <div>
                                <strong className="text-white block">AIR BUBBLE</strong>
                                1-Hit Shield. <span className="text-green-400">Push Water Back (+150).</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-xl">👻</span>
                            <div>
                                <strong className="text-purple-400 block">PHASE SHIFT</strong>
                                8s Invincibility. <span className="text-green-400">Ignores Blocks.</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-xl">🔺</span>
                            <div>
                                <strong className="text-red-500 block">SURGE BOOST</strong>
                                Extreme Speed. <span className="text-green-400">HUGE Water Pushback (+250).</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowGuide(false)} className="mt-8 border border-white/20 px-6 py-2 rounded-full text-xs font-bold hover:bg-white/10">CLOSE LOG</button>
                </div>
            )}

            {gameState === 'GAMEOVER' && (
              <div className="mb-8 text-center flex flex-col items-center w-full">
                <p className="text-blue-500 font-black text-3xl mb-2 animate-bounce">YOU DROWNED 💀</p>
                <div className="bg-white/10 p-4 rounded-xl mb-4 w-full max-w-[280px]">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-gray-400 text-[10px] tracking-widest">DEPTH REACHED</p>
                            <p className="text-2xl font-bold text-white">{score}m</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] tracking-widest">TOTAL DIVES</p>
                            <p className="text-2xl font-bold text-white">{totalRuns}</p>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 border-t border-white/10 pt-2">
                        <span>BEST: {highScore}m</span>
                        {score >= highScore && <span className="text-yellow-400">NEW RECORD!</span>}
                    </div>
                </div>

                {/* ACHIEVEMENTS */}
                <div className="flex gap-2 mb-6 flex-wrap justify-center max-w-[300px]">
                    {ACHIEVEMENTS.map(a => (
                        <span key={a.id} className={`bg-gray-800/50 border ${unlockedBadges.includes(a.id) ? 'border-yellow-500 text-yellow-200' : 'border-gray-700 text-gray-500 opacity-50'} px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1`}>
                            {a.icon} {a.name}
                        </span>
                    ))}
                </div>

                <div className="flex flex-col gap-3 w-full max-w-[280px] pointer-events-auto">
                  <button onClick={handleStartGame} className="bg-white hover:bg-gray-200 text-black w-full py-4 rounded-full font-bold text-sm tracking-widest transition-all">DIVE AGAIN</button>
                  <div className="flex gap-3">
                      <button onClick={handleHome} className="bg-gray-800 hover:bg-gray-700 text-white flex-1 py-3 rounded-full font-bold text-xs tracking-widest transition-all">HOME</button>
                      <button onClick={handleShare} className="bg-blue-500 hover:bg-blue-400 text-white flex-1 py-3 rounded-full font-bold text-xs tracking-widest transition-all">SHARE</button>
                  </div>
                </div>
              </div>
            )}

            {gameState === 'START' && (
              <>
                <h1 className="text-5xl font-black italic tracking-tighter mb-2 text-center">
                  <span className="text-cyan-400">SYNC</span>
                  <span className="text-white mx-2">OR</span>
                  <span className="text-blue-600">SINK</span>
                </h1>
                
                {/* NAME INPUT */}
                {showNameInput && (
                    <div className="mb-4">
                        <input 
                            type="text" 
                            placeholder="ENTER PILOT NAME"
                            className="bg-white/10 border border-white/20 rounded px-4 py-2 text-center text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 uppercase font-bold text-sm tracking-widest"
                            maxLength={12}
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toUpperCase())}
                        />
                    </div>
                )}
                
                <div className="flex gap-4 mb-8 mt-4 pointer-events-auto">
                  <button onClick={toggleMode} className={`px-4 py-2 rounded border text-xs font-bold transition-all ${gameMode === 'LINKED' ? 'bg-white text-black border-white' : 'text-gray-500 border-gray-700'}`}>LINKED</button>
                  <button onClick={toggleMode} className={`px-4 py-2 rounded border text-xs font-bold transition-all ${gameMode === 'DUAL' ? 'bg-white text-black border-white' : 'text-gray-500 border-gray-700'}`}>DUAL</button>
                </div>

                <button onClick={handleStartGame} className="pointer-events-auto border border-white/20 bg-white/5 px-12 py-5 rounded-full hover:bg-white/10 transition-colors active:scale-95 shadow-lg shadow-cyan-500/20">
                  <span className="font-bold text-white tracking-widest text-lg">INITIATE DIVE</span>
                </button>

                <button onClick={() => setShowGuide(true)} className="mt-6 text-xs text-gray-500 hover:text-white underline tracking-widest pointer-events-auto">
                    SYSTEM INFO
                </button>
              </>
            )}
          </div>
        )}
    </>
  );
};