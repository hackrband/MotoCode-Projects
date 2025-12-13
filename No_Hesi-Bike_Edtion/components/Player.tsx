
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import useGame from '../store/useGame';
import { Controls } from '../App';

const BIKE_LENGTH = 2.5;
const BIKE_WIDTH = 1;
const ACCELERATION = 80;
const MAX_SPEED = 250;
const MIN_BIKE_SPEED_MPS = 0;
const BRAKE_FORCE = -120;
const SWERVE_FORCE = 60;
const LEAN_AMOUNT = -0.5;

function Player() {
  const body = useRef<RapierRigidBody>(null);
  const bikeMesh = useRef<THREE.Group>(null);
  const { status, endGame, setSpeed, setPlayerZ, setScore, settings } = useGame();
  const { scoringMode } = settings;
  const [subscribeKeys, getKeys] = useKeyboardControls<Controls>();
  const { camera } = useThree();

  // Adjusted camera offset to be closer (z: -6 instead of -8, y: 3.5 instead of 4)
  const cameraOffset = useMemo(() => new THREE.Vector3(0, 3.5, -6), []);
  
  // Use a ref for smoothed lookAt target to prevent jitter
  const smoothedLookAt = useRef(new THREE.Vector3(0, 1, 10));

  useFrame((state, delta) => {
    if (!body.current || !bikeMesh.current) return;

    const position = body.current.translation();

    // --- Camera Smoothing Logic ---
    const bodyPosition = new THREE.Vector3(position.x, position.y, position.z);
    
    // Smooth Camera Position
    const desiredCameraPosition = bodyPosition.clone().add(cameraOffset);
    // Lower lerp speed slightly (8) to absorb some physics jitter while remaining responsive
    camera.position.lerp(desiredCameraPosition, delta * 8);
    
    // Smooth Camera Rotation (LookAt)
    const targetLookAt = new THREE.Vector3(position.x, position.y + 1, position.z);
    // Interpolate the lookAt target. This filters out high-frequency vibrations from the physics body.
    smoothedLookAt.current.lerp(targetLookAt, delta * 10);
    camera.lookAt(smoothedLookAt.current);
    // -----------------------------

    // Freeze physics updates if not playing
    if (status !== 'playing') {
      return;
    }
    
    const { forward, backward, left, right } = getKeys();
    const impulse = new THREE.Vector3();

    const currentVelocity = body.current.linvel();
    const speed = new THREE.Vector3(currentVelocity.x, 0, currentVelocity.z).length() * 3.6; // Convert to km/h

    // Movement (world space)
    if (forward && speed < MAX_SPEED) {
      impulse.z += ACCELERATION * delta;
    }
    if (backward) {
      impulse.z += BRAKE_FORCE * delta;
    }

    // Swerving (world space) - A=Left (-x), D=Right (+x)
    const steerDirection = (left ? 1 : 0) - (right ? 1 : 0);
    if (steerDirection !== 0) {
       impulse.x = steerDirection * SWERVE_FORCE * delta;
    }

    body.current.applyImpulse(impulse, true);
    
    // Enforce minimum speed
    const updatedVelocity = body.current.linvel();
    if (updatedVelocity.z < MIN_BIKE_SPEED_MPS) {
        body.current.setLinvel({ x: updatedVelocity.x, y: updatedVelocity.y, z: MIN_BIKE_SPEED_MPS }, true);
    }

    // Lock physics body rotation to prevent spinning out
    body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    body.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    
    // Visual Lean/Yaw for the bike model inside the physics body
    // Lean left = counter-clockwise = positive Z rotation
    const targetLean = steerDirection * LEAN_AMOUNT * Math.min(1, speed / 50);
    const targetYaw = steerDirection * 0.2 * Math.min(1, speed / 50);
    bikeMesh.current.rotation.z = THREE.MathUtils.lerp(bikeMesh.current.rotation.z, targetLean, delta * 10);
    bikeMesh.current.rotation.y = THREE.MathUtils.lerp(bikeMesh.current.rotation.y, targetYaw, delta * 10);
    
    // Update player position and speed
    setPlayerZ(position.z);
    if (scoringMode === 'distance') {
        setScore(Math.floor(position.z));
    }
    setSpeed(speed);
  });

  const handleCollision = (event: any) => {
    if (event.other.rigidBodyObject.name === "traffic") {
        endGame();
    }
  };

  return (
    <RigidBody
      ref={body}
      position={[0, 1, 0]}
      colliders={false}
      mass={50}
      linearDamping={0.5}
      angularDamping={0.8}
      onCollisionEnter={handleCollision}
      name="player"
    >
      <CuboidCollider args={[BIKE_WIDTH / 2, 0.5, BIKE_LENGTH / 2]} />
      <group ref={bikeMesh} scale={1.2}>
        {/* Body */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[0.6, 0.4, 2]} />
          <meshStandardMaterial color="#8A2BE2" metalness={0.8} roughness={0.2} />
        </mesh>
         {/* Seat */}
        <mesh castShadow position={[0, 0.8, -0.3]}>
          <boxGeometry args={[0.5, 0.2, 0.8]} />
          <meshStandardMaterial color="black" />
        </mesh>
         {/* Wheels */}
        <mesh position={[0, 0.35, 0.9]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
            <meshStandardMaterial color="black" />
        </mesh>
        <mesh position={[0, 0.35, -0.9]}>
            <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
            <meshStandardMaterial color="black" />
        </mesh>
        {/* Headlight */}
        <mesh position={[0, 0.6, 1.1]}>
            <boxGeometry args={[0.2, 0.2, 0.1]} />
            <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={10} toneMapped={false} />
        </mesh>
         {/* Taillight */}
        <mesh position={[0, 0.6, -1.3]}>
            <boxGeometry args={[0.3, 0.15, 0.1]} />
            <meshStandardMaterial color="red" emissive="red" emissiveIntensity={10} toneMapped={false}/>
        </mesh>
      </group>
    </RigidBody>
  );
}

export default Player;
