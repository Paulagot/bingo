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
      
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        
        <div className="absolute inset-0 bg-black bg-opacity-10" />
        
        <div 
          className="absolute top-1/2"
          style={{
            animation: 'runAcross 7s ease-in-out forwards',
            transform: 'translateY(-50%)',
            zIndex: 100
          }}
        >
          <div className="relative body-bob">
            
            <div className="relative w-24 h-20">
              
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black opacity-30 rounded-full" />
              
              <div 
                className="absolute left-2 top-4 w-4 h-12 bg-red-700 rounded-r-lg opacity-80 transform -skew-x-6"
                style={{ zIndex: 1 }}
              />
              
              <div 
                className="absolute left-6 top-6 w-4 h-10 bg-green-600 rounded-sm"
                style={{ zIndex: 10 }}
              />
              
              <div 
                className="absolute left-5 top-2 w-6 h-6 bg-pink-200 rounded-full"
                style={{ zIndex: 10 }}
              >
                <div className="absolute right-1 top-2 w-1 h-1 bg-black rounded-full" />
                <div className="absolute right-0 top-3 w-1 h-0.5 bg-pink-300 rounded-r-full" />
              </div>
              
              <div 
                className="absolute left-4 top-1 w-8 h-3 bg-green-700 rounded-r-lg"
                style={{ zIndex: 15 }}
              >
                <div className="absolute right-0 -top-1 w-0.5 h-3 bg-red-500" />
              </div>
              
              <div 
                className="absolute left-4 top-8 w-1.5 h-6 bg-pink-200 rounded-full left-arm"
                style={{ 
                  zIndex: 5, 
                  transformOrigin: 'top center'
                }}
              />
              
              <div 
                className="absolute left-9 top-8 w-1.5 h-6 bg-pink-200 rounded-full right-arm"
                style={{ 
                  zIndex: 5,
                  transformOrigin: 'top center'
                }}
              />
              
              <div 
                className="absolute left-6 top-14 w-1.5 h-8 bg-amber-800 rounded-full left-leg"
                style={{ 
                  zIndex: 5,
                  transformOrigin: 'top center'
                }}
              >
                <div className="absolute -bottom-0.5 -left-1 w-3 h-1.5 bg-black rounded" />
              </div>
              
              <div 
                className="absolute left-8 top-14 w-1.5 h-8 bg-amber-800 rounded-full right-leg"
                style={{ 
                  zIndex: 5,
                  transformOrigin: 'top center'
                }}
              >
                <div className="absolute -bottom-0.5 -left-1 w-3 h-1.5 bg-black rounded" />
              </div>
              
              <div 
                className="absolute left-12 top-10 w-3 h-4 bg-yellow-400 rounded-b-lg"
                style={{ zIndex: 10 }}
              >
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-yellow-600 rounded-t-full" />
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-800">$</div>
              </div>
              
              <div 
                className="absolute left-15 top-9 w-0.5 h-6 bg-amber-600 rounded-full"
                style={{ zIndex: 12 }}
              />
              
            </div>
            
            <div className="absolute top-1/2 -left-6 transform -translate-y-1/2 space-y-1 opacity-60">
              <div className="w-4 h-0.5 bg-white rounded" />
              <div className="w-3 h-0.5 bg-white rounded" />
              <div className="w-5 h-0.5 bg-white rounded" />
            </div>
            
          </div>
        </div>
        
        {stars.map(star => (
          <div
            key={star.id}
            className="absolute star-trail"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              zIndex: 75
            }}
          >
            <div className="text-yellow-400 text-lg">⭐</div>
          </div>
        ))}
        
        {showPoints && (
          <div 
            className="absolute top-1/2 left-1/2 points-pop"
            style={{ 
              zIndex: 50,
              transform: 'translateX(-50%) translateY(-50%) rotate(-8deg)'
            }}
          >
            <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-red-800">
              <div className="text-xl font-bold text-center mb-2">💰 POINTS STOLEN! 💰</div>
              <div className="text-center">
                <div className="text-lg">
                  <span className="font-bold text-yellow-300">{stolenPoints}</span> points stolen from{' '}
                  <span className="font-bold text-red-300">{fromTeam}</span>
                </div>
                <div className="text-sm mt-1">
                  Given to <span className="font-bold text-green-300">{toTeam}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
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