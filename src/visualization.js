/**
 * ForensicFlow — Graph Visualization Module
 * Uses Cytoscape.js for interactive network graph rendering
 */

import cytoscape from 'cytoscape';

let cy = null;
let showLabels = true;

/**
 * Initialize and render the Cytoscape graph
 * @param {Object} analysisResult - Complete analysis result from graphEngine
 * @param {string} containerId - DOM element id for the graph
 */
export function renderGraph(analysisResult, containerId = 'cy-graph') {
    const { _internal, suspicious_accounts, fraud_rings } = analysisResult;
    const { graph, scores, patterns, ringMembership } = _internal;

    // Build node and edge data for Cytoscape
    const elements = [];

    // Suspicious account lookup
    const suspiciousSet = new Set(suspicious_accounts.map(a => a.account_id));
    const ringMemberSet = new Set();
    for (const ring of fraud_rings) {
        for (const member of ring.member_accounts) {
            ringMemberSet.add(member);
        }
    }

    // Map ring IDs to colors for visual differentiation
    const ringColors = {};
    const colorPalette = [
        '#ef4444', '#f59e0b', '#ec4899', '#a855f7',
        '#6366f1', '#14b8a6', '#f97316', '#e11d48',
        '#8b5cf6', '#06b6d4', '#84cc16', '#d946ef'
    ];
    fraud_rings.forEach((ring, i) => {
        ringColors[ring.ring_id] = colorPalette[i % colorPalette.length];
    });

    // OPTIMIZATION: Smart filtering for large graphs
    const MAX_NODES_FOR_FULL_RENDER = 1000;
    const isLargeGraph = graph.nodes.length > MAX_NODES_FOR_FULL_RENDER;
    const nodesToRender = new Set();

    if (isLargeGraph) {
        // Include:
        // 1. All suspicious accounts
        // 2. All ring members
        // 3. High volume nodes (hubs)
        for (const nodeId of graph.nodes) {
            if (suspiciousSet.has(nodeId) || ringMemberSet.has(nodeId)) {
                nodesToRender.add(nodeId);
            } else {
                const stats = graph.nodeStats[nodeId];
                // Include major hubs to provide context, even if not flagged
                if (stats.inDeg + stats.outDeg > 50) {
                    nodesToRender.add(nodeId);
                }
            }
        }

        // Context expansion: Include direct neighbors of high-risk nodes (score >= 40)
        // limit to avoiding explosion
        for (const account of suspicious_accounts) {
            if (account.suspicion_score >= 40) {
                const neighbors = (graph.adjacency[account.account_id] || []).map(e => e.receiver)
                    .concat((graph.reverseAdj[account.account_id] || []).map(e => e.sender));

                for (const neighbor of neighbors) {
                    // Only add if not too many already
                    if (nodesToRender.size < 2000) {
                        nodesToRender.add(neighbor);
                    }
                }
            }
        }

        console.log(`Large graph detected (${graph.nodes.length} nodes). Optimized view to ${nodesToRender.size} nodes.`);

        // Notify user (simple toast or console for now)
        if (graph.nodes.length > nodesToRender.size) {
            // Check if toast exists
            let toast = document.getElementById('graph-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'graph-toast';
                toast.style.cssText = `
                    position: absolute; 
                    bottom: 20px; 
                    right: 20px; 
                    background: rgba(15, 23, 42, 0.9); 
                    color: #94a3b8; 
                    padding: 12px 20px; 
                    border-radius: 8px; 
                    border: 1px solid #334155;
                    font-size: 0.9rem;
                    z-index: 1000;
                    pointer-events: none;
                `;
                document.getElementById(containerId).appendChild(toast);
            }
            toast.textContent = `Rendering top ${nodesToRender.size} relevant nodes (of ${graph.nodes.length})`;
            toast.classList.remove('hidden');
        }

    } else {
        // Small graph: render everything
        for (const nodeId of graph.nodes) nodesToRender.add(nodeId);
    }

    // Create nodes
    for (const nodeId of graph.nodes) {
        if (!nodesToRender.has(nodeId)) continue;

        const stats = graph.nodeStats[nodeId];
        const score = scores[nodeId] || 0;
        const isSuspicious = suspiciousSet.has(nodeId);
        const isRingMember = ringMemberSet.has(nodeId);
        const nodeRingId = ringMembership[nodeId] || null;
        const nodePatterns = patterns[nodeId] ? Array.from(patterns[nodeId]) : [];

        let nodeType = 'normal';
        if (isRingMember) nodeType = 'ring';
        else if (isSuspicious) nodeType = 'suspicious';

        // Size based on transaction volume
        const totalVolume = (stats.totalIn || 0) + (stats.totalOut || 0);
        const baseSize = 20;
        const sizeScale = Math.min(50, baseSize + Math.log2(totalVolume + 1) * 3);

        elements.push({
            group: 'nodes',
            data: {
                id: nodeId,
                label: nodeId,
                type: nodeType,
                score: score,
                inDeg: stats.inDeg,
                outDeg: stats.outDeg,
                totalIn: stats.totalIn,
                totalOut: stats.totalOut,
                txCount: stats.txCount,
                ringId: nodeRingId,
                patterns: nodePatterns,
                sizeVal: sizeScale,
                ringColor: nodeRingId ? (ringColors[nodeRingId] || '#ef4444') : null
            }
        });
    }

    // Create edges (aggregate if multiple transactions between same pair)
    const edgeMap = {};
    for (const senderId of Object.keys(graph.adjacency)) {
        if (!nodesToRender.has(senderId)) continue; // Optimization

        for (const edge of graph.adjacency[senderId]) {
            if (!nodesToRender.has(edge.receiver)) continue; // Optimization

            const key = `${senderId}->${edge.receiver}`;
            if (!edgeMap[key]) {
                edgeMap[key] = { source: senderId, target: edge.receiver, totalAmount: 0, txCount: 0 };
            }
            edgeMap[key].totalAmount += edge.amount;
            edgeMap[key].txCount++;
        }
    }

    for (const [key, edge] of Object.entries(edgeMap)) {
        const isSuspiciousEdge = (suspiciousSet.has(edge.source) && suspiciousSet.has(edge.target)) ||
            (ringMemberSet.has(edge.source) && ringMemberSet.has(edge.target));

        elements.push({
            group: 'edges',
            data: {
                id: key,
                source: edge.source,
                target: edge.target,
                totalAmount: edge.totalAmount,
                txCount: edge.txCount,
                suspicious: isSuspiciousEdge,
                weight: Math.max(1, Math.min(5, Math.log2(edge.totalAmount + 1) * 0.5))
            }
        });
    }

    // Destroy previous instance
    if (cy) {
        cy.destroy();
    }

    // Create Cytoscape instance
    cy = cytoscape({
        container: document.getElementById(containerId),
        elements: elements,
        style: [
            // Normal nodes
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
                    'text-outline-color': '#0a0e1a'
                }
            },
            // Suspicious nodes
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
                    'text-outline-color': '#0a0e1a'
                }
            },
            // Ring member nodes
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
                    'text-outline-color': '#0a0e1a'
                }
            },
            // Normal edges
            {
                selector: 'edge[!suspicious]',
                style: {
                    'width': 'data(weight)',
                    'line-color': 'rgba(148, 163, 184, 0.15)',
                    'target-arrow-color': 'rgba(148, 163, 184, 0.2)',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 0.8,
                    'opacity': 0.4
                }
            },
            // Suspicious edges
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
                    'line-style': 'solid'
                }
            },
            // Highlighted (selected/hovered)
            {
                selector: 'node:active, node:selected',
                style: {
                    'border-color': '#22d3ee',
                    'border-width': 4,
                    'shadow-blur': 25,
                    'shadow-color': '#22d3ee',
                    'shadow-opacity': 0.7
                }
            }
        ],
        layout: {
            name: isLargeGraph ? 'grid' : 'cose', // Use grid for large graphs initially to avoid heavy layout calc
            rows: isLargeGraph ? undefined : undefined,
            animate: !isLargeGraph, // Disable animation for large graphs
            animationDuration: 1000,
            animationEasing: 'ease-out',
            nodeRepulsion: function () { return 8000; },
            idealEdgeLength: function () { return 120; },
            edgeElasticity: function () { return 80; },
            gravity: 0.3,
            numIter: isLargeGraph ? 0 : 1000, // Skip COSE iterations if using grid
            randomize: true,
            padding: 40
        },
        minZoom: 0.1,
        maxZoom: 5,
        wheelSensitivity: 0.3
    });

    // Setup event handlers
    setupNodeEvents(cy);
    setupControls(cy);

    return cy;
}

