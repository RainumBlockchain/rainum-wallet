"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Wallet, Compass, FileText } from "lucide-react";

export default function LoginHeader() {
  const [systemStatus, setSystemStatus] = useState<"online" | "offline" | "checking">("checking");

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await fetch("http://localhost:8080/status", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          setSystemStatus("online");
        } else {
          setSystemStatus("offline");
        }
      } catch (error) {
        setSystemStatus("offline");
      }
    };

    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0019ff] border-b border-white/5 shadow-xl">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0019ff] via-[#001fff] to-[#0019ff] opacity-50" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo - Left */}
          <div className="flex items-center">
            <div className="relative group cursor-pointer">
              {/* Subtle hover glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-[#61dca3]/0 via-[#61dca3]/20 to-[#61b3dc]/0 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image
                src="/rainum-logo-green-border.svg"
                alt="Rainum"
                width={120}
                height={120}
                className="relative w-[120px] h-[120px] transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
          </div>

          {/* Menu - Center */}
          <nav className="hidden md:flex items-center gap-1">
            <a
              href="#"
              className="group flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <Wallet size={16} className="text-[#61dca3] group-hover:scale-110 transition-transform duration-200" />
              <span className="text-white font-medium text-sm">Wallet</span>
            </a>
            <a
              href="#"
              className="group flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <Compass size={16} className="text-[#61b3dc] group-hover:scale-110 transition-transform duration-200" />
              <span className="text-white font-medium text-sm">Explorer</span>
            </a>
            <a
              href="#"
              className="group flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              <FileText size={16} className="text-[#61dca3] group-hover:scale-110 transition-transform duration-200" />
              <span className="text-white font-medium text-sm">Docs</span>
            </a>
          </nav>

          {/* System Status & Version - Right */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
              {/* Status indicator with ring */}
              <div className="relative flex items-center justify-center">
                {systemStatus === "online" && (
                  <div className="absolute w-3 h-3 bg-[#61dca3] rounded-full animate-ping opacity-75" />
                )}
                <div
                  className={`relative w-2 h-2 rounded-full ${
                    systemStatus === "online"
                      ? "bg-[#61dca3] shadow-lg shadow-[#61dca3]/50"
                      : systemStatus === "offline"
                      ? "bg-red-400 shadow-lg shadow-red-400/50"
                      : "bg-yellow-400 shadow-lg shadow-yellow-400/50"
                  }`}
                />
              </div>
              <span className="text-white text-xs font-semibold tracking-wider hidden sm:inline">
                {systemStatus === "online"
                  ? "ONLINE"
                  : systemStatus === "offline"
                  ? "OFFLINE"
                  : "CHECKING"}
              </span>
            </div>
            <span className="text-white/60 font-thin text-xs tracking-wider hidden lg:inline font-mono">
              v1.0.0 :: 0x4A891C
            </span>
          </div>

        </div>
      </div>
    </header>
  );
}
