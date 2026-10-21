/* LIVE // EARTH — V59 clean SVG Sun/Moon sky canvases.
   Keeps the Home scene untouched; sky presentation is a background canvas only. */
(() => {
  "use strict";
  if (window.__liveEarthSkyViews) return;
  window.__liveEarthSkyViews = true;

  const css = `
  #le-sky-view{position:fixed;inset:0;z-index:8;overflow:hidden;background:#071323;color:#f3f7ff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;touch-action:pan-y}
  #le-sky-view[hidden]{display:none}
  #le-sky-view .le-sky-bg{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;background-color:#071323}
  #le-sky-view[data-view="sun"] .le-sky-bg{background-image:url("./sun-sky-background-responsive.svg")}
  #le-sky-view[data-view="moon"] .le-sky-bg{background-image:url("./moon-sky-background-responsive.svg")}
  #le-sky-view .le-close{position:absolute;z-index:12;top:calc(env(safe-area-inset-top) + 14px);right:16px;width:42px;height:42px;border:1px solid #ffffff55;border-radius:50%;background:#07132388;color:white;font-size:25px;line-height:1;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:pointer}
  body.le-sky-view-open #navButtons{z-index:10!important}
  @media(orientation:landscape){
    #le-sky-view .le-sky-bg{background-position:center center}
    #le-sky-view .le-close{top:calc(env(safe-area-inset-top) + 10px);right:calc(env(safe-area-inset-right) + 14px)}
  }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("section");
  root.id = "le-sky-view";
  root.hidden = true;
  root.setAttribute("aria-label", "Sky View");
  root.innerHTML = `
    <div class="le-sky-bg" aria-hidden="true"></div>
    <button class="le-close" type="button" aria-label="Close Sky View">×</button>
  `;
  document.body.appendChild(root);

  let active = null;
  let previousOverflow = "";
  const closeButton = root.querySelector(".le-close");

  function open(view) {
    if (view !== "sun" && view !== "moon") return;
    active = view;
    root.dataset.view = view;
    root.setAttribute("aria-label", view === "sun" ? "Sun Sky View" : "Moon Sky View");
    root.hidden = false;
    document.body.classList.add("le-sky-view-open");
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent("live-earth-sky-view", {detail:{active:view}}));
  }

  function close() {
    if (!active) return;
    const closed = active;
    active = null;
    root.hidden = true;
    document.body.classList.remove("le-sky-view-open");
    document.body.style.overflow = previousOverflow;
    window.dispatchEvent(new CustomEvent("live-earth-sky-view", {detail:{active:null,closed}}));
  }

  closeButton.addEventListener("click", close);

  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest('.orbButton[data-view]');
    if (!button) return;
    const id = button.dataset.view;
    if (id === "sun" || id === "moon") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (active === id) close();
      else open(id);
      return;
    }
    // Sky View must not intercept Location or Stacks. Earth closes Sky View
    // before the existing Explorer transition continues.
    if (id === "earth" && active) close();
  }, true);

  window.addEventListener("live-earth-location-state", () => {
    // Location is independent of this canvas and must not navigate it.
  });

  window.LiveEarthSkyViews = Object.freeze({
    open,
    close,
    isOpen: () => !!active,
    getActive: () => active
  });
})();
