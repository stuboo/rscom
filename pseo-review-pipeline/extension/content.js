/**
 * pSEO Review Pipeline — content script
 *
 * Runs on http://127.0.0.1:4000/* (Jekyll preview).
 * Highlights headings that match proposed change sections with a yellow left border.
 * Listens for messages relayed from sidepanel → background → here.
 */

const HIGHLIGHT_CLASS = 'pseo-highlight';

function clearHighlights() {
  for (const el of document.querySelectorAll('.' + HIGHLIGHT_CLASS)) {
    el.classList.remove(HIGHLIGHT_CLASS);
  }
}

function highlightSections(sections) {
  clearHighlights();
  if (!sections || sections.length === 0) return;

  const headings = document.querySelectorAll('h2, h3');
  for (const heading of headings) {
    const text = heading.textContent.trim().toLowerCase();
    for (const section of sections) {
      if (text.includes(section.toLowerCase())) {
        heading.classList.add(HIGHLIGHT_CLASS);
        break;
      }
    }
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'highlightSections') {
    highlightSections(msg.sections);
  }
  if (msg.type === 'clearHighlights') {
    clearHighlights();
  }
});
