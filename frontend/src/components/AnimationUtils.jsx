import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════
   1. useScrollReveal — Fade + slide on scroll
   ═══════════════════════════════════════════════ */
export function useScrollReveal(options = {}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const { threshold = 0.15, once = true } = options;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) observer.disconnect();
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, once]);

    const style = {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
    };

    return { ref, style, isVisible };
}

/* ═══════════════════════════════════════════════
   2. useNodePulse — requestAnimationFrame pulse
   ═══════════════════════════════════════════════ */
export function useNodePulse(active = true) {
    const ref = useRef(null);
    const frameRef = useRef(null);

    useEffect(() => {
        if (!active || !ref.current) return;
        let start = null;

        const pulse = (timestamp) => {
            if (!start) start = timestamp;
            const elapsed = (timestamp - start) / 1000;
            const scale = 1 + Math.sin(elapsed * 2.5) * 0.08;
            const glow = 10 + Math.sin(elapsed * 2.5) * 8;

            if (ref.current) {
                ref.current.style.transform = `scale(${scale})`;
                ref.current.style.boxShadow = `0 0 ${glow}px rgba(255, 26, 26, ${0.3 + Math.sin(elapsed * 2.5) * 0.2})`;
            }
            frameRef.current = requestAnimationFrame(pulse);
        };

        frameRef.current = requestAnimationFrame(pulse);
        return () => cancelAnimationFrame(frameRef.current);
    }, [active]);

    return ref;
}

/* ═══════════════════════════════════════════════
   3. useRingShockwave — Expanding ripple effect
   ═══════════════════════════════════════════════ */
export function useRingShockwave() {
    const containerRef = useRef(null);

    const trigger = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const ripple = document.createElement('div');
        const size = Math.max(container.offsetWidth, container.offsetHeight);

        Object.assign(ripple.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: `${size}px`,
            height: `${size}px`,
            marginTop: `-${size / 2}px`,
            marginLeft: `-${size / 2}px`,
            borderRadius: '50%',
            border: '2px solid rgba(255, 26, 26, 0.5)',
            pointerEvents: 'none',
            animation: 'shockwaveRipple 0.8s ease-out forwards',
        });

        container.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }, []);

    return { containerRef, trigger };
}

/* ═══════════════════════════════════════════════
   4. ScrollReveal wrapper component
   ═══════════════════════════════════════════════ */
export function ScrollReveal({ children, className = '', delay = 0, ...props }) {
    const { ref, style } = useScrollReveal(props);

    const delayedStyle = {
        ...style,
        transitionDelay: `${delay}ms`,
    };

    return (
        <div ref={ref} style={delayedStyle} className={className}>
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   5. CSS Keyframes (inject once)
   ═══════════════════════════════════════════════ */
export function AnimationStyles() {
    return (
        <style>{`
      /* Shockwave ripple */
      @keyframes shockwaveRipple {
        0% {
          transform: scale(0);
          opacity: 1;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }

      /* Button hover glow */
      .glow-btn {
        position: relative;
        overflow: hidden;
        transition: box-shadow 0.3s ease, transform 0.2s ease;
      }
      .glow-btn:hover {
        box-shadow: 0 0 24px rgba(255, 26, 26, 0.25), 0 0 48px rgba(255, 26, 26, 0.1);
        transform: translateY(-1px);
      }
      .glow-btn::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
          rgba(255, 26, 26, 0.12) 0%, transparent 60%);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      }
      .glow-btn:hover::after {
        opacity: 1;
      }

      /* Section fade transition */
      .section-fade {
        opacity: 0;
        transform: translateY(20px);
        animation: sectionFadeIn 0.8s ease forwards;
      }
      @keyframes sectionFadeIn {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Node pulse CSS fallback */
      .node-pulse {
        animation: nodePulseAnim 2s ease-in-out infinite;
      }
      @keyframes nodePulseAnim {
        0%, 100% {
          box-shadow: 0 0 8px rgba(255, 26, 26, 0.3);
          transform: scale(1);
        }
        50% {
          box-shadow: 0 0 20px rgba(255, 26, 26, 0.6);
          transform: scale(1.06);
        }
      }
    `}</style>
    );
}
