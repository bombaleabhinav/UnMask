from __future__ import annotations

"""
ForensicFlow — Graph-Based Financial Crime Detection Engine
Core Graph Analysis Module (Python/FastAPI port)

Implements:
1. Circular Fund Routing (Cycle detection, length 3–5)
2. Smurfing Patterns (Fan-in / Fan-out with temporal analysis)
3. Layered Shell Networks (Low-degree intermediary chains)
4. Suspicion Scoring System
"""

import time
import math
import csv
import io
from collections import defaultdict
from datetime import datetime
from typing import Any


# ==============================================
# DATA STRUCTURES
# ==============================================

def build_graph(transactions: list[dict]) -> dict:
    """Build adjacency list graph from parsed transactions."""
    adjacency: dict[str, list] = defaultdict(list)
    reverse_adj: dict[str, list] = defaultdict(list)
    nodes: set[str] = set()
    node_stats: dict[str, dict] = {}

    for tx in transactions:
        sender = tx["sender_id"]
        receiver = tx["receiver_id"]
        amount = float(tx["amount"])
        ts = datetime.strptime(tx["timestamp"].strip(), "%Y-%m-%d %H:%M:%S")
        tx_id = tx["transaction_id"]

        nodes.add(sender)
        nodes.add(receiver)

        adjacency[sender].append({
            "receiver": receiver,
            "amount": amount,
            "timestamp": ts,
            "txId": tx_id,
        })

        reverse_adj[receiver].append({
            "sender": sender,
            "amount": amount,
            "timestamp": ts,
            "txId": tx_id,
        })

        for account_id in (sender, receiver):
            if account_id not in node_stats:
                node_stats[account_id] = {
                    "inDeg": 0, "outDeg": 0,
                    "totalIn": 0.0, "totalOut": 0.0,
                    "txCount": 0, "timestamps": [],
                }

        node_stats[sender]["outDeg"] += 1
        node_stats[sender]["totalOut"] += amount
        node_stats[sender]["txCount"] += 1
        node_stats[sender]["timestamps"].append(ts)

        node_stats[receiver]["inDeg"] += 1
        node_stats[receiver]["totalIn"] += amount
        node_stats[receiver]["txCount"] += 1
        node_stats[receiver]["timestamps"].append(ts)

    return {
        "adjacency": dict(adjacency),
        "reverseAdj": dict(reverse_adj),
        "nodes": list(nodes),
        "nodeStats": node_stats,
    }


# ==============================================
# PATTERN 1: CYCLE DETECTION (Length 3–5)
# ==============================================

def detect_cycles(adjacency: dict, node_list: list[str], node_stats: dict) -> list[list[str]]:
    """Detect cycles of length 3-5 using DFS with pruning."""
    cycles: list[list[str]] = []
    seen: set[str] = set()
    start_time = time.perf_counter()
    MAX_TIME_S = 5.0

    # Only consider nodes with both in > 0 and out > 0
    candidates = [
        n for n in node_list
        if node_stats[n]["inDeg"] > 0 and node_stats[n]["outDeg"] > 0
    ]

    for start_node in candidates:
        if time.perf_counter() - start_time > MAX_TIME_S:
            break
        visited: set[str] = set()
        path: list[str] = []
        _dfs(start_node, start_node, 0, visited, path, adjacency, cycles, seen)

    return cycles


def _dfs(current, start, depth, visited, path, adjacency, cycles, seen):
    if depth > 5:
        return
    visited.add(current)
    path.append(current)

    for edge in adjacency.get(current, []):
        nxt = edge["receiver"]
        if nxt == start and depth >= 2:
            cycle_len = len(path)
            if 3 <= cycle_len <= 5:
                cycle_path = list(path)
                norm = _normalize_cycle(cycle_path)
                key = "->".join(norm)
                if key not in seen:
                    seen.add(key)
                    cycles.append(cycle_path)
        elif nxt not in visited and depth < 4:
            _dfs(nxt, start, depth + 1, visited, path, adjacency, cycles, seen)

    path.pop()
    visited.discard(current)


