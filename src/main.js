/**
 * ForensicFlow — Main Application Entry
 * Orchestrates CSV upload, analysis, visualization, and output generation
 */

import './style.css';
import Papa from 'papaparse';
import { analyzeTransactions } from './graphEngine.js';
import { renderGraph, destroyGraph } from './visualization.js';

// ==========================================
// STATE
// ==========================================
const ITEMS_PER_PAGE = 20;
let currentResult = null;
let ringsPage = 1;
let accountsPage = 1;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setupUpload();
    setupDownload();
    setupNewAnalysis();
});

// ==========================================
// CSV UPLOAD HANDLING
// ==========================================
function setupUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('csv-file-input');

    // Click to browse
    uploadZone.addEventListener('click', () => fileInput.click());

    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        alert('Please upload a CSV file.');
        return;
    }

    const uploadZone = document.getElementById('upload-zone');
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    // Show progress
    uploadZone.classList.add('hidden');
    progressDiv.classList.remove('hidden');
    progressBar.style.width = '5%';
    progressText.textContent = 'Parsing CSV file...';

    // Parse CSV
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const transactions = results.data;

            if (!transactions || transactions.length === 0) {
                alert('No valid transactions found in the CSV.');
                resetUpload();
                return;
            }

            // Validate columns
            const requiredColumns = ['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp'];
            const headers = Object.keys(transactions[0]);
            const missing = requiredColumns.filter(col => !headers.includes(col));
            if (missing.length > 0) {
                alert(`Missing required columns: ${missing.join(', ')}\n\nExpected: ${requiredColumns.join(', ')}`);
                resetUpload();
                return;
            }

            progressBar.style.width = '15%';
            progressText.textContent = `Loaded ${transactions.length.toLocaleString()} transactions. Starting analysis...`;

            // Run analysis with progress updates (use setTimeout to allow UI updates)
            setTimeout(async () => {
                try {
                    const result = await analyzeTransactions(transactions, (step, percent, message) => {
                        progressBar.style.width = `${percent}%`;
                        progressText.textContent = message;
                    });

                    currentResult = result;

                    // Small delay so user sees "Analysis complete!" 
                    setTimeout(() => {
                        displayResults(result);
                    }, 500);
                } catch (err) {
                    console.error('Analysis error:', err);
                    alert('Error during analysis: ' + err.message);
                    resetUpload();
                }
            }, 100);
        },
        error: (err) => {
            console.error('CSV parse error:', err);
            alert('Error parsing CSV file: ' + err.message);
            resetUpload();
        }
    });
}

function resetUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const fileInput = document.getElementById('csv-file-input');

    uploadZone.classList.remove('hidden');
    progressDiv.classList.add('hidden');
    progressBar.style.width = '0%';
    fileInput.value = '';
}

