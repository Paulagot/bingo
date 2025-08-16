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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas crack system
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
    const container = canvas.parentElement;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
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
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

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
    
    const fracture = makeCrackSystem({ seeds, maxTime: 1600 });
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

    rafIdRef.current = requestAnimationFrame(loop);
  }, [makeCrackSystem, clearCanvas, resizeCanvas]);

  useEffect(() => {
    if (isActive) {
      setShowOverlay(true);
      
      // Apply CORRECTED ice effect to target element
      const targetEl = document.querySelector(targetElement);
      if (targetEl) {
        (targetEl as HTMLElement).classList.add('fo-target-iced');
      }

      // Initialize canvas
      const canvas = canvasRef.current;
      if (canvas) {
        ctxRef.current = canvas.getContext('2d');
        // Start crack animation after a brief delay
        setTimeout(startCrackAnimation, 200);
      }
      
      // Auto-hide after full animation sequence
      timerRef.current = setTimeout(() => {
        if (isActive) {
          setShowOverlay(false);
          if (targetEl) {
            (targetEl as HTMLElement).classList.remove('fo-target-iced');
          }
          onAnimationComplete?.();
        }
      }, 4000);
      
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      };
    } else {
      setShowOverlay(false);
      const targetEl = document.querySelector(targetElement);
      if (targetEl) {
        (targetEl as HTMLElement).classList.remove('fo-target-iced');
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    }
  }, [isActive, targetElement, onAnimationComplete, startCrackAnimation]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  if (!showOverlay) return null;

  return (
    <>
      <style>{`
        .fo-target-iced { 
          filter: saturate(0.7) hue-rotate(180deg) contrast(1.1) brightness(0.9) sepia(0.1);
          transform: translateZ(0);
          transition: filter 0.3s ease;
        }
      `}</style>
      
      {/* FULL SCREEN OVERLAY WITH CORRECTED ICE COLORS */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none"
        style={{ 
          background: `radial-gradient(120% 120% at 50% 50%, 
            rgba(200,230,255,.2) 0%, rgba(150,200,240,.3) 45%, rgba(80,120,160,.45) 100%)`,
          filter: 'saturate(1.2)'
        }}
      >
        {/* VIGNETTE EFFECT */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(70% 50% at 50% 50%, rgba(255,255,255,0) 60%, rgba(20,40,70,.4) 100%)',
            mixBlendMode: 'multiply'
          }}
        />

        {/* FROST PLATES */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="frostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(240,250,255,0.8)" />
              <stop offset="70%" stopColor="rgba(200,230,255,0.4)" />
              <stop offset="100%" stopColor="rgba(200,230,255,0)" />
            </linearGradient>
          </defs>
          <rect className="animate-frost-top" x="0" y="-50" width="100" height="50" fill="url(#frostGrad)" />
          <rect className="animate-frost-bottom" x="0" y="100" width="100" height="50" fill="url(#frostGrad)" />
          <rect className="animate-frost-left" x="-50" y="0" width="50" height="100" fill="url(#frostGrad)" />
          <rect className="animate-frost-right" x="100" y="0" width="50" height="100" fill="url(#frostGrad)" />
        </svg>

        {/* CANVAS FOR DYNAMIC CRACKS */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        />

        {/* ENHANCED SHARDS - CENTERED SWEEP */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 15 }, (_, i) => {
            const angle = (i * 24) + 10;
            const delay = 120 + (i * 30);
            const duration = 800 + (i * 25);
            
            return (
              <span
                key={i}
                className="absolute animate-shard-sweep-centered"
                style={{
                  top: '50%',
                  left: '50%',
                  width: 'min(40vw, 500px)',
                  height: '3px',
                  borderRadius: '2px',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(235,245,255,.95), rgba(255,255,255,0))',
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                  transformOrigin: '0 50%',
                  animationDelay: `${delay}ms`,
                  animationDuration: `${duration}ms`,
                  boxShadow: '0 0 15px rgba(235,245,255,0.6), 0 0 30px rgba(180,220,255,0.3)'
                }}
              />
            );
          })}
        </div>

        {/* BLOOM EFFECT */}
        <div 
          className="absolute inset-0 animate-bloom"
          style={{
            background: `
              radial-gradient(40% 30% at 50% 50%, rgba(180,220,255,.3), rgba(255,255,255,0) 70%),
              radial-gradient(30% 24% at 45% 55%, rgba(200,230,255,.25), rgba(255,255,255,0) 70%),
              radial-gradient(35% 28% at 55% 45%, rgba(220,240,255,.2), rgba(255,255,255,0) 70%)
            `,
            mixBlendMode: 'screen',
            animationDelay: '350ms'
          }}
        />

        {/* REFRACTION */}
        <div 
          className="absolute inset-0 animate-refract"
          style={{
            background: `
              radial-gradient(60% 40% at 50% 50%, rgba(255,255,255,.25), rgba(255,255,255,0) 70%),
              conic-gradient(from 0turn at 50% 50%, rgba(255,255,255,.06), rgba(255,255,255,0) 70%)
            `,
            maskImage: 'radial-gradient(closest-side at 50% 50%, rgba(0,0,0,.9), transparent 75%)',
            mixBlendMode: 'screen',
            filter: 'contrast(1.15) saturate(1.1) blur(.3px)',
            animationDelay: '600ms'
          }}
        />

        {/* GLINT */}
        <div 
          className="absolute inset-0 animate-glint"
          style={{
            background: 'radial-gradient(45% 35% at 50% 50%, rgba(255,255,255,.3), transparent 70%)',
            animationDelay: '900ms'
          }}
        />

        {/* ICE CRYSTALS */}
        <div className="absolute inset-0">
          {Array.from({ length: 25 }, (_, i) => {
            const angle = (i * 14.4);
            const distance = 20 + (i % 5) * 12;
            const x = 50 + Math.cos(angle * Math.PI / 180) * distance;
            const y = 50 + Math.sin(angle * Math.PI / 180) * distance;
            const size = 3 + (i % 3);
            
            return (
              <div
                key={i}
                className="absolute animate-ice-crystal"
                style={{
                  top: `${Math.max(5, Math.min(95, y))}%`,
                  left: `${Math.max(5, Math.min(95, x))}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: i % 2 === 0 ? '50%' : '0',
                  animationDelay: `${500 + i * 40}ms`,
                  boxShadow: `
                    0 0 ${size * 3}px rgba(255,255,255,0.8), 
                    0 0 ${size * 6}px rgba(180,220,255,0.4),
                    inset 0 0 ${size}px rgba(220,240,255,0.6)
                  `,
                  transform: 'translate(-50%, -50%)',
                  clipPath: i % 3 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'
                }}
              />
            );
          })}
        </div>

        {/* FREEZE NOTIFICATION */}
        <div className="absolute inset-0 flex items-center justify-center p-4 z-30">
          <div className="relative animate-freeze-notification-enter">
            {/* Glow backdrop */}
            <div className="absolute inset-0 bg-cyan-300/20 rounded-3xl blur-xl scale-110"></div>
            
            {/* Main notification */}
            <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md rounded-2xl p-8 text-center border border-cyan-300/30 shadow-2xl">
              {/* Animated border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-300/50 via-blue-300/50 to-cyan-300/50 animate-border-glow"></div>
              <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Animated freeze icon */}
                <div className="text-7xl mb-4 animate-freeze-icon">
                  <span className="inline-block animate-spin-slow">❄️</span>
                </div>
                
                {/* Title with gradient text */}
                <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent animate-text-shimmer">
                  FROZEN!
                </h2>
                
                {/* Subtitle */}
                <p className="text-xl text-cyan-100 mb-2 font-medium">
                  {frozenBy} froze you out!
                </p>
                
                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2 text-sm text-cyan-200/80">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse"></div>
                  <span>Unfreezing next question...</span>
                  <div className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* FROST PLATE ANIMATIONS */
        @keyframes frost-grow {
          0% { transform: translateY(0) scale(1); opacity: 0; filter: blur(10px); }
          60% { opacity: 0.95; }
          100% { transform: translateY(0) scale(0.02); opacity: 1; filter: blur(0); }
        }

        .animate-frost-top { animation: frost-grow 1.1s ease-out both 0.08s; }
        .animate-frost-bottom { animation: frost-grow 1.25s ease-out both 0.16s; }
        .animate-frost-left { animation: frost-grow 1.05s ease-out both 0.06s; }
        .animate-frost-right { animation: frost-grow 1.15s ease-out both 0.12s; }

        /* SHARD ANIMATIONS */
        @keyframes shard-sweep-centered {
          0% { 
            transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(0); 
            opacity: 0; 
          }
          15% { 
            opacity: 0.95; 
          }
          100% { 
            transform: translate(-50%, -50%) rotate(var(--angle)) scaleX(4); 
            opacity: 0; 
          }
        }

        .animate-shard-sweep-centered {
          animation: shard-sweep-centered 1000ms cubic-bezier(0.16,0.84,0.44,1) forwards;
        }

        /* BLOOM EFFECT */
        @keyframes bloom {
          from { opacity: 0; filter: blur(0); }
          60% { opacity: 0.8; filter: blur(12px); }
          to { opacity: 0.35; filter: blur(6px); }
        }

        .animate-bloom {
          animation: bloom 1200ms ease-out forwards;
          opacity: 0;
        }

        /* REFRACTION EFFECT */
        @keyframes refract {
          0% { opacity: 0; transform: scale(0.92); }
          40% { opacity: 0.75; transform: scale(1.02); }
          100% { opacity: 0.28; transform: scale(1); }
        }

        .animate-refract {
          animation: refract 1.2s ease-out forwards;
          opacity: 0;
        }

        /* GLINT EFFECT */
        @keyframes glint {
          0% { opacity: 0; transform: translateX(-10%) translateY(-8%) scale(1.1); }
          40% { opacity: 0.55; }
          100% { opacity: 0; transform: translateX(6%) translateY(4%) scale(1); }
        }

        .animate-glint {
          animation: glint 1.8s ease-in-out forwards;
          opacity: 0;
        }

        /* NOTIFICATION ANIMATIONS */
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

        @keyframes border-glow {
          0%, 100% { 
            opacity: 0.3; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1.02);
          }
        }

        @keyframes text-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes freeze-icon {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(5deg); }
          50% { transform: scale(1) rotate(0deg); }
          75% { transform: scale(1.05) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-freeze-notification-enter { animation: freeze-notification-enter 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; }
        .animate-border-glow { animation: border-glow 2s ease-in-out infinite; }
        .animate-text-shimmer { 
          background-size: 200% 100%;
          animation: text-shimmer 3s ease-in-out infinite;
        }
        .animate-freeze-icon { animation: freeze-icon 2s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }

        /* ICE CRYSTAL ANIMATIONS */
        @keyframes ice-crystal {
          0% { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0) rotate(0deg); 
          }
          20% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(0.5) rotate(90deg); 
          }
          80% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1.2) rotate(270deg); 
          }
          100% { 
            opacity: 0.8; 
            transform: translate(-50%, -50%) scale(1) rotate(360deg); 
          }
        }

        .animate-ice-crystal {
          animation: ice-crystal 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-frost-top, .animate-frost-bottom, .animate-frost-left, .animate-frost-right,
          .animate-shard-sweep-centered, .animate-bloom, .animate-refract, .animate-glint, 
          .animate-ice-crystal {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default FreezeOverlay;