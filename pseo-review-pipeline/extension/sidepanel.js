/**
 * pSEO Review Pipeline — sidebar panel logic
 *
 * Polls the review server, renders proposals, and sends decisions.
 * Communicates with background.js for health state and content script highlights.
 */

const BASE_URL = 'http://127.0.0.1:19600';
const POLL_MS = 3000;

// ─── DOM refs ─────────────────────────────────────────────────
const views = {
  disconnected: document.getElementById('state-disconnected'),
  loading:      document.getElementById('state-loading'),
  idle:         document.getElementById('state-idle'),
  proposal:     document.getElementById('state-proposal'),
};

const loadingLabel = document.getElementById('loading-label');
const loadingPage  = document.getElementById('loading-page');
const pageName     = document.getElementById('page-name');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const evidenceEl   = document.getElementById('evidence-summary');
const changesList  = document.getElementById('changes-list');
const refsList     = document.getElementById('references-list');
const feedbackEl   = document.getElementById('feedback');
const btnApprove   = document.getElementById('btn-approve');
const btnRevise    = document.getElementById('btn-revise');
const btnSkip      = document.getElementById('btn-skip');

let currentProposalId = null; // track to avoid re-rendering the same proposal
let buttonsDisabled = false;

// ─── View toggling ────────────────────────────────────────────

function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
}

// ─── Rendering ────────────────────────────────────────────────

function renderProposal(proposal) {
  if (!proposal) { showView('loading'); return; }

  // Header
  pageName.textContent = proposal.pagePath || 'Unknown page';

  // Progress bar (from health data, updated separately)
  // Will be set by updateProgress()

  // Evidence summary
  evidenceEl.textContent = proposal.evidenceSummary || '';

  // Changes
  changesList.innerHTML = '';
  const changes = proposal.changes || [];
  for (const change of changes) {
    const card = document.createElement('div');
    card.className = 'change-card';

    const sectionName = document.createElement('div');
    sectionName.className = 'change-section-name';
    sectionName.textContent = change.section || '';
    card.appendChild(sectionName);

    if (change.reason) {
      const reason = document.createElement('div');
      reason.className = 'change-reason';
      reason.textContent = change.reason;
      card.appendChild(reason);
    }

    if (change.before) {
      const removed = document.createElement('div');
      removed.className = 'diff-block diff-removed';
      removed.textContent = change.before;
      card.appendChild(removed);
    }

    if (change.after) {
      const added = document.createElement('div');
      added.className = 'diff-block diff-added';
      added.textContent = change.after;
      card.appendChild(added);
    }

    changesList.appendChild(card);
  }

  // References
  refsList.innerHTML = '';
  const refs = proposal.references || [];
  for (const ref of refs) {
    const li = document.createElement('li');
    li.className = 'reference-item';

    let html = '';
    if (ref.author) html += `<span class="ref-author">${esc(ref.author)}</span> `;
    if (ref.title)  html += `<span class="ref-title">${esc(ref.title)}</span>. `;
    if (ref.journal) html += `<span class="ref-journal">${esc(ref.journal)}</span>`;
    if (ref.year) html += ` (${esc(String(ref.year))})`;
    if (ref.doi) html += ` <a href="https://doi.org/${esc(ref.doi)}" target="_blank">DOI</a>`;

    li.innerHTML = html;
    refsList.appendChild(li);
  }

  // Clear feedback
  feedbackEl.value = '';

  // Send section names to content script for highlighting
  const sections = changes.map(c => c.section).filter(Boolean);
  chrome.runtime.sendMessage({ type: 'highlightSections', sections });

  showView('proposal');
}

function updateProgress(queueLength, reviewed) {
  if (typeof queueLength !== 'number') return;
  const total = queueLength + (reviewed || 0);
  const done = reviewed || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${done} / ${total} reviewed`;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ─── Server communication ─────────────────────────────────────

async function fetchJSON(path, opts) {
  const resp = await fetch(BASE_URL + path, {
    signal: AbortSignal.timeout(5000),
    ...opts,
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function postJSON(path, body) {
  return fetchJSON(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Poll loop ────────────────────────────────────────────────

async function poll() {
  try {
    const health = await fetchJSON('/health');
    if (!health) {
      currentProposalId = null;
      chrome.runtime.sendMessage({ type: 'clearHighlights' });
      showView('disconnected');
      return;
    }

    // Update progress from health data
    updateProgress(health.queue_length, health.reviewed_count);

    const status = health.status;

    if (status === 'ready') {
      // Fetch the current proposal
      const proposal = await fetchJSON('/current');
      if (proposal) {
        // Only re-render if it's a new proposal
        const pid = proposal.pagePath + '|' + (proposal.timestamp || '');
        if (pid !== currentProposalId) {
          currentProposalId = pid;
          renderProposal(proposal);
        }
        enableButtons();
        showView('proposal');
      } else {
        showView('loading');
      }
    } else if (status === 'researching') {
      currentProposalId = null;
      chrome.runtime.sendMessage({ type: 'clearHighlights' });
      loadingLabel.textContent = 'Researching next page...';
      loadingPage.textContent = health.current_page || '';
      showView('loading');
    } else if (status === 'idle') {
      currentProposalId = null;
      chrome.runtime.sendMessage({ type: 'clearHighlights' });
      if (health.queue_length === 0) {
        showView('idle');
      } else {
        loadingLabel.textContent = 'Waiting for next page...';
        loadingPage.textContent = '';
        showView('loading');
      }
    } else {
      // Unknown status — show loading
      loadingLabel.textContent = `Status: ${status}`;
      loadingPage.textContent = '';
      showView('loading');
    }
  } catch {
    currentProposalId = null;
    showView('disconnected');
  }
}

// ─── Button actions ───────────────────────────────────────────

function disableButtons() {
  buttonsDisabled = true;
  btnApprove.disabled = true;
  btnRevise.disabled = true;
  btnSkip.disabled = true;
}

function enableButtons() {
  buttonsDisabled = false;
  btnApprove.disabled = false;
  btnRevise.disabled = false;
  btnSkip.disabled = false;
}

async function sendDecision(decision, feedback) {
  if (buttonsDisabled) return;
  disableButtons();

  // Show processing state
  loadingLabel.textContent = 'Processing...';
  loadingPage.textContent = '';
  showView('loading');
  currentProposalId = null;
  chrome.runtime.sendMessage({ type: 'clearHighlights' });

  try {
    const body = { decision };
    if (feedback) body.feedback = feedback;
    await postJSON('/decide', body);
  } catch {
    // Server error — poll will recover
  }

  // Clear feedback textarea
  feedbackEl.value = '';

  // Poll immediately to pick up new state
  await poll();
}

btnApprove.addEventListener('click', () => {
  sendDecision('approve');
});

btnRevise.addEventListener('click', () => {
  const feedback = feedbackEl.value.trim();
  if (!feedback) {
    feedbackEl.focus();
    feedbackEl.style.borderColor = '#f59e0b';
    setTimeout(() => { feedbackEl.style.borderColor = ''; }, 1500);
    return;
  }
  sendDecision('revise', feedback);
});

btnSkip.addEventListener('click', () => {
  sendDecision('skip');
});

// ─── Listen for health broadcasts from background ─────────────

chrome.runtime.onMessage.addListener((msg) => {
  // We do our own polling now, but still listen for connection drops
  if (msg.type === 'health' && !msg.data) {
    currentProposalId = null;
    showView('disconnected');
  }
});

// ─── Startup ──────────────────────────────────────────────────

poll();
setInterval(poll, POLL_MS);
