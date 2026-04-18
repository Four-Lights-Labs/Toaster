const MESSAGE_TYPES = {
  RUN_PROMPT: "RUN_PROMPT",
  RUN_PROMPT_RESULT: "RUN_PROMPT_RESULT",
  RUN_PROMPT_ERROR: "RUN_PROMPT_ERROR"
};

const els = {
  mode: document.getElementById("mode"),
  contextMode: document.getElementById("contextMode"),
  format: document.getElementById("format"),
  strictness: document.getElementById("strictness"),
  prompt: document.getElementById("prompt"),
  run: document.getElementById("run"),
  status: document.getElementById("status"),
  showNormalized: document.getElementById("showNormalized"),
  showRaw: document.getElementById("showRaw"),
  normalizedView: document.getElementById("normalizedView"),
  rawView: document.getElementById("rawView"),
  rawText: document.getElementById("rawText"),
  debug: document.getElementById("debug")
};

els.run.addEventListener("click", runPrompt);
els.showNormalized.addEventListener("click", () => setTab("normalized"));
els.showRaw.addEventListener("click", () => setTab("raw"));

els.prompt.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    runPrompt();
  }
});

function setTab(tab) {
  const normalizedActive = tab === "normalized";
  els.showNormalized.classList.toggle("active", normalizedActive);
  els.showRaw.classList.toggle("active", !normalizedActive);
  els.normalizedView.classList.toggle("hidden", !normalizedActive);
  els.rawView.classList.toggle("hidden", normalizedActive);
}

async function runPrompt() {
  const prompt = els.prompt.value.trim();
  if (!prompt) {
    setStatus("error: prompt is required");
    return;
  }

  setStatus("processing");
  els.normalizedView.innerHTML = "<div class='muted'>Waiting for result...</div>";
  els.rawText.textContent = "";
  els.debug.textContent = "Running...";

  const payload = {
    prompt,
    mode: els.mode.value,
    contextMode: els.contextMode.value,
    format: els.format.value,
    strictness: els.strictness.value
  };

  try {
    const res = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.RUN_PROMPT,
      payload
    });

    if (!res) {
      setStatus("error: empty response");
      return;
    }

    if (res.type === MESSAGE_TYPES.RUN_PROMPT_ERROR) {
      setStatus(`error: ${res.payload.message}`);
      els.debug.textContent = JSON.stringify(res.payload, null, 2);
      return;
    }

    const result = res.payload;
    setStatus(`[${result.mode}] [confidence: ${result.confidence}]`);
    renderNormalized(result.normalizedSections || []);
    els.rawText.textContent = result.rawText || "";
    els.debug.textContent = JSON.stringify(
      {
        format: result.format,
        appliedNormalizers: result.appliedNormalizers
      },
      null,
      2
    );
  } catch (err) {
    setStatus(`error: ${err.message}`);
    els.debug.textContent = err.stack || err.message;
  }
}

function renderNormalized(sections) {
  const root = els.normalizedView;
  root.innerHTML = "";

  if (!sections.length) {
    root.innerHTML = "<div class='muted'>No structured output.</div>";
    return;
  }

  sections.forEach((sec) => {
    const div = document.createElement("div");
    div.className = "section";

    const h = document.createElement("h3");
    h.textContent = sec.label || "RESULT";

    const ul = document.createElement("ul");
    (sec.items || []).forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    });

    div.appendChild(h);
    div.appendChild(ul);
    root.appendChild(div);
  });
}

function setStatus(text) {
  els.status.innerHTML = `Status: <strong>${escapeHtml(text)}</strong>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
