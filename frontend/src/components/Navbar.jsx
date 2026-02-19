export default function Navbar({ hasResults }) {
    return (
        <nav
            className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 backdrop-blur-md"
            style={{
                background: 'rgba(0, 0, 0, 0.92)',
                borderBottom: '1px solid rgba(122, 0, 0, 0.2)',
            }}
        >
            {/* Logo */}
            <span
                className="text-xl font-black tracking-tight select-none"
                style={{ color: '#FF1A1A', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.5px' }}
            >
                UNMASK
            </span>

            {/* Section indicators — only visible with results */}
            {hasResults && (
                <div className="flex items-center gap-1">
                    {[
                        { label: 'Graph', href: '#graph-section' },
                        { label: 'Rings', href: '#rings-section' },
                    ].map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="relative px-4 py-2 text-xs font-semibold tracking-widest uppercase text-neutral-500 hover:text-white/80 transition-colors duration-200 group"
                        >
                            {link.label}
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-[#FF1A1A] transition-all duration-300 group-hover:w-3/4" />
                        </a>
                    ))}
                </div>
            )}
        </nav>
    );
}
