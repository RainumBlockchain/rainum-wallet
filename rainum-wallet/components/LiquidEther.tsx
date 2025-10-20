"use client";

import { useRef, useEffect } from 'react';

interface LiquidEtherProps {
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  resolution?: number;
  isBounce?: boolean;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
}

const LiquidEther: React.FC<LiquidEtherProps> = ({
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    updateSize();

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 82, g: 39, b: 255 };
    };

    const colorsRgb = colors.map(hexToRgb);

    let time = 0;
    let mouseX = canvas.getBoundingClientRect().width / 2;
    let mouseY = canvas.getBoundingClientRect().height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      if (!ctx || !canvas) return;

      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;

      time += autoSpeed * 0.01;

      // Create gradient background
      const gradient = ctx.createRadialGradient(
        mouseX,
        mouseY,
        0,
        mouseX,
        mouseY,
        Math.max(width, height) * 0.8
      );

      // Animate between colors
      const colorIndex = Math.floor(time * autoIntensity) % colorsRgb.length;
      const nextColorIndex = (colorIndex + 1) % colorsRgb.length;
      const colorProgress = (time * autoIntensity) % 1;

      const currentColor = colorsRgb[colorIndex];
      const nextColor = colorsRgb[nextColorIndex];

      const r1 = Math.round(currentColor.r + (nextColor.r - currentColor.r) * colorProgress);
      const g1 = Math.round(currentColor.g + (nextColor.g - currentColor.g) * colorProgress);
      const b1 = Math.round(currentColor.b + (nextColor.b - currentColor.b) * colorProgress);

      const secondColorIndex = (colorIndex + 2) % colorsRgb.length;
      const secondColor = colorsRgb[secondColorIndex];

      gradient.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, 0.8)`);
      gradient.addColorStop(0.5, `rgba(${secondColor.r}, ${secondColor.g}, ${secondColor.b}, 0.4)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add wavy overlay
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 5; i++) {
        const waveGradient = ctx.createRadialGradient(
          width / 2 + Math.sin(time + i) * width * 0.3,
          height / 2 + Math.cos(time + i * 0.7) * height * 0.3,
          0,
          width / 2 + Math.sin(time + i) * width * 0.3,
          height / 2 + Math.cos(time + i * 0.7) * height * 0.3,
          200
        );

        const waveColorIndex = (i + colorIndex) % colorsRgb.length;
        const waveColor = colorsRgb[waveColorIndex];

        waveGradient.addColorStop(0, `rgba(${waveColor.r}, ${waveColor.g}, ${waveColor.b}, 0.3)`);
        waveGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = waveGradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', updateSize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', updateSize);
    };
  }, [colors, autoDemo, autoSpeed, autoIntensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'auto' }}
    />
  );
};

export default LiquidEther;
