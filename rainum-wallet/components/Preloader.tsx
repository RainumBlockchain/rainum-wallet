'use client';

import React from 'react';

interface PreloaderProps {
  size?: number;
  className?: string;
}

export default function Preloader({ size = 64, className = '' }: PreloaderProps) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size * 1.33 }}>
        <svg
          viewBox="0 0 84.24 112.32"
          className="w-full h-full"
        >
          {/* Top left square */}
          <rect
            className="grid-element grid-element-1"
            x="0"
            y="0"
            width="28.08"
            height="28.08"
            fill="#0019ff"
          />

          {/* Top middle square */}
          <rect
            className="grid-element grid-element-2"
            x="28.08"
            y="0"
            width="28.08"
            height="28.08"
            fill="#0019ff"
          />

          {/* Top right curved element */}
          <path
            className="grid-element grid-element-3"
            d="M56.16,0h0c15.5,0,28.08,12.58,28.08,28.08h-28.08v-28.08h0Z"
            fill="#0019ff"
          />

          {/* Middle right square */}
          <rect
            className="grid-element grid-element-4"
            x="56.16"
            y="28.08"
            width="28.08"
            height="28.08"
            fill="#0019ff"
          />

          {/* Middle center square */}
          <rect
            className="grid-element grid-element-5"
            x="28.08"
            y="56.16"
            width="28.08"
            height="28.08"
            fill="#0019ff"
          />

          {/* Bottom right square */}
          <rect
            className="grid-element grid-element-6"
            x="56.16"
            y="84.24"
            width="28.08"
            height="28.08"
            fill="#0019ff"
          />

          {/* Bottom left square */}
          <rect
            className="grid-element grid-element-7"
            x="0"
            y="84.24"
            width="28.08"
            height="28.08"
            fill="#0019ff"
          />

          {/* Diagonal triangle top */}
          <polygon
            className="grid-element grid-element-8"
            points="84.24 84.24 56.16 84.24 56.16 56.16 84.24 84.24"
            fill="#0019ff"
          />

          {/* Diagonal triangle bottom */}
          <polygon
            className="grid-element grid-element-9"
            points="56.16 112.32 28.08 84.24 56.16 84.24 56.16 112.32"
            fill="#0019ff"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes buildUp {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .grid-element {
          transform-origin: center;
          animation: buildUp 2s ease-in-out infinite;
        }

        .grid-element-1 { animation-delay: 0s; }
        .grid-element-2 { animation-delay: 0.1s; }
        .grid-element-3 { animation-delay: 0.2s; }
        .grid-element-4 { animation-delay: 0.3s; }
        .grid-element-5 { animation-delay: 0.4s; }
        .grid-element-6 { animation-delay: 0.5s; }
        .grid-element-7 { animation-delay: 0.6s; }
        .grid-element-8 { animation-delay: 0.7s; }
        .grid-element-9 { animation-delay: 0.8s; }
      `}</style>
    </div>
  );
}
