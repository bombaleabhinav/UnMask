import { useRef, useState } from 'react';

export default function HeroSection({ onFileUpload, loading, progress, error }) {
    const fileRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) setSelectedFile(e.dataTransfer.files[0]);
    };

    const handleSelect = (e) => {
        if (e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const handleAnalyze = () => {
        if (selectedFile) onFileUpload(selectedFile);
    };

    return (
        <section className="min-h-[calc(100vh-57px)] flex items-center justify-center px-6 md:px-12 lg:px-20 bg-black">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center py-16">

                {/* ── Left: Hero Text ── */}
                <div className="text-center lg:text-left">
                    <h1
                        className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] select-none mb-5"
                        style={{
                            color: '#FF1A1A',
                            fontFamily: "'Inter', sans-serif",
                            textShadow: '0 0 60px rgba(255, 26, 26, 0.15)',
                        }}
                    >
                        UNMASK
                    </h1>
                    <p className="text-base sm:text-lg font-light tracking-wide text-white/50 max-w-md mx-auto lg:mx-0">
                        Follow the money. Reveal the network.
                    </p>
                </div>

                {/* ── Right: Upload Command Box ── */}
                <div>
                    {!loading ? (
                        <div className="space-y-5">
                            {/* Upload zone */}
                            <div
                                className={`
                  border rounded-xl p-8 sm:p-10 cursor-pointer text-center
                  transition-all duration-300
                  ${dragOver
                                        ? 'border-[#FF1A1A] bg-[#FF1A1A]/5 shadow-[0_0_40px_rgba(255,26,26,0.12)]'
                                        : selectedFile
                                            ? 'border-[#7A0000] bg-[#7A0000]/[0.04]'
                                            : 'border-[#7A0000] hover:border-[#FF1A1A]/50 hover:shadow-[0_0_30px_rgba(255,26,26,0.06)]'
                                    }
                `}
                                onClick={() => !loading && fileRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {!selectedFile ? (
                                    <>
                                        <div className="text-[#FF1A1A]/30 mb-4">
                                            <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                                <path d="M12 16V4m0 0l-4 4m4-4l4 4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
                                            </svg>
                                        </div>
                                        <p className="text-white/60 font-medium text-sm mb-1">Drop transaction CSV here</p>
                                        <p className="text-white/25 text-xs">or click to browse</p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border border-emerald-500/40 flex items-center justify-center">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                        <p className="font-mono text-white/70 text-xs tracking-wide">{selectedFile.name}</p>
                                        <p className="text-white/25 text-[10px]">
                                            {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
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
                            <button
                                onClick={handleAnalyze}
                                disabled={!selectedFile}
                                className={`
                  w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.2em]
                  transition-all duration-200 cursor-pointer
                  ${!selectedFile
                                        ? 'bg-[#7A0000]/20 text-white/15 cursor-not-allowed'
                                        : 'bg-[#B00000] text-white hover:bg-[#FF1A1A] hover:shadow-[0_0_30px_rgba(255,26,26,0.2)] active:scale-[0.99]'
                                    }
                `}
                            >
                                Analyze Network
                            </button>

                            {error && (
                                <p className="text-[#FF1A1A] font-medium text-xs text-center">⚠ {error}</p>
                            )}
                        </div>
                    ) : (
                        /* Loading state */
                        <div className="space-y-3 py-8">
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                                    style={{
                                        width: `${progress.percent}%`,
                                        background: 'linear-gradient(90deg, #B00000, #FF1A1A)',
                                        boxShadow: '0 0 12px rgba(255, 26, 26, 0.4)',
                                    }}
                                />
                            </div>
                            <p className="text-white/30 text-xs font-medium text-center">{progress.text}</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
