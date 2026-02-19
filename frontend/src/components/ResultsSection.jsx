import { useState } from 'react';
import StatsGrid from './StatsGrid';
import GraphView from './GraphView';
import RingsTable from './RingsTable';
import AccountsTable from './AccountsTable';

export default function ResultsSection({ result, onNewAnalysis }) {
    const handleDownload = () => {
        const output = {
            suspicious_accounts: result.suspicious_accounts.map((a) => ({
                account_id: a.account_id,
                suspicion_score: a.suspicion_score,
                detected_patterns: a.detected_patterns,
                ring_id: a.ring_id || 'NONE',
            })),
            fraud_rings: result.fraud_rings.map((r) => ({
                ring_id: r.ring_id,
                member_accounts: r.member_accounts,
                pattern_type: r.pattern_type,
                risk_score: r.risk_score,
            })),
            summary: result.summary,
        };

        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'forensicflow_report.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="results-container">
            {/* Stats */}
            <StatsGrid summary={result.summary} />

            {/* Graph */}
            <section className="graph-section">
                <div className="section-header">
                    <h2>🕸️ Network Graph</h2>
                    <button className="download-btn" onClick={handleDownload}>
                        ⬇ Download JSON Report
                    </button>
                </div>
                <GraphView graphData={result.graph_data} fraudRings={result.fraud_rings} />
            </section>

            {/* Fraud Rings Table */}
            <RingsTable rings={result.fraud_rings} />

            {/* Suspicious Accounts Table */}
            <AccountsTable accounts={result.suspicious_accounts} />

            {/* New Analysis */}
            <section className="new-analysis-section">
                <button className="new-analysis-btn" onClick={onNewAnalysis}>
                    🔄 Run New Analysis
                </button>
            </section>
        </div>
    );
}
