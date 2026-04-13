const listEl = document.getElementById("tab-list");

chrome.tabs.query({ url: "*://www.youtube.com/watch*" }, (tabs) => {
  if (!tabs.length) {
    listEl.innerHTML = '<span class="empty">No YouTube videos open</span>';
    return;
  }

  chrome.storage.local.get(["loopTabs", "qualityTabs"], (data) => {
    const loopTabs = data.loopTabs || {};
    const qualityTabs = data.qualityTabs || {};

    let pending = tabs.length;
    const titles = {};

    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_VIDEO_TITLE" }, (res) => {
        titles[tab.id] =
          res && res.title
            ? res.title
            : "Video not detected, if already playing please refresh the page";
        pending--;
        if (pending === 0) render(tabs, loopTabs, qualityTabs, titles);
      });
    });
  });
});

function makeToggle(checked, extraClass, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "toggle-wrap";

  const label = document.createElement("label");
  label.className = "switch" + (extraClass ? " " + extraClass : "");

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));

  const slider = document.createElement("span");
  slider.className = "slider";

  label.appendChild(input);
  label.appendChild(slider);
  wrap.appendChild(label);
  return wrap;
}

function render(tabs, loopTabs, qualityTabs, titles) {
  listEl.innerHTML = "";

  tabs.forEach((tab) => {
    const row = document.createElement("div");
    row.className = "tab-row";

    const titleEl = document.createElement("span");
    titleEl.className = "tab-title";
    titleEl.textContent = titles[tab.id];
    titleEl.title = titles[tab.id];

    const controls = document.createElement("div");
    controls.className = "controls";

    // Loop toggle
    const loopWrap = makeToggle(!!loopTabs[tab.id], null, (checked) => {
      chrome.storage.local.get("loopTabs", (data) => {
        const updated = data.loopTabs || {};
        updated[tab.id] = checked;
        chrome.storage.local.set({ loopTabs: updated });
      });
    });
    const loopLabel = document.createElement("span");
    loopLabel.className = "toggle-label";
    loopLabel.textContent = "Loop";
    loopWrap.prepend(loopLabel);

    // Quality toggle
    const qualWrap = makeToggle(!!qualityTabs[tab.id], "switch-orange", (checked) => {
      chrome.storage.local.get("qualityTabs", (data) => {
        const updated = data.qualityTabs || {};
        updated[tab.id] = checked;
        chrome.storage.local.set({ qualityTabs: updated });
      });
    });
    const qualLabel = document.createElement("span");
    qualLabel.className = "toggle-label";
    qualLabel.textContent = "144p bg";
    qualWrap.prepend(qualLabel);

    controls.appendChild(loopWrap);
    controls.appendChild(qualWrap);

    row.appendChild(titleEl);
    row.appendChild(controls);
    listEl.appendChild(row);
  });
}
