import { useState, useEffect, useRef } from 'react';

const ITEMS_PER_PAGE = 15;

const PATTERN_LABELS = {
    cycle: 'CYCLE',
    fan_in: 'FAN-IN',
    fan_out: 'FAN-OUT',
    shell_network: 'SHELL',
};

const PATTERN_ICONS = {
    cycle: '⟲',
    fan_in: '⇘',
    fan_out: '⇗',
    shell_network: '◈',
};

/* Animated risk bar */
function RiskBar({ score }) {
    const [width, setWidth] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(() => setWidth(score));
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [score]);

    const glowIntensity = Math.min(score / 100, 1);

    return (
        <div ref={ref} className="risk-bar">
            <div className="risk-bar__track">
                <div
                    className="risk-bar__fill"
                    style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, var(--success), var(--primary-accent), var(--danger))',
                        boxShadow: `0 0 ${6 + glowIntensity * 14}px rgba(251, 113, 133, ${0.15 + glowIntensity * 0.4})`,
                    }}
                />
            </div>
            <span
                className="risk-bar__value"
                style={{ color: score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--primary-accent)' : 'var(--success)' }}
            >
                {score.toFixed(1)}%
            </span>
        </div>
    );
}

export default function FraudRingMatrix({ rings, onRingHover }) {
    const [page, setPage] = useState(1);
    const [hoveredRing, setHoveredRing] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const totalPages = Math.ceil(rings.length / ITEMS_PER_PAGE) || 1;
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const pageData = rings.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    const handleRowEnter = (ring) => {
        setHoveredRing(ring.ring_id);
        if (onRingHover) onRingHover(ring.ring_id);
    };

    const handleRowLeave = () => {
        setHoveredRing(null);
        if (onRingHover) onRingHover(null);
    };

    return (
        <section className={`fraud-rings-section ${visible ? 'fraud-rings-section--visible' : ''}`}>
            {/* Header */}
            <div className="fraud-rings__header">
                <h2 className="fraud-rings__title">
                    Fraud Ring Matrix
                </h2>
                <span className="fraud-rings__count">
                    {rings.length} RING{rings.length !== 1 ? 'S' : ''} DETECTED
                </span>
            </div>

            {/* Table */}
            <div className="fraud-rings__table-wrap">
                <table className="fraud-rings__table">
                    <thead>
                        <tr>
                            {['RING ID', 'PATTERN', 'MEMBERS', 'RISK SCORE', 'MEMBER ACCOUNTS'].map((col) => (
                                <th key={col} className="fraud-rings__th">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="fraud-rings__empty">
                                    No fraud rings detected in this dataset.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((ring) => (
                                <tr
                                    key={ring.ring_id}
                                    className={`fraud-rings__row ${hoveredRing === ring.ring_id ? 'fraud-rings__row--hovered' : ''}`}
                                    onMouseEnter={() => handleRowEnter(ring)}
                                    onMouseLeave={handleRowLeave}
                                >
                                    {/* Ring ID */}
                                    <td className="fraud-rings__td">
                                        <span className="fraud-rings__ring-id">{ring.ring_id}</span>
                                    </td>

                                    {/* Pattern */}
                                    <td className="fraud-rings__td">
                                        <span className="fraud-rings__pattern-badge">
                                            <span className="fraud-rings__pattern-icon">{PATTERN_ICONS[ring.pattern_type] || '●'}</span>
                                            {PATTERN_LABELS[ring.pattern_type] || ring.pattern_type}
                                        </span>
                                    </td>

                                    {/* Member Count */}
                                    <td className="fraud-rings__td">
                                        <span className="fraud-rings__member-count">{ring.member_accounts.length}</span>
                                    </td>

                                    {/* Risk Score */}
                                    <td className="fraud-rings__td">
                                        <RiskBar score={ring.risk_score} />
                                    </td>

                                    {/* Member Accounts */}
                                    <td className="fraud-rings__td fraud-rings__td--accounts">
                                        <div className="fraud-rings__accounts-list">
                                            {ring.member_accounts.slice(0, 5).map((acc) => (
                                                <span key={acc} className="fraud-rings__account-tag">{acc}</span>
                                            ))}
                                            {ring.member_accounts.length > 5 && (
                                                <span className="fraud-rings__account-more">+{ring.member_accounts.length - 5}</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {rings.length > ITEMS_PER_PAGE && (
                <div className="fraud-rings__pagination">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        className="fraud-rings__page-btn"
                    >
                        ← Prev
                    </button>
                    <span className="fraud-rings__page-info">{page} / {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="fraud-rings__page-btn"
                    >
                        Next →
                    </button>
                </div>
            )}
        </section>
    );
}
