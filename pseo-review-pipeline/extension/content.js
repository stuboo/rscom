// Stub — PSEO-006 will implement full content script
// Listens for highlight messages from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'highlightSections') {
    // Will be implemented in PSEO-006
  }
  if (msg.type === 'clearHighlights') {
    // Will be implemented in PSEO-006
  }
});
