import React from 'react';
import { cn } from '../lib/utils';

interface AnimatedBatteryProps {
  soc: number;
  size?: number;
  animationEnabled?: boolean;
}

const AnimatedBattery: React.FC<AnimatedBatteryProps> = ({ 
  soc = 75, 
  size = 140, 
  animationEnabled = true 
}) => {
  const getLevelColor = (value: number) => {
    if (value >= 90) return "#22c55e";
    if (value >= 75) return "#4ade80";
    if (value >= 60) return "#a3e635";
    if (value >= 45) return "#facc15";
    if (value >= 30) return "#fda4af";
    if (value >= 15) return "#fb7185";
    return "#f43f5e";
  };

  const color = getLevelColor(soc);
  const ringCircumference = 2 * Math.PI * 46;
  const segmentLength = ringCircumference / 4;
  
  return (
    <div 
      className="relative flex items-center justify-center overflow-hidden"
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        borderRadius: '50%'
      }}
    >
      {/* Layer 1: The solid ring outer boundary + percentage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight drop-shadow-sm">
          {soc}%
        </span>
      </div>

      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full z-10"
      >
        <circle 
          cx="50" 
          cy="50" 
          r="46" 
          fill="transparent" 
          stroke={color} 
          strokeWidth="4" 
        />
      </svg>

      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full z-10 opacity-30"
      >
        <circle 
          cx="50" 
          cy="50" 
          r="40" 
          fill="transparent" 
          stroke={color} 
          strokeWidth="1" 
          strokeDasharray="4 4" 
        />
      </svg>

      {/* Layer 2: Charging particles floating inwards */}
      {animationEnabled && (
        <div className="absolute inset-0 z-0">
          {[...Array(12)].map((_, i) => {
            const angle = Math.random() * 360;
            const duration = 1.2 + Math.random() * 0.8;
            const animDelay = Math.random() * 2;
            const sizePx = 6 + Math.random() * 4;
            
            return (
              <div 
                key={i}
                className="absolute top-1/2 left-1/2 w-0 h-0"
                style={{ 
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <div
                  className="absolute rounded-full"
                  style={{
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                    backgroundColor: color,
                    marginLeft: `-${sizePx/2}px`,
                    marginTop: `-${sizePx/2}px`,
                    animation: `floatIn ${duration}s ease-in-out infinite`,
                    animationDelay: `${animDelay}s`,
                    opacity: 0,
                    boxShadow: `0 0 5px ${color}`
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
      
      <style>{`
        @keyframes floatIn {
          0% {
            transform: translateY(-${size / 2 - 2}px) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-20px) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBattery;
