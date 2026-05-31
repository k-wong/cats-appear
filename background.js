const ALARM_NAME = "cats-appear-next";
const MIN_DELAY_MINUTES = 2;
const MAX_DELAY_MINUTES = 10;

const CAT_FILES = [
  { path: "cats/cat1.webm", type: "video" },
  { path: "cats/cat2.webm", type: "video" },
  { path: "cats/cat3.webm", type: "video" },
  { path: "cats/cat4.webm", type: "video" },
  { path: "cats/cat5.webm", type: "video" }
];

function randomDelayMinutes() {
  return MIN_DELAY_MINUTES + Math.random() * (MAX_DELAY_MINUTES - MIN_DELAY_MINUTES);
}

function randomCat() {
  const cat = CAT_FILES[Math.floor(Math.random() * CAT_FILES.length)];
  return {
    ...cat,
    url: chrome.runtime.getURL(cat.path)
  };
}

function scheduleNextCat() {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: randomDelayMinutes() });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function showCatOnActiveTab() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const message = {
    type: "CATS_APPEAR_SHOW",
    cat: randomCat(),
    requestId: crypto.randomUUID()
  };

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    chrome.tabs.sendMessage(tab.id, message, () => void chrome.runtime.lastError);
  } catch {
    // Browser-internal pages, extension pages, and some restricted pages cannot be scripted.
  }
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleNextCat();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleNextCat();
});

chrome.action.onClicked.addListener(async () => {
  await showCatOnActiveTab();
  scheduleNextCat();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  await showCatOnActiveTab();
  scheduleNextCat();
});
