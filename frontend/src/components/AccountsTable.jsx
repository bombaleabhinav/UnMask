import { useState, useEffect, useRef } from 'react';

const ITEMS_PER_PAGE = 20;

function ScoreBar({ score }) {
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
            <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, var(--success), var(--primary-accent), var(--danger))',
                        boxShadow: `0 0 ${6 + glowIntensity * 10}px rgba(251, 113, 133, ${0.15 + glowIntensity * 0.3})`,
                    }}
                />
            </div>
            <span
                className="text-xs font-mono font-bold tabular-nums"
                style={{ color: score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--primary-accent)' : 'var(--success)' }}
            >
                {score.toFixed(1)}
            </span>
        </div>
    );
}

export default function AccountsTable({ accounts }) {
    const [page, setPage] = useState(1);

    const totalPages = Math.ceil(accounts.length / ITEMS_PER_PAGE) || 1;
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const pageData = accounts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    return (
        <section>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <span className="text-danger">🚨</span> Suspicious Accounts
                </h2>
                <span className="text-xs font-mono text-neutral-600 tracking-wide">
                    {accounts.length} FLAGGED
                </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-primary-accent/10 bg-bg-primary">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-primary-accent/10">
                            {['ACCOUNT ID', 'SUSPICION SCORE', 'DETECTED PATTERNS', 'RING ID'].map((col) => (
                                <th
                                    key={col}
                                    className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600 whitespace-nowrap"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-16 text-neutral-600 text-sm">
                                    No suspicious accounts detected.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((account) => (
                                <tr
                                    key={account.account_id}
                                    className="border-b border-divider transition-all duration-200 hover:bg-danger/[0.02]"
                                >
                                    <td className="px-5 py-4">
                                        <span className="font-mono font-bold text-sm text-danger/80">
                                            {account.account_id}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <ScoreBar score={account.suspicion_score} />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {account.detected_patterns.map((p, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wide border border-danger/10 bg-danger/[0.04] text-danger/50"
                                                >
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="font-mono font-bold text-sm text-danger/60">
                                            {account.ring_id || '—'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {accounts.length > ITEMS_PER_PAGE && (
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