def _normalize_cycle(cycle: list[str]) -> list[str]:
    min_idx = 0
    for i in range(1, len(cycle)):
        if cycle[i] < cycle[min_idx]:
            min_idx = i
    return cycle[min_idx:] + cycle[:min_idx]


# ==============================================
# PATTERN 2: SMURFING (Fan-in / Fan-out)
# ==============================================

def detect_smurfing(adjacency: dict, reverse_adj: dict, node_stats: dict) -> list[dict]:
    FANIN_THRESHOLD = 10
    FANOUT_THRESHOLD = 10
    TEMPORAL_WINDOW_S = 72 * 3600  # 72 hours

    patterns = []

    for account_id, stats in node_stats.items():
        # Fan-in
        if stats["inDeg"] >= FANIN_THRESHOLD:
            incoming = reverse_adj.get(account_id, [])
            temporal_score = _compute_temporal_density(
                [t["timestamp"] for t in incoming], TEMPORAL_WINDOW_S
            )
            if temporal_score > 0:
                unique_senders = set(t["sender"] for t in incoming)
                if len(unique_senders) >= FANIN_THRESHOLD:
                    patterns.append({
                        "type": "fan_in",
                        "centerAccount": account_id,
                        "connectedAccounts": list(unique_senders),
                        "temporalScore": temporal_score,
                        "totalAmount": sum(t["amount"] for t in incoming),
                        "txCount": len(incoming),
                    })

        # Fan-out
        if stats["outDeg"] >= FANOUT_THRESHOLD:
            outgoing = adjacency.get(account_id, [])
            temporal_score = _compute_temporal_density(
                [t["timestamp"] for t in outgoing], TEMPORAL_WINDOW_S
            )
            if temporal_score > 0:
                unique_receivers = set(t["receiver"] for t in outgoing)
                if len(unique_receivers) >= FANOUT_THRESHOLD:
                    patterns.append({
                        "type": "fan_out",
                        "centerAccount": account_id,
                        "connectedAccounts": list(unique_receivers),
                        "temporalScore": temporal_score,
                        "totalAmount": sum(t["amount"] for t in outgoing),
                        "txCount": len(outgoing),
                    })

    return patterns


def _compute_temporal_density(timestamps: list[datetime], window_s: float) -> float:
    if len(timestamps) < 2:
        return 0.0
    epoch_vals = sorted(t.timestamp() for t in timestamps)
    max_in_window = 0
    win_start = 0
    for i in range(len(epoch_vals)):
        while epoch_vals[i] - epoch_vals[win_start] > window_s:
            win_start += 1
        max_in_window = max(max_in_window, i - win_start + 1)
    return max_in_window / len(timestamps)


# ==============================================
# PATTERN 3: LAYERED SHELL NETWORKS
# ==============================================

def detect_shell_networks(adjacency: dict, node_stats: dict) -> list[dict]:
    SHELL_TX_MIN = 2
    SHELL_TX_MAX = 3
    MIN_CHAIN_LENGTH = 3

    potential_shells: set[str] = set()
    for account_id, stats in node_stats.items():
        if (SHELL_TX_MIN <= stats["txCount"] <= SHELL_TX_MAX
                and stats["inDeg"] > 0 and stats["outDeg"] > 0):
            potential_shells.add(account_id)

    shell_chains: list[dict] = []
    visited: set[str] = set()

    for start_node in node_stats:
        if start_node in potential_shells:
            continue
        if start_node in visited:
            continue

        chain = [start_node]
        current = start_node
        chain_visited = {start_node}

        while True:
            out_edges = adjacency.get(current, [])
            found_shell = False
            for edge in out_edges:
                if edge["receiver"] in potential_shells and edge["receiver"] not in chain_visited:
                    chain.append(edge["receiver"])
                    chain_visited.add(edge["receiver"])
                    current = edge["receiver"]
                    found_shell = True
                    break

            if not found_shell:
                for edge in out_edges:
                    if edge["receiver"] not in potential_shells and edge["receiver"] not in chain_visited:
                        chain.append(edge["receiver"])
                        break
                break

            if len(chain) > 10:
                break

        intermediaries = chain[1:-1]
        shell_intermediaries = [a for a in intermediaries if a in potential_shells]
        if len(chain) >= MIN_CHAIN_LENGTH + 1 and len(shell_intermediaries) >= 1:
            shell_chains.append({
                "chain": list(chain),
                "shellAccounts": shell_intermediaries,
                "hopCount": len(chain) - 1,
            })

    return shell_chains


