// Next, React
import { FC, useEffect, useState, useRef } from 'react';
// We keep pkg to avoid breaking relative paths if the template relies on it
import pkg from '../../../package.json';
// Import Firebase functions (Uncomment when you have set up firebase.ts)
// import { submitHighScore, getLeaderboardData } from '../../lib/firebase';

// ❌ DO NOT EDIT ANYTHING ABOVE THIS LINE

// --- GAME CONFIGURATION & CONSTANTS ---
const GOD_MODE = false; 
const SHOW_JUMP_LINE = false;

// PHYSICS & DIFFICULTY (PRO MODE)
const GRAVITY = 0.85;           
const JUMP_FORCE = -11.5;       
const BASE_SPEED = 7.5;         
const SPEED_MULTIPLIER = 1.25;  
const SPAWN_RATE_BASE = 75;     
const PLAYER_SIZE = 24;
const HITBOX_PADDING = 5;

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
    { id: 'novice', name: 'ASCENDER', score: 200, icon: '🚀' },
    { id: 'pro',    name: 'STRATOSPHERE', score: 600, icon: '⭐' },
    { id: 'god',    name: 'INTERSTELLAR', score: 1200, icon: '👑' },
];

const ENVIRONMENTS = [
    { name: "ABYSS",    type: 'UNDERWATER', bgTop: '#000000', bgBot: '#0a0a2a', accent: '#00ffff' },
    { name: "THE DEEP", type: 'UNDERWATER', bgTop: '#0a0a2a', bgBot: '#004488', accent: '#39ff14' },
    { name: "SURFACE",  type: 'UNDERWATER', bgTop: '#004488', bgBot: '#44aaff', accent: '#ffffff' },
    { name: "SKY",      type: 'SKY',        bgTop: '#44aaff', bgBot: '#88ccff', accent: '#ffff00' },
    { name: "STRATO",   type: 'SKY',        bgTop: '#001133', bgBot: '#44aaff', accent: '#ff00ff' },
    { name: "SPACE",    type: 'SPACE',      bgTop: '#000000', bgBot: '#000000', accent: '#ff0000' }
];

// TYPES
type Player = { y: number; vy: number; grounded: boolean; color: string; jumps: number; flash: number };
type Obstacle = { x: number; y: number; w: number; h: number; type: 'BLOCK' | 'ORB' | 'GHOST'; lane: 'LEFT' | 'RIGHT'; passed: boolean; collided: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; type?: 'PULSE' };
type BgProp = { x: number; y: number; size: number; speed: number; type: 'BUBBLE' | 'CLOUD' | 'STAR' };
type FloatingText = { x: number; y: number; text: string; life: number; color: string };
type GameMode = 'LINKED' | 'DUAL';
type GameState = 'START' | 'TUTORIAL' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

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

            {/* SHOP PLACEHOLDER */}
            {activeTab === 'Shop' && (
                <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-black">
                    <span className="text-4xl mb-4">🛒</span>
                    <h2 className="text-xl font-bold mb-2">DRONE SHOP</h2>
                    <p className="text-gray-500 text-xs">Skins coming soon!</p>
                </div>
            )}
        </div>
    </div>
  );
};

