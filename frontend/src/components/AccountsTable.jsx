import { useState } from 'react';

const ITEMS_PER_PAGE = 20;

function getScoreGradient(score) {
    if (score >= 70) return 'linear-gradient(90deg, #ef4444, #ec4899)';
    if (score >= 40) return 'linear-gradient(90deg, #f59e0b, #ef4444)';
    return 'linear-gradient(90deg, #10b981, #22d3ee)';
}

function getScoreClass(score) {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
}

export default function AccountsTable({ accounts }) {
    const [page, setPage] = useState(1);

    const totalPages = Math.ceil(accounts.length / ITEMS_PER_PAGE) || 1;
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const pageData = accounts.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    return (
        <section className="table-section">
            <div className="section-header">
                <h2>🚨 Suspicious Accounts</h2>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Account ID</th>
                            <th>Suspicion Score</th>
                            <th>Detected Patterns</th>
                            <th>Ring ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                    No suspicious accounts detected.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((account) => (
                                <tr key={account.account_id}>
                                    <td>{account.account_id}</td>
                                    <td>
                                        <div className="score-bar">
                                            <span className={getScoreClass(account.suspicion_score)}>
                                                {account.suspicion_score.toFixed(1)}
                                            </span>
                                            <div className="score-bar-track">
                                                <div
                                                    className="score-bar-fill"
                                                    style={{
                                                        width: `${account.suspicion_score}%`,
                                                        background: getScoreGradient(account.suspicion_score),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {account.detected_patterns.map((p, i) => (
                                            <span className="pattern-tag" key={i}>{p}</span>
                                        ))}
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                                        {account.ring_id || '—'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {accounts.length > ITEMS_PER_PAGE && (
                <div className="pagination">
                    <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
                    <span className="pagination-info">Page {page} of {totalPages}</span>
                    <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
            )}
        </section>
    );
}
