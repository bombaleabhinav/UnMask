import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

const COLOR_PALETTE = [
    '#ef4444', '#f59e0b', '#ec4899', '#a855f7',
    '#6366f1', '#14b8a6', '#f97316', '#e11d48',
    '#8b5cf6', '#06b6d4', '#84cc16', '#d946ef',
];

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(2);
}

export default function GraphView({ graphData, fraudRings }) {
    const containerRef = useRef(null);
    const cyRef = useRef(null);
    const [showLabels, setShowLabels] = useState(true);
    const tooltipRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !graphData) return;

        // Build ring color map
        const ringColors = {};
        fraudRings.forEach((ring, i) => {
            ringColors[ring.ring_id] = COLOR_PALETTE[i % COLOR_PALETTE.length];
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
                    ringColor: node.ringId ? (ringColors[node.ringId] || '#ef4444') : null,
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
                {
                    selector: 'node[type="normal"]',
                    style: {
                        'background-color': '#3b82f6',
                        'border-width': 2,
                        'border-color': '#2563eb',
                        'label': showLabels ? 'data(label)' : '',
                        'font-size': '9px',
                        'font-family': 'Inter, sans-serif',
                        'color': '#94a3b8',
                        'text-valign': 'bottom',
                        'text-margin-y': 6,
                        'width': 'data(sizeVal)',
                        'height': 'data(sizeVal)',
                        'opacity': 0.7,
                        'text-outline-width': 2,
                        'text-outline-color': '#0a0e1a',
                    },
                },
                {
                    selector: 'node[type="suspicious"]',
                    style: {
                        'background-color': '#f59e0b',
                        'border-width': 3,
                        'border-color': '#d97706',
                        'shadow-blur': 15,
                        'shadow-color': '#f59e0b',
                        'shadow-opacity': 0.5,
                        'label': 'data(label)',
                        'font-size': '10px',
                        'font-family': 'Inter, sans-serif',
                        'font-weight': 'bold',
                        'color': '#fbbf24',
                        'text-valign': 'bottom',
                        'text-margin-y': 6,
                        'width': 'data(sizeVal)',
                        'height': 'data(sizeVal)',
                        'opacity': 1,
                        'text-outline-width': 2,
                        'text-outline-color': '#0a0e1a',
                    },
                },
                {
                    selector: 'node[type="ring"]',
                    style: {
                        'background-color': 'data(ringColor)',
                        'border-width': 4,
                        'border-color': '#ffffff',
                        'border-style': 'double',
                        'shadow-blur': 20,
                        'shadow-color': 'data(ringColor)',
                        'shadow-opacity': 0.6,
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
                        'text-outline-color': '#0a0e1a',
                    },
                },
                {
                    selector: 'edge[!suspicious]',
                    style: {
                        'width': 'data(weight)',
                        'line-color': 'rgba(148, 163, 184, 0.15)',
                        'target-arrow-color': 'rgba(148, 163, 184, 0.2)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 0.8,
                        'opacity': 0.4,
                    },
                },
                {
                    selector: 'edge[suspicious]',
                    style: {
                        'width': 'data(weight)',
                        'line-color': '#ef4444',
                        'target-arrow-color': '#ef4444',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 1,
                        'opacity': 0.8,
                    },
                },
                {
                    selector: 'node:active, node:selected',
                    style: {
                        'border-color': '#22d3ee',
                        'border-width': 4,
                        'shadow-blur': 25,
                        'shadow-color': '#22d3ee',
                        'shadow-opacity': 0.7,
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
            cy.elements().not(neighborhood).style('opacity', 0.15);
            neighborhood.style('opacity', 1);
        });

        cy.on('mouseout', 'node', () => {
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            cy.elements().style('opacity', '');
        });

        cy.on('tap', 'node', (event) => {
            const data = event.target.data();
            if (data.ringId) {
                const ringMembers = cy.nodes().filter((n) => n.data('ringId') === data.ringId);
                cy.elements().style('opacity', 0.1);
                ringMembers.style('opacity', 1);
                ringMembers.connectedEdges().style('opacity', 0.8);
            }
        });

        cy.on('tap', (event) => {
            if (event.target === cy) cy.elements().style('opacity', '');
        });

        cyRef.current = cy;

        return () => {
            cy.destroy();
            cyRef.current = null;
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
            <div className="graph-controls" style={{ marginBottom: 12 }}>
                <button className="ctrl-btn" onClick={zoomIn} title="Zoom In">+</button>
                <button className="ctrl-btn" onClick={zoomOut} title="Zoom Out">−</button>
                <button className="ctrl-btn" onClick={fitView} title="Fit">⊞</button>
                <button className="ctrl-btn" onClick={toggleLabels} title="Toggle Labels">Aa</button>
            </div>

            <div className="graph-container">
                <div className="cy-graph" ref={containerRef} />

                <div className="graph-legend">
                    <div className="legend-title">Legend</div>
                    <div className="legend-item"><span className="legend-dot normal" /> Normal Account</div>
                    <div className="legend-item"><span className="legend-dot suspicious" /> Suspicious Account</div>
                    <div className="legend-item"><span className="legend-dot ring" /> Fraud Ring Member</div>
                    <div className="legend-item"><span className="legend-line normal-edge" /> Normal Flow</div>
                    <div className="legend-item"><span className="legend-line suspicious-edge" /> Suspicious Flow</div>
                </div>

                {graphData.isFiltered && (
                    <div className="graph-toast">
                        Rendering {graphData.renderedNodes} relevant nodes (of {graphData.totalNodes})
                    </div>
                )}
            </div>

            <div className="node-tooltip" ref={tooltipRef} style={{ display: 'none' }} />
        </>
    );
}
