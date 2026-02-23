"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

export default function GameInitializer() {
    const fetchUser = useGameStore((state) => state.fetchUser);
    const isLoaded = useGameStore((state) => state.isLoaded);

    useEffect(() => {
        if (!isLoaded) {
            fetchUser();
        }
    }, [fetchUser, isLoaded]);

    return null;
}
