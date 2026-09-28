// خروجِ نرمِ همه‌ی پاپ‌آپ‌ها — بدونِ دست‌زدن به تک‌تکِ والدها.
//
// مسئله: تقریبا همه‌ی پاپ‌آپ‌های اپ با رندرِ شرطی mount/unmount می‌شوند
// ({open && <Modal/>}). React عنصر را همان لحظه از DOM برمی‌دارد، پس
// «بستن»، «ثبت» یا «تأیید» پاپ‌آپ را یک‌باره غیب می‌کرد. تبدیلِ ده‌ها والد
// به الگوی presence هم پرخطر بود و هم هر پاپ‌آپِ تازه دوباره از قلم می‌افتاد.
//
// راه‌حل: یک MutationObserver روی body. وقتی یک پرده/پنلِ پاپ‌آپ حذف
// می‌شود، یک کپیِ ایستا (cloneNode) از آن — با data-popup-ghost، inert و
// aria-hidden — دقیقا سرِ جای قبلی‌اش گذاشته می‌شود، با Web Animations
// پایین می‌رود و محو می‌شود و بعد حذف می‌شود. فقط opacity و translate
// انیمیت می‌شوند (کامپوزیتور، بدونِ layout)؛ تاریِ پرده ثابت می‌ماند چون
// opacity روی خودِ پرده است، نه روی یک جدِ آن.
//
// مستثناها: هرچه خودش خروج دارد (MentorSheet → .m-sheet-wrap، یا هر عنصری
// با data-popup-exit="self")، و عنصری که framer پیش‌تر به opacity:0 برده.

const BACKDROP_SEL = [
  ".modal-overlay.open",
  ".wsearch-newform-overlay.open",
  ".pcard-overlay.open",
  ".jdate-overlay.open",
  ".exercise-catalog-popup-wrap",
  ".premium-celebration-backdrop",
  ".trade-lightbox",
  ".photo-lightbox",
  ".popup-backdrop",
].join(",");

const PANEL_SEL = [
  ".modal-panel.open",
  ".wsearch-newform.open",
  ".pcard-stage.open",
  ".jdate-popup.open",
  ".trade-drawer",
  ".friend-profile-panel",
  ".trade-econ-monthpicker",
  ".exercise-catalog-popup-panel",
  ".premium-celebration-card",
  ".popup-panel",
].join(",");

const MENU_SEL = [".dash-context-menu", ".notif-panel"].join(",");

const ANY_SEL = `${BACKDROP_SEL},${PANEL_SEL},${MENU_SEL}`;
const EXCLUDE_SEL = '.m-sheet-wrap, [data-popup-exit="self"], [data-popup-ghost]';

const OUT_MS = 260;
const MENU_OUT_MS = 160;
const REDUCED_OUT_MS = 140;
const EASE_OUT = "cubic-bezier(.4,0,.2,1)";

// آخرین اسکرولِ هر عنصر؛ عنصرِ جداشده از DOM دیگر scrollTop ندارد و
// کپی از بالا شروع می‌شد (پرشِ محتوا حینِ خروج).
const scrollPos = new WeakMap<Element, [number, number]>();

function isFadedOut(el: HTMLElement) {
  const o = el.style.opacity;
  return o !== "" && parseFloat(o) < 0.05;
}

function isIgnorableChild(el: Element) {
  if (el.tagName === "STYLE" || el.tagName === "SCRIPT" || el.tagName === "TEMPLATE") return true;
  return el.children.length === 0 && !(el.textContent || "").trim();
}

/** عنصری که فرزندانش فقط پاپ‌آپ (یا پوسته‌ی خالی) هستند — کلِ خودش کپی می‌شود. */
function isPopupWrapper(el: Element, depth = 0): boolean {
  if (depth > 3) return false;
  let found = false;
  for (const c of Array.from(el.children)) {
    if (c.matches(EXCLUDE_SEL)) return false;
    if (c.matches(ANY_SEL)) { found = true; continue; }
    if (isIgnorableChild(c)) continue;
    if (isPopupWrapper(c, depth + 1)) { found = true; continue; }
    return false;
  }
  return found;
}

function collectRoots(node: Node, out: HTMLElement[]) {
  if (!(node instanceof HTMLElement)) return;
  if (node.matches(EXCLUDE_SEL)) return;
  if (node.matches(ANY_SEL)) {
    if (!isFadedOut(node)) out.push(node);
    return;
  }
  if (!node.querySelector(ANY_SEL)) return;
  if (isPopupWrapper(node)) { out.push(node); return; }
  for (const c of Array.from(node.children)) collectRoots(c, out);
}

function prepareGhost(orig: HTMLElement): HTMLElement {
  const ghost = orig.cloneNode(true) as HTMLElement;
  ghost.setAttribute("data-popup-ghost", "");
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("inert", "");
  ghost.removeAttribute("id");
  ghost.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
  ghost.querySelectorAll("iframe").forEach((f) => { f.removeAttribute("srcdoc"); f.setAttribute("src", "about:blank"); });
  ghost.querySelectorAll("video,audio").forEach((m) => m.removeAttribute("autoplay"));
  return ghost;
}

