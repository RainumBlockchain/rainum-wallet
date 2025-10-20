"use client";

import { useState } from "react";
import FloatingMenuGlitch from "./FloatingMenuGlitch";

interface FloatingMenuProps {
  menuItems: { label: string; link: string }[];
}

export default function FloatingMenu({ menuItems }: FloatingMenuProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="hidden md:block fixed top-[60px] left-1/2 -translate-x-1/2 pt-4 z-50 pointer-events-auto">
      <div className="relative">
        {/* Content */}
        <nav className="relative bg-white/90 backdrop-blur-md rounded-xl px-4 lg:px-6 py-2 shadow-lg h-[48px] flex items-center transition-all duration-300 border-2 border-gray-200/50">
          <ul className="flex items-center gap-6 lg:gap-8 list-none p-0 m-0">
            {menuItems.map((item, idx) => (
              <li key={idx} className="relative overflow-hidden">
                <a
                  href={item.link}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="relative text-black font-bold text-base hover:text-[#0019ff] transition-colors duration-200 no-underline whitespace-nowrap inline-block"
                >
                  <FloatingMenuGlitch text={item.label} isHovered={hoveredIndex === idx} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
