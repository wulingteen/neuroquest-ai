"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Float, ContactShadows } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

function BarbapapaBody() {
    const points = useMemo(() => {
        const pts = [];
        // Define the profile curve (x, y)
        pts.push(new THREE.Vector2(0, 0));
        pts.push(new THREE.Vector2(0.6, 0.05));
        pts.push(new THREE.Vector2(1.1, 0.4));
        pts.push(new THREE.Vector2(1.4, 1.0));
        pts.push(new THREE.Vector2(1.35, 1.8));
        pts.push(new THREE.Vector2(0.9, 2.4));
        pts.push(new THREE.Vector2(0.6, 2.9)); // Narrow part/neck
        pts.push(new THREE.Vector2(0.55, 3.4)); // Head start
        pts.push(new THREE.Vector2(0.4, 3.9));
        pts.push(new THREE.Vector2(0, 4.1)); // Top center
        return pts;
    }, []);

    return (
        <mesh castShadow receiveShadow>
            <latheGeometry args={[points, 64]} />
            <meshStandardMaterial
                color="#A020F0"
                roughness={0.2}
                metalness={0.1}
                emissive="#330044"
                emissiveIntensity={0.2}
            />
        </mesh>
    );
}

function Face() {
    return (
        <group position={[0, 3.4, 0.6]} rotation={[0, 0, 0]}>
            {/* Eyes - Vertical Ovals with 3D depth */}
            <group position={[-0.2, 0.2, 0]}>
                <mesh scale={[0.7, 1.4, 0.5]}>
                    <sphereGeometry args={[0.2, 32, 32]} />
                    <meshStandardMaterial color="white" roughness={0.1} />
                </mesh>
                <group position={[0, 0, 0.08]} scale={[0.4, 1.1, 0.2]}>
                    <mesh>
                        <sphereGeometry args={[0.12, 32, 32]} />
                        <meshStandardMaterial color="black" roughness={0.1} />
                    </mesh>
                </group>
            </group>
            <group position={[0.2, 0.2, 0]}>
                <mesh scale={[0.7, 1.4, 0.5]}>
                    <sphereGeometry args={[0.2, 32, 32]} />
                    <meshStandardMaterial color="white" roughness={0.1} />
                </mesh>
                <group position={[0, 0, 0.08]} scale={[0.4, 1.1, 0.2]}>
                    <mesh>
                        <sphereGeometry args={[0.12, 32, 32]} />
                        <meshStandardMaterial color="black" roughness={0.1} />
                    </mesh>
                </group>
            </group>

            {/* Simple Smile */}
            <mesh position={[0, -0.15, -0.1]} rotation={[Math.PI / 1.7, 0, 0]}>
                <torusGeometry args={[0.14, 0.015, 16, 32, Math.PI]} />
                <meshStandardMaterial color="#222" />
            </mesh>
        </group>
    );
}

function Limbs() {
    return (
        <group>
            {/* Arms */}
            <mesh position={[-1.3, 1.8, 0]} rotation={[0, 0, -Math.PI / 6]}>
                <capsuleGeometry args={[0.18, 0.5, 16, 16]} />
                <meshStandardMaterial color="#A020F0" roughness={0.2} />
            </mesh>
            <mesh position={[1.3, 1.8, 0]} rotation={[0, 0, Math.PI / 6]}>
                <capsuleGeometry args={[0.18, 0.5, 16, 16]} />
                <meshStandardMaterial color="#A020F0" roughness={0.2} />
            </mesh>

            {/* Feet */}
            <group position={[-0.5, 0.15, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <capsuleGeometry args={[0.25, 0.3, 16, 16]} />
                    <meshStandardMaterial color="#A020F0" roughness={0.2} />
                </mesh>
            </group>
            <group position={[0.5, 0.15, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <capsuleGeometry args={[0.25, 0.3, 16, 16]} />
                    <meshStandardMaterial color="#A020F0" roughness={0.2} />
                </mesh>
            </group>
        </group>
    );
}

function Character() {
    return (
        <group position={[0, -2.1, 0]}>
            <BarbapapaBody />
            <Face />
            <Limbs />
        </group>
    );
}

export default function Profile3D() {
    return (
        <div className="w-full h-full">
            <Canvas
                shadows
                style={{ background: 'transparent' }}
                camera={{ position: [0, 2, 11], fov: 35 }}
            >
                <ambientLight intensity={1.5} />
                <spotLight
                    position={[10, 15, 10]}
                    angle={0.2}
                    penumbra={1}
                    intensity={2.5}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <pointLight position={[-10, -10, -10]} intensity={1} />

                <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
                    <Character />
                </Float>

                <ContactShadows
                    opacity={0.4}
                    scale={10}
                    blur={1.5}
                    far={10}
                    resolution={512}
                    color="#000000"
                />
                <Environment preset="city" />
                <OrbitControls
                    enablePan={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 1.5}
                    enableZoom={true}
                />
            </Canvas>
        </div>
    );
}
