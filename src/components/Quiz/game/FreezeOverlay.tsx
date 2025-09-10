import React, { useEffect, useState, useRef, useCallback } from 'react';

interface FreezeOverlayProps {
  isActive: boolean;
  frozenBy?: string;
  onAnimationComplete?: () => void;
  targetElement?: string;
}

interface CrackSeed {
  x: number;
  y: number;
  rays?: number;
  spread?: number;
  width?: number;
  angle?: number;
}

interface CrackSegment {
  x: number;
  y: number;
  angle: number;
  t0: number;
  len: number;
  w: number;
  life: number;
  parent: CrackSegment | null;
}

interface CrackSystemParams {
  seeds: CrackSeed[];
  maxTime?: number;
  color?: string;
}

const FreezeOverlay: React.FC<FreezeOverlayProps> = ({ 
  isActive, 
  frozenBy = 'Someone',
  onAnimationComplete,
  targetElement = '.quiz-content' 
}) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [animationActive, setAnimationActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // Canvas crack system - matches the HTML version exactly
  const makeCrackSystem = useCallback(({ seeds, maxTime = 1600, color = 'rgba(235,245,255,0.95)' }: CrackSystemParams) => {
    const segs: CrackSegment[] = [];
    const started = performance.now();
    const speedBase = 540;
    const jitter = 0.35;
    const branchChance = 0.23;

    seeds.forEach((seed: CrackSeed) => {
      const rays = seed.rays ?? 5;
      const spread = seed.spread ?? Math.PI / 1.6;
      const startA = seed.angle ?? Math.PI / 2.1;
      for (let i = 0; i < rays; i++) {
        const a = startA - spread / 2 + (spread / (rays - 1 || 1)) * i + (Math.random() - 0.5) * 0.2;
        segs.push({
          x: seed.x,
          y: seed.y,
          angle: a,
          t0: started,
          len: 0,
          w: seed.width ?? 2.2,
          life: maxTime * (0.75 + Math.random() * 0.5),
          parent: null
        });
      }
    });

    const step = (now: number, dt: number) => {
      const ctx = ctxRef.current;
      if (!ctx || !canvasRef.current) return { done: true };

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      segs.forEach((s: CrackSegment) => {
        const alpha = 0.9;
        ctx.strokeStyle = color;
        ctx.lineWidth = s.w;
        const speed = speedBase * (0.8 + Math.random() * 0.4);
        const dist = speed * dt;
        const oldX = s.x;
        const oldY = s.y;

        s.angle += (Math.random() - 0.5) * jitter * dt;
        s.x += Math.cos(s.angle) * dist;
        s.y += Math.sin(s.angle) * dist;
        s.len += dist;

        // Main crack line
        ctx.beginPath();
        ctx.moveTo(oldX, oldY);
        ctx.lineTo(s.x, s.y);
        ctx.globalAlpha = alpha;
        ctx.stroke();

        // Inner glow
        ctx.strokeStyle = 'rgba(180,220,255,0.35)';
        ctx.lineWidth = Math.max(0.8, s.w - 1);
        ctx.globalAlpha = 0.6;
        ctx.stroke();

        // Random sparkles along crack
        if (Math.random() < 0.08) {
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 0.9;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          const a2 = s.angle + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6);
          const d2 = 6 + Math.random() * 10;
          ctx.lineTo(s.x + Math.cos(a2) * d2, s.y + Math.sin(a2) * d2);
          ctx.stroke();
        }

        // Branch creation
        if (Math.random() < branchChance && segs.length < 260) {
          const a = s.angle + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.9);
          segs.push({
            x: s.x,
            y: s.y,
            angle: a,
            t0: now,
            len: 0,
            w: Math.max(1, s.w - 0.6),
            life: s.life * (0.5 + Math.random() * 0.5),
            parent: s
          });
        }
      });

      ctx.restore();

      // Remove expired segments
      for (let i = segs.length - 1; i >= 0; i--) {
        const s: CrackSegment = segs[i];
        const lifeOver = (now - s.t0) > s.life;
        const out = (s.x < 0 || s.y < 0 || s.x > canvasRef.current!.clientWidth || s.y > canvasRef.current!.clientHeight);
        if (lifeOver || out || s.len > 2200) {
          segs.splice(i, 1);
        }
      }

      const age = now - started;
      let done = false;
      if (age > maxTime && segs.length === 0) done = true;
      return { done };
    };

    return { step };
  }, []);

  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !canvasRef.current) return;
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    ctx.restore();
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startCrackAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;

    resizeCanvas();
    
    const rect = canvas.getBoundingClientRect();
    const seeds = [
      { 
        x: rect.width * 0.45 + (Math.random() * 30 - 15), 
        y: rect.height * 0.15, 
        rays: 4, 
        spread: Math.PI / 1.8, 
        width: 2.4, 
        angle: Math.PI / 1.8 
      },
      { 
        x: rect.width * 0.55 + (Math.random() * 30 - 15), 
        y: rect.height * 0.12, 
        rays: 3, 
        spread: Math.PI / 2.1, 
        width: 2.2, 
        angle: Math.PI / 1.7 
      },
    ];
    
    const fracture = makeCrackSystem({ 
      seeds, 
      maxTime: prefersReduced.current ? 400 : 1600 
    });
    let prev = performance.now();

    const loop = (now: number) => {
      const dt = Math.max(0.001, Math.min(0.050, (now - prev) / 1000));
      prev = now;
      clearCanvas();
      const { done } = fracture.step(now, dt);
      if (!done) {
        rafIdRef.current = requestAnimationFrame(loop);
      }
    };

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(loop);
  }, [makeCrackSystem, clearCanvas, resizeCanvas]);

  // Main effect controller
  useEffect(() => {
    if (isActive) {
      console.log('[FreezeOverlay] Activating freeze effect');
      setShowOverlay(true);
      
      // Apply ice effect to target element
      const targetEl = document.querySelector(targetElement);
      if (targetEl) {
        (targetEl as HTMLElement).classList.add('fo-target-iced');
      }

      // Trigger animation state change after a brief delay
      setTimeout(() => {
        setAnimationActive(true);
        
        // Initialize canvas
        const canvas = canvasRef.current;
        if (canvas) {
          ctxRef.current = canvas.getContext('2d');
          startCrackAnimation();
        }
      }, 50);

      // Auto-hide after duration
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        console.log('[FreezeOverlay] Auto-hiding after timeout');
        setAnimationActive(false);
        setTimeout(() => {
          setShowOverlay(false);
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 250);
      }, 3800);
      
    } else {
      // Clean up when deactivated
      console.log('[FreezeOverlay] Deactivating freeze effect');
      const targetEl = document.querySelector(targetElement);
      if (targetEl) {
        (targetEl as HTMLElement).classList.remove('fo-target-iced');
      }
      
      setAnimationActive(false);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      setTimeout(() => {
        setShowOverlay(false);
      }, 200);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isActive, targetElement, startCrackAnimation, onAnimationComplete]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  if (!showOverlay) return null;

  return (
    <>
      {/* Inject CSS that matches the HTML version */}
      <style>{`
        .fo-target-iced { 
          filter: saturate(.8) hue-rotate(190deg) contrast(1.05) brightness(.98); 
          transform: translateZ(0);
        }

        /* Frost animations - exactly like HTML version */
        @keyframes frostGrow {
          0%{transform:translateY(0) scale(1); opacity:0; filter:blur(10px)}
          60%{opacity:.95}
          100%{transform:translateY(0) scale(.02); opacity:1; filter:blur(0)}
        }

        .fo-frost .plate {
          opacity: 0;
          transform-origin: center;
        }

        .fo-active .fo-frost .plate.top { animation: frostGrow 1.1s ease-out both .08s; }
        .fo-active .fo-frost .plate.bottom { animation: frostGrow 1.25s ease-out both .16s; }
        .fo-active .fo-frost .plate.left { animation: frostGrow 1.05s ease-out both .06s; }
        .fo-active .fo-frost .plate.right { animation: frostGrow 1.15s ease-out both .12s; }

        /* Shard animations */
        @keyframes shardSweep {
          0%{transform:rotate(var(--r)) translate3d(0,0,0); opacity:0}
          10%{opacity:.95}
          100%{transform:rotate(var(--r)) translate3d(140vw,45vh,0); opacity:0}
        }

        .fo-shards span {
          position: absolute;
          top: -10vh;
          left: -15vw;
          width: 24vmax;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(225,240,255,.95), rgba(255,255,255,0));
          transform: rotate(var(--r,25deg)) translate3d(0,0,0);
          opacity: 0;
        }

        .fo-active .fo-shards span {
          animation: shardSweep var(--t,950ms) cubic-bezier(.16,.84,.44,1) forwards var(--d,120ms);
        }

        /* Bloom effect */
        @keyframes bloom {
          from{opacity:0; filter:blur(0)}
          60%{opacity:.8; filter:blur(12px)}
          to{opacity:.35; filter:blur(6px)}
        }

        .fo-bloom {
          opacity: 0;
        }

        .fo-active .fo-bloom {
          animation: bloom 1200ms ease-out .35s forwards;
        }

        /* Refraction effect */
        @keyframes refract {
          0%{opacity:0; transform:scale(.92)}
          40%{opacity:.75; transform:scale(1.02)}
          100%{opacity:.28; transform:scale(1)}
        }

        .fo-refraction {
          opacity: 0;
        }

        .fo-active .fo-refraction {
          animation: refract 1.2s ease-out .6s forwards;
        }

        /* Glint effect */
        @keyframes glint {
          0%{opacity:0; transform:translateX(-10%) translateY(-8%) scale(1.1)}
          40%{opacity:.55}
          100%{opacity:0; transform:translateX(6%) translateY(4%) scale(1)}
        }

        .fo-glint {
          opacity: 0;
        }

        .fo-active .fo-glint {
          animation: glint 1.8s ease-in-out .9s 1 forwards;
        }

        /* Notification animations */
        @keyframes freeze-notification-enter {
          0% { 
            transform: scale(0.3) translateY(50px); 
            opacity: 0; 
            filter: blur(10px);
          }
          60% { 
            transform: scale(1.05) translateY(-5px); 
            opacity: 0.9;
            filter: blur(2px);
          }
          100% { 
            transform: scale(1) translateY(0px); 
            opacity: 1;
            filter: blur(0px);
          }
        }

        .animate-freeze-notification-enter { 
          animation: freeze-notification-enter 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; 
        }

        @media (prefers-reduced-motion: reduce) {
          .fo-frost .plate, .fo-shards span, .fo-glint, .fo-bloom, .fo-refraction {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      
      {/* Main overlay with fo-active class for triggering animations */}
      <div 
        className={`pointer-events-none fixed inset-0 z-50 ${animationActive ? 'fo-active' : ''}`}
        style={{ 
          opacity: animationActive ? 1 : 0,
          transform: animationActive ? 'scale(1)' : 'scale(1.02)',
          transition: 'opacity .25s ease, transform .35s ease'
        }}
      >
        {/* Tint - matches HTML version */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 120% at 50% 40%,
              rgba(180,215,255,.25) 0%, rgba(120,170,230,.35) 45%, rgba(40,60,90,.55) 100%)`,
            filter: 'saturate(1.1) hue-rotate(200deg)'
          }}
        />

        {/* Vignette */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(70% 50% at 50% 40%, rgba(255,255,255,0) 60%, rgba(10,20,35,.48) 100%)',
            mixBlendMode: 'multiply'
          }}
        />

        {/* Bloom effect */}
        <div 
          className="fo-bloom absolute inset-0"
          style={{
            background: `
              radial-gradient(40% 30% at 30% 20%, rgba(140,200,255,.25), rgba(255,255,255,0) 70%),
              radial-gradient(30% 24% at 70% 72%, rgba(150,210,255,.20), rgba(255,255,255,0) 70%)
            `,
            mixBlendMode: 'screen'
          }}
        />

        {/* Frost plates - matches HTML exactly */}
        <svg className="fo-frost absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect className="plate top" x="0" y="-50" width="100" height="50" fill="url(#frostGrad)" />
          <rect className="plate bottom" x="0" y="100" width="100" height="50" fill="url(#frostGrad)" />
          <rect className="plate left" x="-50" y="0" width="50" height="100" fill="url(#frostGrad)" />
          <rect className="plate right" x="100" y="0" width="50" height="100" fill="url(#frostGrad)" />
          <defs>
            <linearGradient id="frostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(224,245,255,0.85)" />
              <stop offset="70%" stopColor="rgba(190,225,255,0.35)" />
              <stop offset="100%" stopColor="rgba(190,225,255,0)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Canvas for cracks */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: 'none' }}
        />

        {/* Shards - matches HTML version exactly */}
        <div className="fo-shards absolute inset-0 overflow-hidden">
          <span style={{'--r': '22deg', '--t': '900ms', '--d': '120ms', top: '10%', left: '-20%'} as React.CSSProperties}></span>
          <span style={{'--r': '28deg', '--t': '980ms', '--d': '200ms', top: '20%', left: '-30%'} as React.CSSProperties}></span>
          <span style={{'--r': '18deg', '--t': '840ms', '--d': '260ms', top: '30%', left: '-25%'} as React.CSSProperties}></span>
          <span style={{'--r': '35deg', '--t': '1100ms', '--d': '180ms', top: '40%', left: '-35%'} as React.CSSProperties}></span>
          <span style={{'--r': '26deg', '--t': '860ms', '--d': '240ms', top: '50%', left: '-28%'} as React.CSSProperties}></span>
          <span style={{'--r': '22deg', '--t': '900ms', '--d': '300ms', top: '60%', left: '-20%'} as React.CSSProperties}></span>
          <span style={{'--r': '28deg', '--t': '980ms', '--d': '340ms', top: '70%', left: '-30%'} as React.CSSProperties}></span>
          <span style={{'--r': '18deg', '--t': '840ms', '--d': '380ms', top: '15%', left: '-18%'} as React.CSSProperties}></span>
          <span style={{'--r': '32deg', '--t': '1040ms', '--d': '220ms', top: '35%', left: '-34%'} as React.CSSProperties}></span>
          <span style={{'--r': '25deg', '--t': '900ms', '--d': '260ms', top: '55%', left: '-22%'} as React.CSSProperties}></span>
        </div>

        {/* Refraction */}
        <div 
          className="fo-refraction absolute inset-0"
          style={{
            maskImage: 'radial-gradient(closest-side, rgba(0,0,0,.9), transparent 75%)',
            background: `
              radial-gradient(60% 40% at 50% 40%, rgba(255,255,255,.22), rgba(255,255,255,0) 70%),
              conic-gradient(from 0turn at 40% 50%, rgba(255,255,255,.06), rgba(255,255,255,0) 70%)
            `,
            mixBlendMode: 'screen',
            filter: 'contrast(1.15) saturate(1.1) blur(.3px)'
          }}
        />

        {/* Glint */}
        <div 
          className="fo-glint absolute inset-0"
          style={{
            background: 'radial-gradient(40% 30% at 30% 20%, rgba(255,255,255,.25), transparent 70%)'
          }}
        />

        {/* Freeze notification */}
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <div className="animate-freeze-notification-enter relative">
            {/* Glow backdrop */}
            <div className="absolute inset-0 scale-110 rounded-3xl bg-cyan-300/20 blur-xl"></div>
            
            {/* Main notification */}
            <div className="relative rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-slate-900/95 to-slate-800/95 p-8 text-center shadow-2xl backdrop-blur-md">
              {/* Content */}
              <div className="relative z-10">
                {/* Animated freeze icon */}
                <div className="mb-4 text-7xl">
                  <span className="inline-block animate-spin" style={{animationDuration: '8s'}}>❄️</span>
                </div>
                
                {/* Title with gradient text */}
                <h2 className="mb-3 bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-4xl font-black text-transparent">
                  FROZEN!
                </h2>
                
                {/* Subtitle */}
                <p className="mb-2 text-xl font-medium text-cyan-100">
                  {frozenBy} froze you out!
                </p>
                
                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-cyan-200/80">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300"></div>
                  <span>Unfreezing next question...</span>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FreezeOverlay;