// --- 2. LEADERBOARD COMPONENT (Placeholder until Firebase linked) ---
const LeaderboardView: FC = () => {
    // In a real app, use useEffect to fetch data here
    const [scores, setScores] = useState([
        { username: "SyncMaster", score: 1540 },
        { username: "DeepDiver", score: 1200 },
        { username: "Pilot_01", score: 850 },
    ]);

    return (
        <div className="flex flex-col h-full bg-black p-6 overflow-y-auto">
            <h2 className="text-2xl font-black italic text-center mb-6 text-yellow-400">TOP PILOTS</h2>
            <div className="space-y-2">
                {scores.map((s, i) => (
                    <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold w-6 ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{i+1}</span>
                            <span className="text-sm font-bold text-white">{s.username}</span>
                        </div>
                        <span className="text-sm font-mono text-cyan-400">{s.score}m</span>
                    </div>
                ))}
            </div>
            <div className="mt-8 text-center text-[10px] text-gray-600">
                Play to upload your score!
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
  
  // User Info
  const [username, setUsername] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);

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
  const waterLevelRef = useRef(600);
  
  // Powerup Refs
  const shieldActive = useRef(false);
  const shieldTimer = useRef(0);
  const ghostActive = useRef(false); 
  const ghostTimer = useRef(0);      

  // Audio Refs
  const audioCtx = useRef<Record<string, HTMLAudioElement>>({});
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // Transition Refs
  const transitionProgress = useRef(1); 
  const prevEnvIdx = useRef(0);
  const nextEnvIdx = useRef(0);

  // Physics Refs
  const pLeft = useRef<Player>({ y: 0, vy: 0, grounded: true, color: '#fff', jumps: 0, flash: 0 });
  const pRight = useRef<Player>({ y: 0, vy: 0, grounded: true, color: '#fff', jumps: 0, flash: 0 });
  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);
  const texts = useRef<FloatingText[]>([]);
  const bgProps = useRef<BgProp[]>([]);

  // --- INIT ---
  useEffect(() => {
      const savedScore = localStorage.getItem('syncOrSinkHigh');
      if (savedScore) {
          const parsed = parseInt(savedScore);
          setHighScore(parsed);
          highScoreRef.current = parsed; 
      }
      
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
  }, []);

  // --- MUSIC ---
  useEffect(() => {
      const bgm = bgmRef.current;
      if (!bgm) return;

      if (gameState === 'PLAYING') {
          const playPromise = bgm.play();
          if (playPromise !== undefined) {
              playPromise.catch(error => {
                  console.log("Audio play failed (browser blocked):", error);
              });
          }
      } else {
          bgm.pause();
          if (gameState === 'GAMEOVER') bgm.currentTime = 0;
      }
  }, [gameState]);

  const triggerEvent = (key: string, x: number, y: number, color: string) => {
      const sound = audioCtx.current[key];
      if (sound) {
          sound.currentTime = 0;
          sound.play().catch(() => {});
      }
      particles.current.push({
          x: x, y: y, vx: 0, vy: 0,
          life: 1.0, color: color, size: 10, type: 'PULSE'
      });
  }

  const checkAchievements = (finalScore: number) => {
      const newBadges = [...unlockedBadges];
      let changed = false;

      ACHIEVEMENTS.forEach(ach => {
          if (finalScore >= ach.score && !newBadges.includes(ach.id)) {
              newBadges.push(ach.id);
              changed = true;
          }
      });

      if (changed) {
          setUnlockedBadges(newBadges);
          localStorage.setItem('syncOrSinkBadges', JSON.stringify(newBadges));
      }
      
      if (finalScore > highScoreRef.current) {
          setHighScore(finalScore);
          highScoreRef.current = finalScore;
          localStorage.setItem('syncOrSinkHigh', finalScore.toString());
          
          // HERE IS WHERE YOU WOULD CALL FIREBASE SAVE
          // if (username) submitHighScore(username, finalScore);
      }
  };

  const initWorld = () => {
    levelRef.current = 0;
    distanceRef.current = 0;
    scoreRef.current = 0;
    setScore(0);

    prevEnvIdx.current = 0;
    nextEnvIdx.current = 0;
    transitionProgress.current = 1; 
    setCurrentEnv(ENVIRONMENTS[0]);

    speedRef.current = BASE_SPEED;

    pLeft.current = { y: 450, vy: 0, grounded: true, color: ENVIRONMENTS[0].accent, jumps: 0, flash: 0 };
    pRight.current = { y: 450, vy: 0, grounded: true, color: ENVIRONMENTS[0].accent, jumps: 0, flash: 0 };

    obstacles.current = [];
    particles.current = [];
    texts.current = [];
    bgProps.current = [];

    waterLevelRef.current = 600;
    shieldActive.current = false;
    shieldTimer.current = 0;
    ghostActive.current = false;
    ghostTimer.current = 0;
    lastTimeRef.current = 0;
  };

  const spawnBgProp = (envType: string) => {
    const x = Math.random() * 400;
    const y = -50;
    let size = 0, speed = 0, type: any = 'BUBBLE';

    if (envType === 'UNDERWATER') {
      type = 'BUBBLE';
      size = Math.random() * 4 + 2;
      speed = Math.random() * 1 + 0.5;
    } else if (envType === 'SKY') {
      type = 'CLOUD';
      size = Math.random() * 40 + 20;
      speed = Math.random() * 0.5 + 0.2;
    } else {
      type = 'STAR';
      size = Math.random() * 2 + 1;
      speed = Math.random() * 3 + 1;
    }
    bgProps.current.push({ x, y, size, speed, type });
  };

  const spawnExplosion = (x: number, y: number, color: string, count: number = 15) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x: x + 10, y: y + 10,
        vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
        life: 1.0, color: color, size: Math.random() * 4 + 2
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
      
      // ALTITUDE
      distanceRef.current += (speedRef.current * deltaTime) * PIXELS_TO_METERS;
      const currentAltitude = Math.floor(distanceRef.current);
      
      if (currentAltitude > scoreRef.current) {
          setScore(currentAltitude);
          scoreRef.current = currentAltitude;
      }

      // TRANSITION
      if (transitionProgress.current < 1) {
        transitionProgress.current += 0.015 * deltaTime; 
        if (transitionProgress.current >= 1) transitionProgress.current = 1;
      }

      // LEVEL
      const newLevel = Math.floor(currentAltitude / METERS_PER_LEVEL);
      if (newLevel > levelRef.current) {
        levelRef.current = newLevel;

        prevEnvIdx.current = nextEnvIdx.current;
        nextEnvIdx.current = Math.min(newLevel, ENVIRONMENTS.length - 1);
        transitionProgress.current = 0; 

        setCurrentEnv(ENVIRONMENTS[nextEnvIdx.current]);

        speedRef.current = BASE_SPEED * Math.pow(SPEED_MULTIPLIER, newLevel);

        spawnText(MID, 200, "ASCENDING!", '#FFF');
        if (prevEnvIdx.current !== nextEnvIdx.current) {
            spawnText(MID, 230, ENVIRONMENTS[nextEnvIdx.current].name + " REACHED!", '#FF0000');
        }
        triggerEvent('level', MID, 300, '#FFF');
      }

      // POWERUP TIMERS
      if (shieldActive.current) {
        shieldTimer.current -= deltaTime;
        if (shieldTimer.current <= 0) shieldActive.current = false;
      }
      if (ghostActive.current) {
        ghostTimer.current -= deltaTime;
        if (ghostTimer.current <= 0) {
            ghostActive.current = false;
            spawnText(MID, 300, "GHOST ENDED", '#FFF');
        }
      }

      // PROPS
      const activeEnv = ENVIRONMENTS[nextEnvIdx.current];
      if (Math.random() < 0.05) spawnBgProp(activeEnv.type);
      bgProps.current.forEach(p => {
        p.y += (speedRef.current * 0.5 * p.speed) * deltaTime;
      });
      bgProps.current = bgProps.current.filter(p => p.y < H + 50);

      // PLAYERS
      [pLeft.current, pRight.current].forEach(p => {
        p.vy += GRAVITY * deltaTime;
        p.y += p.vy * deltaTime;
        if (p.flash > 0) p.flash -= deltaTime;

        if (p.y > FLOOR - PLAYER_SIZE) {
          if (!p.grounded) spawnExplosion(p === pLeft.current ? MID / 2 - 12 : MID + MID / 2 - 12, FLOOR, '#fff', 5);
          p.y = FLOOR - PLAYER_SIZE;
          p.vy = 0;
          p.grounded = true;
          p.jumps = 0;
        } else {
          p.grounded = false;
        }
      });

      // SPAWNER
      frameCount.current += deltaTime;
      const currentSpawnRate = Math.max(30, SPAWN_RATE_BASE - (levelRef.current * 5));

      if (frameCount.current > currentSpawnRate) {
        const spawnLeft = (yOffset = 0) => obstacles.current.push({
          x: MID / 2 - 25, y: -50 + yOffset, w: 50, h: 30, type: 'BLOCK', lane: 'LEFT', passed: false, collided: false
        });
        const spawnRight = (yOffset = 0) => obstacles.current.push({
          x: MID + (MID / 2) - 25, y: -50 + yOffset, w: 50, h: 30, type: 'BLOCK', lane: 'RIGHT', passed: false, collided: false
        });
        const spawnPowerup = (type: 'ORB' | 'GHOST') => {
            const lane = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
            obstacles.current.push({
                x: lane === 'LEFT' ? MID/2 - 25 : MID + MID/2 - 25,
                y: -50, w: 50, h: 25, type: type, lane: lane, passed: false, collided: false
            });
        };

        // SPAWN LOGIC
        const rand = Math.random();
        if (rand < 0.008 && !ghostActive.current) spawnPowerup('GHOST');
        else if (rand < 0.05 && !shieldActive.current) spawnPowerup('ORB');
        else {
            const blockRand = Math.random();
            if (blockRand < 0.35) spawnLeft();        
            else if (blockRand < 0.70) spawnRight();  
            else {
                const shaveGap = -(speedRef.current * 22); 
                if (Math.random() > 0.5) { spawnLeft(0); spawnRight(shaveGap); } 
                else { spawnRight(0); spawnLeft(shaveGap); }
            }
        }
        frameCount.current = 0;
      }

      // OBSTACLES (COLLISION FIXED)
      obstacles.current.forEach((obs, i) => {
        obs.y += speedRef.current * deltaTime;

        const p = obs.lane === 'LEFT' ? pLeft.current : pRight.current;
        const pX = obs.lane === 'LEFT' ? (MID / 2 - PLAYER_SIZE / 2) : (MID + MID / 2 - PLAYER_SIZE / 2);

        const pHitX = pX + HITBOX_PADDING;
        const pHitY = p.y + HITBOX_PADDING;
        const pHitW = PLAYER_SIZE - (HITBOX_PADDING * 2);
        const pHitH = PLAYER_SIZE - (HITBOX_PADDING * 2);

        const obsHitX = obs.x + 2;
        const obsHitY = obs.y + 2;
        const obsHitW = obs.w - 4;
        const obsHitH = obs.h - 4;
        const isJumpingOver = !p.grounded && p.y < FLOOR - PLAYER_SIZE - 20;

        if (pHitX < obsHitX + obsHitW && pHitX + pHitW > obsHitX && pHitY < obsHitY + obsHitH && pHitY + pHitH > obsHitY) {
          
          if (obs.type === 'ORB') {
            if (!p.grounded) return; // MUST BE GROUNDED
            shieldActive.current = true;
            shieldTimer.current = 300;
            spawnText(pX, p.y - 40, "SHIELD!", '#FFF');
            obstacles.current.splice(i, 1);
            triggerEvent('level', pX, p.y, '#FFF');
            return;
          }
          if (obs.type === 'GHOST') {
            if (!p.grounded) return; // MUST BE GROUNDED
            ghostActive.current = true;
            ghostTimer.current = 480; 
            spawnText(MID, 300, "GHOST MODE!", '#d946ef');
            obstacles.current.splice(i, 1);
            triggerEvent('level', pX, p.y, '#d946ef');
            return;
          }
          
          else if (!isJumpingOver) {
            if (ghostActive.current) return; 

            obs.collided = true;
            if (shieldActive.current) {
              shieldActive.current = false;
              spawnExplosion(pX, p.y, '#FFF', 20);
              spawnText(MID, 300, "SHIELD BROKEN", '#F00');
              obstacles.current.splice(i, 1);
              shakeRef.current = 10;
              triggerEvent('crash', pX, p.y, '#F00');
            } else if (p.flash <= 0) {
              shakeRef.current = 20;
              spawnExplosion(pX, p.y, activeEnv.accent, 30);
              triggerEvent('crash', pX, p.y, '#F00');

              if (!GOD_MODE) {
                gameStateRef.current = 'GAMEOVER';
                setGameState('GAMEOVER');
                waterLevelRef.current = 600;
                checkAchievements(scoreRef.current);
                if (bgmRef.current) {
                    bgmRef.current.pause();
                    bgmRef.current.currentTime = 0;
                }
              } else {
                p.flash = 20;
                spawnText(MID, 300, "HIT! (GOD MODE)", '#FF0000');
              }
            }
          }
        }

        if (!obs.passed && !obs.collided && obs.y > p.y + PLAYER_SIZE) {
          obs.passed = true;
        }
      });
      obstacles.current = obstacles.current.filter(o => o.y < H + 50);
    }

    if (gameStateRef.current === 'GAMEOVER') {
      if (waterLevelRef.current > 0) waterLevelRef.current -= 15 * deltaTime;
    }

    // --- RENDER ---
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (shakeRef.current > 0) {
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      shakeRef.current *= 0.9;
    }

    // DRAW ENV
    const prevEnv = ENVIRONMENTS[prevEnvIdx.current];
    const prevGrad = ctx.createLinearGradient(0, 0, 0, H);
    prevGrad.addColorStop(0, prevEnv.bgTop);
    prevGrad.addColorStop(1, prevEnv.bgBot);
    ctx.fillStyle = prevGrad;
    ctx.fillRect(-1, -1, W + 2, H + 2); 

    if (transitionProgress.current > 0) {
        const nextEnv = ENVIRONMENTS[nextEnvIdx.current];
        const nextGrad = ctx.createLinearGradient(0, 0, 0, H);
        nextGrad.addColorStop(0, nextEnv.bgTop);
        nextGrad.addColorStop(1, nextEnv.bgBot);
        ctx.fillStyle = nextGrad;
        if (transitionProgress.current < 1) {
            const splitY = Math.ceil(H * transitionProgress.current) + 2; 
            ctx.fillRect(-1, -1, W + 2, splitY); 
        } else {
            ctx.fillRect(-1, -1, W + 2, H + 2);
        }
    }

    bgProps.current.forEach(p => {
      if (p.type === 'BUBBLE') {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'CLOUD') {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(p.x, p.y, p.size * 2, p.size);
      } else {
        ctx.fillStyle = '#FFF';
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });

    const waterY = gameStateRef.current === 'GAMEOVER' ? waterLevelRef.current : FLOOR + 10;
    ctx.fillStyle = 'rgba(0, 150, 255, 0.5)';
    ctx.fillRect(0, waterY, W, H - waterY);

    ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(MID, 0); ctx.lineTo(MID, H); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, FLOOR, W, 2);

    if (SHOW_JUMP_LINE && gameStateRef.current === 'PLAYING') {
      const jumpY = FLOOR - 110;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(0, jumpY); ctx.lineTo(W, jumpY); ctx.stroke(); ctx.setLineDash([]);
    }

    obstacles.current.forEach(obs => {
      if (obs.type === 'ORB') {
        ctx.shadowBlur = 20; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      } else if (obs.type === 'GHOST') {
        ctx.shadowBlur = 20; ctx.shadowColor = '#d946ef'; ctx.fillStyle = '#d946ef'; // Purple
        ctx.beginPath(); ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      } else {
        ctx.shadowBlur = 15;
        const activeEnv = ENVIRONMENTS[nextEnvIdx.current];
        const color = obs.lane === 'LEFT' ? activeEnv.accent : '#FFF';
        ctx.shadowColor = color; ctx.fillStyle = color;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = '#000'; ctx.fillRect(obs.x + 2, obs.y + 2, obs.w - 4, obs.h - 4);
      }
    });

    const drawPlayer = (p: Player, xOffset: number, color: string) => {
      const x = xOffset - PLAYER_SIZE / 2;
      if (p.flash > 0 && Math.floor(Date.now() / 50) % 2 === 0) return;
      
      // GHOST MODE VISUALS
      if (ghostActive.current) {
          ctx.globalAlpha = 0.4; // TRANSPARENT
          ctx.shadowBlur = 0;
      } else {
          ctx.shadowBlur = 20; 
          ctx.shadowColor = color; 
      }
      
      ctx.fillStyle = color;
      if (shieldActive.current) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE / 2, PLAYER_SIZE, 0, Math.PI * 2); ctx.stroke();
      }
      let w = PLAYER_SIZE, h = PLAYER_SIZE;
      if (!p.grounded) { h = PLAYER_SIZE + 4; w = PLAYER_SIZE - 4; }
      ctx.fillRect(x + (PLAYER_SIZE - w) / 2, p.y, w, h);
      
      ctx.globalAlpha = 1.0; // Reset Alpha
    };
    drawPlayer(pLeft.current, MID / 2, ENVIRONMENTS[nextEnvIdx.current].accent);
    drawPlayer(pRight.current, MID + MID / 2, '#FFF');

    particles.current.forEach((p, i) => {
      if (p.type === 'PULSE') {
          p.size += 3;
          p.life -= 0.05;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x + 10, p.y + 10, p.size, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
      } else {
          p.x += p.vx; p.y += p.vy; p.life -= 0.05;
          if (p.life > 0) { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1.0; }
      }
      if (p.life <= 0) particles.current.splice(i, 1);
    });

    texts.current.forEach((t, i) => {
      t.y -= 1; t.life -= 0.02;
      if (t.life > 0) { ctx.font = "bold 16px monospace"; ctx.fillStyle = t.color; ctx.globalAlpha = t.life; ctx.fillText(t.text, t.x - 20, t.y); ctx.globalAlpha = 1.0; }
      else texts.current.splice(i, 1);
    });

    ctx.restore();
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    initWorld();
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);

  // --- CONTROLS ---
  const jumpLeft = () => { 
      if (gameStateRef.current === 'PLAYING' && pLeft.current.jumps < 2) { 
          pLeft.current.vy = JUMP_FORCE; pLeft.current.jumps++; pLeft.current.grounded = false; 
          spawnExplosion(100, pLeft.current.y + 20, '#fff', 5); 
          triggerEvent('jump', 100, pLeft.current.y + 20, '#fff');
      } 
  };
  const jumpRight = () => { 
      if (gameStateRef.current === 'PLAYING' && pRight.current.jumps < 2) { 
          pRight.current.vy = JUMP_FORCE; pRight.current.jumps++; pRight.current.grounded = false; 
          spawnExplosion(300, pRight.current.y + 20, '#fff', 5); 
          triggerEvent('jump', 300, pRight.current.y + 20, '#fff');
      } 
  };
  const jumpBoth = () => { jumpLeft(); jumpRight(); };

  const handleTap = (e: any) => {
    if (gameStateRef.current !== 'PLAYING') return;

    if (gameModeRef.current === 'LINKED') jumpBoth();
    else {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const touches = e.touches ? Array.from(e.touches) : [{ clientX: e.clientX }];
      touches.forEach((t: any) => {
        if (t.clientX - rect.left < rect.width / 2) jumpLeft(); else jumpRight();
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameStateRef.current === 'PLAYING') {
        gameStateRef.current = 'PAUSED';
        setGameState('PAUSED');
        if (bgmRef.current) bgmRef.current.pause(); 
        return;
      }
      if (gameStateRef.current === 'PLAYING') {
        if (gameModeRef.current === 'LINKED') {
          if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'd') jumpBoth();
        } else {
          if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') jumpLeft();
          if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') jumpRight();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleMode = (e: React.MouseEvent) => { e.stopPropagation(); const newMode = gameMode === 'LINKED' ? 'DUAL' : 'LINKED'; setGameMode(newMode); gameModeRef.current = newMode; };
  
  const handleStartGame = () => {
      if (bgmRef.current) {
          bgmRef.current.currentTime = 0;
          bgmRef.current.play().catch(() => {});
      }
      
      // Save name if not saved
      if (showNameInput && username.trim().length > 0) {
          localStorage.setItem('syncOrSinkName', username);
          setShowNameInput(false);
      }

      const seenTutorial = localStorage.getItem('syncOrSinkTutorial');
      if (!seenTutorial) {
          gameStateRef.current = 'TUTORIAL';
          setGameState('TUTORIAL');
          localStorage.setItem('syncOrSinkTutorial', 'true');
      } else {
          gameStateRef.current = 'PLAYING';
          setGameState('PLAYING');
          initWorld();
      }
  }

  const finishTutorial = () => {
      gameStateRef.current = 'PLAYING';
      setGameState('PLAYING');
      initWorld();
  }

  const handleHome = (e: React.MouseEvent) => { 
      e.stopPropagation(); 
      gameStateRef.current = 'START'; 
      setGameState('START'); 
      initWorld(); 
      if (bgmRef.current) bgmRef.current.pause(); 
  }
  
  const handlePause = (e: React.MouseEvent) => { 
      e.stopPropagation(); 
      gameStateRef.current = 'PAUSED'; 
      setGameState('PAUSED'); 
      if (bgmRef.current) bgmRef.current.pause(); 
  }
  
  const handleResume = (e: React.MouseEvent) => { 
      e.stopPropagation(); 
      gameStateRef.current = 'PLAYING'; 
      setGameState('PLAYING'); 
      lastTimeRef.current = 0; 
      if (bgmRef.current) bgmRef.current.play(); 
  }
  
  const handleShare = () => {
      const name = username || 'A Pilot';
      const text = `I (${name}) ascended to ${score}m in SyncOrSink! Can you beat the rising tide? #SyncOrSink 🌊🚀 #SolanaGame`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <>
      {/* HUD */}
      <div className="absolute top-16 w-full max-w-[400px] flex justify-between px-4 z-10 pointer-events-none">
        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/20 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 tracking-[0.3em]">ALTITUDE</span>
          <span className="text-xl font-bold font-mono text-white">{score}m</span>
        </div>
        <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/20 flex flex-col items-center">
          <span className="text-[10px] text-gray-400 tracking-[0.3em]">DEPTH</span>
          <span className="text-xs font-bold font-mono text-white">{currentEnv.name}</span>
        </div>
      </div>

      {/* PAUSE */}
      {gameState === 'PLAYING' && (
        <button
          onClick={handlePause}
          className="absolute top-16 right-1/2 translate-x-12 z-20 bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur border border-white/20 pointer-events-auto"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        </button>
      )}

      {/* GAME CANVAS */}
      <canvas 
          ref={canvasRef} 
          width={400} 
          height={600} 
          className="w-full h-full object-cover touch-none" 
          style={{ background: '#000' }} 
          onPointerDown={handleTap} 
      />

        {/* MENUS */}
        {(gameState !== 'PLAYING') && (
          <div className="absolute inset-0 bg-black/85 flex flex-col justify-center items-center backdrop-blur-sm z-20 animate-fade-in p-4">

            {gameState === 'PAUSED' && (
              <div className="flex flex-col gap-4 pointer-events-auto w-full max-w-[200px]">
                <h2 className="text-3xl font-bold italic mb-4 text-center">PAUSED</h2>
                <button onClick={handleResume} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200">RESUME</button>
                <button onClick={handleHome} className="bg-gray-700 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-600">QUIT</button>
              </div>
            )}

            {gameState === 'TUTORIAL' && (
               <div className="flex flex-col items-center text-center max-w-[300px] pointer-events-auto">
                   <h2 className="text-2xl font-bold text-cyan-400 mb-4">HOW TO PLAY</h2>
                   <div className="space-y-4 text-sm text-gray-300 mb-8">
                       <p>👆 <strong className="text-white">TAP</strong> to Jump.</p>
                       <p>👆👆 <strong className="text-white">DOUBLE TAP</strong> to Jump Higher.</p>
                       <p>⚠️ Avoid the <strong className="text-red-400">BLOCKS</strong>.</p>
                       <p>🌊 Don&apos;t let the water rise.</p>
                       <p>🎮 <strong className="text-white">LINKED MODE:</strong> One tap moves BOTH droids.</p>
                       <p>🎯 <strong className="text-white">DUAL MODE:</strong> Tap left/right independently.</p>
                   </div>
                   <button onClick={finishTutorial} className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg animate-pulse">I&apos;M READY</button>
               </div>
            )}

            {gameState === 'GAMEOVER' && (
              <div className="mb-8 text-center flex flex-col items-center w-full">
                <p className="text-blue-500 font-black text-3xl mb-2 animate-bounce">YOU SINKED 😂</p>
                <div className="bg-white/10 p-4 rounded-xl mb-4 w-full max-w-[280px]">
                    <p className="text-gray-400 text-xs tracking-widest">FINAL ALTITUDE</p>
                    <p className="text-4xl font-bold text-white mb-2">{score}m</p>
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
                  <button onClick={handleStartGame} className="bg-white hover:bg-gray-200 text-black w-full py-4 rounded-full font-bold text-sm tracking-widest transition-all">TRY AGAIN</button>
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

                <button onClick={handleStartGame} className="pointer-events-auto border border-white/20 bg-white/5 px-12 py-5 rounded-full hover:bg-white/10 transition-colors active:scale-95">
                  <span className="font-bold text-white tracking-widest text-lg">ASCEND</span>
                </button>
              </>
            )}
          </div>
        )}
    </>
  );
};