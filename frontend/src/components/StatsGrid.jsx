import { useEffect, useRef } from 'react';

function AnimatedNumber({ value }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const duration = 1000;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(value * eased);
            el.textContent = current.toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }, [value]);

    return <span ref={ref}>0</span>;
}

const STAT_CONFIG = [
    { key: 'total_accounts_analyzed', label: 'Accounts Analyzed', icon: '🏦' },
    { key: 'suspicious_accounts_flagged', label: 'Suspicious Accounts', icon: '🚨', accent: true },
    { key: 'fraud_rings_detected', label: 'Fraud Rings', icon: '🔗', accent: true },
    { key: 'total_transactions', label: 'Transactions', icon: '📄' },
];

export default function StatsGrid({ summary }) {
    return (
        <section>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <span className="text-[#FF1A1A]">📊</span> Analysis Summary
                </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {STAT_CONFIG.map((stat) => (
                    <div
                        key={stat.key}
                        className={`
              relative rounded-xl px-5 py-6 border transition-all duration-300
              ${stat.accent
                                ? 'border-[#FF1A1A]/15 bg-[#FF1A1A]/[0.03] hover:border-[#FF1A1A]/30 hover:shadow-[0_0_30px_rgba(255,26,26,0.06)]'
                                : 'border-white/[0.04] bg-white/[0.015] hover:border-white/[0.08] hover:bg-white/[0.025]'
                            }
            `}
                    >
                        <div className="text-2xl mb-3">{stat.icon}</div>
                        <div className={`text-2xl font-black font-mono tracking-tight ${stat.accent ? 'text-[#FF1A1A]' : 'text-white/90'}`}>
                            <AnimatedNumber value={summary[stat.key]} />
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 mt-1.5">
                            {stat.label}
                        </div>
                    </div>
                ))}

                {/* Processing time — special card */}
                <div className="relative rounded-xl px-5 py-6 border border-white/[0.04] bg-white/[0.015] hover:border-white/[0.08] hover:bg-white/[0.025] transition-all duration-300">
                    <div className="text-2xl mb-3">⚡</div>
                    <div className="text-2xl font-black font-mono tracking-tight text-white/90">
                        {summary.processing_time_seconds}s
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 mt-1.5">
                        Processing Time
                    </div>
                </div>
            </div>
        </section>
    );
}
