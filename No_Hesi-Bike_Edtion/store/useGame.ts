import { create } from 'zustand';

export type SpeedUnit = 'kph' | 'mph';
export type ScoringMode = 'overtake' | 'distance';
export type TrafficSpeed = 'slow' | 'normal' | 'fast';
export type GameStatus = 'menu' | 'playing' | 'gameOver' | 'settings' | 'credits';

interface SettingsState {
  speedUnit: SpeedUnit;
  scoringMode: ScoringMode;
  trafficSpeed: TrafficSpeed;
}

interface GameState {
  status: GameStatus;
  score: number;
  speed: number;
  playerZ: number;
  settings: SettingsState;
  startGame: () => void;
  endGame: () => void;
  showSettings: () => void;
  hideSettings: () => void;
  showCredits: () => void;
  hideCredits: () => void;
  setSpeed: (speed: number) => void;
  setScore: (score: number) => void;
  incrementScore: () => void;
  setPlayerZ: (z: number) => void;
  reset: () => void;
  setSpeedUnit: (unit: SpeedUnit) => void;
  setScoringMode: (mode: ScoringMode) => void;
  setTrafficSpeed: (speed: TrafficSpeed) => void;
}

const useGame = create<GameState>((set) => ({
  status: 'menu',
  score: 0,
  speed: 0,
  playerZ: 0,
  settings: {
    speedUnit: 'kph',
    scoringMode: 'overtake',
    trafficSpeed: 'normal',
  },
  startGame: () => set({ status: 'playing', score: 0, playerZ: 0 }),
  endGame: () => set((state) => {
    if (state.status !== 'playing') return {};
    return { status: 'gameOver' };
  }),
  showSettings: () => set({ status: 'settings' }),
  hideSettings: () => set({ status: 'menu' }),
  showCredits: () => set({ status: 'credits' }),
  hideCredits: () => set({ status: 'menu' }),
  setSpeed: (speed) => set({ speed }),
  setScore: (score) => set({ score }),
  incrementScore: () => set((state) => ({ score: state.score + 1 })),
  setPlayerZ: (z) => set({ playerZ: z }),
  reset: () => set({ status: 'menu', score: 0, speed: 0, playerZ: 0 }),
  setSpeedUnit: (unit) => set((state) => ({ settings: { ...state.settings, speedUnit: unit } })),
  setScoringMode: (mode) => set((state) => ({ settings: { ...state.settings, scoringMode: mode } })),
  setTrafficSpeed: (speed) => set((state) => ({ settings: { ...state.settings, trafficSpeed: speed } })),
}));

export default useGame;