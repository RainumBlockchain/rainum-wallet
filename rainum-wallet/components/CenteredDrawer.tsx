"use client";

import { useState } from 'react';

interface MenuItem {
  label: string;
  link: string;
}

interface CenteredDrawerProps {
  menuItems: MenuItem[];
  logoUrl?: string;
}

export default function CenteredDrawer({ menuItems, logoUrl }: CenteredDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Fixed Header with Logo and Menu Button */}
      <header className="fixed top-[60px] left-0 w-full flex items-start justify-between px-4 sm:px-6 lg:px-8 pt-4 z-50 pointer-events-none">
        {/* Logo Badge */}
        <div className="pointer-events-auto">
          <div className="relative">
            {/* Animated border gradient */}
            <div className="absolute inset-0 rounded-lg sm:rounded-xl overflow-hidden">
              <div className="absolute inset-0" style={{
                background: 'conic-gradient(from 0deg, transparent 0%, transparent 70%, #0019ff 70%, #61dca3 85%, #61b3dc 92%, transparent 100%)',
                animation: 'spin-slow 2s linear infinite',
                filter: 'blur(1px)'
              }}></div>
            </div>
            <div className="relative bg-white/90 backdrop-blur-md rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-lg h-[36px] sm:h-[48px] flex items-center m-[2px]">
              <img
                src={logoUrl || '/rainum-logo-black.svg'}
                alt="Rainum Logo"
                className="h-5 sm:h-8 w-auto object-contain"
                draggable={false}
              />
            </div>
          </div>
        </div>

        {/* Menu Button Badge */}
        <div className="pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-md rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-lg border border-gray-200/50 h-[36px] sm:h-[48px] flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-transparent border-0 cursor-pointer font-medium text-black flex items-center gap-2 text-xs sm:text-base"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="hidden sm:inline">{isOpen ? 'Close' : 'Menu'}</span>
              <div className="relative w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] flex items-center justify-center">
                <span
                  className={`absolute w-full h-[2px] bg-black rounded transition-transform duration-300 ${
                    isOpen ? 'rotate-45' : 'rotate-0'
                  }`}
                />
                <span
                  className={`absolute w-full h-[2px] bg-black rounded transition-transform duration-300 ${
                    isOpen ? '-rotate-45' : 'rotate-90'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Centered Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 max-w-2xl w-full animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Items */}
            <nav>
              <ul className="flex flex-col gap-3 sm:gap-4 list-none p-0 m-0">
                {menuItems.map((item, idx) => (
                  <li key={idx}>
                    <a
                      href={item.link}
                      className="block text-black font-semibold text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight hover:text-[#0019ff] transition-colors duration-200 no-underline"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Social Links */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
              <h3 className="text-[#0019ff] font-medium mb-3 sm:mb-4 text-sm sm:text-base">Socials</h3>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <a
                  href="https://twitter.com/rainum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-[#0019ff] transition-colors no-underline font-medium"
                >
                  Twitter
                </a>
                <a
                  href="https://github.com/rainum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-[#0019ff] transition-colors no-underline font-medium"
                >
                  GitHub
                </a>
                <a
                  href="https://discord.gg/rainum"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:text-[#0019ff] transition-colors no-underline font-medium"
                >
                  Discord
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
