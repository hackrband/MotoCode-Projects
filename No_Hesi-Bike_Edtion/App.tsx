
import React from 'react';
import { KeyboardControls } from '@react-three/drei';
import Game from './components/Game';
import UI from './components/UI';

export enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
}

const controlMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'w', 'W'] },
  { name: Controls.backward, keys: ['ArrowDown', 's', 'S'] },
  { name: Controls.left, keys: ['ArrowLeft', 'a', 'A'] },
  { name: Controls.right, keys: ['ArrowRight', 'd', 'D'] },
];

function App() {
  return (
    <KeyboardControls map={controlMap}>
      <div className="relative w-full h-full">
        <Game />
        <UI />
      </div>
    </KeyboardControls>
  );
}

export default App;
