// Stub — PSEO-005 will implement full sidebar logic
const statusEl = document.getElementById('status');

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'health') {
    if (msg.data) {
      statusEl.textContent = `Connected — ${msg.data.status} (${msg.data.queue_length} in queue)`;
    } else {
      statusEl.textContent = 'Disconnected — waiting for server on port 19600';
    }
  }
});

// Request initial status
chrome.runtime.sendMessage({ type: 'getStatus' }, (resp) => {
  if (resp?.connected) {
    statusEl.textContent = `Connected — ${resp.status || 'idle'}`;
  } else {
    statusEl.textContent = 'Disconnected — waiting for server on port 19600';
  }
});
