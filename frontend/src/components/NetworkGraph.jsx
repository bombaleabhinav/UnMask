import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';

/* ── Helpers ── */
function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(2);
}

/* ── Transaction Particle Overlay ── */
function ParticleOverlay({ cyRef, containerRef }) {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const animRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const cy = cyRef.current;
        const container = containerRef.current;
        if (!canvas || !cy || !container) return;

        const ctx = canvas.getContext('2d');

        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resize();
        window.addEventListener('resize', resize);

        // Spawn particles along edges
        const spawnParticles = () => {
            const particles = [];
            const edges = cy.edges();
            edges.forEach((edge) => {
                const src = edge.source().renderedPosition();
                const tgt = edge.target().renderedPosition();
                if (!src || !tgt) return;

                const weight = edge.data('weight') || 1;
                const speed = 0.003 + (weight / 10) * 0.004; // weight-based speed
                const count = Math.min(Math.ceil(weight), 3); // more particles for heavier edges

                for (let i = 0; i < count; i++) {
                    particles.push({
                        edge,
                        t: Math.random(), // position along edge [0-1]
                        speed,
                        size: 1.5 + Math.random(),
                    });
                }
            });
            particlesRef.current = particles;
        };

        // Initial spawn + re-spawn on layout
        spawnParticles();
        cy.on('layoutstop', spawnParticles);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const particles = particlesRef.current;

            for (const p of particles) {
                try {
                    const src = p.edge.source().renderedPosition();
                    const tgt = p.edge.target().renderedPosition();
                    if (!src || !tgt) continue;

                    p.t += p.speed;
                    if (p.t > 1) p.t = 0;

                    const x = src.x + (tgt.x - src.x) * p.t;
                    const y = src.y + (tgt.y - src.y) * p.t;

                    // Glow
                    ctx.beginPath();
                    ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 26, 26, 0.15)';
                    ctx.fill();

                    // Core
                    ctx.beginPath();
                    ctx.arc(x, y, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 26, 26, 0.7)';
                    ctx.fill();
                } catch {
                    // Edge may have been removed
                }
            }

            animRef.current = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
            cy.off('layoutstop', spawnParticles);
        };
    }, [cyRef, containerRef]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 5 }}
        />
    );
}

