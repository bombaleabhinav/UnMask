import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';

/* ── Helpers ── */
function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Number(num).toFixed(2);
}

/* ── Color constants matching CSS variables ── */
const COLORS = {
    bgPrimary: '#000000',
    cardGlass: 'rgba(255, 255, 255, 0.06)',
    primaryAccent: '#E5D9B6',
    secondaryAccent: '#A78BFA',
    danger: '#FB7185',
    success: '#4ADE80',
    textPrimary: '#F8FAFC',
    textSecondary: '#94a3b8',
    divider: 'rgba(255, 255, 255, 0.08)',
};

const RING_PALETTE = [
    '#A78BFA', // Purple
    '#FB7185', // Rose
    '#38BDF8', // Sky
    '#818CF8', // Indigo
    '#F472B6', // Pink
    '#22D3EE', // Cyan
    '#C084FC', // Violet
    '#60A5FA', // Blue
    '#34D399', // Emerald
    '#FBBF24', // Amber
];

/* ── Main NetworkGraph ── */
export default function NetworkGraph({ graphData, fraudRings, onNodeSelect }) {
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const cyRef = useRef(null);
    const tooltipRef = useRef(null);
    const [showLabels, setShowLabels] = useState(true);
    const [cyReady, setCyReady] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); // all | suspicious | rings

    // Resize observer
    useEffect(() => {
        const cy = cyRef.current;
        const container = containerRef.current;
        if (!cy || !container) return;

        const observer = new ResizeObserver(() => {
            cy.resize();
            cy.fit(undefined, 50);
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [cyReady]);

    useEffect(() => {
        if (!containerRef.current || !graphData) return;

        // Ring color mapping
        const ringColors = {};
        fraudRings.forEach((ring, i) => {
            ringColors[ring.ring_id] = RING_PALETTE[i % RING_PALETTE.length];
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
                    ringColor: node.ringId ? (ringColors[node.ringId] || COLORS.secondaryAccent) : null,
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
                // ─── Normal Nodes ───
                {
                    selector: 'node[type="normal"]',
                    style: {
                        'background-color': '#1a1a2e',
                        'background-opacity': 0.9,
                        'border-width': 1.5,
                        'border-color': 'rgba(229, 217, 182, 0.2)',
                        'shadow-blur': 8,
                        'shadow-color': 'rgba(229, 217, 182, 0.1)',
                        'shadow-opacity': 0.3,
                        'label': showLabels ? 'data(label)' : '',
                        'font-size': '8px',
                        'font-family': 'Inter, sans-serif',
                        'font-weight': '500',
                        'color': COLORS.textSecondary,
                        'text-valign': 'bottom',
                        'text-margin-y': 6,
                        'width': 'data(sizeVal)',
                        'height': 'data(sizeVal)',
                        'opacity': 0.7,
                        'text-outline-width': 2,
                        'text-outline-color': '#000000',
                        'transition-property': 'width, height, shadow-blur, opacity, border-color, border-width',
                        'transition-duration': '0.25s',
                    },
                },
                // ─── Suspicious Nodes ───
                {
                    selector: 'node[type="suspicious"]',
                    style: {
                        'background-color': COLORS.danger,
                        'background-opacity': 0.85,
                        'border-width': 2.5,
                        'border-color': '#FDA4AF',
                        'shadow-blur': 20,
                        'shadow-color': COLORS.danger,
                        'shadow-opacity': 0.5,
                        'label': 'data(label)',
                        'font-size': '9px',
                        'font-family': 'Inter, sans-serif',
                        'font-weight': 'bold',
                        'color': '#FDA4AF',
                        'text-valign': 'bottom',
                        'text-margin-y': 7,
                        'width': 'data(sizeVal)',
                        'height': 'data(sizeVal)',
                        'opacity': 1,
                        'text-outline-width': 2,
                        'text-outline-color': '#000000',
                        'transition-property': 'width, height, shadow-blur, opacity, border-color, border-width',
                        'transition-duration': '0.25s',
                    },
                },
                // ─── Ring Nodes ───
                {
                    selector: 'node[type="ring"]',
                    style: {
                        'background-color': 'data(ringColor)',
                        'background-opacity': 0.9,
                        'border-width': 3,
                        'border-color': '#ffffff',
                        'border-style': 'double',
                        'shadow-blur': 28,
                        'shadow-color': 'data(ringColor)',
                        'shadow-opacity': 0.7,
                        'label': 'data(label)',
                        'font-size': '10px',
                        'font-family': 'Inter, sans-serif',
                        'font-weight': 'bold',
                        'color': COLORS.textPrimary,
                        'text-valign': 'bottom',
                        'text-margin-y': 8,
                        'width': 'mapData(sizeVal, 20, 50, 30, 60)',
                        'height': 'mapData(sizeVal, 20, 50, 30, 60)',
                        'opacity': 1,
                        'text-outline-width': 2.5,
                        'text-outline-color': '#000000',
                        'transition-property': 'width, height, shadow-blur, opacity, border-color, border-width',
                        'transition-duration': '0.25s',
                    },
                },
                // ─── Safe Edges (Green) ───
                {
                    selector: 'edge[!suspicious]',
                    style: {
                        'width': 'data(weight)',
                        'line-color': 'rgba(74, 222, 128, 0.2)',
                        'target-arrow-color': 'rgba(74, 222, 128, 0.35)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 0.7,
                        'opacity': 0.35,
                        'transition-property': 'opacity, line-color',
                        'transition-duration': '0.3s',
                    },
                },
                // ─── Suspicious Edges (Red gradient) ───
                {
                    selector: 'edge[suspicious]',
                    style: {
                        'width': 'data(weight)',
                        'line-color': COLORS.danger,
                        'target-arrow-color': COLORS.danger,
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 0.9,
                        'opacity': 0.7,
                        'transition-property': 'opacity, line-color',
                        'transition-duration': '0.3s',
                    },
                },
                // ─── Hover / Selected State ───
                {
                    selector: 'node:active, node:selected',
                    style: {
                        'border-color': COLORS.primaryAccent,
                        'border-width': 4,
                        'shadow-blur': 40,
                        'shadow-color': COLORS.primaryAccent,
                        'shadow-opacity': 0.8,
                        'width': 'mapData(sizeVal, 20, 50, 40, 70)',
                        'height': 'mapData(sizeVal, 20, 50, 40, 70)',
                    },
                },
            ],
            layout: {
                name: isLarge ? 'grid' : 'cose',
                animate: !isLarge,
                animationDuration: 1200,
                nodeRepulsion: () => 9000,
                idealEdgeLength: () => 130,
                edgeElasticity: () => 80,
                gravity: 0.25,
                numIter: isLarge ? 0 : 1000,
                randomize: true,
                padding: 50,
            },
            minZoom: 0.08,
            maxZoom: 6,
            wheelSensitivity: 0.25,
        });

        // ─── Tooltip Events ───
        cy.on('mouseover', 'node', (event) => {
            const node = event.target;
            const data = node.data();
            const pos = event.renderedPosition || event.position;
            const tooltip = tooltipRef.current;
            if (!tooltip) return;

            // Enlarge on hover
            node.style({
                'shadow-blur': 45,
                'shadow-opacity': 0.95,
            });

            const typeClass = data.type === 'ring' ? 'danger' : data.type === 'suspicious' ? 'suspicious' : '';
            const typeLabel = data.type === 'ring' ? '⚠ Fraud Ring' : data.type === 'suspicious' ? '⚡ Suspicious' : '● Normal';

            tooltip.innerHTML = `
                <div class="tooltip-header">
                    <span class="tooltip-account">${data.id}</span>
                    <span class="tooltip-badge ${typeClass}">${typeLabel}</span>
                </div>
                <div class="tooltip-body">
                    <div class="tooltip-row"><span>Score</span><span>${data.score.toFixed(1)}</span></div>
                    <div class="tooltip-row"><span>In-Degree</span><span>${data.inDeg}</span></div>
                    <div class="tooltip-row"><span>Out-Degree</span><span>${data.outDeg}</span></div>
                    <div class="tooltip-row"><span>Received</span><span>$${formatNumber(data.totalIn)}</span></div>
                    <div class="tooltip-row"><span>Sent</span><span>$${formatNumber(data.totalOut)}</span></div>
                    <div class="tooltip-row"><span>Transactions</span><span>${data.txCount}</span></div>
                    <div class="tooltip-row"><span>Patterns</span><span>${data.patterns?.length ? data.patterns.join(', ') : 'None'}</span></div>
                    <div class="tooltip-row"><span>Ring</span><span>${data.ringId || '—'}</span></div>
                </div>
            `;

            const rect = containerRef.current.getBoundingClientRect();
            let left = rect.left + pos.x + 20;
            let top = rect.top + pos.y - 20;
            if (left + 310 > window.innerWidth) left = rect.left + pos.x - 310;
            if (top + 280 > window.innerHeight) top = window.innerHeight - 290;
            if (top < 10) top = 10;

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
            tooltip.style.display = 'block';

            // Dim non-neighbors
            const neighborhood = node.neighborhood().add(node);
            cy.elements().not(neighborhood).style('opacity', 0.08);
            neighborhood.style('opacity', 1);
        });

        cy.on('mouseout', 'node', (event) => {
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            event.target.style({ 'shadow-blur': '', 'shadow-opacity': '' });
            cy.elements().style('opacity', '');
        });

        cy.on('tap', 'node', (event) => {
            const data = event.target.data();
            if (onNodeSelect) onNodeSelect(data);

            // Highlight ring on tap
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphData, fraudRings, showLabels]);

    // ── Filter logic ──
    useEffect(() => {
        const cy = cyRef.current;
        if (!cy) return;

        if (activeFilter === 'all') {
            cy.elements().style('opacity', '');
        } else if (activeFilter === 'suspicious') {
            cy.nodes().style('opacity', 0.08);
            cy.edges().style('opacity', 0.05);
            const suspicious = cy.nodes().filter(n => n.data('type') === 'suspicious' || n.data('type') === 'ring');
            suspicious.style('opacity', 1);
            suspicious.connectedEdges().style('opacity', 0.8);
        } else if (activeFilter === 'rings') {
            cy.nodes().style('opacity', 0.08);
            cy.edges().style('opacity', 0.05);
            const ringNodes = cy.nodes().filter(n => n.data('type') === 'ring');
            ringNodes.style('opacity', 1);
            ringNodes.connectedEdges().style('opacity', 0.8);
        }
    }, [activeFilter, cyReady]);

    const zoomIn = () => {
        const cy = cyRef.current;
        if (cy) cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    };
    const zoomOut = () => {
        const cy = cyRef.current;
        if (cy) cy.zoom({ level: cy.zoom() * 0.7, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    };
    const fitView = () => {
        if (cyRef.current) cyRef.current.fit(undefined, 50);
    };
    const toggleLabels = () => setShowLabels((v) => !v);

    return (
        <div className="network-graph-wrapper">
            {/* Controls Bar */}
            <div className="graph-controls-bar">
                <div className="graph-controls-group">
                    <button onClick={zoomIn} title="Zoom In" className="graph-ctrl-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <button onClick={zoomOut} title="Zoom Out" className="graph-ctrl-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <button onClick={fitView} title="Fit View" className="graph-ctrl-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                    </button>
                    <button onClick={toggleLabels} title="Toggle Labels" className="graph-ctrl-btn graph-ctrl-btn--text">
                        Aa
                    </button>
                </div>

                {/* Filter pills */}
                <div className="graph-filter-pills">
                    {[
                        { key: 'all', label: 'All Nodes' },
                        { key: 'suspicious', label: 'Suspicious' },
                        { key: 'rings', label: 'Rings Only' },
                    ].map(f => (
                        <button
                            key={f.key}
                            className={`graph-filter-pill ${activeFilter === f.key ? 'graph-filter-pill--active' : ''}`}
                            onClick={() => setActiveFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Graph Container */}
            <div ref={wrapperRef} className="graph-canvas-wrapper">
                <div
                    ref={containerRef}
                    className="graph-canvas"
                />

                {/* Legend */}
                <div className="graph-legend">
                    <div className="graph-legend__title">Legend</div>
                    <div className="graph-legend__items">
                        <div className="graph-legend__item">
                            <span className="graph-legend__dot graph-legend__dot--normal" />
                            <span>Normal</span>
                        </div>
                        <div className="graph-legend__item">
                            <span className="graph-legend__dot graph-legend__dot--suspicious" />
                            <span>Suspicious</span>
                        </div>
                        <div className="graph-legend__item">
                            <span className="graph-legend__dot graph-legend__dot--ring" />
                            <span>Ring Member</span>
                        </div>
                        <div className="graph-legend__item graph-legend__item--edge">
                            <span className="graph-legend__line graph-legend__line--safe" />
                            <span>Safe Flow</span>
                        </div>
                        <div className="graph-legend__item graph-legend__item--edge">
                            <span className="graph-legend__line graph-legend__line--danger" />
                            <span>Suspicious Flow</span>
                        </div>
                    </div>
                </div>

                {/* Node count notice */}
                {graphData.isFiltered && (
                    <div className="graph-node-count">
                        Rendering {graphData.renderedNodes} of {graphData.totalNodes} nodes
                    </div>
                )}
            </div>

            {/* Tooltip */}
            <div className="node-tooltip" ref={tooltipRef} style={{ display: 'none' }} />
        </div>
    );
}