/** مقدارِ فیلدها، اسکرول و بومِ canvas از نسخه‌ی اصلی — بعد از درج. */
function syncLiveState(orig: HTMLElement, ghost: HTMLElement) {
  const a = [orig, ...Array.from(orig.querySelectorAll("*"))];
  const b = [ghost, ...Array.from(ghost.querySelectorAll("*"))];
  if (a.length !== b.length) return;
  for (let i = 0; i < a.length; i++) {
    const o = a[i], g = b[i];
    if (o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement || o instanceof HTMLSelectElement) {
      try {
        (g as HTMLInputElement).value = o.value;
        if (o instanceof HTMLInputElement) (g as HTMLInputElement).checked = o.checked;
      } catch { /* file inputs */ }
    } else if (o instanceof HTMLCanvasElement) {
      try { (g as HTMLCanvasElement).getContext("2d")?.drawImage(o, 0, 0); } catch { /* webgl/tainted */ }
    }
    const sp = scrollPos.get(o);
    if (sp) { g.scrollTop = sp[0]; g.scrollLeft = sp[1]; }
  }
}

function animateGhost(ghost: HTMLElement, reduced: boolean) {
  const parts = [ghost, ...Array.from(ghost.querySelectorAll<HTMLElement>(ANY_SEL))];
  const faded = new Set<HTMLElement>();
  let longest = 0;
  const anims: Animation[] = [];

  for (const el of parts) {
    if (!el.matches(ANY_SEL) || isFadedOut(el)) continue;
    const isMenu = el.matches(MENU_SEL);
    const isPanel = !isMenu && el.matches(PANEL_SEL);
    const dur = reduced ? REDUCED_OUT_MS : isMenu ? MENU_OUT_MS : OUT_MS;
    // اگر جدی از همین کپی خودش محو می‌شود، این یکی فقط جابه‌جا شود (نه
    // opacityِ دوباره که ضرب شود و زودتر ناپدید شود).
    let parentFades = false;
    for (let p = el.parentElement; p && ghost.contains(p); p = p.parentElement) {
      if (faded.has(p)) { parentFades = true; break; }
      if (p === ghost) break;
    }
    const from: Keyframe = {};
    const to: Keyframe = {};
    if (!parentFades) {
      from.opacity = getComputedStyle(el).opacity || "1";
      to.opacity = "0";
      faded.add(el);
    }
    if (!reduced && (isPanel || isMenu)) {
      from.translate = "0 0";
      to.translate = isMenu ? "0 -6px" : "0 24px";
    }
    if (Object.keys(from).length === 0) continue;
    try {
      anims.push(el.animate([from, to], { duration: dur, easing: EASE_OUT, fill: "forwards" }));
      longest = Math.max(longest, dur);
    } catch { /* WAAPI نیست */ }
  }

  // عنصری که هیچ‌کدام از بخش‌هایش قابل‌انیمیت نبود، بی‌درنگ برود.
  if (!anims.length) { ghost.remove(); return; }
  let done = false;
  const finish = () => { if (done) return; done = true; ghost.remove(); };
  Promise.all(anims.map((a) => a.finished)).then(finish, finish);
  window.setTimeout(finish, longest + 120);
}

export function installPopupExitAnimator(): () => void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") return () => {};
  if (typeof Element.prototype.animate !== "function") return () => {};

  const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  const onScroll = (e: Event) => {
    const t = e.target;
    if (t instanceof Element) scrollPos.set(t, [t.scrollTop, t.scrollLeft]);
  };
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });

  const observer = new MutationObserver((records) => {
    if (document.visibilityState === "hidden") return;
    // حینِ خروج از حساب (lib/logout.ts) صفحه در حالِ ترکه — کپی/انیمیشن هدره.
    if (document.documentElement.hasAttribute("data-logging-out")) return;
    const reduced = reducedMq.matches;
    // React هر فرزندِ یک Fragment (پرده، بعد پنل) را جدا حذف می‌کند؛ nextSiblingِ
    // رکوردِ پرده خودش پنلِ حذف‌شده است. با دنبال‌کردنِ این زنجیره تا اولین
    // گره‌ی هنوز-موجود، کپی‌ها به همان ترتیبِ اصلی درج می‌شوند.
    const nextOf = new Map<Node, Node | null>();
    for (const rec of records) rec.removedNodes.forEach((n) => nextOf.set(n, rec.nextSibling));
    const resolveRef = (n: Node | null, parent: Node) => {
      let guard = 0;
      while (n && n.parentNode !== parent && guard++ < 64) n = nextOf.has(n) ? nextOf.get(n)! : null;
      return n && n.parentNode === parent ? n : null;
    };
    for (const rec of records) {
      if (!rec.removedNodes.length) continue;
      const parent = rec.target;
      if (!(parent instanceof Element) || !parent.isConnected) continue;
      const roots: HTMLElement[] = [];
      // گره‌ای که هنوز در DOM است فقط جابه‌جا شده (insertBefore)، بسته نشده.
      rec.removedNodes.forEach((n) => { if (!n.isConnected) collectRoots(n, roots); });
      if (!roots.length) continue;
      const ref = resolveRef(rec.nextSibling, parent);
      for (const orig of roots) {
        const ghost = prepareGhost(orig);
        parent.insertBefore(ghost, ref);
        syncLiveState(orig, ghost);
        animateGhost(ghost, reduced);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    document.removeEventListener("scroll", onScroll, { capture: true });
  };
}