/* ── Main NetworkGraph ── */
export default function NetworkGraph({ graphData, fraudRings, onNodeSelect }) {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const cyRef = useRef(null);
    const tooltipRef = useRef(null);
    const [showLabels, setShowLabels] = useState(true);
    const [cyReady, setCyReady] = useState(false);

    // Parallax effect
    const handleMouseMove = useCallback((e) => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        const container = containerRef.current;
        if (container) {
            container.style.transform = `translate(${dx * 6}px, ${dy * 6}px)`;
        }
    }, []);

    useEffect(() => {
        if (!containerRef.current || !graphData) return;

        // Red-themed ring colors
        const ringColors = {};
        const RED_PALETTE = [
            '#FF1A1A', '#FF4444', '#CC0000', '#FF6666',
            '#E60000', '#FF3333', '#B30000', '#FF5555',
            '#990000', '#FF7777', '#800000', '#FF8888',
        ];
        fraudRings.forEach((ring, i) => {
            ringColors[ring.ring_id] = RED_PALETTE[i % RED_PALETTE.length];
        });

        // Build elements
        const elements = [];

        for (const node of graphData.nodes) {
            elements.push({
                group: 'nodes',
                data: {
                    id: node.id,
                    label: node.id,
                    type: node.type,
                    score: node.score,
                    inDeg: node.inDeg,
                    outDeg: node.outDeg,
                    totalIn: node.totalIn,
                    totalOut: node.totalOut,
                    txCount: node.txCount,
                    ringId: node.ringId,
                    patterns: node.patterns,
                    sizeVal: node.sizeVal,
                    ringColor: node.ringId ? (ringColors[node.ringId] || '#FF1A1A') : null,
                },
            });
        }

        for (const edge of graphData.edges) {
            elements.push({
                group: 'edges',
                data: {
                    id: edge.id,
                    source: edge.source,
                    target: edge.target,
                    totalAmount: edge.totalAmount,
                    txCount: edge.txCount,
                    suspicious: edge.suspicious,
                    weight: edge.weight,
                },
            });
        }

        const isLarge = graphData.isFiltered;

        const cy = cytoscape({
            container: containerRef.current,
            elements,
            style: [
                // Normal nodes — subtle dark red glow
                {
                    selector: 'node[type="normal"]',
                    style: {
                        'background-color': '#7A0000',
                        'border-width': 1.5,
                        'border-color': '#B00000',
                        'shadow-blur': 12,
                        'shadow-color': '#7A0000',
                        'shadow-opacity': 0.4,
                        'label': showLabels ? 'data(label)' : '',
                        'font-size': '9px',
                        'font-family': 'Inter, sans-serif',
                        'color': '#666',
                        'text-valign': 'bottom',
                        'text-margin-y': 6,
                        'width': 'data(sizeVal)',
                        'height': 'data(sizeVal)',
                        'opacity': 0.7,
                        'text-outline-width': 2,
                        'text-outline-color': '#000',
                        'transition-property': 'width, height, shadow-blur, opacity',
                        'transition-duration': '0.2s',
                    },
                },
                // Suspicious nodes — strong red glow
                {
                    selector: 'node[type="suspicious"]',
                    style: {
                        'background-color': '#FF1A1A',
                        'border-width': 2.5,
                        'border-color': '#FF4444',
                        'shadow-blur': 25,
                        'shadow-color': '#FF1A1A',
                        'shadow-opacity': 0.7,
                        'label': 'data(label)',
                        'font-size': '10px',
                        'font-family': 'Inter, sans-serif',
                        'font-weight': 'bold',
                        'color': '#FF6666',
                        'text-valign': 'bottom',
                        'text-margin-y': 6,
                        'width': 'data(sizeVal)',
                        'height': 'data(sizeVal)',
                        'opacity': 1,
                        'text-outline-width': 2,
                        'text-outline-color': '#000',
                        'transition-property': 'width, height, shadow-blur, opacity',
                        'transition-duration': '0.2s',
                    },
                },
                // Ring nodes — intense glow with double border
                {
                    selector: 'node[type="ring"]',
                    style: {
                        'background-color': 'data(ringColor)',
                        'border-width': 3,
                        'border-color': '#fff',
                        'border-style': 'double',
                        'shadow-blur': 30,
                        'shadow-color': 'data(ringColor)',
                        'shadow-opacity': 0.8,
                        'label': 'data(label)',
                        'font-size': '11px',
                        'font-family': 'Inter, sans-serif',
                        'font-weight': 'bold',
                        'color': '#f1f5f9',
                        'text-valign': 'bottom',
                        'text-margin-y': 8,
                        'width': 'mapData(sizeVal, 20, 50, 30, 60)',
                        'height': 'mapData(sizeVal, 20, 50, 30, 60)',
                        'opacity': 1,
                        'text-outline-width': 2,
                        'text-outline-color': '#000',
                        'transition-property': 'width, height, shadow-blur, opacity',
                        'transition-duration': '0.2s',
                    },
                },
                // Normal edges — thin red
                {
                    selector: 'edge[!suspicious]',
                    style: {
                        'width': 'data(weight)',
                        'line-color': 'rgba(176, 0, 0, 0.25)',
                        'target-arrow-color': 'rgba(176, 0, 0, 0.35)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 0.8,
                        'opacity': 0.4,
                        'transition-property': 'opacity, line-color',
                        'transition-duration': '0.3s',
                    },
                },
                // Suspicious edges — bright red
                {
                    selector: 'edge[suspicious]',
                    style: {
                        'width': 'data(weight)',
                        'line-color': '#B00000',
                        'target-arrow-color': '#FF1A1A',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 1,
                        'opacity': 0.75,
                        'transition-property': 'opacity, line-color',
                        'transition-duration': '0.3s',
                    },
                },
                // Hover state — enlarge + intensified glow
                {
                    selector: 'node:active, node:selected',
                    style: {
                        'border-color': '#FF1A1A',
                        'border-width': 4,
                        'shadow-blur': 40,
                        'shadow-color': '#FF1A1A',
                        'shadow-opacity': 0.9,
                        'width': 'mapData(sizeVal, 20, 50, 40, 70)',
                        'height': 'mapData(sizeVal, 20, 50, 40, 70)',
                    },
                },
            ],
            layout: {
                name: isLarge ? 'grid' : 'cose',
                animate: !isLarge,
                animationDuration: 1000,
                nodeRepulsion: () => 8000,
                idealEdgeLength: () => 120,
                edgeElasticity: () => 80,
                gravity: 0.3,
                numIter: isLarge ? 0 : 1000,
                randomize: true,
                padding: 40,
            },
            minZoom: 0.1,
            maxZoom: 5,
            wheelSensitivity: 0.3,
        });

        // Tooltip events
        cy.on('mouseover', 'node', (event) => {
            const node = event.target;
            const data = node.data();
            const pos = event.renderedPosition || event.position;
            const tooltip = tooltipRef.current;
            if (!tooltip) return;

            // Enlarge on hover
            node.style({
                'shadow-blur': 40,
                'shadow-opacity': 0.9,
            });

            tooltip.innerHTML = `
        <div class="tooltip-header">
          <span class="tooltip-account">${data.id}</span>
          <span class="tooltip-badge ${data.type === 'ring' ? 'danger' : data.type === 'suspicious' ? 'suspicious' : ''}">
            ${data.type === 'ring' ? 'Fraud Ring' : data.type === 'suspicious' ? 'Suspicious' : 'Normal'}
          </span>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-row"><span>Score</span><span>${data.score.toFixed(1)}</span></div>
          <div class="tooltip-row"><span>In-Degree</span><span>${data.inDeg}</span></div>
          <div class="tooltip-row"><span>Out-Degree</span><span>${data.outDeg}</span></div>
          <div class="tooltip-row"><span>Received</span><span>$${formatNumber(data.totalIn)}</span></div>
          <div class="tooltip-row"><span>Sent</span><span>$${formatNumber(data.totalOut)}</span></div>
          <div class="tooltip-row"><span>Patterns</span><span>${data.patterns?.length ? data.patterns.join(', ') : 'None'}</span></div>
          <div class="tooltip-row"><span>Ring</span><span>${data.ringId || '—'}</span></div>
        </div>
      `;

            const rect = containerRef.current.getBoundingClientRect();
            let left = rect.left + pos.x + 20;
            let top = rect.top + pos.y - 20;
            if (left + 300 > window.innerWidth) left = rect.left + pos.x - 300;
            if (top + 250 > window.innerHeight) top = window.innerHeight - 260;
            if (top < 10) top = 10;

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.display = 'block';

            const neighborhood = node.neighborhood().add(node);
            cy.elements().not(neighborhood).style('opacity', 0.1);
            neighborhood.style('opacity', 1);
        });

        cy.on('mouseout', 'node', (event) => {
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            event.target.style({ 'shadow-blur': '', 'shadow-opacity': '' });
            cy.elements().style('opacity', '');
        });

        cy.on('tap', 'node', (event) => {
            const data = event.target.data();
            // Open intel panel
            if (onNodeSelect) onNodeSelect(data);
            if (data.ringId) {
                const ringMembers = cy.nodes().filter((n) => n.data('ringId') === data.ringId);
                cy.elements().style('opacity', 0.05);
                ringMembers.style('opacity', 1);
                ringMembers.connectedEdges().style('opacity', 0.8);
            }
        });

        cy.on('tap', (event) => {
            if (event.target === cy) cy.elements().style('opacity', '');
        });

        cyRef.current = cy;
        setCyReady(true);

        return () => {
            cy.destroy();
            cyRef.current = null;
            setCyReady(false);
        };
    }, [graphData, fraudRings, showLabels]);

    const zoomIn = () => {
        const cy = cyRef.current;
        if (cy) cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    };
    const zoomOut = () => {
        const cy = cyRef.current;
        if (cy) cy.zoom({ level: cy.zoom() * 0.7, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    };
    const fitView = () => {
        if (cyRef.current) cyRef.current.fit(undefined, 40);
    };
    const toggleLabels = () => setShowLabels((v) => !v);

    return (
        <>
            {/* Controls */}
            <div className="flex gap-2 mb-3">
                <button onClick={zoomIn} title="Zoom In" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#FF1A1A]/15 bg-black/60 text-neutral-500 hover:text-[#FF1A1A] hover:border-[#FF1A1A]/40 transition-colors duration-200 text-lg cursor-pointer">+</button>
                <button onClick={zoomOut} title="Zoom Out" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#FF1A1A]/15 bg-black/60 text-neutral-500 hover:text-[#FF1A1A] hover:border-[#FF1A1A]/40 transition-colors duration-200 text-lg cursor-pointer">−</button>
                <button onClick={fitView} title="Fit" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#FF1A1A]/15 bg-black/60 text-neutral-500 hover:text-[#FF1A1A] hover:border-[#FF1A1A]/40 transition-colors duration-200 text-lg cursor-pointer">⊞</button>
                <button onClick={toggleLabels} title="Toggle Labels" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#FF1A1A]/15 bg-black/60 text-neutral-500 hover:text-[#FF1A1A] hover:border-[#FF1A1A]/40 transition-colors duration-200 text-sm font-semibold cursor-pointer">Aa</button>
            </div>

            {/* Graph container */}
            <div
                ref={wrapperRef}
                className="relative rounded-xl border border-[#FF1A1A]/10 overflow-hidden bg-black"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                    if (containerRef.current) containerRef.current.style.transform = 'translate(0,0)';
                }}
            >
                <div
                    ref={containerRef}
                    className="w-full transition-transform duration-300 ease-out"
                    style={{ height: '650px' }}
                />

                {/* Particle overlay */}
                {cyReady && <ParticleOverlay cyRef={cyRef} containerRef={containerRef} />}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-black/90 border border-[#FF1A1A]/10 rounded-xl px-5 py-4 z-10">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-3">Legend</div>
                    <div className="flex flex-col gap-1.5 text-xs text-neutral-500">
                        <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full bg-[#7A0000] shadow-[0_0_6px_#7A0000]" /> Safe
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full bg-[#FF1A1A] shadow-[0_0_10px_#FF1A1A]" /> Suspicious
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full bg-[#FF4444] border border-white shadow-[0_0_12px_#FF4444]" /> Ring Member
                        </div>
                        <div className="flex items-center gap-2.5 mt-1">
                            <span className="w-6 h-px bg-[#B00000]/50" /> Normal Flow
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="w-6 h-px bg-[#FF1A1A] shadow-[0_0_4px_#FF1A1A]" /> Suspicious Flow
                        </div>
                    </div>
                </div>

                {/* Filtered notice */}
                {graphData.isFiltered && (
                    <div className="absolute bottom-5 right-5 bg-black/90 text-neutral-600 px-4 py-2.5 rounded-lg border border-[#FF1A1A]/10 text-xs z-10">
                        Rendering {graphData.renderedNodes} nodes (of {graphData.totalNodes})
                    </div>
                )}
            </div>

            {/* Tooltip */}
            <div className="node-tooltip" ref={tooltipRef} style={{ display: 'none' }} />
        </>
    );
}
