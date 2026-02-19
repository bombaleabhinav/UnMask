export default function Navbar({ hasResults }) {
    return (
        <nav
            className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-4 backdrop-blur-xl animate-[fadeInDown_0.8s_ease-out_forwards]"
            style={{
                background: 'rgba(2, 6, 23, 0.7)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
        >
            {/* Logo */}


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
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-primary-accent transition-all duration-300 group-hover:w-3/4" />
                        </a>
                    ))}
                </div>
            )}
        </nav>
    );
}
