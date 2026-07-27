(() => {
const elements = {
  sourceInput: document.querySelector("#source-input"),
  citationInput: document.querySelector("#citation-input"),
  styleSelect: document.querySelector("#style-select"),
  citationPanel: document.querySelector('[data-panel="citation"]'),
  citationState: document.querySelector("#citation-state"),
  sourceMeta: document.querySelector("#source-meta"),
  sourceHeading: document.querySelector("#source-heading"),
  resultMeta: document.querySelector("#result-meta"),
  copyToast: document.querySelector("#copy-toast"),
  downloadButtons: [...document.querySelectorAll(".format-button")],
  elementButtons: [...document.querySelectorAll(".element-button")],
};

let copyToastTimer;

const ui = {
  bind({ onSourceChange, onStyleChange, onDownload, onElementToggle }) {
    elements.sourceInput.addEventListener("input", onSourceChange);
    elements.sourceInput.addEventListener("focus", selectSourceInput);
    elements.sourceInput.addEventListener("click", selectSourceInput);
    elements.citationInput.addEventListener("click", copyCitationResult);
    elements.styleSelect.addEventListener("change", onStyleChange);

    elements.downloadButtons.forEach((button) => {
      button.addEventListener("click", () =>
        onDownload(button.dataset.format, button),
      );
    });
    elements.elementButtons.forEach((button) => {
      button.addEventListener("click", () =>
        onElementToggle(button.dataset.element),
      );
    });
  },

  sourceValue() {
    return elements.sourceInput.value.trim();
  },

  styleValue() {
    return elements.styleSelect.value;
  },

  styleLabel() {
    return elements.styleSelect.options[elements.styleSelect.selectedIndex].text;
  },

  clearCitation() {
    elements.citationInput.value = "";
  },

  renderCitation(citation) {
    elements.citationInput.value = citation;
  },

  setSourceMeta(message) {
    elements.sourceMeta.textContent = message;
  },

  setResultMeta(message) {
    elements.resultMeta.textContent = message;
  },

  showSourceKind(label, kind) {
    elements.sourceHeading.textContent = label;
    elements.sourceHeading.dataset.kind = kind;
  },

  resetSourceKind() {
    elements.sourceHeading.textContent = "Any";
    delete elements.sourceHeading.dataset.kind;
  },

  showSearching(message) {
    elements.citationState.querySelector("p").textContent = message;
    elements.citationState.classList.remove("message");
    elements.citationState.hidden = false;
    elements.citationPanel.classList.add("searching");
  },

  showMessage(message) {
    elements.citationState.querySelector("p").textContent = message;
    elements.citationState.classList.add("message");
    elements.citationState.hidden = false;
    elements.citationPanel.classList.remove("searching");
  },

  clearCitationState() {
    elements.citationState.hidden = true;
    elements.citationState.classList.remove("message");
    elements.citationPanel.classList.remove("searching");
  },

  animateCitation() {
    elements.citationPanel.classList.remove("fresh");
    void elements.citationPanel.offsetWidth;
    elements.citationPanel.classList.add("fresh");
  },

  setDownloadsEnabled(enabled) {
    elements.downloadButtons.forEach((button) => {
      button.disabled = !enabled;
    });
  },

  setDownloadBusy(button, busy, enabledAfter = true) {
    button.classList.toggle("downloading", busy);
    button.disabled = busy || !enabledAfter;
  },

  setElementButtonsEnabled(resolved) {
    elements.elementButtons.forEach((button) => {
      const element = button.dataset.element;
      button.disabled =
        !resolved ||
        (element === "title" && !resolved.title) ||
        (element === "doi" && !resolved.doi);
    });
  },

  setElementActive(element, active) {
    const button = elements.elementButtons.find(
      (item) => item.dataset.element === element,
    );
    if (!button) return;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  },

  downloadTextFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

function selectSourceInput() {
  window.requestAnimationFrame(() => elements.sourceInput.select());
}

async function copyCitationResult() {
  const citation = elements.citationInput.value.trim();
  if (!citation) return;

  try {
    await navigator.clipboard.writeText(citation);
  } catch {
    elements.citationInput.select();
    document.execCommand("copy");
    elements.citationInput.setSelectionRange(
      elements.citationInput.value.length,
      elements.citationInput.value.length,
    );
  }

  elements.citationPanel.classList.add("copied-result");
  window.setTimeout(
    () => elements.citationPanel.classList.remove("copied-result"),
    500,
  );
  showCopyToast();
}

function showCopyToast() {
  window.clearTimeout(copyToastTimer);
  elements.copyToast.classList.remove("show");
  void elements.copyToast.offsetWidth;
  elements.copyToast.classList.add("show");
  copyToastTimer = window.setTimeout(
    () => elements.copyToast.classList.remove("show"),
    1900,
  );
}

window.CiteApp.ui = ui;
})();
