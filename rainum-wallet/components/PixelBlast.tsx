"use client";

import { useRef, useEffect } from 'react';

interface PixelBlastProps {
  variant?: 'circle' | 'square';
  pixelSize?: number;
  color?: string;
  patternScale?: number;
  patternDensity?: number;
  pixelSizeJitter?: number;
  enableRipples?: boolean;
  rippleSpeed?: number;
  rippleThickness?: number;
  rippleIntensityScale?: number;
  liquid?: boolean;
  liquidStrength?: number;
  liquidRadius?: number;
  liquidWobbleSpeed?: number;
  speed?: number;
  edgeFade?: number;
  transparent?: boolean;
}

const PixelBlast: React.FC<PixelBlastProps> = ({
  variant = 'circle',
  pixelSize = 6,
  color = '#B19EEF',
  patternScale = 3,
  patternDensity = 1.2,
  pixelSizeJitter = 0.5,
  enableRipples = false,
  rippleSpeed = 0.4,
  speed = 0.6,
  edgeFade = 0.25,
  transparent = false
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

    const cols = Math.floor(canvas.getBoundingClientRect().width / (pixelSize * patternScale));
    const rows = Math.floor(canvas.getBoundingClientRect().height / (pixelSize * patternScale));

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 177, g: 158, b: 239 };
    };

    const rgb = hexToRgb(color);
    let time = 0;

    const animate = () => {
      if (!ctx || !canvas) return;

      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;

      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
        ctx.fillRect(0, 0, width, height);
      }

      time += speed * 0.01;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * pixelSize * patternScale;
          const y = j * pixelSize * patternScale;

          const centerX = width / 2;
          const centerY = height / 2;
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));

          let wave = 0;
          if (enableRipples) {
            wave = Math.sin(distance * 0.02 - time * rippleSpeed * 10) * 0.5 + 0.5;
          } else {
            wave = Math.sin(distance * 0.02 - time * 5) * 0.5 + 0.5;
          }

          const fade = 1 - (distance / maxDistance) * edgeFade;
          const opacity = wave * fade * patternDensity;

          const jitter = (Math.random() - 0.5) * pixelSizeJitter;
          const size = pixelSize + jitter;

          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

          if (variant === 'circle') {
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, size, size);
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', updateSize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', updateSize);
    };
  }, [variant, pixelSize, color, patternScale, patternDensity, pixelSizeJitter, enableRipples, rippleSpeed, speed, edgeFade, transparent]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default PixelBlast;
