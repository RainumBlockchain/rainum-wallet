export default function TopHeader() {
  return (
    <div className="fixed top-0 z-[100] w-full px-3 sm:px-4 py-2" style={{ background: '#fbc024', borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm" style={{ color: 'rgba(0, 0, 0, 0.8)' }}>
        <span>Protect your funds. Make sure the URL is</span>
        <svg
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'rgba(0, 0, 0, 0.7)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="font-bold" style={{ color: '#000000' }}>wallet.rainum.com</span>
      </div>
    </div>
  );
}
