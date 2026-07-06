import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashLoaderProps {
  onComplete: () => void;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'emblem' | 'explode' | 'assemble' | 'fadeout'>('emblem');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Emblem breathing shows up from 0 to 1.2s
    const explodeTimer = setTimeout(() => {
      setStage('explode');
    }, 1200);

    // 2. Exploded state triggers and settles. Then at 2.3s, assemble letters together
    const assembleTimer = setTimeout(() => {
      setStage('assemble');
    }, 2300);

    // 3. Keep assembled word logo on screen until 5.2s (longer visibility), then initiate fadeout
    const fadeoutTimer = setTimeout(() => {
      setStage('fadeout');
    }, 5200);

    // 4. Complete loading
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 5800);

    return () => {
      clearTimeout(explodeTimer);
      clearTimeout(assembleTimer);
      clearTimeout(fadeoutTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Define components of the word "LeKise" with brand casing and premium blue-to-white gradient colors
  const letters = [
    { char: 'L', fromColor: '#ffffff', toColor: '#1062b8', shadow: 'rgba(16, 98, 184, 0.5)' },
    { char: 'e', fromColor: '#ffffff', toColor: '#1062b8', shadow: 'rgba(16, 98, 184, 0.5)' },
    { char: 'K', fromColor: '#ffffff', toColor: '#0f60b4', shadow: 'rgba(15, 96, 180, 0.5)' },
    { char: 'i', fromColor: '#ffffff', toColor: '#0f60b4', shadow: 'rgba(15, 96, 180, 0.5)' },
    { char: 'S', fromColor: '#ffffff', toColor: '#1062b8', shadow: 'rgba(16, 98, 184, 0.5)' },
    { char: 'e', fromColor: '#ffffff', toColor: '#1062b8', shadow: 'rgba(16, 98, 184, 0.5)' },
  ];

  // Specific trajectories for the letter explosion (mimicking the video)
  const explosionPaths = [
    { x: -160, y: -90, rotate: -220, scale: 1.4 },
    { x: -90, y: 130, rotate: 180, scale: 1.2 },
    { x: 120, y: -150, rotate: -270, scale: 1.5 },
    { x: 180, y: 70, rotate: 340, scale: 0.9 },
    { x: -50, y: -140, rotate: 110, scale: 1.3 },
    { x: 130, y: 150, rotate: -150, scale: 1.25 },
  ];

  // Additional circular particles to make the explosion look rich
  const particles = [
    { x: -100, y: -160, size: 8, color: '#3b82f6', delay: 0.05 },
    { x: 140, y: -60, size: 10, color: '#60a5fa', delay: 0.1 },
    { x: -140, y: 60, size: 12, color: '#ffffff', delay: 0 },
    { x: 90, y: 160, size: 6, color: '#1d4ed8', delay: 0.15 },
    { x: -40, y: 180, size: 9, color: '#2563eb', delay: 0.02 },
    { x: 70, y: -120, size: 7, color: '#ffffff', delay: 0.08 },
    { x: -190, y: -20, size: 8, color: '#60a5fa', delay: 0.12 },
    { x: 160, y: -130, size: 11, color: '#3b82f6', delay: 0.04 },
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="splash-loader-overlay"
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#f4f6fa] select-none overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ 
          opacity: stage === 'fadeout' ? 0 : 1,
          scale: stage === 'fadeout' ? 1.05 : 1
        }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      >
        {/* Subtle Ambient Glowing Background behind layout */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-400/10 blur-[80px] pointer-events-none translate-x-12 translate-y-12" />

        <div className="relative flex items-center justify-center w-full h-full max-w-lg">

          {/* ================= STAGE 1: EMBLEM ================= */}
          {stage === 'emblem' && (
            <motion.div
              id="splash-emblem-container"
              className="relative flex items-center justify-center"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ 
                scale: [0.3, 1.1, 1],
                opacity: 1 
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              {/* Outer pulsing neon ring */}
              <motion.div 
                className="absolute w-28 h-28 rounded-full border border-blue-400/60 bg-blue-500/5 shadow-[0_0_25px_rgba(0,128,255,0.2)]"
                animate={{ 
                  scale: [1, 1.15, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />

              {/* Inner Circle / Solid Base */}
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-white to-slate-100 flex items-center justify-center border-2 border-blue-400/80 shadow-[0_10px_25px_rgba(0,128,255,0.12),inset_0_0_12px_rgba(0,128,255,0.1)]">
                {/* Glowing "L" in the center representing Lekise */}
                <span className="text-3xl font-black italic tracking-wide text-[#007ffa] drop-shadow-[0_0_6px_rgba(0,127,250,0.35)]">
                  L
                </span>
                
                {/* Rotating accent dot */}
                <motion.div 
                  className="absolute w-2 h-2 rounded-full bg-[#00c0ff] right-1.5 top-1.5 shadow-[0_0_6px_#00c0ff]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  style={{ transformOrigin: 'center center' }}
                />
              </div>
            </motion.div>
          )}

          {/* ================= STAGE 2 & 3: EXPLODE & ASSEMBLE ================= */}
          {(stage === 'explode' || stage === 'assemble') && (
            <div className="relative flex items-center justify-center">
              
              {/* Render small decorative particles during explosion */}
              {stage === 'explode' && particles.map((p, index) => (
                <motion.div
                  key={`particle-${index}`}
                  className="absolute rounded-full shadow-lg"
                  style={{
                    backgroundColor: p.color,
                    width: p.size,
                    height: p.size,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    opacity: [1, 1, 0],
                    scale: [1, 1.2, 0.2],
                  }}
                  transition={{
                    duration: 1.1,
                    delay: p.delay,
                    ease: [0.1, 0.8, 0.3, 1],
                  }}
                />
              ))}

              {/* Horizontal layout container that centers assembled letters */}
              <div className="flex items-center justify-center space-x-1 font-sans">
                {letters.map((letObj, idx) => {
                  const itemPath = explosionPaths[idx];

                  return (
                    <motion.span
                      key={`letter-${idx}`}
                      className="relative block select-none"
                      style={{
                        color: idx % 2 === 0 ? '#007ffa' : '#00a3ff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.05), 0 0 10px rgba(0, 163, 255, 0.4), 0 0 20px rgba(0, 127, 250, 0.2)',
                        fontWeight: 900,
                        fontSize: idx === 0 ? '5.2rem' : '4.4rem',
                        fontStyle: idx === 0 ? 'italic' : 'normal',
                      }}
                      initial={{ 
                        x: 0, 
                        y: 0, 
                        rotate: 0, 
                        scale: 0.1, 
                        opacity: 0 
                      }}
                      animate={
                        stage === 'explode' 
                          ? { 
                              x: itemPath.x, 
                              y: itemPath.y, 
                              rotate: itemPath.rotate, 
                              scale: itemPath.scale,
                              opacity: 1 
                            }
                          : { 
                              x: 0, 
                              y: 0, 
                              rotate: 0, 
                              scale: 1,
                              opacity: 1 
                            }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: stage === 'explode' ? 70 : 130,
                        damping: stage === 'explode' ? 10 : 12,
                        mass: stage === 'explode' ? 1 : 1.1,
                        delay: stage === 'assemble' ? idx * 0.06 : 0,
                      }}
                    >
                      {/* Stylized custom glow dot for 'i' */}
                      {letObj.char === 'i' && (
                        <span className="relative">
                          i
                          {/* Customize dynamic blue-white dot above i */}
                          <motion.span 
                            className="absolute left-[30%] -translate-x-1/2 -top-1.5 w-4 h-4 rounded-full bg-gradient-to-br from-white via-[#00a3ff] to-[#007ffa] shadow-[0_0_12px_rgba(0,163,255,0.9)] border border-white"
                            animate={stage === 'assemble' ? {
                              scale: [1, 1.2, 1],
                              opacity: [0.9, 1, 0.9]
                            } : {}}
                            transition={{ repeat: stage === 'assemble' ? Infinity : 0, duration: 2, ease: "easeInOut" }}
                          />
                        </span>
                      )}
                      
                      {/* Thai Subtitle above last 'e' */}
                      {idx === 5 && (
                        <span className="relative">
                          e
                          <motion.span
                            className="absolute -top-3.5 -right-1 text-[11px] font-black text-[#007ffa] tracking-widest whitespace-nowrap block"
                            initial={{ opacity: 0, y: 4, scale: 0.9 }}
                            animate={stage === 'assemble' ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0 }}
                            transition={{ delay: 0.9, duration: 0.5, ease: "easeOut" }}
                            style={{ 
                              textShadow: '0 0 1px #ffffff, 0 0 4px rgba(0, 163, 255, 0.3)', 
                              fontFamily: 'sans-serif' 
                            }}
                          >
                            เลคิเซ่
                          </motion.span>
                        </span>
                      )}

                      {letObj.char !== 'i' && letObj.char !== 'e' && letObj.char}
                      {letObj.char === 'e' && idx !== 5 && 'e'}
                    </motion.span>
                  );
                })}
              </div>

              {/* Complete word accent glow line at bottom, emerges upon assembly */}
              {stage === 'assemble' && (
                <motion.div
                  className="absolute -bottom-6 w-36 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#00a3ff] to-transparent"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 0.8 }}
                  transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                />
              )}
            </div>
          )}

          {/* ================= FINAL FLASH OVERLAY ================= */}
          {stage === 'assemble' && (
            <motion.div
              className="absolute inset-0 bg-blue-500/5 mix-blend-screen pointer-events-none rounded-full blur-xl"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 0],
                opacity: [0, 0.25, 0] 
              }}
              transition={{ delay: 0.1, duration: 1, ease: "easeOut" }}
            />
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashLoader;
