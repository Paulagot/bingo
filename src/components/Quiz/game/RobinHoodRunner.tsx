import { useState, useEffect } from 'react';

interface Star {
  id: number;
  left: number;
  top: number;
}

interface RobinHoodRunnerProps {
  isActive: boolean;
  onComplete?: () => void;
  stolenPoints?: number;
  fromTeam?: string;
  toTeam?: string;
}

const styles = `
  @keyframes runAcross {
    0% {
      transform: translateX(-200px) translateY(-50%);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateX(calc(100vw + 100px)) translateY(-50%);
      opacity: 0;
    }
  }
  
  @keyframes bodyBob {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }
  
  @keyframes leftLeg {
    0% { transform: rotate(-30deg); }
    25% { transform: rotate(10deg); }
    50% { transform: rotate(40deg); }
    75% { transform: rotate(0deg); }
    100% { transform: rotate(-30deg); }
  }
  
  @keyframes rightLeg {
    0% { transform: rotate(40deg); }
    25% { transform: rotate(0deg); }
    50% { transform: rotate(-30deg); }
    75% { transform: rotate(10deg); }
    100% { transform: rotate(40deg); }
  }
  
  @keyframes leftArm {
    0% { transform: rotate(30deg); }
    50% { transform: rotate(-30deg); }
    100% { transform: rotate(30deg); }
  }
  
  @keyframes rightArm {
    0% { transform: rotate(-30deg); }
    50% { transform: rotate(30deg); }
    100% { transform: rotate(-30deg); }
  }
  
  @keyframes starTrail {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.3);
    }
  }
  
  @keyframes pointsPopIn {
    0% {
      transform: translateX(-50%) scale(0) rotate(-10deg);
      opacity: 0;
    }
    50% {
      transform: translateX(-50%) scale(1.1) rotate(5deg);
    }
    100% {
      transform: translateX(-50%) scale(1) rotate(2deg);
      opacity: 1;
    }
  }
  
  .star-trail {
    animation: starTrail 0.8s ease-out forwards;
  }
  
  .run-across { animation: runAcross 7s ease-in-out forwards; }
  .body-bob { animation: bodyBob 0.3s ease-in-out infinite; }
  .left-leg { animation: leftLeg 0.3s ease-in-out infinite; }
  .right-leg { animation: rightLeg 0.3s ease-in-out infinite; }
  .left-arm { animation: leftArm 0.3s ease-in-out infinite; }
  .right-arm { animation: rightArm 0.3s ease-in-out infinite; }
  .points-pop { animation: pointsPopIn 0.6s ease-out forwards; }
`;

