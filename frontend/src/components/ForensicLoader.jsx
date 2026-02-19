import { useEffect, useState } from 'react';

export default function ForensicLoader({ visible }) {
    const [show, setShow] = useState(false);
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        if (visible) {
            setShow(true);
            // Double-rAF ensures DOM paint before opacity transition
            requestAnimationFrame(() => requestAnimationFrame(() => setOpacity(1)));
        } else {
            setOpacity(0);
            const timer = setTimeout(() => setShow(false), 600);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!show) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-500"
            style={{ opacity }}
        >
            {/* Animated grid background */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(255,26,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,26,26,0.03) 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                    maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
                    animation: 'gridShift 4s linear infinite',
                }}
            />

            {/* Content */}
            <div className="relative z-10 text-center">
                {/* Title */}
                <p
                    className="text-2xl sm:text-3xl font-light tracking-[0.2em] text-white/90 mb-10 animate-[fadeIn_1s_ease_forwards]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                >
                    Initializing Forensic Engine...
                </p>

                {/* Loading bar */}
                <div className="w-64 sm:w-80 h-px bg-white/5 mx-auto overflow-hidden rounded-full">
                    <div
                        className="h-full rounded-full"
                        style={{
                            background: '#FF1A1A',
                            boxShadow: '0 0 12px rgba(255,26,26,0.6)',
                            animation: 'scanLine 1.8s ease-in-out infinite',
                        }}
                    />
                </div>

                {/* Subtitle */}
                <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-700 mt-6 animate-[fadeIn_1.5s_ease_forwards]">
                    Analyzing transaction network
                </p>
            </div>

            {/* Keyframes */}
            <style>{`
        @keyframes scanLine {
          0% { width: 0%; margin-left: 0; }
          50% { width: 40%; margin-left: 30%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes gridShift {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
}
