
import React, { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Player from './Player';
import Ground from './Ground';
import TrafficCar from './TrafficCar';
import useGame from '../store/useGame';

const LANES = [-3, 0, 3];
const TRAFFIC_SPAWN_Z_MIN = 60;
const TRAFFIC_SPAWN_Z_MAX = 120;
const CAR_SAFE_DISTANCE = 25; // Min distance between cars for safety checks
const CAR_CHECK_AHEAD_DISTANCE = 50; // How far a car looks ahead to change lanes

interface TrafficCarState {
    id: number;
    initialPosition: [number, number, number];
    speed: number;
    laneIndex: number;
    targetLaneIndex: number;
}

function IntroCamera() {
    const { camera } = useThree();
    const status = useGame((state) => state.status);

    React.useEffect(() => {
        if (status === 'menu') {
            camera.position.set(0, 4, 10);
            camera.lookAt(0, 2, 0);
        }
    }, [status, camera]);

    useFrame((state, delta) => {
        if (status !== 'menu') return;
        
        camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 2;
        camera.position.z = 10 + Math.cos(state.clock.elapsedTime * 0.2) * 2;
        camera.lookAt(0, 1, 0);
    });

    return null;
}

function Game() {
    const status = useGame((state) => state.status);

    return (
        <Canvas shadows>
            <Suspense fallback={null}>
                <PerspectiveCamera makeDefault position={[0, 10, -20]} fov={75} />
                <fog attach="fog" args={['#1c0221', 10, 200]} />
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[10, 20, 0]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />
                <Physics>
                    {(status === 'playing' || status === 'gameOver') ? <Player /> : null}
                    <Ground />
                    {(status === 'playing' || status === 'gameOver') ? <Traffic /> : null}
                </Physics>
                
                {(status === 'menu' || status === 'settings') && <IntroCamera />}
                
                <EffectComposer>
                    <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1} />
                </EffectComposer>
            </Suspense>
        </Canvas>
    );
}

function Traffic() {
    const [traffic, setTraffic] = useState<Map<number, TrafficCarState>>(new Map());
    const trafficRefs = useRef<Map<number, React.RefObject<RapierRigidBody>>>(new Map());
    const status = useGame((state) => state.status);
    const playerZ = useGame((state) => state.playerZ);
    const { trafficSpeed } = useGame((state) => state.settings);
    const nextId = useRef(0);
    const spawnTimer = useRef(0);

    const removeCar = useCallback((id: number) => {
        setTraffic((prev) => {
            const newTraffic = new Map(prev);
            newTraffic.delete(id);
            return newTraffic;
        });
        trafficRefs.current.delete(id);
    }, []);

    useFrame((state, delta) => {
        if (status !== 'playing') return;

        // --- SPAWN NEW CARS ---
        spawnTimer.current += delta;
        if (spawnTimer.current > 0.2) { // Try to spawn more frequently (every 0.2s) to fill gaps
            spawnTimer.current = 0;
            
            if (traffic.size < 25) {
                const laneIndex = Math.floor(Math.random() * LANES.length);
                const laneX = LANES[laneIndex];
                const zOffset = TRAFFIC_SPAWN_Z_MIN + Math.random() * (TRAFFIC_SPAWN_Z_MAX - TRAFFIC_SPAWN_Z_MIN);
                const newCarZ = playerZ + zOffset;

                const isSpotOccupied = Array.from(traffic.values()).some(car => 
                    car.laneIndex === laneIndex && Math.abs(car.initialPosition[2] - newCarZ) < CAR_SAFE_DISTANCE
                );
                
                if (!isSpotOccupied) {
                    const getSpeedRange = () => {
                        switch(trafficSpeed) {
                            case 'slow': return { min: 30, max: 60 };
                            case 'fast': return { min: 70, max: 110 };
                            case 'normal':
                            default: return { min: 50, max: 80 };
                        }
                    }
                    const { min, max } = getSpeedRange();
                    const speed = min + Math.random() * (max - min);
                    const id = nextId.current++;

                    const newCar: TrafficCarState = {
                        id,
                        initialPosition: [laneX, 0.8, newCarZ],
                        speed,
                        laneIndex,
                        targetLaneIndex: laneIndex,
                    };

                    trafficRefs.current.set(id, React.createRef<RapierRigidBody>());
                    setTraffic(prev => new Map(prev).set(id, newCar));
                }
            }
        }
        
        // --- COLLISION AVOIDANCE LOGIC ---
        const currentCarPositions = Array.from(traffic.values()).map(carState => {
            const body = trafficRefs.current.get(carState.id)?.current;
            return { ...carState, position: body?.translation() };
        });

        for (const car of currentCarPositions) {
            if (!car.position || car.laneIndex !== car.targetLaneIndex) {
                 // Already changing lanes, wait until it's finished
                 if (car.position && Math.abs(LANES[car.targetLaneIndex] - car.position.x) < 0.2) {
                    setTraffic(prev => {
                        const newTraffic = new Map(prev);
                        const carToUpdate = newTraffic.get(car.id);
                        if(carToUpdate) newTraffic.set(car.id, {...carToUpdate, laneIndex: carToUpdate.targetLaneIndex});
                        return newTraffic;
                    });
                 }
                 continue;
            }
            
            const carInFront = currentCarPositions
                .filter(other => other.id !== car.id && other.laneIndex === car.laneIndex && other.position && other.position.z > car.position.z)
                .sort((a, b) => a.position!.z - b.position!.z)[0];

            if (carInFront && carInFront.position) {
                const distance = carInFront.position.z - car.position.z;
                const isApproaching = car.speed > carInFront.speed;

                if (isApproaching && distance < CAR_CHECK_AHEAD_DISTANCE) {
                    const possibleLanes = [-1, 1] // Check left, then right
                        .map(dir => car.laneIndex + dir)
                        .filter(idx => idx >= 0 && idx < LANES.length);

                    for (const targetLane of possibleLanes) {
                        const isLaneClear = !currentCarPositions.some(other => 
                            other.targetLaneIndex === targetLane && 
                            other.position &&
                            Math.abs(other.position.z - car.position!.z) < CAR_SAFE_DISTANCE
                        );

                        if (isLaneClear) {
                            setTraffic(prev => {
                                const newTraffic = new Map(prev);
                                const carToUpdate = newTraffic.get(car.id);
                                if(carToUpdate) newTraffic.set(car.id, {...carToUpdate, targetLaneIndex: targetLane});
                                return newTraffic;
                            });
                            break; // Found a lane, stop checking
                        }
                    }
                }
            }
        }
    });

    return (
        <>
            {Array.from(traffic.values()).map((car) => (
                <TrafficCar 
                    key={car.id} 
                    id={car.id}
                    initialPosition={car.initialPosition}
                    speed={car.speed}
                    targetLaneIndex={car.targetLaneIndex}
                    onBehindPlayer={removeCar} 
                    ref={trafficRefs.current.get(car.id)}
                />
            ))}
        </>
    );
}

export default Game;