/**
 * Setup node hover/click events for tooltip
 */
function setupNodeEvents(cy) {
    const tooltip = document.getElementById('node-tooltip');

    cy.on('mouseover', 'node', (event) => {
        const node = event.target;
        const data = node.data();
        const renderedPosition = event.renderedPosition || event.position;

        // Update tooltip content
        document.getElementById('tooltip-account-id').textContent = data.id;
        document.getElementById('tooltip-score').textContent = data.score.toFixed(1);
        document.getElementById('tooltip-in').textContent = data.inDeg;
        document.getElementById('tooltip-out').textContent = data.outDeg;
        document.getElementById('tooltip-received').textContent = `$${formatNumber(data.totalIn)}`;
        document.getElementById('tooltip-sent').textContent = `$${formatNumber(data.totalOut)}`;
        document.getElementById('tooltip-patterns').textContent =
            data.patterns.length > 0 ? data.patterns.join(', ') : 'None';
        document.getElementById('tooltip-ring').textContent = data.ringId || '—';

        // Badge
        const badge = document.getElementById('tooltip-badge');
        badge.className = 'tooltip-badge';
        if (data.type === 'ring') {
            badge.textContent = 'Fraud Ring';
            badge.classList.add('danger');
        } else if (data.type === 'suspicious') {
            badge.textContent = 'Suspicious';
            badge.classList.add('suspicious');
        } else {
            badge.textContent = 'Normal';
        }

        // Position tooltip
        const graphContainer = document.getElementById('cy-graph');
        const rect = graphContainer.getBoundingClientRect();
        let left = rect.left + renderedPosition.x + 20;
        let top = rect.top + renderedPosition.y - 20;

        // Keep tooltip in viewport
        const tooltipWidth = 280;
        const tooltipHeight = 250;
        if (left + tooltipWidth > window.innerWidth) {
            left = rect.left + renderedPosition.x - tooltipWidth - 20;
        }
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
        }
        if (top < 10) top = 10;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.remove('hidden');

        // Highlight connected nodes
        const neighborhood = node.neighborhood().add(node);
        cy.elements().not(neighborhood).style('opacity', 0.15);
        neighborhood.style('opacity', 1);
    });

    cy.on('mouseout', 'node', () => {
        tooltip.classList.add('hidden');
        cy.elements().style('opacity', '');  // Reset to stylesheet opacity
    });

    cy.on('tap', 'node', (event) => {
        const node = event.target;
        const data = node.data();

        // Highlight the ring if this node belongs to one
        if (data.ringId) {
            const ringMembers = cy.nodes().filter(n => n.data('ringId') === data.ringId);
            cy.elements().style('opacity', 0.1);
            ringMembers.style('opacity', 1);
            ringMembers.connectedEdges().style('opacity', 0.8);
        }
    });

    cy.on('tap', function (event) {
        if (event.target === cy) {
            cy.elements().style('opacity', '');
        }
    });
}

/**
 * Setup graph control buttons
 */
function setupControls(cy) {
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        cy.zoom({ level: cy.zoom() * 0.7, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    });

    document.getElementById('btn-fit').addEventListener('click', () => {
        cy.fit(undefined, 40);
    });

    document.getElementById('btn-toggle-labels').addEventListener('click', () => {
        showLabels = !showLabels;
        cy.nodes().forEach(node => {
            if (node.data('type') === 'normal') {
                node.style('label', showLabels ? node.data('label') : '');
            }
        });
    });
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
}

export function destroyGraph() {
    if (cy) {
        cy.destroy();
        cy = null;
    }
}
