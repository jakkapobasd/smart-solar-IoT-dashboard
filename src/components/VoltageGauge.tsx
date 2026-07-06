import React from 'react';

interface VoltageGaugeProps {
  voltage: number;
  minVoltage?: number;
  maxVoltage?: number;
  size?: number;
}

const VoltageGauge: React.FC<VoltageGaugeProps> = ({
  voltage = 13.2,
  minVoltage = 9,
  maxVoltage = 15,
  size = 200
}) => {
  const percentage = Math.max(0, Math.min(1, (voltage - minVoltage) / (maxVoltage - minVoltage)));
  const rotation = percentage * 180 - 90;

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative overflow-hidden" 
        style={{ width: `${size}px`, height: `${size / 2}px` }}
      >
        {/* Gauge Background (Arc) */}
        <div className="absolute top-0 left-0 w-full h-[200%] border-[20px] border-slate-200 dark:border-slate-700 rounded-full" />
        
        {/* Gauge Active Range (Simple simulation with Gradient) */}
        <div 
          className="absolute top-0 left-0 w-full h-[200%] border-[20px] border-transparent rounded-full"
          style={{ 
            borderTopColor: voltage > 12 ? '#4ade80' : voltage > 10.5 ? '#facc15' : '#f43f5e',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 1s ease-out, border-color 0.5s ease'
          }}
        />

        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-3/4 bg-blue-600 origin-bottom transition-transform duration-1000"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        
        {/* Center Point */}
        <div className="absolute bottom-[-5px] left-1/2 w-4 h-4 bg-slate-800 rounded-full -translate-x-1/2" />
      </div>
      
      <div className="mt-2 text-center">
        <span className="text-2xl font-bold text-slate-800 dark:text-white">
          {voltage.toFixed(1)}V
        </span>
        <p className="text-xs text-slate-500">System Voltage</p>
      </div>
    </div>
  );
};

export default VoltageGauge;
