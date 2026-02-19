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
        <div ref={ref} className="flex items-center gap-3">
            <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, var(--success), var(--primary-accent), var(--danger))',
                        boxShadow: `0 0 ${6 + glowIntensity * 14}px rgba(251, 113, 133, ${0.15 + glowIntensity * 0.4})`,
                    }}
                />
            </div>
            <span
                className="text-xs font-mono font-bold tabular-nums"
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
        <section>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <span className="text-danger">🔗</span> Fraud Ring Matrix
                </h2>
                <span className="text-xs font-mono text-neutral-600 tracking-wide">
                    {rings.length} RING{rings.length !== 1 ? 'S' : ''} DETECTED
                </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-primary-accent/10 bg-bg-primary">
                <table className="w-full text-sm">
                    {/* Head */}
                    <thead>
                        <tr className="border-b border-primary-accent/10">
                            {['RING ID', 'PATTERN', 'MEMBERS', 'RISK SCORE', 'ACCOUNTS'].map((col) => (
                                <th
                                    key={col}
                                    className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 whitespace-nowrap"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="text-center py-16 text-neutral-600 text-sm"
                                >
                                    No fraud rings detected in this dataset.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((ring, idx) => (
                                <tr
                                    key={ring.ring_id}
                                    className={`
                    border-b border-divider transition-all duration-200 cursor-default
                    ${hoveredRing === ring.ring_id
                                            ? 'bg-danger/[0.04] shadow-[inset_0_0_30px_rgba(251,113,133,0.05)]'
                                            : 'hover:bg-danger/[0.02]'
                                        }
                  `}
                                    onMouseEnter={() => handleRowEnter(ring)}
                                    onMouseLeave={handleRowLeave}
                                >
                                    {/* Ring ID */}
                                    <td className="px-5 py-4">
                                        <span className="font-mono font-bold text-sm tracking-tight text-danger">
                                            {ring.ring_id}
                                        </span>
                                    </td>

                                    {/* Pattern */}
                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.15em] border border-danger/10 bg-danger/[0.04] text-danger/80">
                                            <span className="text-sm">{PATTERN_ICONS[ring.pattern_type] || '●'}</span>
                                            {PATTERN_LABELS[ring.pattern_type] || ring.pattern_type}
                                        </span>
                                    </td>

                                    {/* Member Count */}
                                    <td className="px-5 py-4">
                                        <span className="font-mono font-bold text-white/70">
                                            {ring.member_accounts.length}
                                        </span>
                                    </td>

                                    {/* Risk Score */}
                                    <td className="px-5 py-4">
                                        <RiskBar score={ring.risk_score} />
                                    </td>

                                    {/* Accounts */}
                                    <td className="px-5 py-4 max-w-[320px]">
                                        <div className="flex flex-wrap gap-1">
                                            {ring.member_accounts.slice(0, 5).map((acc) => (
                                                <span
                                                    key={acc}
                                                    className="font-mono text-[11px] text-white/40 bg-white/[0.03] px-2 py-0.5 rounded"
                                                >
                                                    {acc}
                                                </span>
                                            ))}
                                            {ring.member_accounts.length > 5 && (
                                                <span className="font-mono text-[11px] text-danger/40 px-2 py-0.5">
                                                    +{ring.member_accounts.length - 5}
                                                </span>
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
                <div className="flex justify-center items-center gap-6 pt-6">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 border border-primary-accent/10 rounded-lg hover:text-primary-accent hover:border-primary-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                    >
                        ← Prev
                    </button>
                    <span className="font-mono text-xs text-neutral-600">
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 border border-primary-accent/10 rounded-lg hover:text-primary-accent hover:border-primary-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                    >
                        Next →
                    </button>
                </div>
            )}
        </section>
    );
}
