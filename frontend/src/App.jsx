import { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import NetworkGraph from './components/NetworkGraph';
import StatsGrid from './components/StatsGrid';
import FraudRingMatrix from './components/FraudRingMatrix';
import AccountsTable from './components/AccountsTable';
import NodeIntelPanel from './components/NodeIntelPanel';
import ForensicLoader from './components/ForensicLoader';

export default function App() {
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('forensic_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000'
  );

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, text: '' });
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const handleUrlChange = (newUrl) => {
    const cleanUrl = newUrl.replace(/\/$/, '');
    setApiUrl(cleanUrl);
    localStorage.setItem('forensic_api_url', cleanUrl);
    setShowConfig(false);
  };

  const handleFileUpload = async (file) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }

    setError(null);
    setLoading(true);
    setProgress({ percent: 15, text: 'Uploading & analyzing CSV...' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress({ percent: 40, text: 'Running graph analysis on server...' });

      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${response.status}). Check API URL.`);
      }

      setProgress({ percent: 90, text: 'Processing results...' });
      const data = await response.json();

      setProgress({ percent: 100, text: 'Analysis complete!' });
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 400);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze file. Is the backend running?');
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setResult(null);
    setError(null);
    setLoading(false);
    setSelectedNode(null);
    setProgress({ percent: 0, text: '' });
  };

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
    <div className="min-h-screen bg-black text-white">
      {/* Loader overlay */}
      <ForensicLoader visible={loading} />

      {/* Navbar */}
      <Navbar hasResults={!!result} />

      {!result ? (
        /* ── Landing: Hero + Upload ── */
        <HeroSection
          onFileUpload={handleFileUpload}
          loading={loading}
          progress={progress}
          error={error}
        />
      ) : (
        /* ── Results ── */
        <>
          <main className="max-w-[1400px] mx-auto px-6 md:px-10">
            {/* Stats */}
            <section className="pt-16 pb-8 animate-[fadeUp_0.5s_ease_both]">
              <StatsGrid summary={result.summary} />
            </section>

            {/* Graph */}
            <section id="graph-section" className="py-12 animate-[fadeUp_0.5s_ease_0.1s_both]">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <span className="text-[#FF1A1A]">🕸️</span> Network Graph
                </h2>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-wider uppercase rounded-lg bg-[#B00000] text-white hover:bg-[#FF1A1A] transition-colors duration-200 cursor-pointer"
                >
                  ↓ Download Report
                </button>
              </div>
              <NetworkGraph graphData={result.graph_data} fraudRings={result.fraud_rings} onNodeSelect={setSelectedNode} />
            </section>

            {/* Fraud Rings */}
            <section id="rings-section" className="py-12 animate-[fadeUp_0.5s_ease_0.2s_both]">
              <FraudRingMatrix rings={result.fraud_rings} />
            </section>

            {/* Suspicious Accounts */}
            <section className="py-12 animate-[fadeUp_0.5s_ease_0.3s_both]">
              <AccountsTable accounts={result.suspicious_accounts} />
            </section>

            {/* New Analysis */}
            <section className="text-center py-16 pb-24">
              <button
                onClick={handleNewAnalysis}
                className="px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] rounded-xl border border-[#FF1A1A]/15 text-neutral-500 hover:text-[#FF1A1A] hover:border-[#FF1A1A]/30 transition-all duration-200 cursor-pointer"
              >
                ← New Analysis
              </button>
            </section>
          </main>

          {/* Intel Panel */}
          <NodeIntelPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </>
      )}

      {/* Footer */}
      <footer className="text-center py-6 border-t border-[#7A0000]/15 text-neutral-700 text-xs tracking-wider">
        <p>UNMASK v1.0</p>
        <div className="mt-1">
          <span
            onClick={() => setShowConfig(!showConfig)}
            className="cursor-pointer opacity-40 hover:opacity-80 hover:text-[#FF1A1A] transition-all duration-200"
          >
            ⚙ {(() => { try { return new URL(apiUrl).hostname } catch { return 'localhost' } })()}
          </span>
          {showConfig && (
            <div className="mt-2 inline-block">
              <input
                type="text"
                defaultValue={apiUrl}
                placeholder="Backend URL"
                onKeyDown={(e) => { if (e.key === 'Enter') handleUrlChange(e.target.value); }}
                onBlur={(e) => handleUrlChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-[#7A0000]/20 text-neutral-400 text-xs w-[260px] focus:outline-none focus:border-[#FF1A1A]/40"
              />
            </div>
          )}
        </div>
      </footer>

      {/* Fade-up keyframe */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