# ==============================================
# FALSE POSITIVE FILTERING
# ==============================================

def identify_legitimate_accounts(node_stats: dict, adjacency: dict, reverse_adj: dict) -> set[str]:
    legitimate: set[str] = set()

    for account_id, stats in node_stats.items():
        # Merchant pattern
        if stats["inDeg"] >= 20 and stats["outDeg"] <= 3:
            amounts = [t["amount"] for t in reverse_adj.get(account_id, [])]
            if amounts:
                avg = sum(amounts) / len(amounts)
                if avg > 0:
                    var = sum((a - avg) ** 2 for a in amounts) / len(amounts)
                    cv = math.sqrt(var) / avg
                    if cv < 0.5:
                        legitimate.add(account_id)

        # Payroll pattern
        if stats["outDeg"] >= 20 and stats["inDeg"] <= 3:
            amounts = [t["amount"] for t in adjacency.get(account_id, [])]
            if amounts:
                avg = sum(amounts) / len(amounts)
                if avg > 0:
                    var = sum((a - avg) ** 2 for a in amounts) / len(amounts)
                    cv = math.sqrt(var) / avg
                    if cv < 0.3:
                        legitimate.add(account_id)

    return legitimate


# ==============================================
# SUSPICION SCORING
# ==============================================

def calculate_suspicion_scores(
    node_stats: dict,
    cycles: list[list[str]],
    smurfing_patterns: list[dict],
    shell_chains: list[dict],
    legitimate_accounts: set[str],
) -> dict:
    scores: dict[str, float] = {}
    patterns: dict[str, set] = {}
    ring_membership: dict[str, str] = {}

    for account_id in node_stats:
        scores[account_id] = 0
        patterns[account_id] = set()

    ring_counter = 0
    cycle_rings: list[dict] = []

    # 1. Cycle scoring
    for cycle in cycles:
        ring_counter += 1
        ring_id = f"RING_{ring_counter:03d}"
        for account in cycle:
            scores[account] += 30
            patterns[account].add(f"cycle_length_{len(cycle)}")
            if account not in ring_membership:
                ring_membership[account] = ring_id
        cycle_rings.append({
            "ring_id": ring_id,
            "member_accounts": list(cycle),
            "pattern_type": "cycle",
            "cycle_length": len(cycle),
            "risk_score": 0,
        })

    # 2. Smurfing scoring
    for pat in smurfing_patterns:
        ring_counter += 1
        ring_id = f"RING_{ring_counter:03d}"

        scores[pat["centerAccount"]] += 25
        patterns[pat["centerAccount"]].add(pat["type"])
        patterns[pat["centerAccount"]].add("high_velocity")
        if pat["centerAccount"] not in ring_membership:
            ring_membership[pat["centerAccount"]] = ring_id

        ring_members = [pat["centerAccount"]]
        for connected in pat["connectedAccounts"]:
            scores.setdefault(connected, 0)
            scores[connected] += 15
            patterns.setdefault(connected, set())
            patterns[connected].add(f"smurfing_{pat['type']}")
            if connected not in ring_membership:
                ring_membership[connected] = ring_id
            ring_members.append(connected)

        cycle_rings.append({
            "ring_id": ring_id,
            "member_accounts": ring_members,
            "pattern_type": pat["type"],
            "risk_score": 0,
            "temporal_score": pat["temporalScore"],
        })

    # 3. Shell network scoring
    for shell in shell_chains:
        ring_counter += 1
        ring_id = f"RING_{ring_counter:03d}"
        for account in shell["chain"]:
            scores.setdefault(account, 0)
            scores[account] += 20
            patterns.setdefault(account, set())
            patterns[account].add("shell_network")
            if account in shell["shellAccounts"]:
                patterns[account].add("shell_intermediary")
            if account not in ring_membership:
                ring_membership[account] = ring_id
        cycle_rings.append({
            "ring_id": ring_id,
            "member_accounts": list(shell["chain"]),
            "pattern_type": "shell_network",
            "risk_score": 0,
            "hop_count": shell["hopCount"],
        })

    # 4. Additional scoring
    for account_id, stats in node_stats.items():
        # High velocity
        if len(stats["timestamps"]) >= 5:
            epoch_vals = sorted(t.timestamp() for t in stats["timestamps"])
            time_span = epoch_vals[-1] - epoch_vals[0]
            avg_interval = time_span / (len(epoch_vals) - 1)
            if 0 < avg_interval < 3600:
                scores[account_id] += 10
                patterns[account_id].add("high_velocity")

        # Degree anomaly
        if stats["inDeg"] > 0 and stats["outDeg"] > 0:
            ratio = max(stats["inDeg"], stats["outDeg"]) / min(stats["inDeg"], stats["outDeg"])
            if ratio > 5:
                scores[account_id] += 10
                patterns[account_id].add("degree_anomaly")

        # Pass-through
        if stats["totalIn"] > 0 and stats["totalOut"] > 0:
            pass_through = min(stats["totalIn"], stats["totalOut"]) / max(stats["totalIn"], stats["totalOut"])
            if pass_through > 0.85 and stats["txCount"] >= 4:
                scores[account_id] += 5
                patterns[account_id].add("pass_through")

    # 5. Legitimate discount
    for account_id in legitimate_accounts:
        if account_id in scores:
            scores[account_id] = round(scores[account_id] * 0.5)
            patterns[account_id].add("likely_legitimate")

    # Cap at 100
    for account_id in scores:
        scores[account_id] = min(100, round(scores[account_id] * 10) / 10)

    # Ring risk scores
    for ring in cycle_rings:
        member_scores = [scores.get(a, 0) for a in ring["member_accounts"]]
        if member_scores:
            ring["risk_score"] = round(sum(member_scores) / len(member_scores) * 10) / 10

    return {
        "scores": scores,
        "patterns": {k: list(v) for k, v in patterns.items()},
        "ringMembership": ring_membership,
        "rings": cycle_rings,
    }


