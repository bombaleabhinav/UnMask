import { useState } from 'react';

const ITEMS_PER_PAGE = 20;

const PATTERN_LABELS = {
    cycle: '🔄 Cycle',
    fan_in: '📥 Fan-In',
    fan_out: '📤 Fan-Out',
    shell_network: '🐚 Shell Network',
};

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

export default function RingsTable({ rings }) {
    const [page, setPage] = useState(1);

    const totalPages = Math.ceil(rings.length / ITEMS_PER_PAGE) || 1;
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const pageData = rings.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    return (
        <section className="table-section">
            <div className="section-header">
                <h2>🔗 Fraud Ring Summary</h2>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Ring ID</th>
                            <th>Pattern</th>
                            <th>Members</th>
                            <th>Risk Score</th>
                            <th>Accounts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                                    No fraud rings detected in this dataset.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((ring) => (
                                <tr key={ring.ring_id}>
                                    <td>{ring.ring_id}</td>
                                    <td><span className="pattern-tag">{PATTERN_LABELS[ring.pattern_type] || ring.pattern_type}</span></td>
                                    <td>{ring.member_accounts.length}</td>
                                    <td>
                                        <div className="score-bar">
                                            <span className={getScoreClass(ring.risk_score)}>{ring.risk_score.toFixed(1)}</span>
                                            <div className="score-bar-track">
                                                <div
                                                    className="score-bar-fill"
                                                    style={{ width: `${ring.risk_score}%`, background: getScoreGradient(ring.risk_score) }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="member-accounts">{ring.member_accounts.join(', ')}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {rings.length > ITEMS_PER_PAGE && (
                <div className="pagination">
                    <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
                    <span className="pagination-info">Page {page} of {totalPages}</span>
                    <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
            )}
        </section>
    );
}
