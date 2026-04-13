// Runs in the page's JS world — can access YouTube's player methods

window.addEventListener("yt-looper-set-quality", (e) => {
  const player = document.getElementById("movie_player");
  if (!player || typeof player.setPlaybackQualityRange !== "function") return;
  const q = e.detail.quality;
  player.setPlaybackQualityRange(q, q);
});

window.addEventListener("yt-looper-get-quality", () => {
  const player = document.getElementById("movie_player");
  const quality = (player && typeof player.getPlaybackQuality === "function")
    ? player.getPlaybackQuality()
    : null;
  window.dispatchEvent(new CustomEvent("yt-looper-quality-result", { detail: { quality } }));
});

window.addEventListener("yt-looper-get-available-qualities", () => {
  const player = document.getElementById("movie_player");
  const qualities = (player && typeof player.getAvailableQualityLevels === "function")
    ? player.getAvailableQualityLevels()
    : [];
  window.dispatchEvent(new CustomEvent("yt-looper-available-qualities-result", { detail: { qualities } }));
});
