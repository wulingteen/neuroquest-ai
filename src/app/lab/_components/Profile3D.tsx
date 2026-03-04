"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Float, ContactShadows } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import catData from "./cat_data.json";

function ChonkyCat() {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();

        const vertices = new Float32Array(catData.vertices);
        const normals = new Float32Array(catData.normals);
        const indices = new Uint32Array(catData.indices);

        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geo.setIndex(new THREE.BufferAttribute(indices, 1));

        geo.computeBoundingBox();
        const box = geo.boundingBox!;
        const center = box.getCenter(new THREE.Vector3());

        // Center the geometry
        geo.translate(-center.x, -center.y, -center.z);

        // Scale it to a nice size
        geo.computeBoundingBox();
        const size = geo.boundingBox!.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4.0 / maxDim;
        geo.scale(scale, scale, scale);

        // Final bounding box for vertical alignment
        geo.computeBoundingBox();
        const finalBox = geo.boundingBox!;
        geo.translate(0, -finalBox.min.y - 2.0, 0);

        // Quick rotation adjustment
        geo.rotateX(-Math.PI / 2); // Blender usually has Z-up, three.js has Y-up
        geo.rotateY(-Math.PI / 8);
        geo.rotateZ(Math.PI / 8);

        return geo;
    }, []);

    return (
        <mesh
            geometry={geometry}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color="#A020F0"
                roughness={0.3}
                metalness={0.1}
                emissive="#330044"
                emissiveIntensity={0.2}
                flatShading={true} // Emphasize the low-poly look!
            />
        </mesh>
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
                    <ChonkyCat />
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
