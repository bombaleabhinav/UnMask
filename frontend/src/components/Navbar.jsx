export default function Navbar({ hasResults, onNewAnalysis }) {
    const navLinks = hasResults
        ? [
            { label: 'Upload', action: onNewAnalysis },
            { label: 'Analyze', href: '#graph-section' },
            { label: 'Rings', href: '#rings-section' },
        ]
        : [
            { label: 'Upload', href: '#upload-section' },
        ];

    return (
        <nav className="sticky top-0 z-50 flex items-center justify-end px-8 py-4 bg-black/80 backdrop-blur-xl border-b border-[#FF1A1A]/10">
            {/* Nav Links */}
            <div className="flex items-center gap-1">
                {navLinks.map((link) =>
                    link.action ? (
                        <button
                            key={link.label}
                            onClick={link.action}
                            className="px-5 py-2 text-sm font-semibold tracking-wide uppercase text-neutral-400 hover:text-[#FF1A1A] transition-colors duration-200 rounded-lg hover:bg-[#FF1A1A]/5 cursor-pointer"
                        >
                            {link.label}
                        </button>
                    ) : (
                        <a
                            key={link.label}
                            href={link.href}
                            className="px-5 py-2 text-sm font-semibold tracking-wide uppercase text-neutral-400 hover:text-[#FF1A1A] transition-colors duration-200 rounded-lg hover:bg-[#FF1A1A]/5"
                        >
                            {link.label}
                        </a>
                    )
                )}
            </div>
        </nav>
    );
}
