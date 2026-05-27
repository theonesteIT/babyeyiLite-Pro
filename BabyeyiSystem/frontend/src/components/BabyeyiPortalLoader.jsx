import babyeyiIcon from '../assets/babyeyi-icon.png';

/**
 * Full-screen Babyeyi branded loader (portal auth / initial load).
 */
export default function BabyeyiPortalLoader({
  message = 'Loading',
  submessage = '',
  className = '',
}) {
  return (
    <div
      className={`flex min-h-[100dvh] flex-col items-center justify-center bg-[#F3F4F6] px-6 ${className}`}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <style>{`
        @keyframes babyeyiLoaderPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.92; }
        }
        @keyframes babyeyiLoaderRing {
          to { transform: rotate(360deg); }
        }
        @keyframes babyeyiLoaderDots {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>

      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-[#fde68a] border-t-[#c87800]"
          style={{ animation: 'babyeyiLoaderRing 1.1s linear infinite' }}
          aria-hidden
        />
        <span
          className="absolute inset-2 rounded-full border border-[#000435]/10"
          style={{ animation: 'babyeyiLoaderRing 1.6s linear infinite reverse' }}
          aria-hidden
        />
        <img
          src={babyeyiIcon}
          alt=""
          className="relative z-10 h-16 w-16 object-contain drop-shadow-md"
          style={{ animation: 'babyeyiLoaderPulse 2s ease-in-out infinite' }}
        />
      </div>

      <p className="m-0 text-lg font-black tracking-tight text-[#000435]">{message}</p>
      {submessage ? (
        <p className="m-0 mt-2 max-w-xs text-center text-sm font-medium text-[#000435]/55">{submessage}</p>
      ) : null}

      <div className="mt-5 flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-[#c87800]"
            style={{
              animation: 'babyeyiLoaderDots 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
