import React from 'react';
import useGame from '../store/useGame';

function UI() {
  const { status, score, speed, startGame, reset, showSettings, showCredits, settings } = useGame();

  const displayedSpeed = settings.speedUnit === 'mph' ? speed * 0.621371 : speed;
  const speedUnitText = settings.speedUnit === 'mph' ? 'MPH' : 'KM/H';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 text-white">
      {/* In-game HUD */}
      {status === 'playing' && (
        <div className="flex h-full flex-col justify-between p-8">
          <div className="flex justify-between items-start">
            <div className="text-4xl font-bold font-mono">Score: {score.toFixed(0)}</div>
          </div>
          <div className="flex justify-center items-end">
             <div className="bg-black bg-opacity-50 p-4 rounded-lg text-center">
                <div className="text-6xl font-bold font-mono tracking-widest">{displayedSpeed.toFixed(0)}</div>
                <div className="text-lg font-mono">{speedUnitText}</div>
             </div>
          </div>
        </div>
      )}

      {/* Fullscreen Menus */}
      {status === 'menu' && <Menu onStart={startGame} onSettings={showSettings} onCredits={showCredits} />}
      {status === 'settings' && <Settings />}
      {status === 'credits' && <Credits />}
      {status === 'gameOver' && <GameOver score={score} onRestart={reset} />}
    </div>
  );
}

const Menu = ({ onStart, onSettings, onCredits }: { onStart: () => void, onSettings: () => void, onCredits: () => void }) => (
    <div className="pointer-events-auto relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center justify-center text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 text-white tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">NO HESI: BIKE EDITION</h1>

            <div className="flex justify-center items-center gap-16 my-4">
                 <button onClick={onSettings} className="text-white font-bold text-2xl tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] transition-transform hover:scale-110">SETTINGS</button>
                 <button onClick={onCredits} className="text-white font-bold text-2xl tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] transition-transform hover:scale-110">CREDITS</button>
            </div>

            <button
                onClick={onStart}
                className="text-white font-bold text-5xl tracking-wider transition-transform hover:scale-110 mt-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
            >
                PLAY
            </button>
        </div>
    </div>
);

const Settings = () => {
    const { settings, setSpeedUnit, setScoringMode, setTrafficSpeed, hideSettings } = useGame();

    const settingButtonClasses = "px-4 py-2 rounded-md transition-colors text-lg font-semibold w-40 text-center";
    const activeSettingClasses = "bg-purple-600 text-white";
    const inactiveSettingClasses = "bg-gray-700 hover:bg-gray-600 text-gray-200";

    return (
        <div className="pointer-events-auto flex h-full w-full flex-col items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl">
                <h2 className="text-5xl font-bold mb-8 text-center text-white">Settings</h2>

                {/* Speed Unit */}
                <div className="flex justify-between items-center mb-6">
                    <p className="text-2xl font-semibold text-white">Speed Unit</p>
                    <div className="flex gap-2">
                        <button onClick={() => setSpeedUnit('kph')} className={`${settingButtonClasses} ${settings.speedUnit === 'kph' ? activeSettingClasses : inactiveSettingClasses}`}>KPH</button>
                        <button onClick={() => setSpeedUnit('mph')} className={`${settingButtonClasses} ${settings.speedUnit === 'mph' ? activeSettingClasses : inactiveSettingClasses}`}>MPH</button>
                    </div>
                </div>

                {/* Scoring Mode */}
                <div className="flex justify-between items-center mb-6">
                    <p className="text-2xl font-semibold text-white">Score</p>
                    <div className="flex gap-2">
                        <button onClick={() => setScoringMode('overtake')} className={`${settingButtonClasses} ${settings.scoringMode === 'overtake' ? activeSettingClasses : inactiveSettingClasses}`}>Cars Overtook</button>
                        <button onClick={() => setScoringMode('distance')} className={`${settingButtonClasses} ${settings.scoringMode === 'distance' ? activeSettingClasses : inactiveSettingClasses}`}>Distance</button>
                    </div>
                </div>

                {/* Traffic Speed */}
                <div className="flex justify-between items-center mb-8">
                    <p className="text-2xl font-semibold text-white">Traffic Speed</p>
                    <div className="flex gap-2">
                        <button onClick={() => setTrafficSpeed('slow')} className={`${settingButtonClasses} ${settings.trafficSpeed === 'slow' ? activeSettingClasses : inactiveSettingClasses}`}>Slow</button>
                        <button onClick={() => setTrafficSpeed('normal')} className={`${settingButtonClasses} ${settings.trafficSpeed === 'normal' ? activeSettingClasses : inactiveSettingClasses}`}>Normal</button>
                        <button onClick={() => setTrafficSpeed('fast')} className={`${settingButtonClasses} ${settings.trafficSpeed === 'fast' ? activeSettingClasses : inactiveSettingClasses}`}>Fast</button>
                    </div>
                </div>
                
                <div className="text-center mt-12">
                    <button onClick={hideSettings} className="text-white font-bold text-3xl tracking-wider transition-transform hover:scale-110 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                       BACK
                    </button>
                </div>
            </div>
        </div>
    )
};

const Credits = () => {
    const { hideCredits } = useGame();
    return (
        <div className="pointer-events-auto flex h-full w-full flex-col items-center justify-center bg-black bg-opacity-70">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl text-center">
                <h2 className="text-5xl font-bold mb-8 text-white">Credits</h2>
                <p className="text-3xl font-semibold text-white mb-12">Author: M.Salim Nasirov (Hackrband)</p>
                <button onClick={hideCredits} className="text-white font-bold text-3xl tracking-wider transition-transform hover:scale-110 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                   BACK
                </button>
            </div>
        </div>
    );
};


const GameOver = ({ score, onRestart }: { score: number; onRestart: () => void }) => {
    return (
        <div className="pointer-events-auto flex h-full w-full flex-col items-center justify-center bg-black bg-opacity-50">
            <h2 className="text-6xl font-bold mb-2">Game Over</h2>
            <p className="text-4xl mb-8">Your Score: {score.toFixed(0)}</p>
            <button
              onClick={onRestart}
              className="text-white font-bold text-5xl tracking-wider transition-transform hover:scale-110 mt-4 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
            >
              Restart
            </button>
        </div>
    );
};

export default UI;