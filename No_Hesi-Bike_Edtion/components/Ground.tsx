
import React, { useRef, useLayoutEffect } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

const ROAD_WIDTH = 10;
const ROAD_LENGTH = 100000; // Increased length for longer gameplay
const BARRIER_WIDTH = 0.5;
const BARRIER_HEIGHT = 1.5;

// Constants for dashed lines
const LANE_MARKER_DASH_LENGTH = 5;
const LANE_MARKER_DASH_GAP = 10;
const LANE_MARKER_CYCLE = LANE_MARKER_DASH_LENGTH + LANE_MARKER_DASH_GAP;
const NUM_DASHES = Math.floor(ROAD_LENGTH / LANE_MARKER_CYCLE);

// Use InstancedMesh for performance
const DashedLine = ({ positionX }: { positionX: number }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObject = new THREE.Object3D();

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        
        for (let i = 0; i < NUM_DASHES; i++) {
            const zPos = -ROAD_LENGTH / 2 + i * LANE_MARKER_CYCLE;
            tempObject.position.set(positionX, 0.01, zPos + LANE_MARKER_DASH_LENGTH / 2);
            tempObject.rotation.x = -Math.PI / 2;
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [positionX]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, NUM_DASHES]}>
            <planeGeometry args={[0.15, LANE_MARKER_DASH_LENGTH]} />
            <meshStandardMaterial color="#ffffff" />
        </instancedMesh>
    );
};


function Ground() {
  return (
    <RigidBody type="fixed" colliders={false} name="ground" friction={0.8} restitution={0.2}>
        {/* Ground Collider */}
        <CuboidCollider args={[ROAD_WIDTH / 2, 0.1, ROAD_LENGTH / 2]} position={[0, -0.1, 0]} />

        {/* Barrier Colliders */}
        <CuboidCollider 
            args={[BARRIER_WIDTH / 2, BARRIER_HEIGHT / 2, ROAD_LENGTH / 2]} 
            position={[-ROAD_WIDTH / 2 - BARRIER_WIDTH / 2, BARRIER_HEIGHT / 2, 0]} 
        />
        <CuboidCollider 
            args={[BARRIER_WIDTH / 2, BARRIER_HEIGHT / 2, ROAD_LENGTH / 2]} 
            position={[ROAD_WIDTH / 2 + BARRIER_WIDTH / 2, BARRIER_HEIGHT / 2, 0]} 
        />
        
        <group>
            {/* Road Surface */}
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
                <meshStandardMaterial color="#333333" />
            </mesh>

            {/* Visual Barriers (Concrete style) */}
            <mesh position={[-ROAD_WIDTH / 2 - BARRIER_WIDTH / 2, BARRIER_HEIGHT / 2, 0]}>
                <boxGeometry args={[BARRIER_WIDTH, BARRIER_HEIGHT, ROAD_LENGTH]} />
                <meshStandardMaterial color="#666666" roughness={0.8} />
            </mesh>
             <mesh position={[ROAD_WIDTH / 2 + BARRIER_WIDTH / 2, BARRIER_HEIGHT / 2, 0]}>
                <boxGeometry args={[BARRIER_WIDTH, BARRIER_HEIGHT, ROAD_LENGTH]} />
                <meshStandardMaterial color="#666666" roughness={0.8} />
            </mesh>
            
            {/* Dashed Lane Markers */}
            <DashedLine positionX={-ROAD_WIDTH / 4} />
            <DashedLine positionX={ROAD_WIDTH / 4} />
        </group>
    </RigidBody>
  );
}

export default Ground;
