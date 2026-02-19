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
        <div ref={ref} className="risk-bar">
            <div className="risk-bar__track">
                <div
                    className="risk-bar__fill"
                    style={{
                        width: `${width}%`,
                        background: 'linear-gradient(90deg, var(--success), var(--primary-accent), var(--danger))',
                        boxShadow: `0 0 ${6 + glowIntensity * 10}px rgba(251, 113, 133, ${0.15 + glowIntensity * 0.3})`,
                    }}
                />
            </div>
            <span
                className="risk-bar__value"
                style={{ color: score >= 70 ? 'var(--danger)' : score >= 40 ? 'var(--primary-accent)' : 'var(--success)' }}
            >
                {score.toFixed(1)}
            </span>
        </div>
    );
}

export default function AccountsTable({ accounts }) {
    const [page, setPage] = useState(1);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const totalPages = Math.ceil(accounts.length / ITEMS_PER_PAGE) || 1;
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const pageData = accounts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    return (
        <section className={`accounts-section ${visible ? 'accounts-section--visible' : ''}`}>
            <div className="accounts__header">
                <h2 className="accounts__title">
                    Suspicious Accounts
                </h2>
                <span className="accounts__count">
                    {accounts.length} FLAGGED
                </span>
            </div>

            <div className="accounts__table-wrap">
                <table className="accounts__table">
                    <thead>
                        <tr>
                            {['ACCOUNT ID', 'SUSPICION SCORE', 'DETECTED PATTERNS', 'RING ID'].map((col) => (
                                <th key={col} className="accounts__th">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="accounts__empty">
                                    No suspicious accounts detected.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((account) => (
                                <tr key={account.account_id} className="accounts__row">
                                    <td className="accounts__td">
                                        <span className="accounts__account-id">{account.account_id}</span>
                                    </td>
                                    <td className="accounts__td">
                                        <ScoreBar score={account.suspicion_score} />
                                    </td>
                                    <td className="accounts__td">
                                        <div className="accounts__patterns">
                                            {account.detected_patterns.map((p, i) => (
                                                <span key={i} className="accounts__pattern-tag">{p}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="accounts__td">
                                        <span className="accounts__ring-id">{account.ring_id || '—'}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {accounts.length > ITEMS_PER_PAGE && (
                <div className="accounts__pagination">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        className="accounts__page-btn"
                    >
                        ← Prev
                    </button>
                    <span className="accounts__page-info">{page} / {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="accounts__page-btn"
                    >
                        Next →
                    </button>
                </div>
            )}
        </section>
    );
}
