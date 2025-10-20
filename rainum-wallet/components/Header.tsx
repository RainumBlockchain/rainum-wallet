"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`sticky top-[36px] sm:top-[40px] z-40 w-full bg-black px-3 sm:px-4 py-3 sm:py-4 transition-opacity duration-200 ${isScrolled ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Image
          src="/rainum-logo-green-border.svg"
          alt="Rainum"
          width={160}
          height={40}
          className="h-8 sm:h-10 w-auto"
          priority
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <button className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors touch-manipulation">
            <span className="text-black text-base sm:text-xl font-medium">?</span>
          </button>

          <button className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors touch-manipulation">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="6" width="14" height="2" fill="#000000" rx="1" />
              <rect x="5" y="11" width="14" height="2" fill="#000000" rx="1" />
              <rect x="5" y="16" width="14" height="2" fill="#000000" rx="1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
