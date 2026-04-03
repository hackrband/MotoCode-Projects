import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, Settings, AlertTriangle, Info } from 'lucide-react';

// --- Constants ---
const MAX_RPM = 12000;
const REDLINE_RPM = 10000;
const IDLE_RPM = 1200;
const MAX_SPEED = 240;
const REDLINE_LIMIT_MS = 60000; // 1 minute
const COOLDOWN_MS = 60000; // 1 minute

const GEAR_RATIOS = [
  0,      // Neutral
  3.0,    // 1st
  2.0,    // 2nd
  1.5,    // 3rd
  1.2,    // 4th
  1.0     // 5th
];

const FINAL_DRIVE = 3.5;

// --- Components ---

const Gauge = ({ value, max, label, unit, redlineStart }: { value: number, max: number, label: string, unit: string, redlineStart?: number }) => {
  const rotation = (value / max) * 240 - 120; // -120 to 120 degrees
  
  return (
    <div className="relative w-64 h-64 flex items-center justify-center bg-[#050505] rounded-full border-[8px] border-[#1a1a1a] shadow-[0_0_60px_rgba(0,0,0,1)]">
      {/* Scale Marks */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="#111" strokeWidth="1" />
        
        {[...Array(25)].map((_, i) => {
          const angle = (i / 24) * 240 - 210;
          const currentValue = i * (max / 24);
          const isRed = redlineStart && currentValue >= redlineStart;
          const isMajor = i % 2 === 0;
          
          const r1 = 42;
          const r2 = 48;
          const rText = 34;
          
          const rad = (angle * Math.PI) / 180;
          const x1 = 50 + r1 * Math.cos(rad);
          const y1 = 50 + r1 * Math.sin(rad);
          const x2 = 50 + r2 * Math.cos(rad);
          const y2 = 50 + r2 * Math.sin(rad);
          const xText = 50 + rText * Math.cos(rad);
          const yText = 50 + rText * Math.sin(rad);
          
          return (
            <g key={i}>
              <line 
                x1={x1} y1={y1} x2={x2} y2={y2} 
                stroke={isRed ? "#ff3333" : "#ffffff"} 
                strokeWidth={isMajor ? "1.2" : "0.5"} 
                opacity={isMajor ? 1 : 0.4}
              />
              {isMajor && (
                <text 
                  x={xText} 
                  y={yText} 
                  fontSize="6" 
                  fill={isRed ? "#ff3333" : "#ffffff"} 
                  fontWeight="700"
                  textAnchor="middle" 
                  dominantBaseline="middle"
                  className="font-mono"
                >
                  {Math.round(currentValue / (max > 1000 ? 1000 : 1))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Needle - Simplified to standard div for robustness */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div 
          className="w-[2px] h-28 bg-[#ff3333] shadow-[0_0_15px_rgba(255,51,51,0.8)] transition-transform duration-75 ease-out"
          style={{ 
            transformOrigin: 'bottom center',
            transform: `rotate(${rotation}deg)`,
            marginTop: '-112px'
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-6 bg-[#ff3333] rounded-full" />
        </div>
      </div>
      
      {/* Center Cap */}
      <div className="absolute w-8 h-8 bg-[#0a0a0a] rounded-full border-2 border-[#222] z-30 shadow-2xl flex items-center justify-center">
        <div className="w-2 h-2 bg-[#333] rounded-full" />
      </div>
      
      {/* Labels */}
      <div className="absolute bottom-16 flex flex-col items-center gap-0">
        <span className="text-[10px] text-zinc-500 font-black tracking-[0.2em] uppercase">{label}</span>
        <span className="text-[8px] text-zinc-600 font-mono">{unit}</span>
      </div>
    </div>
  );
};

const BikeTopDown = ({ throttle }: { throttle: number }) => {
  return (
    <div className="relative w-32 h-96 flex flex-col items-center">
      {/* Handlebars */}
      <div className="absolute top-20 w-48 h-2 bg-zinc-800 rounded-full shadow-lg flex justify-between px-2">
        <div className="w-12 h-4 bg-zinc-900 -mt-1 rounded-l-md border-r border-zinc-700" />
        <div className="w-12 h-4 bg-zinc-900 -mt-1 rounded-r-md border-l border-zinc-700" />
      </div>
      
      {/* Main Body */}
      <div className="w-16 h-80 bg-red-600 rounded-t-3xl rounded-b-xl shadow-2xl relative overflow-hidden">
        {/* Seat */}
        <div className="absolute top-32 left-1 right-1 h-32 bg-zinc-900 rounded-lg shadow-inner" />
        {/* Tank Details */}
        <div className="absolute top-10 left-2 right-2 h-20 bg-red-700 rounded-t-2xl opacity-50" />
        {/* Engine Area */}
        <div className="absolute top-64 left-2 right-2 h-12 bg-zinc-800 rounded-md" />
      </div>
      
      {/* Wheels (Simplified) */}
      <div className="absolute -top-4 w-10 h-24 bg-zinc-900 rounded-full shadow-lg border-2 border-zinc-800" />
      <div className="absolute -bottom-4 w-12 h-28 bg-zinc-900 rounded-full shadow-lg border-2 border-zinc-800" />
      
      {/* Foot Pegs */}
      <div className="absolute top-64 w-32 flex justify-between px-4">
        <div className="w-6 h-2 bg-zinc-700 rounded-full" />
        <div className="w-6 h-2 bg-zinc-700 rounded-full" />
      </div>
    </div>
  );
};

export default function App() {
  // --- State ---
  const [engineOn, setEngineOn] = useState(false);
  const [rpm, setRpm] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState(0); // 0 = N, 1-5
  const [clutch, setClutch] = useState(false);
  const [throttle, setThrottle] = useState(0);
  const [frontBrake, setFrontBrake] = useState(0);
  const [footBrake, setFootBrake] = useState(0);
  
  const [redlineTime, setRedlineTime] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  
  const keysPressed = useRef<Set<string>>(new Set());
  
  // Refs for physics loop to avoid closure issues and constant restarts
  const stateRef = useRef({
    engineOn,
    rpm,
    speed,
    gear,
    isOverheated,
    redlineTime,
    cooldownTime
  });

  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = {
      engineOn,
      rpm,
      speed,
      gear,
      isOverheated,
      redlineTime,
      cooldownTime
    };
  }, [engineOn, rpm, speed, gear, isOverheated, redlineTime, cooldownTime]);

  // --- Controls Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.add(key);
      
      // Start/Stop Engine
      if (key === 'f') {
        if (!stateRef.current.isOverheated) {
          setEngineOn(prev => !prev);
        }
      }
      
      // Shifting Logic
      if (!stateRef.current.isOverheated) {
        if (key === '1') setGear(1);
        if (key === '2') setGear(2);
        if (key === '3') setGear(3);
        if (key === '4') setGear(4);
        if (key === '5') setGear(5);
        
        if (key === 'o' || key === 'n') {
          if (stateRef.current.gear === 1 || stateRef.current.gear === 2) {
            setGear(0);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    const handleBlur = () => {
      keysPressed.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []); // Stable listeners

  // --- Physics Loop ---
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();

    const update = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const { engineOn: eOn, rpm: curRpm, speed: curSpeed, gear: curGear, isOverheated: isHot } = stateRef.current;

      // Read Inputs
      const isThrottling = keysPressed.current.has('w');
      const isClutching = keysPressed.current.has(' ');
      const isFrontBraking = keysPressed.current.has('s');
      const isFootBraking = keysPressed.current.has('shift');

      setThrottle(isThrottling ? 1 : 0);
      setClutch(isClutching);
      setFrontBrake(isFrontBraking ? 1 : 0);
      setFootBrake(isFootBraking ? 1 : 0);

      // --- Engine Logic ---
      if (eOn && !isHot) {
        let targetRpm = IDLE_RPM;
        
        if (isThrottling) {
          targetRpm = REDLINE_RPM; 
        }

        if (!isClutching && curGear !== 0) {
          const wheelRpm = (curSpeed * 1000 / 60) / (0.6 * Math.PI);
          const engineRpmFromSpeed = wheelRpm * GEAR_RATIOS[curGear] * FINAL_DRIVE;
          targetRpm = Math.max(targetRpm, engineRpmFromSpeed);
        }

        setRpm(prev => {
          const diff = targetRpm - prev;
          const accel = isThrottling ? 15000 : 5000;
          const next = prev + diff * accel * dt * 0.001;
          return Math.min(REDLINE_RPM, Math.max(0, next));
        });

        if (curRpm >= REDLINE_RPM) {
          setRedlineTime(prev => {
            const next = prev + dt * 1000;
            if (next >= REDLINE_LIMIT_MS) {
              setIsOverheated(true);
              setEngineOn(false);
              setCooldownTime(COOLDOWN_MS);
              return 0;
            }
            return next;
          });
        } else {
          setRedlineTime(prev => Math.max(0, prev - dt * 500));
        }
      } else {
        setRpm(prev => Math.max(0, prev - 8000 * dt));
        setRedlineTime(0);
      }

      if (isHot) {
        setCooldownTime(prev => {
          const next = prev - dt * 1000;
          if (next <= 0) {
            setIsOverheated(false);
            return 0;
          }
          return next;
        });
      }

      // --- Speed Logic ---
      let targetSpeed = 0;
      if (eOn && !isClutching && curGear !== 0) {
        const wheelRpm = curRpm / (GEAR_RATIOS[curGear] * FINAL_DRIVE);
        targetSpeed = (wheelRpm * 0.6 * Math.PI * 60) / 1000;
      }

      setSpeed(prev => {
        let next = prev;
        if (eOn && !isClutching && curGear !== 0) {
          const accelPower = (curRpm / MAX_RPM) * 50;
          next += (targetSpeed - prev) * accelPower * dt * 0.1;
        }
        const brakeForce = (isFrontBraking ? 100 : 0) + (isFootBraking ? 60 : 0);
        const friction = 5 + (prev * 0.05);
        next -= (brakeForce + friction) * dt;
        return Math.min(MAX_SPEED, Math.max(0, next));
      });

      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, []); // Run once

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#1a1a1a] select-none">
      {/* Start Screen Overlay */}
      {!engineOn && rpm === 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-7xl font-black text-white mb-8 tracking-tighter uppercase italic">Dashboard (Alpha 1)</h1>
            <button 
              onClick={() => setEngineOn(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 rounded-full font-black text-2xl uppercase tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-95 transition-all cursor-pointer"
            >
              Start Simulator
            </button>
            <p className="mt-6 text-zinc-500 font-mono text-sm uppercase tracking-widest">Click to focus & start engine</p>
          </motion.div>
        </div>
      )}

      {/* Debug Overlay (Hidden by default, can be toggled if needed) */}
      <div className="fixed top-4 left-4 bg-black/80 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] text-green-500 z-[100] pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${engineOn ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="uppercase font-bold">System Status</span>
        </div>
        <div>RPM: {rpm.toFixed(0)}</div>
        <div>SPD: {speed.toFixed(1)}</div>
        <div>GER: {gear === 0 ? 'N' : gear}</div>
        <div>THR: {throttle > 0 ? 'YES' : 'NO'}</div>
        <div>KEYS: {Array.from(keysPressed.current).join(', ') || 'NONE'}</div>
      </div>

      {/* Header */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center z-50 w-full">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-zinc-900 uppercase opacity-20 select-none pointer-events-none">Dashboard (Alpha 1)</h1>
      </div>

      {/* Main Simulation Area */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-24 w-full max-w-7xl">
        {/* Left Gauges */}
        <div className="flex flex-col gap-12">
          <div className={rpm >= REDLINE_RPM ? "animate-redline" : ""}>
            <Gauge 
              value={rpm} 
              max={MAX_RPM} 
              label="RPM" 
              unit="x1000r/min" 
              redlineStart={REDLINE_RPM}
            />
          </div>
        </div>

        {/* Center Bike */}
        <div className="relative">
          <BikeTopDown throttle={throttle} />
          
          {/* Status Indicators */}
          <div className="absolute -right-24 top-1/2 -translate-y-1/2 flex flex-col gap-4">
            <button 
              onClick={() => !isOverheated && setEngineOn(prev => !prev)}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer active:scale-95 ${engineOn ? 'bg-green-500/10 border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'bg-zinc-800/50 border-zinc-700 text-zinc-600 hover:border-zinc-500'}`}
            >
              <Power size={32} />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest">{engineOn ? 'Running' : 'Off'}</span>
                {!engineOn && !isOverheated && <span className="text-[8px] animate-pulse text-zinc-500">Click or 'F' to Start</span>}
              </div>
            </button>
            
            <div className="p-4 rounded-xl bg-zinc-800 border-2 border-zinc-700 text-zinc-300 flex flex-col items-center">
              <span className="text-2xl font-black">{gear === 0 ? 'N' : gear}</span>
              <span className="text-[10px] font-bold uppercase">Gear</span>
            </div>

            <AnimatePresence>
              {isOverheated && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500 text-red-500 flex flex-col items-center"
                >
                  <AlertTriangle size={24} />
                  <span className="text-[10px] font-bold mt-1 uppercase">Overheat</span>
                  <span className="text-xs font-mono mt-1">{Math.ceil(cooldownTime / 1000)}s</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Info / Controls */}
        <div className="w-64 flex flex-col gap-6">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
            <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={14} /> Controls
            </h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span className="text-zinc-500">Throttle</span>
                <span className="text-red-500">W</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span className="text-zinc-500">Clutch</span>
                <span className="text-red-500">SPACE</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span className="text-zinc-500">F. Brake</span>
                <span className="text-red-500">S</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span className="text-zinc-500">R. Brake</span>
                <span className="text-red-500">SHIFT</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span className="text-zinc-500">Start/Stop</span>
                <span className="text-red-500">F</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span className="text-zinc-500">Gears</span>
                <span className="text-red-500">1-5</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-1">
                <span className="text-zinc-500">Neutral</span>
                <span className="text-red-500">N/O</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
            <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={14} /> System Info
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] uppercase text-zinc-500 mb-1">
                  <span>Engine Temp</span>
                  <span>{Math.round((redlineTime / REDLINE_LIMIT_MS) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-orange-500"
                    animate={{ width: `${(redlineTime / REDLINE_LIMIT_MS) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 leading-relaxed italic">
                * Engine shuts off after redlining for more than 1 min.
                * Cooldown after shutdown: 1 min.
                * Neutral only accessible from 1st or 2nd gear.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Visuals */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none opacity-50" />
    </div>
  );
}
