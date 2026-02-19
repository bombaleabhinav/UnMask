import { useEffect, useRef, useState } from 'react';

function AnimatedNumber({ value }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const duration = 1200;
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
    { key: 'total_accounts_analyzed', label: 'Accounts Analyzed', color: 'accent' },
    { key: 'suspicious_accounts_flagged', label: 'Suspicious Flagged', color: 'danger' },
    { key: 'fraud_rings_detected', label: 'Fraud Rings', color: 'danger' },
    { key: 'total_transactions', label: 'Transactions', color: 'accent' },
];

export default function StatsGrid({ summary }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <section className="stats-grid-section">
            <div className="stats-grid__header">
                <h2 className="stats-grid__title">
                    Analysis Summary
                </h2>
            </div>

            <div className="stats-grid">
                {STAT_CONFIG.map((stat, idx) => (
                    <div
                        key={stat.key}
                        className={`stats-card stats-card--${stat.color} ${visible ? 'stats-card--visible' : ''}`}
                        style={{ transitionDelay: `${idx * 80}ms` }}
                    >

                        <div className={`stats-card__value stats-card__value--${stat.color}`}>
                            <AnimatedNumber value={summary[stat.key]} />
                        </div>
                        <div className="stats-card__label">{stat.label}</div>
                    </div>
                ))}

                {/* Processing Time Card */}
                <div
                    className={`stats-card stats-card--accent ${visible ? 'stats-card--visible' : ''}`}
                    style={{ transitionDelay: `${STAT_CONFIG.length * 80}ms` }}
                >
                    <div className="stats-card__value stats-card__value--accent">
                        {summary.processing_time_seconds}s
                    </div>
                    <div className="stats-card__label">Processing Time</div>
                </div>
            </div>
        </section>
    );
}
