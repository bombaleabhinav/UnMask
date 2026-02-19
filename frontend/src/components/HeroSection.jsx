import { useRef, useState, useEffect } from 'react';

export default function HeroSection({ onFileUpload, loading, progress, error }) {
    const videoRef = useRef(null);
    const fileRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = 0.1;
        }
    }, []);


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

    const handleAnalyze = () => {
        if (selectedFile) onFileUpload(selectedFile);
    };

    return (
        <section className="relative h-screen flex items-center justify-center px-6 md:px-12 lg:px-20 bg-bg-primary overflow-hidden">
            {/* Background Video */}
            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-30"
                style={{ filter: 'contrast(1.2) brightness(0.5) saturate(0)' }}
            >
                <source src="/background.mp4" type="video/mp4" />
            </video>

            <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center py-16">

                <div className="text-center lg:text-left animate-slide-in-left">
                    <h1
                        className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] select-none mb-5"
                        style={{
                            color: 'var(--primary-accent)',
                            fontFamily: "'Inter', sans-serif",
                            textShadow: '0 0 60px rgba(56, 189, 248, 0.15)',
                        }}
                    >
                        <span className="inline-block animate-[smokeEffect_4s_infinite_alternate]">UN</span>MASK
                    </h1>
                    <p className="text-base sm:text-lg font-light tracking-wide text-white/50 max-w-md mx-auto lg:mx-0 lg:pl-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        Follow the money. Reveal the network.
                    </p>
                </div>

                {/* ── Right: Upload Command Box ── */}
                <div className="animate-scale-in" style={{ animationDelay: '400ms' }}>
                    {!loading ? (
                        <div className="space-y-5">
                            {/* Upload zone */}
                            <div
                                className={`
                  border rounded-xl p-8 sm:p-14 cursor-pointer text-center flex flex-col items-center justify-center min-h-[320px]
                  transition-all duration-300
                  ${dragOver
                                        ? 'border-primary-accent bg-primary-accent/5 shadow-[0_0_40px_rgba(56,189,248,0.12)]'
                                        : selectedFile
                                            ? 'border-primary-accent/20 bg-primary-accent/[0.04]'
                                            : 'border-primary-accent/20 hover:border-primary-accent/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.06)]'
                                    }
                `}
                                onClick={() => !loading && fileRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {!selectedFile ? (
                                    <>
                                        <div className="text-primary-accent/30 mb-4">
                                            <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                                                <path d="M12 16V4m0 0l-4 4m4-4l4 4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" />
                                            </svg>
                                        </div>
                                        <p className="text-white/60 font-medium text-sm mb-1">Drop transaction CSV here</p>
                                        <p className="text-white/25 text-xs">or click to browse</p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border border-success/40 flex items-center justify-center">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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


                            {error && (
                                <p className="text-danger font-medium text-xs text-center">⚠ {error}</p>
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
                                        background: 'linear-gradient(90deg, var(--secondary-accent), var(--primary-accent))',
                                        boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
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
