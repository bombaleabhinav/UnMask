import { useEffect, useState } from 'react';

function formatNum(num) {
    if (!num && num !== 0) return '—';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Number(num).toFixed(2);
}

export default function NodeIntelPanel({ node, onClose }) {
    const [visible, setVisible] = useState(false);
    const [meterWidth, setMeterWidth] = useState(0);

    useEffect(() => {
        if (node) {
            requestAnimationFrame(() => setVisible(true));
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
                className="intel-backdrop"
                style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
                onClick={handleClose}
            />

            {/* Panel */}
            <div
                className="intel-panel"
                style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}
            >
                {/* Close button */}
                <div className="intel-panel__close-row">
                    <button onClick={handleClose} className="intel-panel__close-btn">✕</button>
                </div>

                {/* Content */}
                <div className="intel-panel__body">

                    {/* Header */}
                    <div className="intel-panel__section">
                        <div className="intel-panel__section-label">Account Intelligence</div>
                        <h3 className="intel-panel__account-id">{node.id}</h3>
                        <div className="intel-panel__badge-row">
                            <span className={`intel-panel__badge intel-panel__badge--${node.type}`}>
                                {node.type === 'ring' ? '⚠ FRAUD RING' : node.type === 'suspicious' ? '⚡ SUSPICIOUS' : '● NORMAL'}
                            </span>
                        </div>
                    </div>

                    {/* Suspicion Meter */}
                    <div className="intel-panel__section">
                        <div className="intel-panel__meter-header">
                            <span className="intel-panel__section-label">Suspicion Score</span>
                            <span
                                className="intel-panel__score-value"
                                style={{ color: score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--primary-accent)' : 'var(--success)' }}
                            >
                                {score.toFixed(1)}
                            </span>
                        </div>
                        <div className="intel-panel__meter-track">
                            <div
                                className="intel-panel__meter-fill"
                                style={{
                                    width: `${meterWidth}%`,
                                    background: 'linear-gradient(90deg, var(--success), var(--primary-accent), var(--danger))',
                                    boxShadow: `0 0 ${12 + glowIntensity * 20}px rgba(251, 113, 133, ${0.2 + glowIntensity * 0.5})`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="intel-panel__stats-grid">
                        {[
                            { label: 'In-Degree', value: node.inDeg },
                            { label: 'Out-Degree', value: node.outDeg },
                            { label: 'Received', value: `$${formatNum(node.totalIn)}` },
                            { label: 'Sent', value: `$${formatNum(node.totalOut)}` },
                            { label: 'Transactions', value: node.txCount },
                        ].map((item) => (
                            <div key={item.label} className="intel-panel__stat-card">
                                <div className="intel-panel__stat-label">{item.label}</div>
                                <div className="intel-panel__stat-value">{item.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Patterns */}
                    <div className="intel-panel__section">
                        <div className="intel-panel__section-label">Detected Patterns</div>
                        <div className="intel-panel__patterns">
                            {patterns.map((p, i) => (
                                <span key={i} className="intel-panel__pattern-tag">{p}</span>
                            ))}
                        </div>
                    </div>

                    {/* Ring */}
                    <div className="intel-panel__section">
                        <div className="intel-panel__section-label">Ring Association</div>
                        <div className="intel-panel__ring-value">
                            {node.ringId || <span className="intel-panel__ring-none">No ring association</span>}
                        </div>
                    </div>
                </div>

                {/* Bottom accent */}
                <div className="intel-panel__accent-line" />
            </div>
        </>
    );
}
