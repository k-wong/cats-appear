(() => {
const CAT_CONTAINER_ID = "cats-appear-overlay-root";
const CAT_INSTANCE_CLASS = "cats-appear-instance";
const CAT_FADE_MS = 500;
const CAT_FADE_STEPS = 5;
const CAT_FADE_STEP_MS = CAT_FADE_MS / CAT_FADE_STEPS;
const CAT_WIDTH_PX = 60;
const FALLBACK_DURATION_MS = 20000;

if (globalThis.__catsAppearContentLoaded) return;
globalThis.__catsAppearContentLoaded = true;
globalThis.__catsAppearLastRequestId = null;

function getRoot() {
  let root = document.getElementById(CAT_CONTAINER_ID);
  if (root) return root;

  root = document.createElement("div");
  root.id = CAT_CONTAINER_ID;
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = "2147483647";
  root.style.overflow = "hidden";
  document.documentElement.appendChild(root);
  return root;
}

function randomPosition(width, height) {
  const padding = 12;
  const maxLeft = Math.max(padding, window.innerWidth - width - padding);
  const maxTop = Math.max(padding, window.innerHeight - height - padding);
  return {
    left: padding + Math.random() * Math.max(0, maxLeft - padding),
    top: padding + Math.random() * Math.max(0, maxTop - padding)
  };
}

function makeMedia(cat) {
  const catUrl = cat.url;
  const isVideo = /\.webm(?:$|\?)/i.test(catUrl);
  const media = document.createElement(isVideo ? "video" : "img");

  media.src = catUrl;
  media.style.display = "block";
  media.style.width = `${CAT_WIDTH_PX}px`;
  media.style.height = "auto";
  media.style.maxWidth = `${CAT_WIDTH_PX}px`;
  media.style.maxHeight = `${CAT_WIDTH_PX}px`;
  media.style.objectFit = "contain";
  media.style.userSelect = "none";

  if (isVideo) {
    media.autoplay = true;
    media.loop = false;
    media.muted = true;
    media.playsInline = true;
    media.playbackRate = 0.2;
  } else {
    media.alt = "cat";
  }

  return media;
}

function clearCatTimers(wrapper) {
  for (const timer of wrapper.__catsAppearTimers ?? []) {
    window.clearTimeout(timer);
  }
  wrapper.__catsAppearTimers = [];
}

function setCatTimeout(wrapper, callback, delay) {
  const timer = window.setTimeout(() => {
    wrapper.__catsAppearTimers = (wrapper.__catsAppearTimers ?? []).filter((id) => id !== timer);
    callback();
  }, delay);
  wrapper.__catsAppearTimers = [...(wrapper.__catsAppearTimers ?? []), timer];
  return timer;
}

function setSteppedOpacity(element, from, to, done) {
  const delta = (to - from) / CAT_FADE_STEPS;
  element.style.opacity = String(from);

  for (let step = 1; step <= CAT_FADE_STEPS; step += 1) {
    setCatTimeout(element, () => {
      element.style.opacity = String(from + delta * step);
      if (step === CAT_FADE_STEPS) done?.();
    }, step * CAT_FADE_STEP_MS);
  }
}

function removeExistingCats() {
  for (const node of document.querySelectorAll(`.${CAT_INSTANCE_CLASS}`)) {
    removeCat(node);
  }
}

function removeCat(wrapper) {
  clearCatTimers(wrapper);
  for (const media of wrapper.querySelectorAll("video, img")) {
    if (media.tagName === "VIDEO") {
      media.pause();
      media.removeAttribute("src");
      media.load();
    } else {
      media.removeAttribute("src");
    }
  }
  wrapper.remove();
}

function scheduleRemoval(wrapper, media, cat) {
  if (cat.type === "video" || media.tagName === "VIDEO") {
    let fallbackTimer = null;
    const cleanup = () => removeCat(wrapper);
    const scheduleFallback = () => {
      const mediaDurationMs = Number.isFinite(media.duration) ? media.duration * 1000 : FALLBACK_DURATION_MS;
      const playbackBufferMs = CAT_FADE_MS + 1000;
      const timeoutMs = Math.min(
        Math.max(mediaDurationMs + playbackBufferMs, CAT_FADE_MS + 3000),
        FALLBACK_DURATION_MS
      );
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      fallbackTimer = setCatTimeout(wrapper, cleanup, timeoutMs);
    };

    media.addEventListener("ended", cleanup, { once: true });
    media.addEventListener("error", cleanup, { once: true });
    media.addEventListener("loadedmetadata", scheduleFallback, { once: true });
    scheduleFallback();
    return;
  }

  const durationMs = Number.isFinite(cat.durationMs) ? cat.durationMs : 3000;
  setCatTimeout(wrapper, () => removeCat(wrapper), durationMs);
}

function showCat(cat, requestId) {
  if (requestId && requestId === globalThis.__catsAppearLastRequestId) return;
  globalThis.__catsAppearLastRequestId = requestId;

  const root = getRoot();
  removeExistingCats();

  const wrapper = document.createElement("div");
  const media = makeMedia(cat);
  const approximateWidth = CAT_WIDTH_PX;
  const approximateHeight = approximateWidth;
  const { left, top } = randomPosition(approximateWidth, approximateHeight);

  wrapper.className = CAT_INSTANCE_CLASS;
  wrapper.style.position = "fixed";
  wrapper.style.left = `${left}px`;
  wrapper.style.top = `${top}px`;
  wrapper.style.opacity = "0";
  wrapper.style.transform = `rotate(${Math.random() * 10 - 5}deg)`;
  wrapper.style.willChange = "opacity";
  wrapper.appendChild(media);
  root.appendChild(wrapper);

  requestAnimationFrame(() => {
    setSteppedOpacity(wrapper, 0, 1);
    if (media.tagName === "VIDEO") {
      media.currentTime = 0;
      media.playbackRate = 0.2;
      media.play().catch(() => {});
      setCatTimeout(wrapper, () => {
        media.playbackRate = 1;
      }, CAT_FADE_MS);
    }
  });

  scheduleRemoval(wrapper, media, cat);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "CATS_APPEAR_SHOW" || !message.cat?.url) return;
  showCat(message.cat, message.requestId);
});
})();
