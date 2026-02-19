import { useState } from 'react';
import './index.css';
import HeroSection from './components/HeroSection';
import ResultsSection from './components/ResultsSection';


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

  return (
    <div className="app">
      {!result ? (
        <HeroSection
          onFileUpload={handleFileUpload}
          loading={loading}
          progress={progress}
          error={error}
        />
      ) : (
        <ResultsSection
          result={result}
          onNewAnalysis={handleNewAnalysis}
        />
      )}

      <footer>
        <div className="footer-content">
          <p>ForensicFlow v1.0 — Graph-Based Money Muling Detection Engine</p>
          <div className="server-config">
            <span
              onClick={() => setShowConfig(!showConfig)}
              style={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '0.8rem', opacity: 0.7 }}
            >
              ⚙️ Server: {(() => { try { return new URL(apiUrl).hostname } catch { return 'Invalid URL' } })()}
            </span>

            {showConfig && (
              <div className="config-popup" style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  defaultValue={apiUrl}
                  placeholder="Enter Backend URL (e.g. https://xyz.gradio.live)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUrlChange(e.target.value);
                  }}
                  onBlur={(e) => handleUrlChange(e.target.value)}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', width: '250px', color: '#333' }}
                />
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
