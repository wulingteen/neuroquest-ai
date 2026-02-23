"use client";
import { useEffect, useRef } from "react";

export default function StarField() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // Stars
        const stars = Array.from({ length: 200 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.2,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.005,
        }));

        // Nebula particles
        const nebulas = Array.from({ length: 6 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 200 + 80,
            color: [
                "rgba(139,92,246,",
                "rgba(0,212,255,",
                "rgba(255,184,0,",
                "rgba(16,185,129,",
                "rgba(236,72,153,",
                "rgba(59,130,246,",
            ][Math.floor(Math.random() * 6)],
            opacity: Math.random() * 0.05 + 0.02,
        }));

        let animId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw nebulas
            nebulas.forEach((n) => {
                const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
                gradient.addColorStop(0, `${n.color}${n.opacity})`);
                gradient.addColorStop(1, `${n.color}0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw stars
            stars.forEach((s) => {
                s.twinkle += s.speed;
                const opacity = 0.3 + Math.sin(s.twinkle) * 0.7;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, opacity)})`;
                ctx.fill();
            });

            animId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ background: "transparent" }}
        />
    );
}
