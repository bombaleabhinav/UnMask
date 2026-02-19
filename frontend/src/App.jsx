import { useState } from 'react';
import './index.css';
import HeroSection from './components/HeroSection';
import ResultsSection from './components/ResultsSection';

const API_URL = 'http://localhost:8000';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, text: '' });
  const [error, setError] = useState(null);

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

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      setProgress({ percent: 90, text: 'Processing results...' });
      const data = await response.json();

      setProgress({ percent: 100, text: 'Analysis complete!' });
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 400);
    } catch (err) {
      setError(err.message || 'Failed to analyze file');
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
        ForensicFlow v1.0 — Graph-Based Money Muling Detection Engine
      </footer>
    </div>
  );
}
