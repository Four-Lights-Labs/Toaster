const MESSAGE_TYPES = {
  GET_PAGE_CONTEXT: "GET_PAGE_CONTEXT",
  GET_PAGE_CONTEXT_RESULT: "GET_PAGE_CONTEXT_RESULT"
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== MESSAGE_TYPES.GET_PAGE_CONTEXT) return;

  const selection = window.getSelection().toString();

  sendResponse({
    type: MESSAGE_TYPES.GET_PAGE_CONTEXT_RESULT,
    payload: {
      title: document.title,
      url: window.location.href,
      selectionText: selection,
      visibleText: document.body.innerText.slice(0, 5000)
    }
  });

  return true;
});
