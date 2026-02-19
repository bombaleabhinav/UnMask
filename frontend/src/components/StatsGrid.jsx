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

export default function StatsGrid({ summary }) {
    return (
        <section className="stats-section">
            <div className="section-header">
                <h2>📊 Analysis Summary</h2>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🏦</div>
                    <div className="stat-value"><AnimatedNumber value={summary.total_accounts_analyzed} /></div>
                    <div className="stat-label">Accounts Analyzed</div>
                </div>

                <div className="stat-card stat-danger">
                    <div className="stat-icon">🚨</div>
                    <div className="stat-value"><AnimatedNumber value={summary.suspicious_accounts_flagged} /></div>
                    <div className="stat-label">Suspicious Accounts</div>
                </div>

                <div className="stat-card stat-warning">
                    <div className="stat-icon">🔗</div>
                    <div className="stat-value"><AnimatedNumber value={summary.fraud_rings_detected} /></div>
                    <div className="stat-label">Fraud Rings</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📄</div>
                    <div className="stat-value"><AnimatedNumber value={summary.total_transactions} /></div>
                    <div className="stat-label">Transactions</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-value">{summary.processing_time_seconds}s</div>
                    <div className="stat-label">Processing Time</div>
                </div>
            </div>
        </section>
    );
}
