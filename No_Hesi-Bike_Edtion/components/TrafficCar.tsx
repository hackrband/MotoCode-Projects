import React, { useMemo, useRef, useEffect, forwardRef } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import useGame from '../store/useGame';

interface TrafficCarProps {
  id: number;
  initialPosition: [number, number, number];
  speed: number;
  targetLaneIndex: number;
  onBehindPlayer: (id: number) => void;
}

const CAR_COLORS = ['#ff4040', '#40ff40', '#4040ff', '#ffff40', '#ff40ff', '#40ffff', '#ffffff'];
const LANES = [-3, 0, 3];

const TrafficCar = forwardRef<RapierRigidBody, TrafficCarProps>(
  ({ id, initialPosition, speed, targetLaneIndex, onBehindPlayer }, ref) => {
  
  const { status, playerZ, incrementScore, settings } = useGame();
  const { scoringMode } = settings;
  const passed = useRef(false);
  const speedMPS = useMemo(() => speed / 3.6, [speed]);
  
  const color = useMemo(() => CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], []);
  const dimensions = useMemo(() => ({
    width: 2 + Math.random() * 0.5,
    height: 1 + Math.random() * 0.5,
    length: 4 + Math.random(),
  }), []);

  useEffect(() => {
    const body = (ref as React.RefObject<RapierRigidBody>)?.current;
    if (status === 'gameOver' && body) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [status, ref]);

  useFrame(() => {
    const body = (ref as React.RefObject<RapierRigidBody>)?.current;
    if (!body) return;

    if (status !== 'playing') {
      const vel = body.linvel();
      if(vel.x !== 0 || vel.y !== 0 || vel.z !== 0) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      return;
    };

    const carPos = body.translation();

    // Score a point when the player passes the car
    if (scoringMode === 'overtake' && !passed.current && carPos.z < playerZ) {
      incrementScore();
      passed.current = true;
    }
    
    // Despawn the car when it's far behind the player
    if (carPos.z < playerZ - 50) {
        onBehindPlayer(id);
    }

    // Lane change steering logic
    const targetX = LANES[targetLaneIndex];
    const steerForce = (targetX - carPos.x) * 2; // Proportional steering
    body.setLinvel({ x: steerForce, y: 0, z: speedMPS }, true);
  });

  return (
    <RigidBody
      ref={ref}
      position={initialPosition}
      colliders={false}
      type="kinematicVelocity"
      name="traffic"
    >
      <CuboidCollider args={[dimensions.width / 2, dimensions.height / 2, dimensions.length / 2]} />
      <group>
        {/* Car Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Car Cabin */}
        <mesh position={[0, dimensions.height/2, -0.2]}>
           <boxGeometry args={[dimensions.width * 0.8, dimensions.height * 0.8, dimensions.length * 0.5]} />
           <meshStandardMaterial color="black" transparent opacity={0.5} />
        </mesh>
      </group>
    </RigidBody>
  );
});

export default React.memo(TrafficCar);