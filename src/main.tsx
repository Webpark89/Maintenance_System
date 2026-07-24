import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ---------------------------------------------------------------------------
// Global fix for Radix UI scroll-lock layout gap (Dialog, Select, Sheet…)
//
// Radix injects a <style> into <head> with:
//   body[data-scroll-locked] { --removed-body-scroll-bar-size: 15px }
// and applies padding-right compensation → gap on the right.
//
// Strategy (dual-layer):
//   1. When Radix adds its <style>, we ALSO append our override <style>
//      AFTER it — because CSS source order wins (later = higher priority).
//   2. We also zero-out the CSS variable in Radix's own style tag.
//
// MutationObserver callbacks fire as microtasks, before the browser paints,
// so there is no visible flash.
// ---------------------------------------------------------------------------
(function patchRadixScrollLock() {
  const OVERRIDE_ID = "__radix-scroll-lock-fix__";
  const PROP = "--removed-body-scroll-bar-size";

  /** Ensure our override <style> is the LAST style node in <head>. */
  function ensureOverride() {
    let el = document.getElementById(OVERRIDE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = OVERRIDE_ID;
      el.textContent = [
        `body[data-scroll-locked] {`,
        `  ${PROP}: 0px !important;`,
        `  padding-right: 0px !important;`,
        `  margin-right: 0px !important;`,
        `}`,
      ].join("\n");
    }
    // appendChild moves if already in DOM → keeps it as last child
    document.head.appendChild(el);
  }

  /** Zero-out the scroll-bar-size value inside Radix's own style tag. */
  function patchRadixStyle(node: Node) {
    if (!(node instanceof HTMLStyleElement)) return;
    if (node.id === OVERRIDE_ID) return; // skip our own tag
    const text = node.textContent ?? "";
    if (!text.includes(PROP)) return;
    node.textContent = text.replace(
      /--removed-body-scroll-bar-size\s*:\s*[^;!]+/g,
      `${PROP}: 0px`
    );
  }

  const observer = new MutationObserver((mutations) => {
    let needsOverride = false;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if ((node as HTMLElement).id === OVERRIDE_ID) return; // skip our tag
        patchRadixStyle(node);
        if (node instanceof HTMLStyleElement) needsOverride = true;
      });
    }
    if (needsOverride) ensureOverride();
  });

  observer.observe(document.head, { childList: true });

  // Patch any styles already in head + inject override on first run
  document.head.querySelectorAll("style").forEach(patchRadixStyle);
  ensureOverride();
})();

createRoot(document.getElementById("root")!).render(<App />);