# ==============================================
# MAIN ANALYSIS PIPELINE
# ==============================================

def analyze_transactions(transactions: list[dict]) -> dict:
    """Run the complete analysis pipeline."""
    start_time = time.perf_counter()

    # Step 1: Build graph
    graph = build_graph(transactions)

    # Step 2: Detect cycles
    cycles = detect_cycles(graph["adjacency"], graph["nodes"], graph["nodeStats"])

    # Step 3: Detect smurfing
    smurfing_patterns = detect_smurfing(graph["adjacency"], graph["reverseAdj"], graph["nodeStats"])

    # Step 4: Detect shell networks
    shell_chains = detect_shell_networks(graph["adjacency"], graph["nodeStats"])

    # Step 5: False positive filtering
    legitimate_accounts = identify_legitimate_accounts(
        graph["nodeStats"], graph["adjacency"], graph["reverseAdj"]
    )

    # Step 6: Calculate scores
    result = calculate_suspicion_scores(
        graph["nodeStats"], cycles, smurfing_patterns, shell_chains, legitimate_accounts
    )

    end_time = time.perf_counter()
    processing_time = round((end_time - start_time) * 100) / 100

    # Build suspicious accounts array
    suspicious_accounts = sorted(
        [
            {
                "account_id": acc_id,
                "suspicion_score": score,
                "detected_patterns": result["patterns"].get(acc_id, []),
                "ring_id": result["ringMembership"].get(acc_id),
            }
            for acc_id, score in result["scores"].items()
            if score > 0
        ],
        key=lambda x: x["suspicion_score"],
        reverse=True,
    )

    fraud_rings = sorted(result["rings"], key=lambda x: x["risk_score"], reverse=True)

    # Build graph_data for frontend visualization
    graph_data = _build_graph_data_for_frontend(
        graph, result["scores"], result["patterns"],
        result["ringMembership"], suspicious_accounts, fraud_rings
    )

    return {
        "suspicious_accounts": suspicious_accounts,
        "fraud_rings": fraud_rings,
        "summary": {
            "total_accounts_analyzed": len(graph["nodes"]),
            "total_transactions": len(transactions),
            "suspicious_accounts_flagged": len(suspicious_accounts),
            "fraud_rings_detected": len(fraud_rings),
            "processing_time_seconds": processing_time,
        },
        "graph_data": graph_data,
    }