// ==========================================
// RESULTS DISPLAY
// ==========================================
function displayResults(result) {
    // Hide hero, show results
    document.getElementById('hero-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');

    // Populate stats
    populateStats(result.summary);

    // Render graph
    renderGraph(result);

    // Reset pagination
    ringsPage = 1;
    accountsPage = 1;

    // Render first pages
    renderRingsPage();
    renderAccountsPage();

    // Setup pagination listeners if not already
    setupPaginationListeners();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupPaginationListeners() {
    // Rings Pagination
    const prevRingsBtn = document.getElementById('btn-rings-prev');
    const nextRingsBtn = document.getElementById('btn-rings-next');

    // Remove old listeners to avoid duplicates (naive approach, better to just set once)
    const newPrevRings = prevRingsBtn.cloneNode(true);
    const newNextRings = nextRingsBtn.cloneNode(true);
    prevRingsBtn.parentNode.replaceChild(newPrevRings, prevRingsBtn);
    nextRingsBtn.parentNode.replaceChild(newNextRings, nextRingsBtn);

    newPrevRings.addEventListener('click', () => {
        if (ringsPage > 1) {
            ringsPage--;
            renderRingsPage();
        }
    });

    newNextRings.addEventListener('click', () => {
        const maxPage = Math.ceil(currentResult.fraud_rings.length / ITEMS_PER_PAGE);
        if (ringsPage < maxPage) {
            ringsPage++;
            renderRingsPage();
        }
    });

    // Accounts Pagination
    const prevAccBtn = document.getElementById('btn-accounts-prev');
    const nextAccBtn = document.getElementById('btn-accounts-next');

    const newPrevAcc = prevAccBtn.cloneNode(true);
    const newNextAcc = nextAccBtn.cloneNode(true);
    prevAccBtn.parentNode.replaceChild(newPrevAcc, prevAccBtn);
    nextAccBtn.parentNode.replaceChild(newNextAcc, nextAccBtn);

    newPrevAcc.addEventListener('click', () => {
        if (accountsPage > 1) {
            accountsPage--;
            renderAccountsPage();
        }
    });

    newNextAcc.addEventListener('click', () => {
        const maxPage = Math.ceil(currentResult.suspicious_accounts.length / ITEMS_PER_PAGE);
        if (accountsPage < maxPage) {
            accountsPage++;
            renderAccountsPage();
        }
    });
}

function renderRingsPage() {
    if (!currentResult || !currentResult.fraud_rings) return;

    const rings = currentResult.fraud_rings;
    const totalPages = Math.ceil(rings.length / ITEMS_PER_PAGE);

    // Update controls
    document.getElementById('rings-page-info').textContent = `Page ${ringsPage} of ${totalPages || 1}`;
    document.getElementById('btn-rings-prev').disabled = ringsPage === 1;
    document.getElementById('btn-rings-next').disabled = ringsPage >= totalPages;

    // Slice data
    const start = (ringsPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = rings.slice(start, end);

    populateRingsTable(pageData);
}

function renderAccountsPage() {
    if (!currentResult || !currentResult.suspicious_accounts) return;

    const accounts = currentResult.suspicious_accounts;
    const totalPages = Math.ceil(accounts.length / ITEMS_PER_PAGE);

    // Update controls
    document.getElementById('accounts-page-info').textContent = `Page ${accountsPage} of ${totalPages || 1}`;
    document.getElementById('btn-accounts-prev').disabled = accountsPage === 1;
    document.getElementById('btn-accounts-next').disabled = accountsPage >= totalPages;

    // Slice data
    const start = (accountsPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = accounts.slice(start, end);

    populateAccountsTable(pageData);
}

function populateStats(summary) {
    animateCounter('stat-total-val', summary.total_accounts_analyzed);
    animateCounter('stat-suspicious-val', summary.suspicious_accounts_flagged);
    animateCounter('stat-rings-val', summary.fraud_rings_detected);
    animateCounter('stat-transactions-val', summary.total_transactions || summary.total_accounts_analyzed);

    document.getElementById('stat-time-val').textContent = `${summary.processing_time_seconds}s`;
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    const duration = 1000;
    const start = performance.now();
    const startVal = 0;

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startVal + (target - startVal) * eased);
        el.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function populateRingsTable(rings) {
    const tbody = document.getElementById('rings-table-body');
    tbody.innerHTML = '';

    if (rings.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
          No fraud rings detected in this dataset.
        </td>
      </tr>
    `;
        return;
    }

    for (const ring of rings) {
        const tr = document.createElement('tr');

        // Score color class
        let scoreClass = 'score-low';
        if (ring.risk_score >= 70) scoreClass = 'score-high';
        else if (ring.risk_score >= 40) scoreClass = 'score-medium';

        // Pattern tag
        const patternLabel = formatPatternType(ring.pattern_type);

        tr.innerHTML = `
      <td>${ring.ring_id}</td>
      <td><span class="pattern-tag">${patternLabel}</span></td>
      <td>${ring.member_accounts.length}</td>
      <td>
        <div class="score-bar">
          <span class="${scoreClass}">${ring.risk_score.toFixed(1)}</span>
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width: ${ring.risk_score}%; background: ${getScoreGradient(ring.risk_score)};"></div>
          </div>
        </div>
      </td>
      <td class="member-accounts">${ring.member_accounts.join(', ')}</td>
    `;

        tbody.appendChild(tr);
    }
}

function populateAccountsTable(accounts) {
    const tbody = document.getElementById('accounts-table-body');
    tbody.innerHTML = '';

    if (accounts.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px;">
          No suspicious accounts detected.
        </td>
      </tr>
    `;
        return;
    }

    for (const account of accounts) {
        const tr = document.createElement('tr');

        let scoreClass = 'score-low';
        if (account.suspicion_score >= 70) scoreClass = 'score-high';
        else if (account.suspicion_score >= 40) scoreClass = 'score-medium';

        const patternTags = account.detected_patterns
            .map(p => `<span class="pattern-tag">${p}</span>`)
            .join('');

        tr.innerHTML = `
      <td>${account.account_id}</td>
      <td>
        <div class="score-bar">
          <span class="${scoreClass}">${account.suspicion_score.toFixed(1)}</span>
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width: ${account.suspicion_score}%; background: ${getScoreGradient(account.suspicion_score)};"></div>
          </div>
        </div>
      </td>
      <td>${patternTags}</td>
      <td style="font-family: var(--font-mono); color: var(--accent-cyan);">${account.ring_id || '—'}</td>
    `;

        tbody.appendChild(tr);
    }
}

function formatPatternType(type) {
    const labels = {
        'cycle': '🔄 Cycle',
        'fan_in': '📥 Fan-In',
        'fan_out': '📤 Fan-Out',
        'shell_network': '🐚 Shell Network'
    };
    return labels[type] || type;
}

function getScoreGradient(score) {
    if (score >= 70) return 'linear-gradient(90deg, #ef4444, #ec4899)';
    if (score >= 40) return 'linear-gradient(90deg, #f59e0b, #ef4444)';
    return 'linear-gradient(90deg, #10b981, #22d3ee)';
}

// ==========================================
// JSON DOWNLOAD
// ==========================================
function setupDownload() {
    document.getElementById('btn-download-json').addEventListener('click', () => {
        if (!currentResult) return;

        // Create clean output matching required format exactly
        const output = {
            suspicious_accounts: currentResult.suspicious_accounts.map(a => ({
                account_id: a.account_id,
                suspicion_score: a.suspicion_score,
                detected_patterns: a.detected_patterns,
                ring_id: a.ring_id || "NONE"
            })),
            fraud_rings: currentResult.fraud_rings.map(ring => ({
                ring_id: ring.ring_id,
                member_accounts: ring.member_accounts,
                pattern_type: ring.pattern_type,
                risk_score: ring.risk_score
            })),
            summary: {
                total_accounts_analyzed: currentResult.summary.total_accounts_analyzed,
                suspicious_accounts_flagged: currentResult.summary.suspicious_accounts_flagged,
                fraud_rings_detected: currentResult.summary.fraud_rings_detected,
                processing_time_seconds: currentResult.summary.processing_time_seconds
            }
        };

        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'forensicflow_report.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// ==========================================
// NEW ANALYSIS
// ==========================================
function setupNewAnalysis() {
    document.getElementById('btn-new-analysis').addEventListener('click', () => {
        currentResult = null;
        destroyGraph();

        // Show hero, hide results
        document.getElementById('results-section').classList.add('hidden');
        document.getElementById('hero-section').classList.remove('hidden');
        resetUpload();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
