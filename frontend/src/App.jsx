import { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import GraphView from './components/GraphView';
import StatsGrid from './components/StatsGrid';
import RingsTable from './components/RingsTable';
import AccountsTable from './components/AccountsTable';


export default function App() {
  // Priority: 1. LocalStorage (User override) -> 2. Env Var (Build time) -> 3. Localhost default
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('forensic_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000'
  );

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, text: '' });
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  // Update localStorage when URL changes
  const handleUrlChange = (newUrl) => {
    // Remove trailing slash if present
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

      // Use the dynamic apiUrl
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
      {/* ── Sticky Navbar ── */}
      <Navbar hasResults={!!result} onNewAnalysis={handleNewAnalysis} />

      {!result ? (
        /* ── Hero / Upload View ── */
        <section id="upload-section">
          <HeroSection
            onFileUpload={handleFileUpload}
            loading={loading}
            progress={progress}
            error={error}
          />
        </section>
      ) : (
        /* ── Results View ── */
        <main className="max-w-[1400px] mx-auto px-6 md:px-10">

          {/* Stats Overview */}
          <section className="pt-20 pb-10">
            <StatsGrid summary={result.summary} />
          </section>

          {/* Network Graph */}
          <section id="graph-section" className="py-20">
            <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <span className="text-[#FF1A1A]">🕸️</span> Network Graph
              </h2>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#FF1A1A] to-[#B00000] text-black hover:scale-[1.03] transition-transform duration-200 cursor-pointer"
              >
                ⬇ Download JSON Report
              </button>
            </div>
            <GraphView graphData={result.graph_data} fraudRings={result.fraud_rings} />
          </section>

          {/* Fraud Ring Table */}
          <section id="rings-section" className="py-20">
            <RingsTable rings={result.fraud_rings} />
          </section>

          {/* Suspicious Accounts Table */}
          <section className="py-20">
            <AccountsTable accounts={result.suspicious_accounts} />
          </section>

          {/* New Analysis CTA */}
          <section className="text-center py-24 pb-32">
            <button
              onClick={handleNewAnalysis}
              className="inline-flex items-center gap-3 px-10 py-4 text-base font-semibold rounded-2xl border border-[#FF1A1A]/20 text-neutral-400 hover:text-[#FF1A1A] hover:border-[#FF1A1A]/40 hover:shadow-[0_0_40px_rgba(255,26,26,0.1)] transition-all duration-300 cursor-pointer"
            >
              🔄 Run New Analysis
            </button>
          </section>
        </main>
      )}

      {/* ── Footer ── */}
      <footer className="text-center py-8 border-t border-[#FF1A1A]/5 text-neutral-600 text-sm tracking-wide space-y-2">
        <p>UNMASK v1.0 — Graph-Based Financial Crime Detection</p>
        <div>
          <span
            onClick={() => setShowConfig(!showConfig)}
            className="cursor-pointer underline text-xs opacity-60 hover:opacity-100 hover:text-[#FF1A1A] transition-all duration-200"
          >
            ⚙️ Server: {(() => { try { return new URL(apiUrl).hostname } catch { return 'Invalid URL' } })()}
          </span>

          {showConfig && (
            <div className="mt-3 inline-block">
              <input
                type="text"
                defaultValue={apiUrl}
                placeholder="Enter Backend URL (e.g. https://xyz.gradio.live)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUrlChange(e.target.value);
                }}
                onBlur={(e) => handleUrlChange(e.target.value)}
                className="px-3 py-2 rounded-lg bg-neutral-900 border border-[#FF1A1A]/20 text-neutral-300 text-sm w-[300px] focus:outline-none focus:border-[#FF1A1A]/50"
              />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
