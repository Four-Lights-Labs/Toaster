const MESSAGE_TYPES = {
  RUN_PROMPT: "RUN_PROMPT",
  RUN_PROMPT_RESULT: "RUN_PROMPT_RESULT",
  RUN_PROMPT_ERROR: "RUN_PROMPT_ERROR",
  GET_PAGE_CONTEXT: "GET_PAGE_CONTEXT",
  GET_PAGE_CONTEXT_RESULT: "GET_PAGE_CONTEXT_RESULT"
};

const BACKEND_URL = "http://localhost:3000/v1/operator/run";

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === MESSAGE_TYPES.RUN_PROMPT) {
        const result = await handleRunPrompt(message.payload);
        sendResponse({
          type: MESSAGE_TYPES.RUN_PROMPT_RESULT,
          payload: result
        });
      }
    } catch (e) {
      sendResponse({
        type: MESSAGE_TYPES.RUN_PROMPT_ERROR,
        payload: { message: e.message || "Unknown error" }
      });
    }
  })();

  return true;
});

async function handleRunPrompt(input) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No active tab found.");
  }

  let context = {
    title: "",
    url: "",
    selectionText: "",
    visibleText: ""
  };

  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.GET_PAGE_CONTEXT,
      payload: { contextMode: input.contextMode || "page" }
    });

    if (res?.type === MESSAGE_TYPES.GET_PAGE_CONTEXT_RESULT) {
      context = res.payload || context;
    }
  } catch (err) {
    console.warn("Could not read page context:", err);
  }

  const requestBody = buildModelRequest(input, context);
  const backendResponse = await callBackend(requestBody);

  const rawText = backendResponse.output_text || "";
  const normalized = normalizeOutput(rawText, input.mode);

  return {
    mode: input.mode,
    confidence: backendResponse.confidence || "unknown",
    format: input.format || "plain",
    rawText,
    normalizedSections: normalized.sections,
    appliedNormalizers: normalized.applied
  };
}

function buildModelRequest(input, context) {
  const baseRules = [
    "You are an operational interface layered over a language model.",
    "Be concise, neutral, and direct.",
    "Return the answer first.",
    "Avoid praise, enthusiasm, flattery, encouragement, and filler.",
    "Do not use phrases like 'great question', 'happy to help', or 'absolutely'.",
    "Use structured output when possible.",
    "State assumptions explicitly.",
    "Do not simulate excitement."
  ];

  const modeRules = getModeRules(input.mode);
  const formatRules = getFormatRules(input.format);
  const strictnessRules = getStrictnessRules(input.strictness);

  return {
    model: "gpt-5.4",
    system: [...baseRules, ...modeRules, ...formatRules, ...strictnessRules].join("\n"),
    userPrompt: input.prompt,
    context: {
      title: context.title || "",
      url: context.url || "",
      selectionText: context.selectionText || "",
      visibleText: context.visibleText || ""
    }
  };
}

function getModeRules(mode) {
  switch (mode) {
    case "analyze":
      return [
        "Use sections: SUMMARY, ASSUMPTIONS, OPTIONS.",
        "Highlight uncertainty clearly."
      ];
    case "transform":
      return [
        "Use sections: INPUT, TRANSFORMATION, OUTPUT."
      ];
    case "compare":
      return [
        "Use sections: OPTIONS, DIFFERENCES, RECOMMENDATION, RISK."
      ];
    case "answer":
    default:
      return [
        "Use sections: RESULT, OPTIONAL NEXT."
      ];
  }
}

function getFormatRules(format) {
  switch (format) {
    case "json":
      return ["Return valid JSON only."];
    case "table":
      return ["Return a compact markdown table where appropriate."];
    case "bullets":
      return ["Prefer concise bullet points."];
    default:
      return ["Prefer compact plain text."];
  }
}

function getStrictnessRules(strictness) {
  if (strictness === "high") {
    return [
      "Do not use exclamation marks.",
      "Do not include conversational preambles.",
      "Do not thank the user.",
      "Do not apologize unless a real error occurred."
    ];
  }
  return [];
}

async function callBackend(body) {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend error ${response.status}: ${text}`);
  }

  return await response.json();
}

function normalizeOutput(rawText, mode) {
  let text = (rawText || "").trim();
  const applied = [];

  const fillerPatterns = [
    /^absolutely[,!\s-]*/i,
    /^great question[,!\s-]*/i,
    /^happy to help[,!\s-]*/i,
    /^certainly[,!\s-]*/i,
    /^of course[,!\s-]*/i
  ];

  for (const pattern of fillerPatterns) {
    if (pattern.test(text)) {
      text = text.replace(pattern, "").trim();
      applied.push("strip_filler_intro");
    }
  }

  const sections = parseSections(text, mode);
  if (sections.length) {
    applied.push("parse_sections");
  }

  return {
    sections: sections.length ? sections : fallbackSections(text, mode),
    applied
  };
}

function parseSections(text, mode) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (/^[A-Z][A-Z\s]+$/.test(line)) {
      current = { label: line, items: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { label: defaultLabel(mode), items: [] };
      sections.push(current);
    }

    current.items.push(line.replace(/^[-*]\s*/, ""));
  }

  return sections;
}

function fallbackSections(text, mode) {
  return [{
    label: defaultLabel(mode),
    items: text.split("\n").map((l) => l.trim()).filter(Boolean)
  }];
}

function defaultLabel(mode) {
  switch (mode) {
    case "compare":
      return "DIFFERENCES";
    case "transform":
      return "OUTPUT";
    case "analyze":
      return "SUMMARY";
    default:
      return "RESULT";
  }
}
