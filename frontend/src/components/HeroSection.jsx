import { useRef, useState } from 'react';

export default function HeroSection({ onFileUpload, loading, progress, error }) {
    const fileRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            onFileUpload(e.dataTransfer.files[0]);
        }
    };

    return (
        <section className="hero-section">
            <div className="hero-bg">
                <div className="grid-overlay" />
                <div className="glow-orb orb-1" />
                <div className="glow-orb orb-2" />
                <div className="glow-orb orb-3" />
            </div>

            <div className="hero-content">
                <div className="badge">
                    <span className="badge-dot" />
                    RIFT 2026 — Financial Crime Detection
                </div>

                <h1>
                    <span className="gradient-text">ForensicFlow</span>
                </h1>
                <p className="tagline">Graph-Based Money Muling Detection Engine</p>
                <p className="subtitle">
                    Upload a transaction CSV to detect circular fund routing, smurfing, and shell networks
                </p>

                {!loading ? (
                    <div
                        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <div className="upload-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 16V4m0 0l-4 4m4-4l4 4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
                            </svg>
                        </div>
                        <p className="upload-text">Drop your transaction CSV here</p>
                        <p className="upload-hint">or click to browse</p>
                        <div className="upload-format">
                            <code>transaction_id, sender_id, receiver_id, amount, timestamp</code>
                        </div>
                        <input
                            type="file"
                            ref={fileRef}
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files[0]) onFileUpload(e.target.files[0]);
                            }}
                        />
                    </div>
                ) : (
                    <div className="progress-container">
                        <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${progress.percent}%` }} />
                        </div>
                        <p className="progress-text">{progress.text}</p>
                    </div>
                )}

                {error && (
                    <p style={{ color: 'var(--accent-red)', marginTop: 16, fontWeight: 600 }}>
                        ⚠ {error}
                    </p>
                )}
            </div>
        </section>
    );
}
