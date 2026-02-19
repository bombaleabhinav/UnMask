import { useRef, useState, useEffect } from 'react';

/* ── Animated network nodes background ── */
function NetworkBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let nodes = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Create nodes
        const NODE_COUNT = 40;
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 2 + 1,
                pulse: Math.random() * Math.PI * 2,
            });
        }

        const CONNECTION_DIST = 180;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update positions
            nodes.forEach((n) => {
                n.x += n.vx;
                n.y += n.vy;
                n.pulse += 0.015;
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
            });

            // Draw connecting lines
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECTION_DIST) {
                        const opacity = (1 - dist / CONNECTION_DIST) * 0.08;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.strokeStyle = `rgba(255, 26, 26, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            nodes.forEach((n) => {
                const glowOpacity = 0.15 + Math.sin(n.pulse) * 0.1;
                // Outer glow
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 26, 26, ${glowOpacity * 0.3})`;
                ctx.fill();
                // Core dot
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 26, 26, ${glowOpacity})`;
                ctx.fill();
            });

            animId = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ opacity: 0.6 }}
        />
    );
}

/* ── Scroll indicator ── */
function ScrollIndicator() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY < 50);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500"
            style={{ opacity: visible ? 1 : 0 }}
        >
            <span className="text-neutral-600 text-xs tracking-[0.3em] uppercase">Scroll</span>
            <div className="w-px h-10 bg-gradient-to-b from-[#FF1A1A] to-transparent animate-pulse" />
        </div>
    );
}

/* ── Main HeroSection ── */
export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
            {/* Animated nodes background */}
            <NetworkBackground />

            {/* Radial vignette overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 30%, #000 80%)',
                }}
            />

            {/* Hero content */}
            <div className="relative z-10 text-center px-6 max-w-3xl w-full animate-[fadeSlideUp_1s_ease_forwards]">

                {/* Massive UNMASK title */}
                <h1
                    className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter leading-none select-none mb-6"
                    style={{
                        color: '#FF1A1A',
                        fontFamily: "'Inter', sans-serif",
                        textShadow: '0 0 80px rgba(255, 26, 26, 0.25), 0 0 160px rgba(255, 26, 26, 0.1)',
                    }}
                >
                    UNMASK
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl md:text-2xl font-light tracking-wide text-white/70">
                    Follow the money. Reveal the network.
                </p>
            </div>

            {/* Scroll indicator */}
            <ScrollIndicator />

            {/* Keyframe animation */}
            <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </section>
    );
}

