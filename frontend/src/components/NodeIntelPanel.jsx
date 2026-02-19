import { useEffect, useState } from 'react';

export default function NodeIntelPanel({ node, onClose }) {
    const [visible, setVisible] = useState(false);
    const [meterWidth, setMeterWidth] = useState(0);

    // Animate in when node changes
    useEffect(() => {
        if (node) {
            requestAnimationFrame(() => setVisible(true));
            // Animate meter after panel slides in
            const timer = setTimeout(() => setMeterWidth(node.score || 0), 300);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
            setMeterWidth(0);
        }
    }, [node]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => onClose(), 300);
    };

    if (!node) return null;

    const score = node.score || 0;
    const glowIntensity = Math.min(score / 100, 1);
    const patterns = node.patterns?.length ? node.patterns : ['None detected'];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
                onClick={handleClose}
            />

            {/* Panel */}
            <div
                className="fixed top-0 right-0 z-50 h-full w-[380px] max-w-[90vw] flex flex-col transition-transform duration-300 ease-out"
                style={{
                    transform: visible ? 'translateX(0)' : 'translateX(100%)',
                    background: 'rgba(122, 0, 0, 0.15)',
                    borderLeft: '2px solid #FF1A1A',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                }}
            >
                {/* Close button */}
                <div className="flex justify-end p-4">
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-[#FF1A1A] hover:bg-[#FF1A1A]/10 transition-all duration-200 cursor-pointer text-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-8">

                    {/* Header — Account ID */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 mb-2">
                            Account Intelligence
                        </div>
                        <h3
                            className="text-2xl font-black font-mono tracking-tight break-all"
                            style={{ color: '#FF1A1A' }}
                        >
                            {node.id}
                        </h3>
                        <div className="mt-2">
                            <span
                                className={`
                  inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border
                  ${node.type === 'ring'
                                        ? 'text-[#FF4444] border-[#FF4444]/30 bg-[#FF4444]/10'
                                        : node.type === 'suspicious'
                                            ? 'text-[#FF1A1A] border-[#FF1A1A]/30 bg-[#FF1A1A]/10'
                                            : 'text-[#7A0000] border-[#7A0000]/30 bg-[#7A0000]/10'
                                    }
                `}
                            >
                                {node.type === 'ring' ? '⚠ FRAUD RING' : node.type === 'suspicious' ? '⚡ SUSPICIOUS' : '● NORMAL'}
                            </span>
                        </div>
                    </div>

                    {/* Suspicion Meter */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600">
                                Suspicion Score
                            </span>
                            <span
                                className="text-xl font-black font-mono"
                                style={{ color: score >= 70 ? '#FF1A1A' : score >= 40 ? '#FF4444' : '#7A0000' }}
                            >
                                {score.toFixed(1)}
                            </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${meterWidth}%`,
                                    background: `linear-gradient(90deg, #7A0000, #B00000, #FF1A1A)`,
                                    boxShadow: `0 0 ${12 + glowIntensity * 20}px rgba(255, 26, 26, ${0.2 + glowIntensity * 0.5})`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'In-Degree', value: node.inDeg },
                            { label: 'Out-Degree', value: node.outDeg },
                            { label: 'Received', value: `$${formatNum(node.totalIn)}` },
                            { label: 'Sent', value: `$${formatNum(node.totalOut)}` },
                            { label: 'Transactions', value: node.txCount },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="px-3 py-3 rounded-lg border border-[#FF1A1A]/8 bg-[#FF1A1A]/[0.03]"
                            >
                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-600 mb-1">
                                    {item.label}
                                </div>
                                <div className="text-sm font-bold font-mono text-white/80">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detected Patterns */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 mb-3">
                            Detected Patterns
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {patterns.map((p, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-[#FF1A1A]/15 bg-[#FF1A1A]/5 text-[#FF1A1A]/70"
                                >
                                    {p}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Ring ID */}
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 mb-2">
                            Ring Association
                        </div>
                        <div className="text-base font-mono font-bold text-white/70">
                            {node.ringId || (
                                <span className="text-neutral-600 font-normal">No ring association</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom accent line */}
                <div className="h-px bg-gradient-to-r from-transparent via-[#FF1A1A]/30 to-transparent" />
            </div>
        </>
    );
}

function formatNum(num) {
    if (!num && num !== 0) return '—';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(2);
}