const RobinHoodRunner: React.FC<RobinHoodRunnerProps> = ({ 
  isActive, 
  onComplete, 
  stolenPoints = 50, 
  fromTeam = 'Team A', 
  toTeam = 'Team B' 
}) => {
  const [showPoints, setShowPoints] = useState<boolean>(false);
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    if (isActive) {
      // Create star trail effect
      const starInterval = setInterval(() => {
        const newStar: Star = {
          id: Math.random(),
          left: Math.random() * 15 + 5,
          top: Math.random() * 20 + 40,
        };
        
        setStars(prevStars => [...prevStars, newStar]);
        
        setTimeout(() => {
          setStars(prevStars => prevStars.filter(star => star.id !== newStar.id));
        }, 800);
      }, 100);
      
      const pointsTimer = setTimeout(() => setShowPoints(true), 2000);
      
      const completeTimer = setTimeout(() => {
        clearInterval(starInterval);
        setStars([]);
        setShowPoints(false);
        onComplete?.();
      }, 7500);

      return () => {
        clearInterval(starInterval);
        clearTimeout(pointsTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        
        <div className="absolute inset-0 bg-black bg-opacity-10" />
        
        <div 
          className="absolute top-1/2"
          style={{
            animation: 'runAcross 7s ease-in-out forwards',
            transform: 'translateY(-50%)',
            zIndex: 100
          }}
        >
          <div className="body-bob relative">
            
            <div className="relative h-20 w-24">
              
              <div className="absolute bottom-0 left-1/2 h-2 w-8 -translate-x-1/2 transform rounded-full bg-black opacity-30" />
              
              <div 
                className="absolute left-2 top-4 h-12 w-4 -skew-x-6 transform rounded-r-lg bg-red-700 opacity-80"
                style={{ zIndex: 1 }}
              />
              
              <div 
                className="absolute left-6 top-6 h-10 w-4 rounded-sm bg-green-600"
                style={{ zIndex: 10 }}
              />
              
              <div 
                className="absolute left-5 top-2 h-6 w-6 rounded-full bg-pink-200"
                style={{ zIndex: 10 }}
              >
                <div className="absolute right-1 top-2 h-1 w-1 rounded-full bg-black" />
                <div className="absolute right-0 top-3 h-0.5 w-1 rounded-r-full bg-pink-300" />
              </div>
              
              <div 
                className="absolute left-4 top-1 h-3 w-8 rounded-r-lg bg-green-700"
                style={{ zIndex: 15 }}
              >
                <div className="absolute -top-1 right-0 h-3 w-0.5 bg-red-500" />
              </div>
              
              <div 
                className="left-arm absolute left-4 top-8 h-6 w-1.5 rounded-full bg-pink-200"
                style={{ 
                  zIndex: 5, 
                  transformOrigin: 'top center'
                }}
              />
              
              <div 
                className="right-arm absolute left-9 top-8 h-6 w-1.5 rounded-full bg-pink-200"
                style={{ 
                  zIndex: 5,
                  transformOrigin: 'top center'
                }}
              />
              
              <div 
                className="left-leg absolute left-6 top-14 h-8 w-1.5 rounded-full bg-amber-800"
                style={{ 
                  zIndex: 5,
                  transformOrigin: 'top center'
                }}
              >
                <div className="absolute -bottom-0.5 -left-1 h-1.5 w-3 rounded bg-black" />
              </div>
              
              <div 
                className="right-leg absolute left-8 top-14 h-8 w-1.5 rounded-full bg-amber-800"
                style={{ 
                  zIndex: 5,
                  transformOrigin: 'top center'
                }}
              >
                <div className="absolute -bottom-0.5 -left-1 h-1.5 w-3 rounded bg-black" />
              </div>
              
              <div 
                className="absolute left-12 top-10 h-4 w-3 rounded-b-lg bg-yellow-400"
                style={{ zIndex: 10 }}
              >
                <div className="absolute left-1/2 top-0 h-1 w-2 -translate-x-1/2 transform rounded-t-full bg-yellow-600" />
                <div className="absolute left-1/2 top-1 -translate-x-1/2 transform text-xs font-bold text-green-800">$</div>
              </div>
              
              <div 
                className="left-15 absolute top-9 h-6 w-0.5 rounded-full bg-amber-600"
                style={{ zIndex: 12 }}
              />
              
            </div>
            
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 transform space-y-1 opacity-60">
              <div className="bg-muted h-0.5 w-4 rounded" />
              <div className="bg-muted h-0.5 w-3 rounded" />
              <div className="bg-muted h-0.5 w-5 rounded" />
            </div>
            
          </div>
        </div>
        
        {stars.map(star => (
          <div
            key={star.id}
            className="star-trail absolute"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              zIndex: 75
            }}
          >
            <div className="text-lg text-yellow-400">⭐</div>
          </div>
        ))}
        
        {showPoints && (
          <div 
            className="points-pop absolute left-1/2 top-1/2"
            style={{ 
              zIndex: 50,
              transform: 'translateX(-50%) translateY(-50%) rotate(-8deg)'
            }}
          >
            <div className="rounded-lg border-2 border-red-800 bg-red-600 px-6 py-4 text-white shadow-2xl">
              <div className="mb-2 text-center text-xl font-bold">💰 POINTS STOLEN! 💰</div>
              <div className="text-center">
                <div className="text-lg">
                  <span className="font-bold text-yellow-300">{stolenPoints}</span> points stolen from{' '}
                  <span className="font-bold text-red-300">{fromTeam}</span>
                </div>
                <div className="mt-1 text-sm">
                  Given to <span className="font-bold text-green-300">{toTeam}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="pointer-events-none absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 animate-ping rounded-full bg-yellow-400"
              style={{
                top: `${30 + (i * 8)}%`,
                left: `${15 + (i * 15)}%`,
                animationDelay: `${i * 300}ms`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
        
      </div>
    </>
  );
};

export default RobinHoodRunner;