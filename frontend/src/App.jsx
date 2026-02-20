import { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AnalysisPage from './components/AnalysisPage';
import ForensicLoader from './components/ForensicLoader';
import CustomCursor from './components/CustomCursor';

export default function App() {
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('forensic_api_url') || import.meta.env.VITE_API_URL || ''
  );

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, text: '' });
  const [error, setError] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

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
    setProgress({ percent: 0, text: '' });
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <CustomCursor />
      <ForensicLoader visible={loading} />
      <Navbar />

      {!result ? (
        <HeroSection
          onFileUpload={handleFileUpload}
          loading={loading}
          progress={progress}
          error={error}
        />
      ) : (
        <AnalysisPage
          result={result}
          onNewAnalysis={handleNewAnalysis}
        />
      )}
    </div>
  );
}
