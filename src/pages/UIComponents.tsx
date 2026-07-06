import React, { useState } from 'react';
import AnimatedBattery from '../components/AnimatedBattery';
import VoltageGauge from '../components/VoltageGauge';

const UIComponents: React.FC = () => {
  const [soc, setSoc] = useState(80);
  const [voltage, setVoltage] = useState(13.2);

  return (
    <div className="space-y-12 pb-20">
      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-blue-600 pl-4">Custom IoT Gauges</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card flex flex-col items-center p-12">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-10">State of Charge</h3>
            <AnimatedBattery soc={soc} size={240} />
            <div className="mt-12 w-full max-w-xs space-y-4">
               <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                 <span>Adjust Level</span>
                 <span className="text-blue-600">{soc}%</span>
               </div>
               <input 
                type="range" 
                min="0" max="100" 
                value={soc} 
                onChange={(e) => setSoc(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
            </div>
          </div>

          <div className="card flex flex-col items-center p-12">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-10">System Voltage</h3>
            <VoltageGauge voltage={voltage} size={240} />
            <div className="mt-12 w-full max-w-xs space-y-4">
               <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                 <span>Adjust Voltage</span>
                 <span className="text-blue-600">{voltage.toFixed(1)}V</span>
               </div>
               <input 
                type="range" 
                min="9" max="15" step="0.1"
                value={voltage} 
                onChange={(e) => setVoltage(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
               />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-l-4 border-purple-600 pl-4">Status Badges</h2>
        <div className="card flex flex-wrap gap-4">
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-black rounded-full uppercase">Online</span>
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-black rounded-full uppercase">Offline</span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black rounded-full uppercase">Never Seen</span>
          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-black rounded-full uppercase">Low Battery</span>
        </div>
      </section>
    </div>
  );
};

export default UIComponents;
