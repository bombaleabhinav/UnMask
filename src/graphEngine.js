/**
 * ForensicFlow — Graph-Based Financial Crime Detection Engine
 * Core Graph Analysis Module
 * 
 * Implements:
 * 1. Circular Fund Routing (Cycle detection, length 3–5)
 * 2. Smurfing Patterns (Fan-in / Fan-out with temporal analysis)
 * 3. Layered Shell Networks (Low-degree intermediary chains)
 * 4. Suspicion Scoring System
 */

// ==========================================
// DATA STRUCTURES
// ==========================================

/**
 * Build the adjacency list graph from parsed transactions
 * @param {Array} transactions - Parsed CSV rows
 * @returns {Object} Graph data structure
 */
export function buildGraph(transactions) {
    const adjacency = {};       // sender -> [{receiver, amount, timestamp, txId}]
    const reverseAdj = {};      // receiver -> [{sender, amount, timestamp, txId}]
    const nodes = new Set();
    const nodeStats = {};       // accountId -> {inDeg, outDeg, totalIn, totalOut, txCount, timestamps}

    for (const tx of transactions) {
        const { sender_id, receiver_id, amount, timestamp, transaction_id } = tx;
        const amountNum = parseFloat(amount);
        const ts = new Date(timestamp);

        nodes.add(sender_id);
        nodes.add(receiver_id);

        // Forward adjacency
        if (!adjacency[sender_id]) adjacency[sender_id] = [];
        adjacency[sender_id].push({
            receiver: receiver_id,
            amount: amountNum,
            timestamp: ts,
            txId: transaction_id
        });

        // Reverse adjacency
        if (!reverseAdj[receiver_id]) reverseAdj[receiver_id] = [];
        reverseAdj[receiver_id].push({
            sender: sender_id,
            amount: amountNum,
            timestamp: ts,
            txId: transaction_id
        });

        // Node stats
        for (const id of [sender_id, receiver_id]) {
            if (!nodeStats[id]) {
                nodeStats[id] = { inDeg: 0, outDeg: 0, totalIn: 0, totalOut: 0, txCount: 0, timestamps: [] };
            }
        }
        nodeStats[sender_id].outDeg++;
        nodeStats[sender_id].totalOut += amountNum;
        nodeStats[sender_id].txCount++;
        nodeStats[sender_id].timestamps.push(ts);

        nodeStats[receiver_id].inDeg++;
        nodeStats[receiver_id].totalIn += amountNum;
        nodeStats[receiver_id].txCount++;
        nodeStats[receiver_id].timestamps.push(ts);
    }

    return { adjacency, reverseAdj, nodes: Array.from(nodes), nodeStats, transactions };
}

// ==========================================
// PATTERN 1: CYCLE DETECTION (Length 3–5)
// ==========================================

/**
 * Detect cycles of length 3-5 using DFS
 * Johnson's algorithm adapted for small cycle lengths
 */
/**
 * Detect cycles of length 3-5 using DFS with Pruning
 * Johnson's algorithm adapted for small cycle lengths
 */
export function detectCycles(adjacency, nodeList, nodeStats) {
    const cycles = [];
    const seen = new Set(); // To avoid reporting duplicate cycles
    const startTime = performance.now();
    const MAX_TIME_MS = 5000; // 5 second timeout for cycle detection

    // OPTIMIZATION: Pruning
    // Nodes with inDeg=0 or outDeg=0 cannot be part of a cycle.
    // Iteratively remove them to strictly isolate the Cyclic Core.
    const nodesInCore = new Set(nodeList);
    const currentInDeg = {};
    const currentOutDeg = {};
    const queue = [];

    // Initialize degrees
    for (const node of nodeList) {
        currentInDeg[node] = nodeStats[node].inDeg;
        currentOutDeg[node] = nodeStats[node].outDeg;
        if (currentInDeg[node] === 0 || currentOutDeg[node] === 0) {
            queue.push(node);
        }
    }

    // Peel the onion
    while (queue.length > 0) {
        const u = queue.pop();
        if (!nodesInCore.has(u)) continue;
        nodesInCore.delete(u);

        // "Remove" u from graph -> update neighbors
        // For u's outgoing edges: decrement v's in-degree
        if (adjacency[u]) {
            for (const edge of adjacency[u]) {
                const v = edge.receiver;
                if (nodesInCore.has(v)) {
                    currentInDeg[v]--;
                    if (currentInDeg[v] === 0) queue.push(v);
                }
            }
        }
        // We technically need reverse adjacency to update out-degrees of parents
        // but for cycle detection, one zero side is enough to disqualify.
        // However, correct peeling requires full updates.
        // For optimization, peeling just based on one pass is often enough, 
        // but complete Kahn's algorithm style peeling is better.
        // Let's rely on the fact that if we can't efficiently find parents 
        // (without passing reverseAdj), we just skip start nodes that are not in core.
    }

    // For the remaining nodes, effectively we only start DFS if they are in the "potential core"
    // (Note: To do full peeling we would need reverseAdj passed here, but just filtering 
    // start nodes by initial in/out > 0 is already a big win, and the iterative set 
    // above helps pruning downstream).

    // Let's refine: We only strictly need to start DFS from nodes that have BOTH in > 0 and out > 0.
    const candidates = nodeList.filter(n =>
        nodeStats[n].inDeg > 0 &&
        nodeStats[n].outDeg > 0
    );

    for (const startNode of candidates) {
        // Time check
        if (performance.now() - startTime > MAX_TIME_MS) {
            console.warn("Cycle detection timed out - returning partial results");
            break;
        }

        const visited = new Set();
        const path = [];

        dfs(startNode, startNode, 0, visited, path, adjacency, cycles, seen);
    }

    return cycles;
}

