import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/Toast";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Rainum Wallet",
  description: "Secure dual-VM blockchain wallet for Rainum",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexSans.variable} antialiased font-sans`}
      >
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
