function drawIcon(enabled) {
  const size = 32;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = enabled ? "#ff0000" : "#555555";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("↻", size / 2, size / 2 + 1);

  return ctx.getImageData(0, 0, size, size);
}

function refreshIcon() {
  chrome.storage.local.get("loopTabs", (data) => {
    const tabs = data.loopTabs || {};
    const anyActive = Object.values(tabs).some(Boolean);
    chrome.action.setIcon({ imageData: drawIcon(anyActive) });
  });
}

// Set icon on startup
refreshIcon();

// Update icon when any tab's loop state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.loopTabs !== undefined) {
    refreshIcon();
  }
});

// Provide tab ID to content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_TAB_ID") {
    sendResponse({ tabId: sender.tab.id });
  }
});

// Clean up closed tabs from storage
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(["loopTabs", "qualityTabs"], (data) => {
    const loops = data.loopTabs || {};
    const quality = data.qualityTabs || {};
    let changed = false;
    if (tabId in loops) { delete loops[tabId]; changed = true; }
    if (tabId in quality) { delete quality[tabId]; changed = true; }
    if (changed) chrome.storage.local.set({ loopTabs: loops, qualityTabs: quality });
  });
});
