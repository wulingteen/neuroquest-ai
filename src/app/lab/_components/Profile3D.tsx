"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Float } from "@react-three/drei";
import * as THREE from "three";

function Character() {
    const groupRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const leftLegRef = useRef<THREE.Mesh>(null);
    const rightLegRef = useRef<THREE.Mesh>(null);
    const bodyRef = useRef<THREE.Group>(null);

    // Character materials
    const materials = useMemo(() => {
        return {
            gold: new THREE.MeshStandardMaterial({
                color: "#EBB351",
                roughness: 0.6,
                metalness: 0.1,
            }),
            eyes: new THREE.MeshStandardMaterial({
                color: "#FFFFFF",
                roughness: 0.1,
            }),
            pupil: new THREE.MeshStandardMaterial({
                color: "#111111",
                roughness: 0.4,
            })
        }
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const danceSpeed = 4;

        // Dancing animation:

        // Body bop (jumping up and down slightly)
        if (bodyRef.current) {
            bodyRef.current.position.y = Math.abs(Math.sin(t * danceSpeed)) * 0.3;
            // Slight tilt side to side
            bodyRef.current.rotation.z = Math.sin(t * danceSpeed / 2) * 0.1;
            // Slight bounce scaling
            const stretch = 1 + Math.sin(t * danceSpeed) * 0.05;
            const squash = 1 - Math.sin(t * danceSpeed) * 0.05;
            bodyRef.current.scale.set(squash, stretch, squash);
        }

        // Arm swing
        if (leftArmRef.current && rightArmRef.current) {
            // Left arm rotates around its shoulder pivot
            leftArmRef.current.rotation.z = Math.sin(t * danceSpeed) * 0.5 + 0.3;
            leftArmRef.current.rotation.x = Math.sin(t * danceSpeed * 2) * 0.3;

            // Right arm rotates around its shoulder pivot
            rightArmRef.current.rotation.z = -Math.sin(t * danceSpeed) * 0.5 - 0.3;
            rightArmRef.current.rotation.x = -Math.sin(t * danceSpeed * 2) * 0.3;
        }

        // Leg tap / bounce
        if (leftLegRef.current && rightLegRef.current) {
            leftLegRef.current.position.y = -1.2 + Math.max(0, Math.sin(t * danceSpeed)) * 0.2;
            rightLegRef.current.position.y = -1.2 + Math.max(0, Math.sin(t * danceSpeed + Math.PI)) * 0.2;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0.5, 0]}>
            <group ref={bodyRef}>
                {/* Main Body (Pear shape: larger bottom, smaller top) */}
                <mesh position={[0, -0.3, 0]} material={materials.gold} scale={[1.2, 1.1, 1.1]}>
                    <sphereGeometry args={[1, 32, 32]} />
                </mesh>
                <mesh position={[0, 0.6, 0]} material={materials.gold} scale={[0.9, 0.9, 0.9]}>
                    <sphereGeometry args={[1, 32, 32]} />
                </mesh>

                {/* Smoothing the transition slightly with a cylinder */}
                <mesh position={[0, 0.15, 0]} material={materials.gold}>
                    <cylinderGeometry args={[0.85, 1.1, 1, 32]} />
                </mesh>

                {/* Eyes */}
                <group position={[0, 0.6, 0.8]}>
                    {/* Left Eye */}
                    <mesh position={[-0.35, 0, 0]} material={materials.eyes}>
                        <sphereGeometry args={[0.25, 32, 32]} />
                    </mesh>
                    <mesh position={[-0.35, 0, 0.22]} material={materials.pupil}>
                        <sphereGeometry args={[0.08, 16, 16]} />
                    </mesh>

                    {/* Right Eye */}
                    <mesh position={[0.35, 0, 0]} material={materials.eyes}>
                        <sphereGeometry args={[0.25, 32, 32]} />
                    </mesh>
                    <mesh position={[0.35, 0, 0.22]} material={materials.pupil}>
                        <sphereGeometry args={[0.08, 16, 16]} />
                    </mesh>
                </group>

                {/* Mouth */}
                <mesh position={[0, 0.2, 1.0]} material={materials.gold} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.15, 0.04, 16, 32, Math.PI]} />
                </mesh>

                {/* Left Arm (with pivot group) */}
                <group ref={leftArmRef} position={[-1.2, 0, 0]}>
                    <mesh position={[-0.2, -0.4, 0]} material={materials.gold}>
                        <capsuleGeometry args={[0.2, 0.6, 16, 16]} />
                    </mesh>
                </group>

                {/* Right Arm (with pivot group) */}
                <group ref={rightArmRef} position={[1.2, 0, 0]}>
                    <mesh position={[0.2, -0.4, 0]} material={materials.gold}>
                        <capsuleGeometry args={[0.2, 0.6, 16, 16]} />
                    </mesh>
                </group>
            </group>

            {/* Legs (Independent from body grouping to stay mostly planted) */}
            <mesh ref={leftLegRef} position={[-0.4, -1.2, 0]} material={materials.gold}>
                <capsuleGeometry args={[0.22, 0.4, 16, 16]} />
            </mesh>
            <mesh ref={rightLegRef} position={[0.4, -1.2, 0]} material={materials.gold}>
                <capsuleGeometry args={[0.22, 0.4, 16, 16]} />
            </mesh>
        </group>
    );
}

export default function Profile3D() {
    return (
        <div className="w-full h-full relative">
            <Canvas
                shadows
                camera={{ position: [0, 1.5, 6], fov: 45 }}
                className="w-full h-full"
            >
                <ambientLight intensity={0.5} />
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={1}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />

                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
                    <Character />
                </Float>

                <Environment preset="city" />

                <ContactShadows
                    position={[0, -1.5, 0]}
                    opacity={0.5}
                    scale={10}
                    blur={2}
                    far={4}
                />

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 3}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                />
            </Canvas>
        </div>
    );
}
