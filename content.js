let loopEnabled = false;
let qualityEnabled = false;
let myTabId = null;
let attachedVideo = null;
let savedQuality = null;

// Get own tab ID from background, then load state
chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, (res) => {
  myTabId = res.tabId;
  chrome.storage.local.get(["loopTabs", "qualityTabs"], (data) => {
    loopEnabled = !!(data.loopTabs && data.loopTabs[myTabId]);
    qualityEnabled = !!(data.qualityTabs && data.qualityTabs[myTabId]);
    attachToVideo();
  });
});

// Keep in sync with storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.loopTabs !== undefined && myTabId !== null) {
    const tabs = changes.loopTabs.newValue || {};
    loopEnabled = !!tabs[myTabId];
  }
  if (changes.qualityTabs !== undefined && myTabId !== null) {
    const prev = qualityEnabled;
    const tabs = changes.qualityTabs.newValue || {};
    qualityEnabled = !!tabs[myTabId];
    if (qualityEnabled && !prev) {
      showToast("144p bg-quality: ON");
    } else if (!qualityEnabled && prev) {
      // If toggled off while tab is backgrounded, restore quality immediately
      if (savedQuality) restoreQuality();
      else showToast("144p bg-quality: OFF");
    }
  }
});

function onVideoEnded() {
  const title = document.title.replace(" - YouTube", "").trim();
  if (loopEnabled) {
    console.log(`[YouTube Looper] Looping: "${title}"`);
    this.currentTime = 0;
    this.play();
  } else {
    console.log(`[YouTube Looper] Video ended (looping off): "${title}"`);
  }
}

function onTimeUpdate() {
  if (!loopEnabled) return;
  if (this.duration && this.currentTime >= this.duration - 0.5) {
    const title = document.title.replace(" - YouTube", "").trim();
    console.log(`[YouTube Looper] Looping (mix intercept): "${title}"`);
    this.currentTime = 0;
  }
}

function attachToVideo() {
  const video = document.querySelector("video");
  if (video && video !== attachedVideo) {
    if (attachedVideo) {
      attachedVideo.removeEventListener("ended", onVideoEnded);
      attachedVideo.removeEventListener("timeupdate", onTimeUpdate);
    }
    attachedVideo = video;
    video.addEventListener("ended", onVideoEnded);
    video.addEventListener("timeupdate", onTimeUpdate);
  }
}

// YouTube is a SPA — re-attach on navigation
const observer = new MutationObserver(() => attachToVideo());
observer.observe(document.body, { childList: true, subtree: true });

// --- Background quality lowering ---


function showToast(msg) {
  let toast = document.getElementById("yt-looper-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "yt-looper-toast";
    Object.assign(toast.style, {
      position: "fixed",
      top: "60px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#ff00ff",
      color: "#fff",
      padding: "16px 28px",
      borderRadius: "8px",
      fontSize: "20px",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      zIndex: "2147483647",
      pointerEvents: "none",
      transition: "opacity 0.3s",
      opacity: "0",
    });
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => { toast.style.opacity = "0"; }, 2500);
}

function getQuality(callback) {
  const handler = (e) => {
    window.removeEventListener("yt-looper-quality-result", handler);
    callback(e.detail.quality);
  };
  window.addEventListener("yt-looper-quality-result", handler);
  window.dispatchEvent(new CustomEvent("yt-looper-get-quality"));
}

function setQuality(quality) {
  window.dispatchEvent(new CustomEvent("yt-looper-set-quality", { detail: { quality } }));
}

const QUALITY_RANK = ["highres", "hd2880", "hd2160", "hd1440", "hd1080", "hd720", "large", "medium", "small", "tiny"];

function isBelowHD(quality) {
  const idx = QUALITY_RANK.indexOf(quality);
  return idx === -1 || idx > QUALITY_RANK.indexOf("hd1080");
}

function getBestAvailableQuality(callback) {
  const handler = (e) => {
    window.removeEventListener("yt-looper-available-qualities-result", handler);
    callback(e.detail.qualities);
  };
  window.addEventListener("yt-looper-available-qualities-result", handler);
  window.dispatchEvent(new CustomEvent("yt-looper-get-available-qualities"));
}

let lowerPending = false;

function lowerQuality() {
  if (savedQuality || lowerPending) return;
  lowerPending = true;
  getQuality((quality) => {
    lowerPending = false;
    if (!quality) { showToast("❌ player not found"); return; }
    savedQuality = quality;
    setQuality("tiny");
    showToast(`⬇ Quality → 144p (was: ${savedQuality})`);
    console.log(`[YouTube Looper] Quality lowered to 144p (was: ${savedQuality})`);
  });
}

function restoreQuality() {
  if (!savedQuality) return;
  const toRestore = savedQuality;
  savedQuality = null;
  if (isBelowHD(toRestore)) {
    getBestAvailableQuality((qualities) => {
      const best = qualities[0] || toRestore;
      setQuality(best);
      showToast(`⬆ Quality restored → ${best}`);
      console.log(`[YouTube Looper] Quality restored to best available: ${best} (saved was: ${toRestore})`);
    });
  } else {
    setQuality(toRestore);
    showToast(`⬆ Quality restored → ${toRestore}`);
    console.log(`[YouTube Looper] Quality restored to: ${toRestore}`);
  }
}

function onHide() {
  if (!qualityEnabled) return;
  lowerQuality();
}

function onShow() {
  if (!qualityEnabled) return;
  restoreQuality();
}

// Tab switching
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") onHide();
  else onShow();
});

// Window minimize / switching to another app
window.addEventListener("blur", onHide);
window.addEventListener("focus", onShow);

// Handle messages from popup requesting current video title
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_VIDEO_TITLE") {
    const title = document.title.replace(" - YouTube", "").trim();
    const onVideoPage = window.location.pathname === "/watch";
    sendResponse({ title: onVideoPage ? title : null });
  }
});
