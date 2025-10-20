"use client";

import { useEffect, useRef } from "react";

interface FloatingMenuGlitchProps {
  text: string;
  isHovered: boolean;
}

export default function FloatingMenuGlitch({ text, isHovered }: FloatingMenuGlitchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!isHovered) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const chars = "0123456789ABCDEF";
    const fontSize = 8;
    const columns = Math.floor(rect.width / fontSize);
    const drops: number[] = Array(columns).fill(0);

    let frame = 0;
    const maxFrames = 30;

    const draw = () => {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.fillStyle = "#0019ff";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(char, x, y);

        if (y > rect.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      frame++;
      if (frame < maxFrames) {
        animationFrameRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, rect.width, rect.height);
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovered]);

  return (
    <div className="relative inline-block">
      <span className="relative z-10">{text}</span>
      {isHovered && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
