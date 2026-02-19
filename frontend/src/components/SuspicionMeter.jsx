import { useEffect, useState, useRef } from 'react';

export default function SuspicionMeter({ score = 0 }) {
    const [width, setWidth] = useState(0);
    const ref = useRef(null);
    const clamped = Math.min(Math.max(score, 0), 100);
    const glowIntensity = clamped / 100;
    const isPulsing = clamped > 75;

    // Animate on scroll into view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(() => setWidth(clamped));
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [clamped]);

    return (
        <div ref={ref} className="flex items-center gap-3 w-full">
            {/* Track */}
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#7A0000' }}>
                {/* Fill */}
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                        width: `${width}%`,
                        background: '#FF1A1A',
                        boxShadow: `0 0 ${8 + glowIntensity * 20}px rgba(255, 26, 26, ${0.2 + glowIntensity * 0.6})`,
                        animation: isPulsing ? 'meterPulse 1.5s ease-in-out infinite' : 'none',
                    }}
                />
            </div>

            {/* Score label */}
            <span
                className="text-xs font-mono font-bold tabular-nums flex-shrink-0 w-10 text-right"
                style={{ color: clamped >= 70 ? '#FF1A1A' : clamped >= 40 ? '#B00000' : '#7A0000' }}
            >
                {clamped.toFixed(0)}
            </span>

            {/* Pulse keyframe */}
            {isPulsing && (
                <style>{`
          @keyframes meterPulse {
            0%, 100% { box-shadow: 0 0 ${8 + glowIntensity * 20}px rgba(255,26,26,${0.2 + glowIntensity * 0.6}); }
            50% { box-shadow: 0 0 ${16 + glowIntensity * 30}px rgba(255,26,26,${0.4 + glowIntensity * 0.6}); }
          }
        `}</style>
            )}
        </div>
    );
}
