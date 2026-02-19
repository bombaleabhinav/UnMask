import { useEffect, useState } from 'react';

export default function CustomCursor() {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [hidden, setHidden] = useState(false);
    const [clicked, setClicked] = useState(false);
    const [linkHovered, setLinkHovered] = useState(false);

    useEffect(() => {
        const mMove = (el) => {
            setPosition({ x: el.clientX, y: el.clientY });

            // Check if hovering over clickable element
            const target = el.target;
            const isClickable = (
                target.tagName === 'A' ||
                target.tagName === 'BUTTON' ||
                target.closest('a') ||
                target.closest('button') ||
                target.classList.contains('cursor-pointer') ||
                target.onclick ||
                window.getComputedStyle(target).cursor === 'pointer'
            );

            setLinkHovered(!!isClickable);
        };

        const mEnter = () => { setHidden(false); };
        const mLeave = () => { setHidden(true); };
        const mDown = () => { setClicked(true); };
        const mUp = () => { setClicked(false); };

        document.addEventListener("mousemove", mMove);
        document.addEventListener("mouseenter", mEnter);
        document.addEventListener("mouseleave", mLeave);
        document.addEventListener("mousedown", mDown);
        document.addEventListener("mouseup", mUp);

        return () => {
            document.removeEventListener("mousemove", mMove);
            document.removeEventListener("mouseenter", mEnter);
            document.removeEventListener("mouseleave", mLeave);
            document.removeEventListener("mousedown", mDown);
            document.removeEventListener("mouseup", mUp);
        };
    }, []);

    const cursorClasses = `
        fixed top-0 left-0 w-8 h-8 
        border border-primary-accent rounded-full 
        pointer-events-none z-[9999] 
        transform -translate-x-1/2 -translate-y-1/2
        transition-transform duration-150 ease-out
        flex items-center justify-center
        mix-blend-difference
    `;

    // Only show on non-touch devices ideally, but simple check here
    if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return null;

    return (
        <div
            className={cursorClasses}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                opacity: hidden ? 0 : 1,
                transform: `
                    translate(-50%, -50%) 
                    scale(${clicked ? 0.9 : linkHovered ? 1.5 : 1})
                `,
                backgroundColor: linkHovered ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                borderWidth: linkHovered ? '2px' : '1px'
            }}
        >
            <div
                className={`
                    w-1.5 h-1.5 bg-primary-accent rounded-full 
                    transition-all duration-200
                `}
                style={{
                    transform: `scale(${linkHovered ? 0.5 : 1})`
                }}
            />
        </div>
    );
}
