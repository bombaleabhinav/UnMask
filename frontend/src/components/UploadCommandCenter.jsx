import { useRef, useState } from 'react';

export default function UploadCommandCenter({ onFileUpload, loading, progress, error }) {
    const fileRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            setSelectedFile(file);
            onFileUpload(file);
        }
    };

    const handleSelect = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            onFileUpload(file);
        }
    };

    return (
        <section className="relative py-28 px-6 bg-bg-primary flex flex-col items-center justify-center">
            {/* Section heading */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white/90 text-center mb-16">
                Analyze Transaction Network
            </h2>

            {/* Upload box */}
            <div
                className={`
          relative w-full max-w-2xl border rounded-xl p-10 sm:p-14 cursor-pointer
          transition-all duration-300 text-center flex flex-col items-center justify-center min-h-[320px]
          ${dragOver
                        ? 'border-primary-accent bg-primary-accent/5 shadow-[0_0_40px_rgba(56,189,248,0.15)]'
                        : selectedFile
                            ? 'border-secondary-accent/20 bg-secondary-accent/5'
                            : 'border-secondary-accent/20 hover:border-primary-accent hover:shadow-[0_0_50px_rgba(56,189,248,0.1)]'
                    }
        `}
                onClick={() => !loading && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                {/* Icon */}
                {!selectedFile ? (
                    <>
                        <div className="text-primary-accent/40 mb-6">
                            <svg className="mx-auto" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                <path d="M12 16V4m0 0l-4 4m4-4l4 4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
                            </svg>
                        </div>
                        <p className="text-white/70 font-semibold text-lg mb-2">Drop transaction CSV here</p>
                        <p className="text-white/30 text-sm mb-6">or click to browse files</p>
                        <code className="text-xs font-mono px-4 py-2 rounded-lg bg-primary-accent/5 border border-primary-accent/10 text-primary-accent/40">
                            transaction_id, sender_id, receiver_id, amount, timestamp
                        </code>
                    </>
                ) : (
                    /* File selected state */
                    <div className="flex flex-col items-center gap-4">
                        {/* Green tick animation */}
                        <div className="w-14 h-14 rounded-full border-2 border-success/50 flex items-center justify-center animate-[tickPop_0.4s_ease_forwards]">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <p className="font-mono text-white/80 text-sm tracking-wide">{selectedFile.name}</p>
                        <p className="text-white/30 text-xs">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                        </p>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileRef}
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleSelect}
                />
            </div>

            {/* Analyze button */}


            {/* Loading progress bar */}
            {loading && (
                <div className="mt-8 w-full max-w-md">
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-[width] duration-500 ease-out"
                            style={{
                                width: `${progress.percent}%`,
                                background: 'linear-gradient(90deg, var(--secondary-accent), var(--primary-accent))',
                                boxShadow: '0 0 16px rgba(56, 189, 248, 0.5)',
                            }}
                        />
                    </div>
                    <p className="text-white/40 text-xs font-medium mt-3 text-center">{progress.text}</p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <p className="mt-6 text-danger font-semibold text-sm">⚠ {error}</p>
            )}

            {/* Keyframe for tick */}
            <style>{`
        @keyframes tickPop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </section>
    );
}
