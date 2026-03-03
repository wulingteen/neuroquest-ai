"use client";

import Profile3D from "./_components/Profile3D";

export default function LabPage() {
    return (
        <div className="min-h-screen bg-[#1F2024] text-white flex flex-col items-center justify-center">
            <div className="w-full h-[600px] max-w-2xl relative">
                <Profile3D />
            </div>
            <div className="mt-8 text-center">
                <h1 className="text-4xl font-bold mb-4">3D Lab</h1>
                <p className="text-gray-400">Experimenting with 3D avatars</p>
            </div>
        </div>
    );
}
