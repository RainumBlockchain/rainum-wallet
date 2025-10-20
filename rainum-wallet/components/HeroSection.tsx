"use client";

import LetterGlitch from "./LetterGlitch";
import Gradient from "./Gradient";
import CenteredDrawer from "./CenteredDrawer";
import FloatingMenu from "./FloatingMenu";
import CryptoFooter from "./CryptoFooter";
import LoginHeader from "./LoginHeader";

export default function HeroSection() {

  const menuItems = [
    { label: 'Home', link: '/' },
    { label: 'Wallet', link: '/wallet' },
    { label: 'Transactions', link: '/transactions' },
    { label: 'About', link: '/about' }
  ];

  const floatingMenuItems = [
    { label: 'RainSwap', link: '/rainswap' },
    { label: 'RainChain', link: '/rainchain' },
    { label: 'RainToken', link: '/raintoken' },
    { label: 'RainWallet', link: '/rainwallet' }
  ];

  return (
    <div className="relative w-full h-screen flex items-center justify-center px-5 sm:px-6 lg:px-8 overflow-hidden" style={{ background: '#ffffff' }}>

      {/* Login Header */}
      <LoginHeader />

      {/* Centered Drawer Menu */}
      {/* <CenteredDrawer menuItems={menuItems} logoUrl="/rainum-logo-black.svg" /> */}

      {/* Floating Menu */}
      {/* <FloatingMenu menuItems={floatingMenuItems} /> */}

      {/* Simplified Glitch Background - Single instance for better performance */}
      <div className="absolute inset-0 w-full h-full opacity-30">
        <LetterGlitch
          glitchColors={['#0019ff', '#61dca3', '#61b3dc']}
          characters="RAINUM0123456789ABCDEF!@#$%^&*"
          glitchSpeed={40}
          centerVignette={false}
          outerVignette={false}
          smooth={true}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <Gradient />
      </div>

      {/* Crypto Footer */}
      <CryptoFooter />

    </div>
  );
}