def _build_graph_data_for_frontend(
    graph: dict, scores: dict, patterns: dict,
    ring_membership: dict, suspicious_accounts: list, fraud_rings: list,
) -> dict:
    """Build lightweight graph data for Cytoscape visualization on frontend."""
    suspicious_set = set(a["account_id"] for a in suspicious_accounts)
    ring_member_set = set()
    for ring in fraud_rings:
        for m in ring["member_accounts"]:
            ring_member_set.add(m)

    # Smart filtering for large graphs
    MAX_NODES = 500
    all_nodes = graph["nodes"]
    is_large = len(all_nodes) > MAX_NODES

    nodes_to_render = set()
    if is_large:
        for nid in all_nodes:
            if nid in suspicious_set or nid in ring_member_set:
                nodes_to_render.add(nid)
            else:
                stats = graph["nodeStats"][nid]
                if stats["inDeg"] + stats["outDeg"] > 50:
                    nodes_to_render.add(nid)
        # Context: neighbors of high-risk
        for acc in suspicious_accounts:
            if acc["suspicion_score"] >= 40:
                for e in graph["adjacency"].get(acc["account_id"], []):
                    if len(nodes_to_render) < 1000:
                        nodes_to_render.add(e["receiver"])
                for e in graph["reverseAdj"].get(acc["account_id"], []):
                    if len(nodes_to_render) < 1000:
                        nodes_to_render.add(e["sender"])
    else:
        nodes_to_render = set(all_nodes)

    cy_nodes = []
    for nid in nodes_to_render:
        stats = graph["nodeStats"][nid]
        score = scores.get(nid, 0)
        node_type = "normal"
        if nid in ring_member_set:
            node_type = "ring"
        elif nid in suspicious_set:
            node_type = "suspicious"

        total_volume = (stats["totalIn"] or 0) + (stats["totalOut"] or 0)
        size_val = min(50, 20 + math.log2(total_volume + 1) * 3)

        cy_nodes.append({
            "id": nid,
            "type": node_type,
            "score": score,
            "inDeg": stats["inDeg"],
            "outDeg": stats["outDeg"],
            "totalIn": round(stats["totalIn"], 2),
            "totalOut": round(stats["totalOut"], 2),
            "txCount": stats["txCount"],
            "ringId": ring_membership.get(nid),
            "patterns": patterns.get(nid, []),
            "sizeVal": round(size_val, 1),
        })

    # Aggregate edges
    edge_map: dict[str, dict] = {}
    for sender_id in graph["adjacency"]:
        if sender_id not in nodes_to_render:
            continue
        for edge in graph["adjacency"][sender_id]:
            if edge["receiver"] not in nodes_to_render:
                continue
            key = f"{sender_id}->{edge['receiver']}"
            if key not in edge_map:
                edge_map[key] = {"source": sender_id, "target": edge["receiver"], "totalAmount": 0, "txCount": 0}
            edge_map[key]["totalAmount"] += edge["amount"]
            edge_map[key]["txCount"] += 1

    cy_edges = []
    for key, e in edge_map.items():
        is_suspicious = (
            (e["source"] in suspicious_set and e["target"] in suspicious_set)
            or (e["source"] in ring_member_set and e["target"] in ring_member_set)
        )
        cy_edges.append({
            "id": key,
            "source": e["source"],
            "target": e["target"],
            "totalAmount": round(e["totalAmount"], 2),
            "txCount": e["txCount"],
            "suspicious": is_suspicious,
            "weight": round(max(1, min(5, math.log2(e["totalAmount"] + 1) * 0.5)), 2),
        })

    return {
        "nodes": cy_nodes,
        "edges": cy_edges,
        "totalNodes": len(all_nodes),
        "renderedNodes": len(nodes_to_render),
        "isFiltered": is_large,
    }


def parse_csv_content(content: str) -> list[dict]:
    """Parse CSV string into list of dicts."""
    reader = csv.DictReader(io.StringIO(content))
    return list(reader)