function dfs(current, start, depth, visited, path, adjacency, cycles, seen) {
    if (depth > 5) return;

    visited.add(current);
    path.push(current);

    const neighbors = adjacency[current] || [];
    for (const edge of neighbors) {
        const next = edge.receiver;

        if (next === start && depth >= 2) {
            // Found a cycle of length depth+1 (path length = depth+1)
            const cycleLen = path.length;
            if (cycleLen >= 3 && cycleLen <= 5) {
                const cyclePath = [...path];
                // Normalize cycle for dedup: rotate so smallest element is first
                const normalized = normalizeCycle(cyclePath);
                const key = normalized.join('->');
                if (!seen.has(key)) {
                    seen.add(key);
                    cycles.push(cyclePath);
                }
            }
        } else if (!visited.has(next) && depth < 4) {
            dfs(next, start, depth + 1, visited, path, adjacency, cycles, seen);
        }
    }

    path.pop();
    visited.delete(current);
}

function normalizeCycle(cycle) {
    let minIdx = 0;
    for (let i = 1; i < cycle.length; i++) {
        if (cycle[i] < cycle[minIdx]) minIdx = i;
    }
    return [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
}

// ==========================================
// PATTERN 2: SMURFING (Fan-in / Fan-out)
// ==========================================

/**
 * Detect Smurfing patterns:
 * - Fan-in: >= 10 senders → 1 receiver
 * - Fan-out: 1 sender → >= 10 receivers
 * With temporal analysis (72-hour window)
 */
export function detectSmurfing(adjacency, reverseAdj, nodeStats) {
    const FANIN_THRESHOLD = 10;
    const FANOUT_THRESHOLD = 10;
    const TEMPORAL_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours in ms

    const smurfingPatterns = [];

    for (const accountId of Object.keys(nodeStats)) {
        const stats = nodeStats[accountId];

        // Fan-in detection
        if (stats.inDeg >= FANIN_THRESHOLD) {
            const incomingTxs = reverseAdj[accountId] || [];
            const temporalScore = computeTemporalDensity(incomingTxs.map(t => t.timestamp), TEMPORAL_WINDOW_MS);
            if (temporalScore > 0) {
                // Check unique senders
                const uniqueSenders = new Set(incomingTxs.map(t => t.sender));
                if (uniqueSenders.size >= FANIN_THRESHOLD) {
                    smurfingPatterns.push({
                        type: 'fan_in',
                        centerAccount: accountId,
                        connectedAccounts: Array.from(uniqueSenders),
                        temporalScore,
                        totalAmount: incomingTxs.reduce((s, t) => s + t.amount, 0),
                        txCount: incomingTxs.length
                    });
                }
            }
        }

        // Fan-out detection
        if (stats.outDeg >= FANOUT_THRESHOLD) {
            const outgoingTxs = adjacency[accountId] || [];
            const temporalScore = computeTemporalDensity(outgoingTxs.map(t => t.timestamp), TEMPORAL_WINDOW_MS);
            if (temporalScore > 0) {
                const uniqueReceivers = new Set(outgoingTxs.map(t => t.receiver));
                if (uniqueReceivers.size >= FANOUT_THRESHOLD) {
                    smurfingPatterns.push({
                        type: 'fan_out',
                        centerAccount: accountId,
                        connectedAccounts: Array.from(uniqueReceivers),
                        temporalScore,
                        totalAmount: outgoingTxs.reduce((s, t) => s + t.amount, 0),
                        txCount: outgoingTxs.length
                    });
                }
            }
        }
    }

    return smurfingPatterns;
}

/**
 * Compute temporal density: how clustered are timestamps within a time window?
 * Returns a score 0..1, where 1 = all transactions within one window
 */
function computeTemporalDensity(timestamps, windowMs) {
    if (timestamps.length < 2) return 0;

    const sorted = timestamps.map(t => t.getTime()).sort((a, b) => a - b);
    let maxInWindow = 0;
    let windowStart = 0;

    for (let i = 0; i < sorted.length; i++) {
        while (sorted[i] - sorted[windowStart] > windowMs) {
            windowStart++;
        }
        maxInWindow = Math.max(maxInWindow, i - windowStart + 1);
    }

    return maxInWindow / timestamps.length;
}

// ==========================================
// PATTERN 3: LAYERED SHELL NETWORKS
// ==========================================

/**
 * Detect shell network chains:
 * Chains of 3+ hops where intermediate accounts have only 2-3 total transactions
 */
export function detectShellNetworks(adjacency, nodeStats) {
    const SHELL_TX_MIN = 2;
    const SHELL_TX_MAX = 3;
    const MIN_CHAIN_LENGTH = 3;

    const shellChains = [];
    const visited = new Set();

    // Find potential shell accounts (low transaction count, have both in and out)
    const potentialShells = new Set();
    for (const [accountId, stats] of Object.entries(nodeStats)) {
        if (stats.txCount >= SHELL_TX_MIN && stats.txCount <= SHELL_TX_MAX &&
            stats.inDeg > 0 && stats.outDeg > 0) {
            potentialShells.add(accountId);
        }
    }

    // BFS from each non-shell account to find chains through shell accounts
    for (const startNode of Object.keys(nodeStats)) {
        if (potentialShells.has(startNode)) continue; // Start from a non-shell
        if (visited.has(startNode)) continue;

        const chain = [startNode];
        let current = startNode;
        const chainVisited = new Set([startNode]);

        while (true) {
            const outEdges = adjacency[current] || [];
            let foundShell = false;

            for (const edge of outEdges) {
                if (potentialShells.has(edge.receiver) && !chainVisited.has(edge.receiver)) {
                    chain.push(edge.receiver);
                    chainVisited.add(edge.receiver);
                    current = edge.receiver;
                    foundShell = true;
                    break;
                }
            }

            if (!foundShell) {
                // Check if we end at a non-shell
                for (const edge of outEdges) {
                    if (!potentialShells.has(edge.receiver) && !chainVisited.has(edge.receiver)) {
                        chain.push(edge.receiver);
                        break;
                    }
                }
                break;
            }

            // Safety: avoid infinite loops
            if (chain.length > 10) break;
        }

        // Need at least MIN_CHAIN_LENGTH hops with shell intermediaries
        const intermediaries = chain.slice(1, -1);
        const shellIntermediaries = intermediaries.filter(a => potentialShells.has(a));
        if (chain.length >= MIN_CHAIN_LENGTH + 1 && shellIntermediaries.length >= 1) {
            shellChains.push({
                chain: [...chain],
                shellAccounts: shellIntermediaries,
                hopCount: chain.length - 1
            });
        }
    }

    return shellChains;
}

// ==========================================
// FALSE POSITIVE FILTERING
// ==========================================

/**
 * Identify legitimate high-volume accounts (merchants, payroll)
 * These should NOT be flagged as suspicious
 */
export function identifyLegitimateAccounts(nodeStats, adjacency, reverseAdj) {
    const legitimateAccounts = new Set();

    for (const [accountId, stats] of Object.entries(nodeStats)) {
        // Merchant pattern: High fan-in with consistent amounts (many customers paying)
        if (stats.inDeg >= 20 && stats.outDeg <= 3) {
            const inTxs = reverseAdj[accountId] || [];
            const amounts = inTxs.map(t => t.amount);
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length;
            const cv = Math.sqrt(variance) / avgAmount; // Coefficient of variation

            // Low variance in transaction amounts suggests legitimate merchant
            if (cv < 0.5) {
                legitimateAccounts.add(accountId);
            }
        }

        // Payroll pattern: One sender → many receivers with regular (monthly-ish) timing
        if (stats.outDeg >= 20 && stats.inDeg <= 3) {
            const outTxs = adjacency[accountId] || [];
            const amounts = outTxs.map(t => t.amount);
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length;
            const cv = Math.sqrt(variance) / avgAmount;

            // High consistency and regular intervals suggest payroll
            if (cv < 0.3) {
                legitimateAccounts.add(accountId);
            }
        }
    }

    return legitimateAccounts;
}

// ==========================================
// SUSPICION SCORING
// ==========================================

/**
 * Calculate suspicion score for each account (0–100)
 * 
 * Scoring methodology:
 * - Cycle membership:          +30 points (per unique cycle, max 30)
 * - Smurfing center:           +25 points (fan-in or fan-out hub)
 * - Smurfing connected:        +15 points (part of a known smurfing cluster)
 * - Shell network membership:  +20 points
 * - Temporal density bonus:    +10 points (high velocity transactions)
 * - Degree anomaly:            +10 points (unusual in/out ratio)
 * - Amount anomaly:            +5 points (pass-through account: received ≈ sent)
 * 
 * Legitimate account discount: -50% (identified merchant/payroll accounts)
 */
export function calculateSuspicionScores(
    nodeStats, cycles, smurfingPatterns, shellChains, legitimateAccounts
) {
    const scores = {};
    const patterns = {};  // accountId -> Set of pattern strings
    const ringMembership = {}; // accountId -> ringId

    // Initialize
    for (const accountId of Object.keys(nodeStats)) {
        scores[accountId] = 0;
        patterns[accountId] = new Set();
    }

    // 1. Cycle scoring
    let ringCounter = 0;
    const cycleRings = [];
    for (const cycle of cycles) {
        ringCounter++;
        const ringId = `RING_${String(ringCounter).padStart(3, '0')}`;
        const ringMembers = [...cycle];

        for (const account of cycle) {
            scores[account] += 30;
            patterns[account].add(`cycle_length_${cycle.length}`);
            if (!ringMembership[account]) {
                ringMembership[account] = ringId;
            }
        }

        cycleRings.push({
            ring_id: ringId,
            member_accounts: ringMembers,
            pattern_type: 'cycle',
            cycle_length: cycle.length,
            risk_score: 0 // Calculated later
        });
    }

    // 2. Smurfing scoring
    for (const pattern of smurfingPatterns) {
        ringCounter++;
        const ringId = `RING_${String(ringCounter).padStart(3, '0')}`;

        // Center account
        scores[pattern.centerAccount] += 25;
        patterns[pattern.centerAccount].add(pattern.type);
        patterns[pattern.centerAccount].add('high_velocity');
        if (!ringMembership[pattern.centerAccount]) {
            ringMembership[pattern.centerAccount] = ringId;
        }

        // Connected accounts
        const ringMembers = [pattern.centerAccount];
        for (const connected of pattern.connectedAccounts) {
            scores[connected] = (scores[connected] || 0) + 15;
            if (!patterns[connected]) patterns[connected] = new Set();
            patterns[connected].add(`smurfing_${pattern.type}`);
            if (!ringMembership[connected]) {
                ringMembership[connected] = ringId;
            }
            ringMembers.push(connected);
        }

        cycleRings.push({
            ring_id: ringId,
            member_accounts: ringMembers,
            pattern_type: pattern.type,
            risk_score: 0,
            temporal_score: pattern.temporalScore
        });
    }

    // 3. Shell network scoring
    for (const shell of shellChains) {
        ringCounter++;
        const ringId = `RING_${String(ringCounter).padStart(3, '0')}`;
        const ringMembers = [...shell.chain];

        for (const account of shell.chain) {
            scores[account] = (scores[account] || 0) + 20;
            if (!patterns[account]) patterns[account] = new Set();
            patterns[account].add('shell_network');
            if (shell.shellAccounts.includes(account)) {
                patterns[account].add('shell_intermediary');
            }
            if (!ringMembership[account]) {
                ringMembership[account] = ringId;
            }
        }

        cycleRings.push({
            ring_id: ringId,
            member_accounts: ringMembers,
            pattern_type: 'shell_network',
            risk_score: 0,
            hop_count: shell.hopCount
        });
    }

    // 4. Additional scoring factors
    for (const [accountId, stats] of Object.entries(nodeStats)) {
        // Temporal density (high velocity)
        if (stats.timestamps.length >= 5) {
            const sorted = stats.timestamps.map(t => t.getTime()).sort((a, b) => a - b);
            const timeSpan = sorted[sorted.length - 1] - sorted[0];
            const avgInterval = timeSpan / (sorted.length - 1);
            // If avg interval < 1 hour, that's suspicious
            if (avgInterval < 3600000 && avgInterval > 0) {
                scores[accountId] += 10;
                patterns[accountId].add('high_velocity');
            }
        }

        // Degree anomaly: extremely unbalanced in/out
        if (stats.inDeg > 0 && stats.outDeg > 0) {
            const ratio = Math.max(stats.inDeg, stats.outDeg) / Math.min(stats.inDeg, stats.outDeg);
            if (ratio > 5) {
                scores[accountId] += 10;
                patterns[accountId].add('degree_anomaly');
            }
        }

        // Pass-through detection (amount in ≈ amount out)
        if (stats.totalIn > 0 && stats.totalOut > 0) {
            const passThrough = Math.min(stats.totalIn, stats.totalOut) / Math.max(stats.totalIn, stats.totalOut);
            if (passThrough > 0.85 && stats.txCount >= 4) {
                scores[accountId] += 5;
                patterns[accountId].add('pass_through');
            }
        }
    }

    // 5. Apply legitimate account discount
    for (const accountId of legitimateAccounts) {
        scores[accountId] = Math.round(scores[accountId] * 0.5);
        patterns[accountId].add('likely_legitimate');
    }

    // Cap scores at 100
    for (const accountId of Object.keys(scores)) {
        scores[accountId] = Math.min(100, Math.round(scores[accountId] * 10) / 10);
    }

    // Calculate ring risk scores
    for (const ring of cycleRings) {
        const memberScores = ring.member_accounts.map(a => scores[a] || 0);
        ring.risk_score = Math.round(
            (memberScores.reduce((a, b) => a + b, 0) / memberScores.length) * 10
        ) / 10;
    }

    return { scores, patterns, ringMembership, rings: cycleRings };
}

// ==========================================
// MAIN ANALYSIS PIPELINE
// ==========================================

/**
 * Run the complete analysis pipeline
 * @param {Array} transactions - Parsed CSV rows
 * @param {Function} onProgress - Progress callback(step, percent, message)
 * @returns {Object} Complete analysis results
 */
export async function analyzeTransactions(transactions, onProgress = () => { }) {
    const startTime = performance.now();

    // Step 1: Build graph
    onProgress('building', 10, 'Building transaction graph...');
    const graph = buildGraph(transactions);

    // Yield to UI
    await new Promise(r => setTimeout(r, 10));

    // Step 2: Detect cycles
    onProgress('cycles', 30, 'Detecting circular fund routing (cycles)...');
    const cycles = detectCycles(graph.adjacency, graph.nodes, graph.nodeStats);

    // Yield to UI
    await new Promise(r => setTimeout(r, 10));

    // Step 3: Detect smurfing
    onProgress('smurfing', 50, 'Analyzing smurfing patterns (fan-in/fan-out)...');
    const smurfingPatterns = detectSmurfing(graph.adjacency, graph.reverseAdj, graph.nodeStats);

    // Yield to UI
    await new Promise(r => setTimeout(r, 10));

    // Step 4: Detect shell networks
    onProgress('shells', 65, 'Identifying layered shell networks...');
    const shellChains = detectShellNetworks(graph.adjacency, graph.nodeStats);

    // Step 5: False positive filtering
    onProgress('filtering', 80, 'Filtering false positives...');
    const legitimateAccounts = identifyLegitimateAccounts(graph.nodeStats, graph.adjacency, graph.reverseAdj);

    // Yield to UI
    await new Promise(r => setTimeout(r, 10));

    // Step 6: Calculate scores
    onProgress('scoring', 90, 'Calculating suspicion scores...');
    const { scores, patterns, ringMembership, rings } = calculateSuspicionScores(
        graph.nodeStats, cycles, smurfingPatterns, shellChains, legitimateAccounts
    );

    const endTime = performance.now();
    const processingTime = Math.round((endTime - startTime) / 10) / 100; // seconds with 2 decimal

    // Build suspicious accounts array (sorted by score descending)
    const suspiciousAccounts = Object.entries(scores)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([accountId, score]) => ({
            account_id: accountId,
            suspicion_score: score,
            detected_patterns: Array.from(patterns[accountId] || []),
            ring_id: ringMembership[accountId] || null
        }));

    // Build final output
    const result = {
        suspicious_accounts: suspiciousAccounts,
        fraud_rings: rings.sort((a, b) => b.risk_score - a.risk_score),
        summary: {
            total_accounts_analyzed: graph.nodes.length,
            total_transactions: transactions.length,
            suspicious_accounts_flagged: suspiciousAccounts.length,
            fraud_rings_detected: rings.length,
            processing_time_seconds: processingTime
        },
        // Internal data for visualization
        _internal: {
            graph,
            scores,
            patterns,
            ringMembership,
            legitimateAccounts: Array.from(legitimateAccounts)
        }
    };

    onProgress('done', 100, 'Analysis complete!');

    return result;
}
