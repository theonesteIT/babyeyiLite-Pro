import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Clean image showcase for news articles — single hero or slideshow with thumbnails (max 5).
 */
export default function NewsImageShowcase({ images = [], alt = '' }) {
  const slides = useMemo(() => images.filter(Boolean).slice(0, 5), [images]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [slides.length, slides[0]]);

  const go = useCallback((next) => {
    if (!slides.length) return;
    setIdx((i) => (i + next + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, slides.length]);

  if (!slides.length) return null;

  if (slides.length === 1) {
    return (
      <figure className="rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,4,53,0.12)] aspect-video bg-[#000435]">
        <img src={slides[0]} alt={alt} className="w-full h-full object-cover" loading="eager" />
      </figure>
    );
  }

  return (
    <div className="space-y-3">
      <figure className="relative rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,4,53,0.12)] aspect-video bg-[#000435] group">
        <img
          key={slides[idx]}
          src={slides[idx]}
          alt={alt ? `${alt} (${idx + 1}/${slides.length})` : ''}
          className="w-full h-full object-cover transition-opacity duration-300"
          loading={idx === 0 ? 'eager' : 'lazy'}
        />
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-bold tabular-nums">
          {idx + 1} / {slides.length}
        </div>
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#000435] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-[#000435] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white"
        >
          <ChevronRight size={22} />
        </button>
      </figure>

      <div className="flex gap-2 justify-center overflow-x-auto pb-1 px-1">
        {slides.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Show image ${i + 1}`}
            aria-current={i === idx ? 'true' : undefined}
            className={`shrink-0 w-[4.5rem] h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 transition-all ${
              i === idx
                ? 'border-amber-500 ring-2 ring-amber-400/40 scale-[1.02]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
