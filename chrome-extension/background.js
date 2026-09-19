// background.js

// Change this to your deployed URL or localhost for testing
// const BASE_URL = "http://localhost:3000"; 
const BASE_URL = "https://test-6826a.web.app"; 

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "keepit-root",
    title: "KeepIt",
    contexts: ["page", "selection", "image", "link"]
  });

  chrome.contextMenus.create({
    id: "save-page",
    parentId: "keepit-root",
    title: "Save Page URL",
    contexts: ["page"]
  });

  chrome.contextMenus.create({
    id: "save-selection",
    parentId: "keepit-root",
    title: "Save Selected Text",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "save-image",
    parentId: "keepit-root",
    title: "Save Image",
    contexts: ["image"]
  });
  
  chrome.contextMenus.create({
    id: "save-link",
    parentId: "keepit-root",
    title: "Save Link",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let url = `${BASE_URL}/?action=create`;
  
  // Helper to encode params
  const addParam = (key, value) => {
    if (value) url += `&${key}=${encodeURIComponent(value)}`;
  };

  if (info.menuItemId === "save-page") {
    addParam("url", info.pageUrl);
    addParam("title", tab.title);
  } else if (info.menuItemId === "save-selection") {
    addParam("text", info.selectionText);
    addParam("url", info.pageUrl); // Context context
    addParam("title", tab.title);
  } else if (info.menuItemId === "save-image") {
    addParam("image", info.srcUrl);
    addParam("url", info.pageUrl);
    addParam("title", tab.title);
  } else if (info.menuItemId === "save-link") {
    addParam("url", info.linkUrl);
    addParam("title", "Saved Link");
  }

  // Open in new tab
  chrome.tabs.create({ url: url });
});

// Also handle clicking the extension icon
chrome.action.onClicked.addListener((tab) => {
  let url = `${BASE_URL}/?action=create`;
  url += `&url=${encodeURIComponent(tab.url)}`;
  url += `&title=${encodeURIComponent(tab.title)}`;
  chrome.tabs.create({ url: url });
});