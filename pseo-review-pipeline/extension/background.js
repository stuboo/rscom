/**
 * pSEO Review Pipeline — background service worker
 *
 * Polls /health every 3s to detect the review server on port 19600.
 * Badge: green when a proposal is ready, gray when disconnected or idle.
 * Extension icon click opens the side panel.
 */

const SERVER_PORT = 19600;
const POLL_INTERVAL = 3000;
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;

let isConnected = false;
let lastStatus = null;

// ─── Health Polling ────────────────────────────────────────────

async function checkHealth() {
  try {
    const resp = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) { setDisconnected(); return; }
    const data = await resp.json();
    isConnected = true;
    lastStatus = data.status;

    // Green badge when a proposal is ready for review
    if (data.status === 'ready') {
      chrome.action.setBadgeBackgroundColor({ color: '#22C55E' });
      chrome.action.setBadgeText({ text: ' ' });
    } else {
      // Connected but no proposal ready — clear badge
      chrome.action.setBadgeBackgroundColor({ color: '#6B7280' });
      chrome.action.setBadgeText({ text: '' });
    }

    // Broadcast health to side panel
    chrome.runtime.sendMessage({ type: 'health', data }).catch(() => {});
  } catch {
    setDisconnected();
  }
}

function setDisconnected() {
  isConnected = false;
  lastStatus = null;
  chrome.action.setBadgeText({ text: '' });
  chrome.runtime.sendMessage({ type: 'health', data: null }).catch(() => {});
}

// ─── Message Handling ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;

  if (msg.type === 'getStatus') {
    sendResponse({ connected: isConnected, status: lastStatus });
    return true;
  }

  // Forward section names from sidepanel to content script for highlighting
  if (msg.type === 'highlightSections') {
    chrome.tabs.query({ url: 'http://127.0.0.1:4000/*' }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'highlightSections',
            sections: msg.sections,
          }).catch(() => {});
        }
      }
    });
    return;
  }

  if (msg.type === 'clearHighlights') {
    chrome.tabs.query({ url: 'http://127.0.0.1:4000/*' }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'clearHighlights' }).catch(() => {});
        }
      }
    });
    return;
  }
});

// ─── Side Panel ────────────────────────────────────────────────

// Click extension icon → open side panel
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[pseo] Failed to set panel behavior:', err.message);
  });
}

// ─── Startup ───────────────────────────────────────────────────

checkHealth();
setInterval(checkHealth, POLL_INTERVAL);
