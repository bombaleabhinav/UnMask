import { useState, useRef, useEffect } from 'react';
import StatsGrid from './StatsGrid';
import NetworkGraph from './NetworkGraph';
import FraudRingMatrix from './FraudRingMatrix';
import AccountsTable from './AccountsTable';
import NodeIntelPanel from './NodeIntelPanel';

export default function AnalysisPage({ result, onNewAnalysis }) {
    const videoRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [sectionsVisible, setSectionsVisible] = useState({
        stats: false,
        graph: false,
        rings: false,
        accounts: false,
    });

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 0.1;
        }
    }, []);

    // Staggered section reveals
    useEffect(() => {
        const timers = [
            setTimeout(() => setSectionsVisible(prev => ({ ...prev, stats: true })), 100),
            setTimeout(() => setSectionsVisible(prev => ({ ...prev, graph: true })), 300),
            setTimeout(() => setSectionsVisible(prev => ({ ...prev, rings: true })), 500),
            setTimeout(() => setSectionsVisible(prev => ({ ...prev, accounts: true })), 700),
        ];
        return () => timers.forEach(clearTimeout);
    }, []);

    const handleDownload = () => {
        if (!result) return;
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
        a.download = 'unmask_report.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="analysis-page">
            {/* Background Video — same as Home */}
            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="analysis-page__video"
            >
                <source src="/background.mp4" type="video/mp4" />
            </video>

            {/* Gradient overlays for depth */}
            <div className="analysis-page__overlay analysis-page__overlay--top" />
            <div className="analysis-page__overlay analysis-page__overlay--bottom" />

            {/* Content */}
            <main className="analysis-page__content">

                {/* ── Stats Section ── */}
                <section
                    className={`analysis-section ${sectionsVisible.stats ? 'analysis-section--visible' : ''}`}
                    style={{ transitionDelay: '0ms' }}
                >
                    <StatsGrid summary={result.summary} />
                </section>

                {/* ── Graph Section ── */}
                <section
                    id="graph-section"
                    className={`analysis-section ${sectionsVisible.graph ? 'analysis-section--visible' : ''}`}
                    style={{ transitionDelay: '100ms' }}
                >
                    <div className="analysis-section__header">
                        <h2 className="analysis-section__title">
                            Network Graph
                        </h2>
                        <button
                            onClick={handleDownload}
                            className="analysis-download-btn"
                            id="download-json-btn"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download Report
                        </button>
                    </div>
                    <NetworkGraph
                        graphData={result.graph_data}
                        fraudRings={result.fraud_rings}
                        onNodeSelect={setSelectedNode}
                    />
                </section>

                {/* ── Fraud Rings Section ── */}
                <section
                    id="rings-section"
                    className={`analysis-section ${sectionsVisible.rings ? 'analysis-section--visible' : ''}`}
                    style={{ transitionDelay: '200ms' }}
                >
                    <FraudRingMatrix rings={result.fraud_rings} />
                </section>

                {/* ── Suspicious Accounts ── */}
                <section
                    className={`analysis-section ${sectionsVisible.accounts ? 'analysis-section--visible' : ''}`}
                    style={{ transitionDelay: '300ms' }}
                >
                    <AccountsTable accounts={result.suspicious_accounts} />
                </section>

                {/* ── New Analysis button ── */}
                <section className="analysis-section analysis-section--visible" style={{ textAlign: 'center', paddingBottom: '4rem' }}>
                    <button
                        onClick={onNewAnalysis}
                        className="analysis-new-btn"
                        id="new-analysis-btn"
                    >
                        ← New Analysis
                    </button>
                </section>
            </main>

            {/* Intel Panel */}
            <NodeIntelPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
    );
}
