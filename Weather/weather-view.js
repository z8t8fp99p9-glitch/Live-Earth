/* LIVE // EARTH — Weather: live Japanese ink drawing, 2D.
   Design: expressive English editorial typography + quiet washi-paper ground +
   a weather-generated Japanese landscape. No photographic wallpaper, no 3D,
   no runtime image generation and no automatic geolocation request. */
(() => {
  'use strict';

  const runtime = window.LiveEarthStacksFeatureRuntime;
  if (!runtime || typeof runtime.registerFeature !== 'function') {
    console.error('[LIVE // EARTH] Weather feature runtime is unavailable.');
    return;
  }

  const { mount, el, isActive, globe } = runtime;
  const STYLE_ID = 'le-weather-live-ink-style';
  const API_ROOT = 'https://api.open-meteo.com/v1/forecast';
  const REFRESH_MS = 15 * 60 * 1000;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function addStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .le-sfv--weather{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;overflow:hidden!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:#f4efe9!important;isolation:isolate;pointer-events:none}
      .le-sfv--weather>.le-sfv-panel{display:none!important}
      .le-weather-screen{box-sizing:border-box;--paper:#f4efe9;--paper-deep:#ece6df;--ink:#172123;--muted:#68716f;--accent:#b52c32;position:absolute;inset:0;z-index:1;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;color:var(--ink);background:radial-gradient(ellipse at 76% 45%,rgba(202,211,194,.30),transparent 42%),linear-gradient(160deg,var(--paper),var(--paper-deep));font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;isolation:isolate}
      .le-weather-screen::-webkit-scrollbar{display:none}
      .le-weather-landscape-accents{display:none}
      .le-weather-screen:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.23;background-image:repeating-linear-gradient(7deg,transparent 0 11px,rgba(78,68,51,.035) 12px,transparent 13px),repeating-linear-gradient(93deg,transparent 0 17px,rgba(78,68,51,.025) 18px,transparent 19px);mix-blend-mode:multiply}
      .le-weather-screen[data-phase="night"]{--paper:#202a2a;--paper-deep:#152223;--ink:#f0eee5;--muted:#bdc8bf;--accent:#d36b55;background:radial-gradient(ellipse at 77% 47%,rgba(74,103,98,.28),transparent 45%),linear-gradient(160deg,var(--paper),var(--paper-deep))}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"],.le-weather-screen[data-weather="fog"]{--paper:#e8e9df;--paper-deep:#d7dfd7}
      .le-weather-screen[data-phase="night"][data-weather="rain"],.le-weather-screen[data-phase="night"][data-weather="storm"],.le-weather-screen[data-phase="night"][data-weather="fog"]{--paper:#1b272b;--paper-deep:#101c21}
      .le-weather-content{box-sizing:border-box;--le-weather-scene-height:clamp(24dvh,30dvh,38dvh);position:relative;z-index:2;width:min(100%,760px);margin:0 auto;padding:calc(env(safe-area-inset-top) + 17px) clamp(20px,5vw,34px) calc(env(safe-area-inset-bottom) + 264px)}
      .le-weather-topbar{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;align-items:center;column-gap:12px;row-gap:clamp(16px,2dvh,23px);min-height:31px}
      .le-weather-brand{grid-column:1;grid-row:1;min-width:0;font-size:11px;font-weight:800;letter-spacing:.2em;white-space:nowrap}.le-weather-brand span{font-weight:400;opacity:.65}
      .le-weather-place{grid-column:2;grid-row:1;display:flex;align-items:center;gap:6px;color:var(--muted);font-size:10px;letter-spacing:.04em;white-space:nowrap}
      .le-weather-place svg{width:12px;height:15px;flex:0 0 auto}
      .le-weather-date-row{display:contents}
      .le-weather-date{grid-column:1;grid-row:2;color:var(--muted);font-size:8px;font-weight:750;letter-spacing:.22em;text-transform:uppercase;white-space:nowrap}
      .le-weather-mode{grid-column:2;grid-row:2;justify-self:end;display:flex;align-items:center;gap:5px;min-height:27px;padding:3px 8px;border:1px solid rgba(52,65,56,.22);border-radius:999px;background:rgba(255,255,255,.43);color:var(--muted);font-size:7px;font-weight:800;letter-spacing:.10em;white-space:nowrap}
      .le-weather-mode select{max-width:105px;border:0;outline:0;background:transparent;color:var(--ink);font:750 8px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.035em;appearance:none;-webkit-appearance:none;padding:4px 13px 4px 2px;background-image:linear-gradient(45deg,transparent 50%,var(--ink) 50%),linear-gradient(135deg,var(--ink) 50%,transparent 50%);background-position:calc(100% - 5px) 50%,calc(100% - 1px) 50%;background-size:4px 4px;background-repeat:no-repeat}
      .le-weather-mode option{background:var(--paper);color:var(--ink)}
      .le-weather-screen[data-preview="true"] .le-weather-mode{border-color:rgba(184,68,55,.42);color:var(--accent)}
      .le-weather-hero{position:relative;z-index:2;max-width:520px;margin-top:15px}
      .le-weather-headline{max-width:510px;margin:0;font-family:"Yuji Boku","Kaiti SC","Hiragino Mincho ProN",Georgia,serif;font-size:clamp(48px,12.5vw,80px);font-weight:400;line-height:.91;letter-spacing:-.055em;text-wrap:balance;color:var(--ink)}
      .le-weather-headline em{font-style:italic;font-weight:400;color:var(--ink)}
      .le-weather-headline:after{content:"";display:block;width:34px;height:2px;margin:15px 0 13px;background:var(--accent)}
      .le-weather-temperature-row{position:absolute;top:clamp(8px,2vh,18px);left:clamp(12px,2vw,24px);z-index:3;display:flex;align-items:flex-start;gap:14px;max-width:calc(100% - 24px);margin:0;pointer-events:none}
      .le-weather-temperature{font-family:"Shippori Mincho","Hiragino Mincho ProN",Georgia,serif;font-size:clamp(88px,23vw,128px);font-weight:400;letter-spacing:-.095em;line-height:.82;white-space:nowrap;color:var(--ink)}
      .le-weather-temperature sup{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:.27em;vertical-align:top;letter-spacing:0;margin-left:5px}
      .le-weather-condition{min-width:0;padding:3px 0 4px 14px;border-left:1px solid color-mix(in srgb,var(--ink) 38%,transparent)}
      .le-weather-condition-icon{display:block;width:34px;height:31px;margin-bottom:4px;color:var(--ink)}
      .le-weather-condition-name{font-family:"Shippori Mincho","Hiragino Mincho ProN",Georgia,serif;font-size:clamp(17px,4.4vw,20px);line-height:1.15}
      .le-weather-feels{margin-top:4px;color:var(--muted);font-size:10px}
      .le-weather-dashboard{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"hero" "scene" "summary" "studio";row-gap:12px;align-items:start;margin-top:14px}
      .le-weather-forecast-column,.le-weather-art-column{display:contents}
      .le-weather-hero{grid-area:hero;position:relative;z-index:2;max-width:520px;margin:0}
      .le-weather-art-stage{grid-area:scene;position:relative;z-index:1;height:clamp(190px,30vh,260px);margin:0 -10px;pointer-events:none;overflow:hidden}
      .le-weather-art-canvas{display:block;width:100%;height:100%;touch-action:none}
      .le-weather-summary{grid-area:summary;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:0;padding:12px 0;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent);border-bottom:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
      .le-weather-stat{min-width:0;padding:0 10px;border-right:1px solid color-mix(in srgb,var(--ink) 17%,transparent)}.le-weather-stat:first-child{padding-left:2px}.le-weather-stat:last-child{border-right:0}
      .le-weather-stat-label{display:block;color:var(--muted);font-size:7px;font-weight:750;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
      .le-weather-stat-value{display:block;margin-top:6px;color:var(--ink);font-family:"Shippori Mincho","Hiragino Mincho ProN",Georgia,serif;font-size:clamp(16px,4.2vw,20px);font-weight:400;letter-spacing:-.025em;line-height:1.05;white-space:nowrap}
      .le-weather-studio{grid-area:studio;position:relative;min-width:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--ink) 16%,transparent);border-radius:17px;background:linear-gradient(145deg,rgba(255,255,255,.40),rgba(214,218,204,.20));box-shadow:0 8px 26px rgba(41,48,40,.06),inset 0 1px rgba(255,255,255,.68);padding:13px 13px 10px}
      .le-weather-studio-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px}
      .le-weather-studio-kicker{display:block;color:var(--muted);font-size:7px;font-weight:850;letter-spacing:.20em;text-transform:uppercase}
      .le-weather-studio-title{margin:4px 0 0;font-family:"Yuji Boku","Kaiti SC","Hiragino Mincho ProN",Georgia,serif;font-size:clamp(21px,5.8vw,28px);font-weight:400;line-height:1.05;letter-spacing:-.025em;color:var(--ink)}
      .le-weather-studio-state{flex:0 0 auto;color:var(--accent);font-size:7px;font-weight:850;letter-spacing:.13em;text-align:right;white-space:nowrap;padding-top:2px}
      .le-weather-studio-canvas{display:block;width:100%;height:clamp(180px,28vh,245px);border-radius:10px;background:radial-gradient(ellipse at 50% 46%,rgba(255,255,255,.48),rgba(231,229,215,.12) 72%);touch-action:none}
      .le-weather-studio-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;color:var(--muted);font-size:8px;letter-spacing:.03em}
      .le-weather-art-replay{appearance:none;border:1px solid color-mix(in srgb,var(--ink) 22%,transparent);border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.34);color:var(--ink);font:750 7px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;cursor:pointer}
      .le-weather-art-replay:active{transform:scale(.97)}
      .le-weather-status{min-height:15px;margin:12px 1px 0;color:var(--muted);font-size:8px;line-height:1.45}.le-weather-status:empty{display:none}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"]{--accent:#4e8285}.le-weather-screen[data-weather="snow"]{--accent:#718c9e}.le-weather-screen[data-weather="hot"]{--accent:#bd6945}
      .le-weather-attribution{margin:13px 1px 0;color:var(--muted);font-size:7px;line-height:1.4;opacity:.78}
      @media(min-width:600px) and (orientation:portrait){.le-weather-content{width:min(100%,760px);padding-left:clamp(32px,7vw,60px);padding-right:clamp(32px,7vw,60px)}.le-weather-headline{font-size:clamp(64px,9vw,88px)}.le-weather-temperature{font-size:clamp(104px,17vw,128px)}.le-weather-art-stage{height:var(--le-weather-scene-height,clamp(24dvh,30dvh,38dvh));min-height:clamp(210px,26dvh,280px);max-height:42dvh}.le-weather-studio-canvas{height:clamp(210px,30vh,280px)}}
      /* Landscape: a quiet Weather overview on the left; Live Art is the visual feature on the right.
         Header elements stay inside the physical horizontal safe areas on notched iPhones. */
      @media (orientation:landscape) and (min-width:650px) {
        .le-weather-screen { overflow-y:auto; }
        .le-weather-landscape-accents {
          display:block;
          position:fixed;
          z-index:1;
          inset:0;
          overflow:hidden;
          pointer-events:none;
          opacity:.54;
        }
        .le-weather-landscape-accents svg { display:block;width:100%;height:100%; }
        .le-weather-screen[data-phase="night"] .le-weather-landscape-accents { opacity:.30; }
        /* Landscape receives a warmer washi atmosphere that links the two artworks. */
        .le-weather-screen::after {
          content:"";
          position:fixed;
          z-index:0;
          inset:0;
          pointer-events:none;
          background:
            radial-gradient(ellipse at 3% 4%,rgba(190,91,67,.12) 0,transparent 23%),
            radial-gradient(ellipse at 98% 8%,rgba(138,151,126,.13) 0,transparent 25%),
            radial-gradient(ellipse at 7% 100%,rgba(91,116,99,.20) 0,transparent 30%),
            radial-gradient(ellipse at 94% 100%,rgba(91,116,99,.18) 0,transparent 32%),
            radial-gradient(ellipse at 48% 88%,rgba(196,205,185,.25) 0,transparent 44%),
            radial-gradient(ellipse at 0% 96%,rgba(174,190,170,.18) 0,transparent 24%),
            radial-gradient(ellipse at 100% 96%,rgba(196,170,151,.13) 0,transparent 22%),
            linear-gradient(180deg,rgba(249,245,236,.18),rgba(239,237,226,.035) 55%,rgba(211,218,204,.13));
        }
        .le-weather-content {
          width:min(100%,1380px);
          min-height:100%;
          padding-top:calc(env(safe-area-inset-top) + clamp(8px,1.6vh,12px));
          padding-right:max(env(safe-area-inset-right),clamp(26px,3.4vw,42px));
          padding-bottom:var(--le-weather-dock-clearance,calc(env(safe-area-inset-bottom) + 112px));
          padding-left:max(env(safe-area-inset-left),clamp(26px,3.4vw,42px));
        }
        .le-weather-topbar {
          grid-template-columns:minmax(0,1fr) auto auto auto;
          grid-template-rows:auto;
          column-gap:clamp(11px,1.5vw,20px);
          row-gap:0;
          min-height:40px;
        }
        .le-weather-brand {
          grid-column:1;grid-row:1;
          font-size:clamp(12px,1.35vw,14px);
          letter-spacing:.19em;
        }
        .le-weather-date {
          grid-column:2;grid-row:1;
          font-size:clamp(9px,1.05vw,11px);
          letter-spacing:.16em;
        }
        .le-weather-place {
          grid-column:3;grid-row:1;
          font-size:clamp(9px,1.05vw,11px);
          letter-spacing:.07em;
        }
        .le-weather-place svg { width:14px;height:17px; }
        .le-weather-mode {
          grid-column:4;grid-row:1;
          min-height:35px;
          padding:4px 11px;
          gap:7px;
          font-size:9px;
          letter-spacing:.11em;
        }
        .le-weather-mode select {
          max-width:112px;
          font-size:10px;
          padding:5px 14px 5px 3px;
        }
        .le-weather-dashboard {
          display:grid;
          position:relative;
          isolation:isolate;
          grid-template-columns:minmax(210px,.56fr) minmax(0,1fr);
          grid-template-areas:"forecast artwork";
          --le-weather-landscape-gap:clamp(12px,1.5vw,20px);
          column-gap:var(--le-weather-landscape-gap);
          row-gap:0;
          align-items:stretch;
          --le-weather-landscape-height:clamp(240px,calc(100svh - env(safe-area-inset-top) - max(78px,calc(var(--le-weather-dock-clearance,116px) - 30px)) - 42px),420px);
          height:var(--le-weather-landscape-height);
          margin-top:clamp(7px,1.5vh,11px);
        }
        /* One quiet paper-and-mist atmosphere sits behind both columns. */
        .le-weather-dashboard::before {
          content:"";
          position:absolute;
          z-index:0;
          inset:-26px calc(-1 * clamp(26px,3.4vw,42px)) -30px;
          border-radius:0;
          pointer-events:none;
          background:
            radial-gradient(ellipse at 5% 78%,rgba(112,132,111,.20),transparent 34%),
            radial-gradient(ellipse at 31% 34%,rgba(198,205,187,.29),transparent 46%),
            radial-gradient(ellipse at 68% 54%,rgba(218,207,188,.22),transparent 51%),
            radial-gradient(ellipse at 98% 84%,rgba(112,132,111,.17),transparent 35%),
            linear-gradient(106deg,rgba(247,243,234,.07),rgba(229,234,224,.20) 53%,rgba(247,243,234,.05));
          filter:blur(13px);
        }
        .le-weather-forecast-column {
          grid-area:forecast;
          box-sizing:border-box;
          position:relative;
          z-index:2;
          display:grid;
          grid-template-columns:minmax(0,1fr);
          grid-template-rows:minmax(0,1fr) auto;
          grid-template-areas:"scene" "summary";
          row-gap:6px;
          /* Preserve the lower reading clearance; the painting itself can flow behind it. */
          padding-bottom:clamp(22px,7vh,30px);
          overflow:visible;
          min-width:0;
          min-height:0;
        }
        .le-weather-art-column {
          grid-area:artwork;
          position:relative;
          z-index:3;
          display:grid;
          grid-template-columns:minmax(0,1fr);
          grid-template-rows:minmax(0,1fr);
          grid-template-areas:"studio";
          place-items:center;
          min-width:0;
          min-height:0;
        }
        /* Landscape Weather is a continuous ink-wash field: it reaches across the
           gutter and tucks beneath the foreground Live Art card without changing it. */
        .le-weather-hero {
          position:absolute;
          z-index:4;
          top:0;
          left:0;
          right:0;
          display:block;
          max-width:none;
          min-width:0;
          margin:0;
          pointer-events:none;
        }
        .le-weather-headline {
          width:min(94%,410px);
          max-width:100%;
          margin:0;
          font-size:clamp(40px,4.15vw,57px);
          line-height:.92;
          letter-spacing:-.06em;
          white-space:normal;
          text-wrap:balance;
          text-shadow:0 1px 14px color-mix(in srgb,var(--paper) 90%,transparent);
        }
        .le-weather-headline:after {
          width:36px;
          height:2px;
          margin:9px 0 6px;
        }
        /* The weather illustration occupies the whole forecast scene, not a strip below the headline. */
        .le-weather-art-stage {
          --le-weather-scene-flow-x:clamp(42px,5.6vw,82px);
          --le-weather-scene-flow-y:clamp(22px,3.2vh,30px);
          grid-area:scene;
          position:relative;
          z-index:1;
          isolation:isolate;
          box-sizing:border-box;
          width:calc(100% + var(--le-weather-landscape-gap) + var(--le-weather-scene-flow-x));
          height:calc(100% + var(--le-weather-scene-flow-y));
          min-height:120px;
          max-height:none;
          margin:0 0 calc(-1 * var(--le-weather-scene-flow-y));
          overflow:hidden;
          border-radius:0;
        }
        /* Extend the same Weather painting through the full left column and into
           the lower margin. The Live Art area remains a separate foreground panel. */
        .le-weather-forecast-column > .le-weather-art-stage {
          position:absolute;
          top:0;
          left:0;
          width:calc(100% + var(--le-weather-landscape-gap) + var(--le-weather-scene-flow-x));
          height:calc(100% + max(72px,calc(var(--le-weather-dock-clearance,116px) - 24px)) + var(--le-weather-scene-flow-y));
          min-height:0;
          margin:0;
          overflow:hidden;
          pointer-events:none;
        }
        .le-weather-art-canvas {
          position:absolute;
          inset:0;
          display:block;
          width:100%;
          height:100%;
          aspect-ratio:auto;
          transform:none;
        }
        .le-weather-temperature-row {
          position:absolute;
          z-index:3;
          top:clamp(108px,19vh,140px);
          left:clamp(7px,1vw,13px);
          display:flex;
          align-items:flex-start;
          gap:clamp(8px,1vw,13px);
          max-width:calc(100% - 18px);
          filter:drop-shadow(0 1px 12px color-mix(in srgb,var(--paper) 76%,transparent));
        }
        .le-weather-temperature { font-size:clamp(72px,5.8vw,94px); }
        .le-weather-condition { padding:4px 0 3px 12px; }
        .le-weather-condition-icon { width:36px;height:34px;margin-bottom:4px; }
        .le-weather-condition-name { font-size:clamp(19px,1.55vw,22px); }
        .le-weather-feels { margin-top:5px;font-size:12px; }
        .le-weather-summary {
          grid-area:summary;
          position:relative;
          z-index:5;
          align-self:end;
          margin:0;
          padding:6px 0;
          background:linear-gradient(90deg,color-mix(in srgb,var(--paper) 29%,transparent),color-mix(in srgb,var(--paper) 12%,transparent));
          backdrop-filter:blur(2px);
          -webkit-backdrop-filter:blur(2px);
        }
        .le-weather-stat { padding:0 5px; }
        .le-weather-stat:first-child { padding-left:1px; }
        .le-weather-stat-label { font-size:9px;letter-spacing:.065em; }
        .le-weather-stat-value { margin-top:5px;font-size:clamp(17px,1.9vw,20px); }

        /* Live Art keeps the same 10:7 frame in both orientations.
           Its width follows the available height; the art column centres it on both axes. */
        .le-weather-studio {
          grid-area:studio;
          box-sizing:border-box;
          position:relative;
          display:block;
          width:min(100%,calc(var(--le-weather-landscape-height) * 1.428571));
          height:auto;
          aspect-ratio:10 / 7;
          min-height:0;
          max-height:100%;
          justify-self:center;
          align-self:center;
          margin:0;
          padding:0;
          overflow:hidden;
          isolation:isolate;
          border-radius:17px;
        }
        .le-weather-studio-canvas {
          position:absolute;
          inset:0;
          display:block;
          width:100%;
          height:100%;
          aspect-ratio:auto;
          max-width:none;
          min-height:0;
          transform:none;
          border-radius:0;
          background:transparent;
          touch-action:none;
        }
        .le-weather-studio:after {
          content:"";
          position:absolute;
          z-index:1;
          inset:0;
          pointer-events:none;
          background:linear-gradient(
            180deg,
            color-mix(in srgb,var(--paper) 76%,transparent) 0%,
            color-mix(in srgb,var(--paper) 16%,transparent) 32%,
            transparent 59%,
            color-mix(in srgb,var(--paper) 66%,transparent) 100%
          );
        }
        .le-weather-studio-head {
          position:absolute;
          z-index:2;
          top:clamp(13px,2vh,18px);
          left:clamp(16px,2vw,24px);
          right:clamp(16px,2vw,24px);
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          margin:0;
          pointer-events:none;
          text-shadow:0 1px 10px rgba(245,243,231,.94);
        }
        .le-weather-studio-head > div { min-width:0;flex:1 1 auto; }
        .le-weather-studio-kicker {
          display:block;
          font-size:clamp(8px,.9vw,10px);
          line-height:1.15;
          letter-spacing:.17em;
        }
        .le-weather-studio-title {
          margin:6px 0 0;
          font-size:clamp(22px,2.8vw,31px);
          line-height:1.02;
          max-width:100%;
          white-space:normal;
          overflow:visible;
          text-overflow:clip;
          text-wrap:balance;
        }
        .le-weather-studio-state {
          flex:0 0 auto;
          padding-top:2px;
          font-size:clamp(8px,.9vw,10px);
          line-height:1.1;
          letter-spacing:.13em;
          white-space:nowrap;
          text-shadow:0 1px 10px rgba(245,243,231,.98);
        }
        .le-weather-studio-foot {
          position:absolute;
          z-index:2;
          left:clamp(16px,2vw,24px);
          right:clamp(16px,2vw,24px);
          bottom:clamp(12px,1.8vh,17px);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin:0;
          font-size:clamp(9px,1vw,11px);
          line-height:1.2;
          text-shadow:0 1px 10px rgba(245,243,231,.98);
        }
        .le-weather-studio-foot > span {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .le-weather-art-replay {
          flex:0 0 auto;
          min-height:32px;
          padding:7px 13px;
          font-size:9px;
          line-height:1;
          pointer-events:auto;
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          background:rgba(255,255,255,.68);
        }
        .le-weather-status,.le-weather-attribution {
          position:absolute!important;
          width:1px!important;
          height:1px!important;
          padding:0!important;
          margin:-1px!important;
          overflow:hidden!important;
          clip:rect(0,0,0,0)!important;
          clip-path:inset(50%)!important;
          white-space:nowrap!important;
          border:0!important;
        }
      }
      @media (orientation:landscape) and (min-width:650px) and (max-width:820px) {
        .le-weather-headline { width:min(94%,370px);font-size:clamp(37px,4.5vw,47px); }
        .le-weather-temperature-row { top:clamp(100px,19vh,120px); }
        .le-weather-temperature { font-size:clamp(68px,7.2vw,82px); }
        .le-weather-condition-name { font-size:clamp(18px,2vw,20px); }
        .le-weather-stat-label { font-size:8.5px; }
        .le-weather-stat-value { font-size:clamp(16px,2vw,18px); }
        /* Keep the compact landscape masthead on one line to protect painting height. */
        .le-weather-topbar {
          grid-template-columns:minmax(0,1fr) auto auto auto;
          grid-template-rows:auto;
          column-gap:clamp(7px,1.1vw,11px);
          row-gap:0;
          min-height:38px;
        }
        .le-weather-brand { grid-column:1;grid-row:1;font-size:10px;letter-spacing:.14em; }
        .le-weather-date { grid-column:2;grid-row:1;font-size:8px;letter-spacing:.08em; }
        .le-weather-place { grid-column:3;grid-row:1;font-size:8px;letter-spacing:.03em; }
        .le-weather-place svg { width:11px;height:13px; }
        .le-weather-mode { grid-column:4;grid-row:1;min-height:29px;padding:2px 7px;gap:4px;font-size:7px; }
        .le-weather-mode select { max-width:72px;font-size:8px;padding-right:11px; }
        .le-weather-dashboard {
          --le-weather-landscape-height:clamp(220px,calc(100svh - env(safe-area-inset-top) - max(82px,calc(var(--le-weather-dock-clearance,116px) - 22px)) - 44px),320px);
          height:var(--le-weather-landscape-height);
        }
      }
      @media (orientation:landscape) and (max-height:390px) {
        .le-weather-dashboard {
          --le-weather-landscape-height:clamp(196px,calc(100svh - env(safe-area-inset-top) - max(78px,calc(var(--le-weather-dock-clearance,108px) - 16px)) - 48px),288px);
          height:var(--le-weather-landscape-height);
        }
        .le-weather-content { padding-top:calc(env(safe-area-inset-top) + 6px); }
        .le-weather-topbar { min-height:34px; }
        .le-weather-brand { font-size:clamp(11px,1.2vw,12px); }
        .le-weather-date { font-size:clamp(8px,.95vw,9px); }
        .le-weather-place { font-size:clamp(8px,.95vw,9px); }
        .le-weather-mode { min-height:31px;padding:3px 9px; }
        .le-weather-headline { width:min(94%,350px);font-size:clamp(34px,4.2vw,44px); }
        .le-weather-temperature-row { top:clamp(88px,20vh,108px); }
        .le-weather-temperature { font-size:clamp(62px,7.3vw,76px); }
        .le-weather-condition-name { font-size:clamp(17px,2vw,19px); }
        .le-weather-feels { font-size:11px; }
        .le-weather-stat-label { font-size:8px; }
        .le-weather-stat-value { font-size:clamp(15px,1.9vw,17px); }
        .le-weather-studio-title { font-size:clamp(20px,2.5vw,26px); }
      }
      @media(max-width:430px){.le-weather-content{padding-left:17px;padding-right:17px;padding-bottom:calc(env(safe-area-inset-bottom) + 278px)}.le-weather-date-row{margin-top:24px;align-items:flex-start}.le-weather-headline{font-size:clamp(48px,12.5vw,80px)}.le-weather-temperature{font-size:clamp(88px,23vw,128px)}.le-weather-art-stage{height:var(--le-weather-scene-height);min-height:clamp(190px,24dvh,260px);max-height:42dvh;margin-left:-9px;margin-right:-9px}.le-weather-summary{padding:10px 0}.le-weather-stat{padding:0 6px}.le-weather-stat-label{font-size:6px;letter-spacing:.08em}.le-weather-stat-value{font-size:11px}.le-weather-studio{padding:11px 10px 9px;border-radius:14px}.le-weather-studio-title{font-size:clamp(21px,5.8vw,28px)}.le-weather-studio-canvas{height:clamp(138px,18vh,155px)}}

      /* Portrait composition: the weather readings and artwork form one scene.
         Live Art is a full-card painting with its controls layered above it. */
      @media (orientation:portrait) {
        .le-weather-content {
          padding-top:calc(env(safe-area-inset-top) + clamp(20px,2.4dvh,28px));
          padding-bottom:var(--le-weather-dock-clearance,calc(env(safe-area-inset-bottom) + 112px));
        }
        .le-weather-topbar { row-gap:clamp(12px,1.45dvh,16px); }
        .le-weather-dashboard {
          grid-template-areas:"scene" "summary" "studio";
          margin-top:clamp(6px,.7dvh,8px);
          row-gap:clamp(5px,.6dvh,7px);
        }
        .le-weather-hero {
          position:absolute;
          z-index:4;
          top:0;
          left:0;
          right:0;
          display:block;
          margin:0;
          pointer-events:none;
        }
        .le-weather-headline {
          position:relative;
          z-index:4;
          width:min(78%,330px);
          margin:0;
          text-shadow:0 1px 12px color-mix(in srgb,var(--paper) 88%,transparent);
          font-size:clamp(48px,12.5vw,80px);
        }
        .le-weather-art-stage {
          grid-area:scene;
          position:relative;
          isolation:isolate;
          box-sizing:border-box;
          width:100vw;
          height:var(--le-weather-scene-height,clamp(24dvh,30dvh,38dvh));
          min-height:clamp(190px,24dvh,260px);
          max-height:42dvh;
          margin:0;
          margin-left:calc(50% - 50vw);
          margin-right:calc(50% - 50vw);
          overflow:hidden;
        }
        .le-weather-art-canvas {
          position:absolute;
          inset:0;
          display:block;
          width:100%;
          height:100%;
          aspect-ratio:auto;
          transform:none;
        }
        /* Text stays at its original screen position while the weather painting rises. */
        .le-weather-temperature-row {
          position:absolute;
          z-index:3;
          top:clamp(108px,15dvh,132px);
          left:18px;
          width:min(calc(100% - 36px),60dvh);
          max-width:100%;
          margin:0;
          align-items:flex-start;
          transform:none;
          pointer-events:none;
          filter:drop-shadow(0 1px 10px color-mix(in srgb,var(--paper) 62%,transparent));
        }
        .le-weather-temperature { font-size:clamp(88px,23vw,128px); }
        .le-weather-condition { padding-top:5px; }
        .le-weather-condition-icon { width:36px;height:34px;margin-bottom:3px; }
        .le-weather-condition-name { font-size:clamp(17px,4.4vw,20px); }
        .le-weather-feels { font-size:10px; }
        .le-weather-summary { padding:10px 0; }
        .le-weather-stat-label { font-size:7.5px;letter-spacing:.10em; }
        .le-weather-stat-value { margin-top:5px;font-size:15px; }

        /* The painting reaches every edge of its inset card; copy is overlay UI. */
        .le-weather-studio {
          box-sizing:border-box;
          position:relative;
          width:min(90vw,760px,max(260px,calc((100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,112px) - 360px) * 1.428571)));
          height:auto;
          aspect-ratio:10 / 7;
          margin-inline:auto;
          min-height:0;
          max-height:none;
          margin:0 auto;
          padding:0;
          display:block;
          overflow:hidden;
          isolation:isolate;
          border:1px solid color-mix(in srgb,var(--ink) 18%,transparent);
          border-radius:17px;
          background:linear-gradient(145deg,rgba(255,255,255,.34),rgba(214,218,204,.18));
          box-shadow:0 5px 18px rgba(41,48,40,.055),inset 0 1px rgba(255,255,255,.6);
        }
        .le-weather-studio-canvas {
          position:absolute;
          inset:0;
          display:block;
          width:100%;
          height:100%;
          aspect-ratio:auto;
          max-width:none;
          min-height:0;
          transform:none;
          border-radius:0;
          background:transparent;
          touch-action:none;
        }
        .le-weather-studio:after {
          content:"";
          position:absolute;
          z-index:1;
          inset:0;
          pointer-events:none;
          background:linear-gradient(180deg,color-mix(in srgb,var(--paper) 72%,transparent) 0%,color-mix(in srgb,var(--paper) 12%,transparent) 34%,transparent 62%,color-mix(in srgb,var(--paper) 62%,transparent) 100%);
        }
        .le-weather-studio-head {
          position:absolute;
          z-index:2;
          top:11px;
          left:14px;
          right:14px;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:8px;
          margin:0;
          pointer-events:none;
          text-shadow:0 1px 9px rgba(245,243,231,.92);
        }
        .le-weather-studio-head > div { min-width:0; }
        .le-weather-studio-kicker {
          display:block;
          font-size:7px;
          line-height:1.15;
          letter-spacing:.17em;
        }
        .le-weather-studio-title {
          margin:4px 0 0;
          font-size:clamp(21px,5.8vw,28px);
          line-height:1.03;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .le-weather-studio-state {
          flex:0 0 auto;
          padding-top:1px;
          font-size:7px;
          line-height:1.1;
          letter-spacing:.12em;
          white-space:nowrap;
          text-shadow:0 1px 9px rgba(245,243,231,.96);
        }
        .le-weather-studio-foot {
          position:absolute;
          z-index:2;
          left:14px;
          right:14px;
          bottom:9px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          margin:0;
          font-size:7px;
          line-height:1.1;
          text-shadow:0 1px 9px rgba(245,243,231,.96);
        }
        .le-weather-studio-foot > span {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }
        .le-weather-art-replay {
          flex:0 0 auto;
          min-height:29px;
          padding:6px 12px;
          font-size:8px;
          line-height:1;
          pointer-events:auto;
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          background:rgba(255,255,255,.62);
        }
        .le-weather-status,.le-weather-attribution {
          position:absolute!important;
          width:1px!important;
          height:1px!important;
          padding:0!important;
          margin:-1px!important;
          overflow:hidden!important;
          clip:rect(0,0,0,0)!important;
          clip-path:inset(50%)!important;
          white-space:nowrap!important;
          border:0!important;
        }
      }

      /* USER VISUAL EDITOR TUNING — LANDSCAPE ONLY
         Based on the supplied 912x420 preview. Percent translations stay viewport-relative.
         Nested scales are intentionally softened to avoid multiplying the raw editor values. */
      @media (orientation:landscape) and (min-width:650px) {
        .le-weather-content {
          transform:translate3d(-.35vw,0,0) scale(1);
          transform-origin:center top;
        }
        .le-weather-dashboard {
          transform:translate3d(0,0,0) scale(1.006);
          transform-origin:center center;
        }
        .le-weather-forecast-column {
          transform:translate3d(3.1vw,0,0) scale(1.05);
          transform-origin:center center;
        }
        .le-weather-headline {
          transform:translate3d(2.6vw,2.4vh,0) scale(1.11);
          transform-origin:center center;
        }
        .le-weather-temperature {
          transform:translate3d(1.2vw,2.3vh,0) scale(1.31);
          transform-origin:center center;
        }
        .le-weather-condition {
          transform:translate3d(1.65vw,.35vh,0) scale(.92);
          transform-origin:center center;
        }
        .le-weather-art-column {
          transform:translate3d(4vw,-1.4vh,0) scale(.98);
          transform-origin:center center;
        }
        .le-weather-studio-title {
          transform:translate3d(-.9vw,-.15vh,0) scale(.95);
          transform-origin:center center;
        }
        /* Attribution stays visually hidden in Landscape for screen-reader semantics. */
      }

      @media (orientation:landscape) and (min-width:650px) and (max-width:820px) {
        .le-weather-content { transform:translate3d(-.25vw,0,0) scale(1); }
        .le-weather-dashboard { transform:scale(1.003); }
        .le-weather-forecast-column { transform:translate3d(2vw,0,0) scale(1.03); }
        .le-weather-headline { transform:translate3d(1.8vw,1.8vh,0) scale(1.06); }
        .le-weather-temperature { transform:translate3d(.6vw,1.6vh,0) scale(1.20); }
        .le-weather-condition { transform:translate3d(1vw,.2vh,0) scale(.95); }
        .le-weather-art-column { transform:translate3d(2vw,-.8vh,0) scale(.995); }
        .le-weather-studio-title { transform:translate3d(-.4vw,-.1vh,0) scale(.97); }
      }

      @media (orientation:landscape) and (max-height:390px) {
        .le-weather-headline { transform:translate3d(2vw,1.5vh,0) scale(1.06); }
        .le-weather-temperature { transform:translate3d(.65vw,1.2vh,0) scale(1.18); }
        .le-weather-condition { transform:translate3d(1vw,.2vh,0) scale(.95); }
        .le-weather-art-column { transform:translate3d(2.4vw,-.65vh,0) scale(.995); }
        .le-weather-studio-title { transform:translate3d(-.4vw,-.1vh,0) scale(.97); }
      }

      @media(prefers-reduced-motion:reduce){.le-weather-screen *,.le-weather-screen *:before,.le-weather-screen *:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      @media(prefers-reduced-transparency:reduce){.le-weather-mode{background:var(--paper)}}
      /* Temporary in-view size/position editor. It only adds editing controls; all edits stay in memory. */
      .le-weather-layout-edit-toggle{position:fixed;z-index:2147483000;left:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);appearance:none;border:1px solid rgba(255,255,255,.42);border-radius:999px;padding:10px 14px;background:rgba(22,34,34,.92);color:#fff;font:800 10px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.13em;box-shadow:0 5px 18px rgba(0,0,0,.24);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:pointer;pointer-events:auto}
      .le-weather-layout-edit-panel{position:fixed;z-index:2147483000;left:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);box-sizing:border-box;width:min(390px,calc(100vw - 24px));max-height:min(52dvh,258px);overflow:auto;border:1px solid rgba(255,255,255,.20);border-radius:16px;padding:11px 12px;background:rgba(20,29,31,.96);color:#f7f5ed;box-shadow:0 12px 34px rgba(0,0,0,.32);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;overscroll-behavior:contain}
      .le-weather-layout-edit-panel[hidden],.le-weather-layout-edit-toggle[hidden]{display:none!important}
      .le-weather-layout-edit-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      .le-weather-layout-edit-title{font-size:10px;font-weight:850;letter-spacing:.15em;color:#fff}
      .le-weather-layout-edit-close,.le-weather-layout-edit-action{appearance:none;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:7px 10px;background:rgba(255,255,255,.09);color:#fff;font:750 9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.06em;cursor:pointer}
      .le-weather-layout-edit-select{box-sizing:border-box;width:100%;margin:0 0 7px;border:1px solid rgba(255,255,255,.22);border-radius:9px;padding:8px 9px;background:#293638;color:#fff;font:650 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .le-weather-layout-edit-row{display:grid;grid-template-columns:42px minmax(0,1fr) 48px;align-items:center;gap:8px;margin:5px 0}
      .le-weather-layout-edit-row label{font-size:9px;font-weight:800;letter-spacing:.08em;color:#d5ddd5}
      .le-weather-layout-edit-row input{width:100%;min-width:0;accent-color:#9bc6b3}
      .le-weather-layout-edit-value{font-size:9px;text-align:right;font-variant-numeric:tabular-nums;color:#f1d8b9}
      .le-weather-layout-edit-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
      .le-weather-layout-edit-copy{background:#dce8dc;color:#1a2a28;border-color:#dce8dc}
      .le-weather-layout-edit-status{min-height:13px;margin-top:7px;color:#c3d2c5;font-size:9px;line-height:1.35}
      .le-weather-layout-edit-json{box-sizing:border-box;width:100%;margin-top:7px;min-height:62px;border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:7px;background:#111a1c;color:#e8eee6;font:9px ui-monospace,SFMono-Regular,monospace;white-space:pre;}
      .le-weather-layout-edit-json[hidden]{display:none!important}
      .le-weather-screen.le-layout-editing [data-le-layout-id]{pointer-events:auto!important;touch-action:none!important;cursor:move!important;outline:1px dashed rgba(77,151,184,.28)!important;outline-offset:2px!important}
      .le-weather-screen.le-layout-editing [data-le-layout-selected="true"]{outline:2px solid #80c7ff!important;outline-offset:3px!important;filter:drop-shadow(0 0 5px rgba(70,166,255,.58))!important}
      .le-weather-layout-edit-handle{position:fixed;z-index:2147483001;width:23px;height:23px;margin:-11px 0 0 -11px;border:2px solid #fff;border-radius:50%;background:#248bd2;box-shadow:0 2px 10px #0008;touch-action:none;cursor:nwse-resize;pointer-events:auto}
      .le-weather-layout-edit-handle[hidden]{display:none!important}
      @media (orientation:portrait){.le-weather-layout-edit-toggle,.le-weather-layout-edit-panel,.le-weather-layout-edit-handle{display:none!important}}


    `;
    document.head.appendChild(style);
  }

  const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const hourOf = value => { const match = /T(\d{2}):/.exec(String(value || '')); return match ? Number(match[1]) : new Date().getHours(); };
  const isSnow = code => [71,73,75,77,85,86].includes(Number(code));
  const isRain = code => [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(Number(code));
  const isFog = code => [45,48].includes(Number(code));
  function conditionKind(code) {
    const n = Number(code);
    if ([95,96,99].includes(n)) return 'storm';
    if (isSnow(n)) return 'snow';
    if (isRain(n)) return 'rain';
    if (isFog(n)) return 'fog';
    if ([2,3].includes(n)) return 'cloudy';
    return 'clear';
  }
  function visualState(current) {
    const hour = hourOf(current.time);
    const night = Number(current.is_day) === 0;
    const phase = night ? 'night' : hour < 7 ? 'dawn' : hour >= 17 && hour < 20 ? 'evening' : 'day';
    const code = Number(current.weather_code);
    const wind = number(current.wind_speed_10m) ?? 0;
    let weather = conditionKind(code);
    if (weather === 'clear' && wind >= 30) weather = 'wind';
    if (number(current.temperature_2m) >= 35 && weather === 'clear') weather = 'hot';
    return { weather, phase, wind, direction: number(current.wind_direction_10m) ?? 270, precipitation: number(current.precipitation) ?? 0, snowfall: number(current.snowfall) ?? 0, cloud: number(current.cloud_cover) ?? 0 };
  }
  function conditionLabel(code, kind) {
    if (kind === 'wind') return 'Windy';
    if (kind === 'hot') return 'Clear and warm';
    const n = Number(code);
    if (n === 0) return 'Clear sky';
    if (n === 1) return 'Mainly clear';
    if (n === 2) return 'Partly cloudy';
    if (n === 3) return 'Overcast';
    if ([45,48].includes(n)) return 'Fog';
    if ([51,53,55,56,57].includes(n)) return 'Drizzle';
    if ([61,63,65,66,67,80,81,82].includes(n)) return 'Rain';
    if ([71,73,75,77,85,86].includes(n)) return 'Snow';
    if ([95,96,99].includes(n)) return 'Thunderstorm';
    return 'Current conditions';
  }
  function headlineFor(kind, phase) {
    const phrases = {
      clear: phase === 'night' ? 'A quiet night' : 'A bright day',
      cloudy: 'Clouds in motion', rain: phase === 'night' ? 'Rain after dark' : 'A rainy day',
      storm: 'A storm is passing', snow: 'A softer kind of snow', fog: 'A world in mist',
      wind: 'A day in motion', hot: 'Under a warm sun'
    };
    return phrases[kind] || 'Weather, in the moment';
  }
  function compass(value) {
    const n = number(value); if (n === null) return '—';
    return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(n / 22.5) % 16];
  }
  function formatLocalTime(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || ''));
    if (!match) return deviceClock();
    const [,year,month,day,hour,minute] = match;
    const date = new Date(Date.UTC(Number(year),Number(month)-1,Number(day)));
    const dayLabel = new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(date);
    const h = Number(hour);
    return `${dayLabel} · ${String(h % 12 || 12).padStart(2,'0')}:${minute} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function deviceClock() {
    const now = new Date();
    return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(now);
  }
  function localWallTime(date) {
    const pad = n => String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function sampleData(kind) {
    const samples = {
      clear:[27,29,0,5,51,6,315,28,17,0,0], cloudy:[22,23,3,88,67,9,250,24,18,15,0],
      rain:[17,15,63,96,88,6,247,17,12,80,2.8], storm:[15,11,95,100,94,38,290,17,13,100,6.2],
      snow:[1,-4,73,94,91,18,30,2,-3,75,.8], fog:[8,7,45,100,99,3,160,11,6,5,0],
      wind:[21,20,0,22,48,36,290,24,16,8,0], night:[18,17,0,4,63,4,15,21,15,0,0], hot:[38,40,0,2,27,8,90,40,26,0,0]
    };
    const [temp,feels,code,cloud,humidity,wind,direction,high,low,chance,precip]=samples[kind] || samples.clear;
    const localHour=new Date().getHours();
    const isNight = kind === 'night' || (kind === 'auto' && (localHour < 6 || localHour >= 19));
    const isDay = kind === 'auto' ? localHour >= 6 && localHour < 19 : kind !== 'night';
    return {
      current:{time:localWallTime(new Date()),temperature_2m:temp,apparent_temperature:feels,is_day:isNight?0:(isDay?1:0),precipitation:precip,rain:precip,snowfall:kind==='snow'?precip:0,weather_code:code,cloud_cover:cloud,wind_speed_10m:wind,wind_direction_10m:direction,wind_gusts_10m:wind*1.4},
      daily:{temperature_2m_max:[high],temperature_2m_min:[low],precipitation_probability_max:[chance]}
    };
  }
  function svgIcon(kind) {
    const paths = {
      clear:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M1 12h3m16 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
      cloudy:'<path d="M6 18h11a4 4 0 0 0 .3-8A6 6 0 0 0 6 8a5 5 0 0 0 0 10Z"/>',
      rain:'<path d="M6 15h11a4 4 0 0 0 .3-8A6 6 0 0 0 6 5a5 5 0 0 0 0 10Zm1 3-1 3m7-3-1 3m7-3-1 3"/>',
      storm:'<path d="M6 14h11a4 4 0 0 0 .3-8A6 6 0 0 0 6 4a5 5 0 0 0 0 10Z M13 14l-3 5h3l-1 4 5-7h-3l1-2"/>',
      snow:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2m-6 16 3-2 3 2"/>',
      fog:'<path d="M3 8h18M1 12h22M4 16h16M7 20h10"/>',
      wind:'<path d="M2 8h13a3 3 0 1 0-3-3M1 12h18a3 3 0 1 1-3 3M3 17h9"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.clear}</svg>`;
  }
  function setText(root,id,value){const node=root.querySelector(`#${id}`);if(node)node.textContent=value==null||value===''?'—':String(value);}
  function setTemp(root,value){const node=root.querySelector('#le-weather-temperature');if(!node)return;node.replaceChildren(document.createTextNode(value==null?'—':String(Math.round(value))));if(value!=null){const sup=document.createElement('sup');sup.textContent='°';node.append(sup);}}
  function paintData(screen,data,preview=false){
    const c=data.current||{},d=data.daily||{};const state=visualState(c);
    screen.dataset.weather=state.weather;screen.dataset.phase=state.phase;screen.dataset.preview=String(preview);screen.dataset.hasdata='true';
    setText(screen,'le-weather-place-text',preview?'LOCATION PREVIEW':'YOUR LOCATION');
    setText(screen,'le-weather-date',formatLocalTime(c.time));
    setText(screen,'le-weather-headline',headlineFor(state.weather,state.phase));
    const title=screen.querySelector('#le-weather-headline');if(title){const words=headlineFor(state.weather,state.phase).split(' ');const cut=Math.max(1,Math.ceil(words.length*.58));title.replaceChildren(document.createTextNode(words.slice(0,cut).join(' ')),document.createElement('br'));const em=document.createElement('em');em.textContent=words.slice(cut).join(' ');title.append(em);}
    setTemp(screen,number(c.temperature_2m));setText(screen,'le-weather-condition',conditionLabel(c.weather_code,state.weather));
    setText(screen,'le-weather-feels',number(c.apparent_temperature)==null?'':`Feels like ${Math.round(c.apparent_temperature)}°`);
    const icon=screen.querySelector('#le-weather-condition-icon');if(icon)icon.innerHTML=svgIcon(state.weather);
    setText(screen,'le-weather-highlow',`${number(d.temperature_2m_max?.[0])==null?'—':Math.round(d.temperature_2m_max[0])+'°'} / ${number(d.temperature_2m_min?.[0])==null?'—':Math.round(d.temperature_2m_min[0])+'°'}`);
    setText(screen,'le-weather-rainchance',number(d.precipitation_probability_max?.[0])==null?'—':`${Math.round(d.precipitation_probability_max[0])}%`);
    setText(screen,'le-weather-wind',number(c.wind_speed_10m)==null?'—':`${compass(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} km/h`);
    screen.__weatherState=state;
    screen.__weatherCurrent=c;
    setText(screen,'le-weather-status',preview?'SAMPLE DATA · Choose AUTO to return to live weather when Location is enabled.':'');
  }
  function resetToSample(screen,kind='clear',message='Location is off. Showing a clearly labelled sample scene.'){
    paintData(screen,sampleData(kind),true);setText(screen,'le-weather-status',message);
  }

  // Deterministic 2D Japanese ink drawing. The scene is redrawn locally from
  // live weather state: no wallpaper, no image download, no WebGL or AI call.
  function makePainter(canvas){
    let ctx=null;try{ctx=canvas.getContext('2d',{alpha:true});}catch(_){ctx=null;}if(!ctx)return {setState(){},stop(){}};
    let width=0,height=0,dpr=1,raf=0,last=0,elapsed=0,state={weather:'clear',phase:'day',wind:4,direction:270,precipitation:0,snowfall:0,cloud:12};
    let snowLoad=0;
    const reduced=reducedMotion();
    const resize=()=>{const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
    const palette=()=>state.phase==='night'?{ink:'#f0f1e8',soft:'#c0cec3',ridge:'#80978b',water:'#91b1aa',accent:'#e58a78',paper:'#dce4d8'}:{ink:'#27332d',soft:'#748176',ridge:'#9aa99d',water:'#91aaa2',accent:'#c77b75',paper:'#eae6de'};
    const line=(points,color,alpha=1,widthPx=1.3)=>{ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=widthPx;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore();};
    const wash=(x,y,w,h,color,alpha)=>{ctx.save();ctx.globalAlpha=alpha;const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,color);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.restore();};
    function drawSky(p,t){
      const {ink,soft,accent}=p;
      const night=state.phase==='night';
      const sx=width*(state.phase==='evening'?.76:.75);
      const sy=height*.33;
      const radius=Math.min(width,height)*.112;

      // A single softly pigmented sun/moon, not a set of concentric interface rings.
      ctx.save();
      const sun=ctx.createRadialGradient(sx-radius*.25,sy-radius*.32,radius*.08,sx,sy,radius*1.08);
      sun.addColorStop(0,night?'#dbe4dc':'#df9a89');
      sun.addColorStop(.74,night?'#c8d8cf':accent);
      sun.addColorStop(1,night?'rgba(179,202,189,.72)':'rgba(184,91,83,.70)');
      ctx.globalAlpha=state.weather==='storm'?.54:state.weather==='fog'?.42:.78;
      ctx.fillStyle=sun;
      ctx.beginPath();ctx.arc(sx,sy,radius,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.beginPath();ctx.arc(sx,sy,radius*.94,0,Math.PI*2);ctx.clip();
      ctx.globalAlpha=night?.12:.14;ctx.strokeStyle=night?'#f1f2e9':'#f8e7d9';ctx.lineWidth=.7;
      for(let i=0;i<4;i++){
        const yy=sy-radius*.48+i*radius*.30;
        ctx.beginPath();ctx.moveTo(sx-radius,yy);ctx.bezierCurveTo(sx-radius*.35,yy-1.5,sx+radius*.28,yy+1.3,sx+radius,yy-.3);ctx.stroke();
      }
      ctx.restore();
      if(night){
        ctx.globalCompositeOperation='destination-out';
        ctx.beginPath();ctx.arc(sx+radius*.37,sy-radius*.22,radius*.84,0,Math.PI*2);ctx.fill();
        ctx.globalCompositeOperation='source-over';
      }
      ctx.restore();

      // Sparse cloud contours retain the Japanese negative-space quality.
      const cloudCount=state.cloud>78?2:state.cloud>43?1:0;
      for(let i=0;i<cloudCount;i++){
        const x=width*(.42+i*.25)+Math.sin(t*.10+i)*Math.max(1.5,state.wind*.22);
        const y=height*(.25+i*.075);
        const scale=Math.min(width,height)*(.050+i*.008);
        ctx.save();ctx.globalAlpha=(.18+state.cloud/520)*(night?1.15:1);ctx.strokeStyle=soft;ctx.lineWidth=1.1;ctx.lineCap='round';ctx.lineJoin='round';
        ctx.beginPath();ctx.moveTo(x-scale*1.35,y+scale*.2);
        ctx.bezierCurveTo(x-scale*1.1,y-scale*.28,x-scale*.48,y-scale*.34,x-scale*.24,y-scale*.02);
        ctx.bezierCurveTo(x-scale*.04,y-scale*.72,x+scale*.9,y-scale*.57,x+scale*.92,y-scale*.05);
        ctx.bezierCurveTo(x+scale*1.5,y-scale*.02,x+scale*1.55,y+scale*.35,x+scale*1.16,y+scale*.4);
        ctx.lineTo(x-scale*1.35,y+scale*.4);ctx.stroke();ctx.restore();
      }
    }
    function drawMountains(p,t){
      const night=state.phase==='night';
      // A layered mountain panorama with recognisable peaks, soft ink edges,
      // and enough vertical relief to remain legible beneath the live readings.
      const ranges=[
        {
          points:[[-.08,.74],[.06,.61],[.17,.45],[.27,.60],[.39,.37],[.51,.59],[.66,.42],[.78,.58],[.91,.45],[1.08,.69]],
          top:night?'#82978e':'#cbd0c8',base:night?'#43594f':'#ece9df',alpha:.86
        },
        {
          points:[[-.08,.83],[.12,.68],[.24,.74],[.41,.54],[.55,.73],[.70,.56],[.84,.71],[1.08,.74]],
          top:night?'#667f74':'#aab5ab',base:night?'#354b42':'#d2d7cd',alpha:.82
        },
        {
          points:[[-.08,.91],[.14,.78],[.31,.85],[.49,.69],[.67,.85],[.84,.70],[1.08,.83]],
          top:night?'#536c61':'#87988d',base:night?'#2b4138':'#b9c4b9',alpha:.72
        }
      ];

      ranges.forEach((range,layer)=>{
        const pts=range.points;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0][0]*width,height);
        ctx.lineTo(pts[0][0]*width,pts[0][1]*height);
        // Slightly softened angular peaks: distinct summits, not rolling waves.
        for(let i=1;i<pts.length;i++){
          const prev=pts[i-1],point=pts[i];
          const midX=(prev[0]+point[0])*.5*width;
          const midY=(prev[1]+point[1])*.5*height;
          ctx.quadraticCurveTo(prev[0]*width,prev[1]*height,midX,midY);
        }
        const last=pts[pts.length-1];
        ctx.quadraticCurveTo(last[0]*width,last[1]*height,width,last[1]*height);
        ctx.lineTo(width,height);
        ctx.closePath();

        const gradient=ctx.createLinearGradient(0,height*.34,0,height);
        gradient.addColorStop(0,range.top);
        gradient.addColorStop(1,range.base);
        ctx.globalAlpha=range.alpha;
        ctx.fillStyle=gradient;
        ctx.fill();

        // Thin ink contours add the overlapping ridge detail from the reference.
        ctx.globalAlpha=night?.48:.34;
        ctx.strokeStyle=night?'#dbe6dc':'#53645a';
        ctx.lineWidth=layer===2?1.15:.9;
        ctx.lineCap='round';
        ctx.lineJoin='round';
        ctx.beginPath();
        ctx.moveTo(pts[0][0]*width,pts[0][1]*height);
        for(let i=1;i<pts.length;i++){
          const prev=pts[i-1],point=pts[i];
          ctx.quadraticCurveTo(prev[0]*width,prev[1]*height,
            (prev[0]+point[0])*.5*width,(prev[1]+point[1])*.5*height);
        }
        ctx.stroke();

        // A second pale fold is intentionally offset so the ridges have depth.
        ctx.globalAlpha=night?.18:.14;
        ctx.strokeStyle=night?'#d8e4d9':'#65746a';
        ctx.lineWidth=.7;
        ctx.beginPath();
        ctx.moveTo(width*.06,height*(pts[1][1]+.075));
        ctx.quadraticCurveTo(width*.25,height*(pts[1][1]+.14),width*.43,height*(pts[2][1]+.075));
        ctx.quadraticCurveTo(width*.65,height*(pts[3][1]+.12),width*.95,height*(pts[4][1]+.10));
        ctx.stroke();
        ctx.restore();
      });

      // A distant veil and two low mist ribbons separate the mountain planes.
      for(let i=0;i<3;i++){
        const yy=height*(.56+i*.075)+Math.sin(t*.10+i)*.7;
        wash(width*.025,yy,width*.95,height*.045,
          night?'#bdcec1':p.paper,
          (night?.22:.19)+(state.weather==='fog'?.20:0));
      }
    }
    function drawWater(p,t){
      const {ink,water,soft}=p;
      const top=height*.82;
      ctx.save();
      const grad=ctx.createLinearGradient(0,top,0,height);
      grad.addColorStop(0,state.phase==='night'?'rgba(116,151,139,.48)':'rgba(142,161,148,.39)');
      grad.addColorStop(.55,state.phase==='night'?'rgba(91,124,115,.27)':'rgba(155,170,157,.23)');
      grad.addColorStop(1,'rgba(255,255,255,.015)');
      ctx.fillStyle=grad;
      ctx.fillRect(0,top,width,height-top);
      ctx.restore();
      for(let row=0;row<8;row++){
        const y=top+(height-top)*row/11;
        const wave=Math.sin(t*.6+row)*Math.min(5,state.wind*.12);
        const alpha=(state.phase==='night'?.44:.34)-row*.025;
        line([[width*.06,y],[width*.24,y+wave],[width*.45,y-wave*.5],
          [width*.68,y+wave*.4],[width*.94,y]],soft,alpha,.8);
      }
      // Broken reflections catch light below the pavilion and sun.
      for(let row=0;row<5;row++){
        const y=top+height*(.075+row*.027);
        const span=width*(.12+row*.035);
        const cx=width*(.60+(row%2)*.06);
        line([[cx-span,y],[cx-span*.42,y+.4],[cx+span*.5,y-.3],[cx+span,y]],
          state.phase==='night'?'#bdd0c3':'#8c9f94',state.phase==='night'?.20:.16,.65);
      }
      if(state.weather==='rain'||state.weather==='storm'){
        const rainScale=Math.min(1,state.precipitation/5);for(let i=0;i<Math.round(4+rainScale*11);i++){const x=((i*79+Math.floor(t*13)*17)%Math.max(1,Math.round(width)));const y=top+((i*31+Math.floor(t*18)*7)%Math.max(1,Math.round(height-top)));const pulse=(t*2+i)%1;ctx.save();ctx.globalAlpha=.34*(1-pulse);ctx.strokeStyle=soft;ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x,y,4+pulse*12,1+pulse*3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
      }
    }
    function drawPagoda(p){
      const {ink,soft}=p;const x=width*.79,y=height*.68,s=Math.min(width,height)*.30;ctx.save();ctx.translate(x,y);ctx.scale(s/100,s/100);ctx.strokeStyle=ink;ctx.globalAlpha=state.phase==='night'?.92:.72;ctx.lineWidth=2.8;ctx.lineJoin='round';ctx.lineCap='round';
      const roof=(yy,half)=>{ctx.beginPath();ctx.moveTo(-half,yy+7);ctx.quadraticCurveTo(-half*.25,yy-7,0,yy-15);ctx.quadraticCurveTo(half*.25,yy-7,half,yy+7);ctx.lineTo(half*.76,yy+8);ctx.stroke();};
      roof(0,42);line([[-30,9],[-30,43],[30,9],[30,43]],ink,.62,1.8);roof(48,55);line([[-39,56],[-39,92],[39,56],[39,92]],ink,.58,2);line([[-47,95],[47,95]],ink,.58,2);line([[0,-15],[0,-30]],ink,.65,2);ctx.restore();
    }
    function drawPagodaReflection(p){
      const night=state.phase==='night';
      const x=width*.79;
      const y=height*.87;
      ctx.save();
      ctx.globalAlpha=night?.23:.18;
      ctx.fillStyle=night?'#b7c9bd':'#6f8175';
      ctx.beginPath();
      ctx.ellipse(x,y,width*.105,height*.035,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
    function drawBambooAndLeaves(p,t){
      const {ink,accent,soft}=p;const x0=width*.90,y0=height*.12;const gust=Math.min(1,state.wind/55);const dir=Math.sin(state.direction*Math.PI/180);const sway=reduced?0:Math.sin(t*(.6+gust*.8))*gust*9;
      ctx.save();ctx.strokeStyle=ink;ctx.globalAlpha=state.phase==='night'?.90:.70;ctx.lineWidth=2.1;ctx.beginPath();ctx.moveTo(x0+width*.13,y0-height*.1);ctx.quadraticCurveTo(x0+width*.015+sway,y0+height*.18,x0-width*.08+sway,y0+height*.39);ctx.stroke();
      const leaves=[];for(let i=0;i<7;i++){const bx=x0+width*(.09-i*.022)+sway*(i/7);const by=y0+height*(i*.047);const side=i%2?1:-1;leaves.push({x:bx,y:by,side,i});ctx.save();ctx.translate(bx,by);ctx.rotate(side*(.45+sway*.006));ctx.fillStyle=i%3===0?accent:ink;ctx.globalAlpha=state.phase==='night'?.72:.52;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(side*13,-8,side*27,-2);ctx.quadraticCurveTo(side*15,8,0,0);ctx.fill();ctx.strokeStyle=soft;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*24,-2);ctx.stroke();ctx.restore();}
      if(state.weather==='snow'&&snowLoad>0){ctx.strokeStyle='#fff';ctx.globalAlpha=Math.min(.9,snowLoad);ctx.lineWidth=2.3;for(let i=0;i<leaves.length;i++){const l=leaves[i];ctx.beginPath();ctx.moveTo(l.x,l.y-2);ctx.quadraticCurveTo(l.x+l.side*8,l.y-9,l.x+l.side*16,l.y-5);ctx.stroke();}}
      if((state.weather==='rain'||state.weather==='storm')&&state.precipitation>.1){for(let i=0;i<leaves.length;i++){const l=leaves[i];const phase=(t*.32+i*.21)%1;const px=l.x+l.side*25;const py=l.y-2;ctx.save();ctx.fillStyle='#6d9ba0';ctx.globalAlpha=.35+.5*(1-phase);ctx.beginPath();ctx.ellipse(px,py+phase*18,1.7,3.1,0,0,Math.PI*2);ctx.fill();ctx.restore();}}
      if(gust>.35&&!reduced){for(let i=0;i<Math.min(3,Math.floor(gust*4));i++){const xx=(width*(.62+i*.09)+((t*state.wind*2+i*87)%(width*.34)));const yy=height*(.42+(i%2)*.17+Math.sin(t+i)*.025);ctx.save();ctx.translate(xx,yy);ctx.rotate(dir*.5+Math.sin(t*1.2+i)*.4);ctx.fillStyle=accent;ctx.globalAlpha=.58;ctx.beginPath();ctx.moveTo(-8,0);ctx.quadraticCurveTo(0,-7,10,-1);ctx.quadraticCurveTo(2,7,-8,0);ctx.fill();ctx.restore();}}
      ctx.restore();
    }
    function drawSnow(p,t){if(state.weather!=='snow'){snowLoad=Math.max(0,snowLoad-.0015);return;}const {soft}=p;const amount=Math.max(.12,Math.min(1,state.snowfall/2));snowLoad=reduced?Math.max(snowLoad,amount*.32):Math.min(.92,snowLoad+amount*.00055);const count=Math.round(7+amount*9);for(let i=0;i<count;i++){const x=((i*83+Math.sin(t*.3+i)*13)%width+width)%width;const y=((i*47+t*(4+(i%4)*1.2))%height*.78);ctx.save();ctx.globalAlpha=.45+(i%3)*.12;ctx.fillStyle=soft;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.45,0,Math.PI*2);ctx.fill();ctx.restore();}}
    function drawRain(p,t){if(state.weather!=='rain'&&state.weather!=='storm')return;const {soft,ink}=p;const intensity=Math.min(1,Math.max(.18,state.precipitation/6));const count=Math.round(6+intensity*5);for(let i=0;i<count;i++){const x=((i*73+t*(state.wind*.8+9))%width+width)%width;const y=((i*49+t*(90+intensity*90))%height*.86);line([[x,y],[x-2+Math.sin(state.direction*Math.PI/180)*6,y+8+intensity*7]],soft,.23+intensity*.18,.65);}
      for(let i=0;i<3;i++){const x=width*(.18+i*.31);const y=height*(.75+(i%2)*.12);const phase=(t*.55+i*.27)%1;ctx.save();ctx.globalAlpha=.32*(1-phase);ctx.strokeStyle=ink;ctx.lineWidth=.75;ctx.beginPath();ctx.ellipse(x,y,4+phase*15,1.5+phase*3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
    function drawWindLines(p,t){if(state.wind<18)return;const {soft}=p;const alpha=Math.min(.30,state.wind/180);for(let i=0;i<4;i++){const y=height*(.38+i*.095)+Math.sin(t*.55+i)*3;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=soft;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(width*(.10+i*.03),y);ctx.bezierCurveTo(width*.35,y-5,width*.56,y+6,width*.88,y-3);ctx.stroke();ctx.restore();}}
    function drawFog(p,t){if(state.weather!=='fog'&&state.cloud<85)return;const {paper,soft}=p;for(let i=0;i<3;i++){const y=height*(.49+i*.075)+Math.sin(t*.15+i)*7;const g=ctx.createLinearGradient(0,y,width,y);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.48,state.weather==='fog'?'rgba(238,238,224,.34)':'rgba(238,238,224,.15)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.save();ctx.fillStyle=g;ctx.fillRect(0,y-9,width,19);ctx.restore();}}
    function drawMinimalLandscape(p,t){
      const night=state.phase==='night';
      const horizon=height*.79;
      drawSky(p,t);

      const fillRidge=(points,top,base,alpha)=>{
        ctx.save();ctx.beginPath();
        ctx.moveTo(points[0][0]*width,height);
        ctx.lineTo(points[0][0]*width,points[0][1]*height);
        // Keep the principal summits legible; only the shoulders are softly joined.
        for(let i=1;i<points.length;i++){
          const a=points[i-1],b=points[i];
          if(i%2===0)ctx.quadraticCurveTo(a[0]*width,a[1]*height,b[0]*width,b[1]*height);
          else ctx.lineTo(b[0]*width,b[1]*height);
        }
        const last=points[points.length-1];ctx.lineTo(last[0]*width,last[1]*height);
        ctx.lineTo(width,height);ctx.closePath();
        const g=ctx.createLinearGradient(0,height*.28,0,height*.91);
        g.addColorStop(0,top);g.addColorStop(1,base);
        ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.fill();ctx.restore();
      };
      const contour=(points,color,alpha,lineWidth)=>{
        ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=lineWidth;
        ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
        points.forEach((pt,i)=>i?ctx.lineTo(pt[0]*width,pt[1]*height):ctx.moveTo(pt[0]*width,pt[1]*height));
        ctx.stroke();ctx.restore();
      };

      // Distant ink mountains: three distinct summits, softer shoulders and pale atmospheric depth.
      const far=[[-.06,.73],[.08,.61],[.17,.65],[.30,.39],[.38,.56],[.51,.27],[.61,.54],[.74,.40],[.84,.59],[.94,.47],[1.06,.66]];
      fillRidge(far,night?'rgba(125,148,137,.58)':'rgba(176,185,174,.62)',night?'rgba(71,94,84,.12)':'rgba(232,230,220,.08)',.92);
      contour(far,night?'#dbe6dc':'#778679',night?.36:.30,.9);
      const mid=[[-.05,.82],[.11,.72],[.23,.76],[.39,.61],[.52,.74],[.68,.59],[.82,.74],[.95,.65],[1.05,.77]];
      fillRidge(mid,night?'rgba(82,111,96,.52)':'rgba(135,154,140,.39)',night?'rgba(43,67,57,.22)':'rgba(179,194,180,.12)',.84);
      contour(mid,night?'#c8d8cc':'#65796d',night?.32:.27,.85);
      const near=[[-.04,.88],[.13,.81],[.30,.86],[.47,.77],[.65,.86],[.83,.76],[1.04,.85]];
      fillRidge(near,night?'rgba(53,79,67,.46)':'rgba(111,135,119,.23)',night?'rgba(35,57,48,.16)':'rgba(192,203,190,.06)',.75);
      contour(near,night?'#b9cbbf':'#758579',night?.26:.20,.7);

      // Small facets and broken ink folds stop the mountains reading as smooth waves.
      const facets=[
        [[.30,.40],[.26,.55],[.35,.49]],[[.51,.28],[.45,.51],[.55,.44]],
        [[.74,.41],[.69,.56],[.79,.51]],[[.94,.48],[.89,.60],[.98,.57]]
      ];
      facets.forEach((tri,i)=>{
        ctx.save();ctx.globalAlpha=night?.20:.18;ctx.fillStyle=i%2?'#eef0e7':'#667a6d';
        ctx.beginPath();tri.forEach((pt,j)=>j?ctx.lineTo(pt[0]*width,pt[1]*height):ctx.moveTo(pt[0]*width,pt[1]*height));
        ctx.closePath();ctx.fill();ctx.restore();
      });
      if(state.weather==='snow'){
        const caps=[[[.30,.40],[.278,.47],[.31,.445],[.335,.50]],[[.51,.28],[.47,.39],[.51,.36],[.55,.42]],[[.74,.41],[.715,.47],[.745,.46],[.775,.50]]];
        caps.forEach(poly=>{ctx.save();ctx.globalAlpha=.62;ctx.fillStyle='#f6f5ed';ctx.beginPath();poly.forEach((pt,i)=>i?ctx.lineTo(pt[0]*width,pt[1]*height):ctx.moveTo(pt[0]*width,pt[1]*height));ctx.closePath();ctx.fill();ctx.restore();});
      }

      // Japanese landscape foreground: two quiet ink-wash ridges, a tiny pine and a distant pavilion.
      // Quiet floating mist, like diluted sumi ink, rather than wide graphic bands.
      for(let i=0;i<3;i++){
        const y=height*(.58+i*.065)+Math.sin(t*.08+i)*.5;
        const g=ctx.createLinearGradient(0,y,width,y);
        g.addColorStop(0,'rgba(255,255,255,0)');
        g.addColorStop(.48,night?'rgba(203,218,207,.20)':'rgba(247,244,235,.48)');
        g.addColorStop(1,'rgba(255,255,255,0)');
        ctx.save();ctx.fillStyle=g;ctx.fillRect(0,y-3,width,6);ctx.restore();
      }

      // Water and restrained reflections keep the foreground quiet under the readings.
      const water=ctx.createLinearGradient(0,horizon,0,height);
      water.addColorStop(0,night?'rgba(101,139,125,.38)':'rgba(133,158,142,.30)');
      water.addColorStop(.62,night?'rgba(62,100,87,.23)':'rgba(170,187,171,.17)');
      water.addColorStop(1,'rgba(255,255,255,.01)');
      ctx.save();ctx.fillStyle=water;ctx.fillRect(0,horizon,width,height-horizon);ctx.restore();
      for(let i=0;i<5;i++){
        const y=horizon+(height-horizon)*(.13+i*.16);
        const wave=Math.sin(t*.24+i*.8)*Math.min(1.1,state.wind*.03);
        line([[width*(.08+i*.015),y],[width*.34,y+wave],[width*.63,y-wave*.25],[width*.94,y]],p.soft,.22-i*.025,.55);
      }

      // A small, recognisable pine silhouette balances the distant pavilion.
      ctx.save();
      const tx=width*.13,ty=height*.84,sc=Math.min(width,height)*.31;
      ctx.translate(tx,ty);ctx.scale(sc/100,sc/100);
      ctx.strokeStyle=p.ink;ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=night?.66:.55;
      ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-6,-22,8,-54);ctx.stroke();
      const tiers=[[-13,-47,-37,-43,19,-47],[-10,-34,-42,-30,24,-36],[-5,-22,-34,-18,27,-24]];
      tiers.forEach((q,i)=>{
        ctx.beginPath();ctx.moveTo(5,q[1]);ctx.quadraticCurveTo(-5,q[1]-6,q[2],q[3]);
        ctx.moveTo(5,q[1]+2);ctx.quadraticCurveTo(13,q[1]-5,q[4],q[5]);ctx.stroke();
        for(let j=0;j<4;j++){
          const xx=q[2]+(q[4]-q[2])*j/3,yy=q[3]+(q[5]-q[3])*j/3;
          ctx.globalAlpha=night?.54:.40;ctx.lineWidth=1.3;
          ctx.beginPath();ctx.moveTo(xx-6,yy-3);ctx.quadraticCurveTo(xx,yy-9,xx+7,yy-2);ctx.stroke();
        }
      });ctx.restore();
      drawPagoda(p);drawPagodaReflection(p);

      if(state.weather==='rain'||state.weather==='storm')drawRain(p,t);
      else if(state.weather==='snow')drawSnow(p,t);
      else if(state.weather==='fog')drawFog(p,t);
      else if(state.weather==='wind')drawWindLines(p,t);
    }
    function drawLandscapeWeatherScene(p,t){
      // Portrait is the visual master. In the narrower landscape forecast column,
      // enlarge that same mountain / sun / foreground language slightly so it
      // retains the depth and visual presence of the portrait composition.
      // This function is called only by the landscape branch below.
      const aspect=width/Math.max(1,height);
      const compact=Math.max(0,Math.min(1,(1.82-aspect)/.48));
      const zoomX=1.045+compact*.055;
      const zoomY=1.055+compact*.065;
      const anchorX=width*.50,anchorY=height*.64;
      ctx.save();
      ctx.translate(anchorX,anchorY);
      ctx.scale(zoomX,zoomY);
      ctx.translate(-anchorX,-anchorY);
      drawMinimalLandscape(p,t);
      ctx.restore();
    }
    function draw(){
      const p=palette();const t=elapsed;ctx.clearRect(0,0,width,height);
      // Portrait keeps the original painter and exact composition. Only the
      // landscape forecast column receives the aspect-aware portrait-inspired crop.
      if(window.matchMedia('(orientation:landscape) and (min-width:650px)').matches){
        drawLandscapeWeatherScene(p,t);
      }else{
        drawMinimalLandscape(p,t);
      }
      // The detailed, expressive interpretation belongs to the separate Live Art canvas.
    }
    function loop(now){raf=0;if(!canvas.isConnected||!isActive('weather')||document.hidden)return;if(now-last>=42){const delta=Math.min(.08,(now-last)/1000||.04);elapsed+=delta;last=now;draw();}raf=requestAnimationFrame(loop);}
    function onVisibility(){if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(!reduced&&!raf){last=0;raf=requestAnimationFrame(loop);}}
    document.addEventListener('visibilitychange',onVisibility);
    function setState(next){state=next||state;if(reduced){draw();return;}if(!raf)raf=requestAnimationFrame(loop);}
    resize();draw();if(!reduced)raf=requestAnimationFrame(loop);
    window.addEventListener('resize',resize,{passive:true});
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{resize();draw();}):null;observer?.observe(canvas);
    return {setState,stop(){if(raf)cancelAnimationFrame(raf);raf=0;observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);}};
  }

  // Initial, original weather-matched art studies. The registry is data-driven:
  // additional studies can be added by ID and condition tags without changing the renderer.
  const JAPANESE_ART_LIBRARY = [
    { id:'clear-pine-001', weather:['clear','hot'], title:'Red Sun over Pine Ridge', caption:'A red sun, distant peaks and a windswept pine', motif:'pine' },
    { id:'cloud-willow-001', weather:['cloudy'], title:'Clouds over the Willow', caption:'Soft cloud banks above a quiet river', motif:'willow' },
    { id:'rain-willow-001', weather:['rain'], title:'Willow in the Rain', caption:'Rain strokes fall into a still mountain pond', motif:'willow' },
    { id:'storm-wave-001', weather:['storm'], title:'Waves beneath the Storm', caption:'A storm crest rendered in sweeping ink', motif:'waves' },
    { id:'snow-pine-001', weather:['snow'], title:'Snow on the Pine Branches', caption:'White ink gathers on winter branches', motif:'snow' },
    { id:'fog-temple-001', weather:['fog'], title:'Temple in the Mist', caption:'A distant roof emerging through pale ink wash', motif:'temple' },
    { id:'wind-bamboo-001', weather:['wind'], title:'Bamboo in the Wind', caption:'Long leaves bend with the passing wind', motif:'bamboo' },
    { id:'night-moon-001', weather:['night'], title:'Moon over the Quiet Ridge', caption:'A crescent above layered mountain silhouettes', motif:'moon' }
  ];

  function makeArtStudyStrokes(state) {
    const kind=state.phase==='night'?'night':(state.weather==='hot'?'clear':state.weather);
    const study=JAPANESE_ART_LIBRARY.find(item=>item.weather.includes(kind))||JAPANESE_ART_LIBRARY[0];
    const strokes=[];
    const add=(points,tone='ink',weight=1.6,alpha=.75,kind='line')=>strokes.push({points,tone,weight,alpha,kind});
    const sample=(fn,count=28)=>Array.from({length:count+1},(_,i)=>fn(i/count));
    const cubic=(a,c1,c2,b,n=28)=>sample(t=>{const u=1-t;return [u*u*u*a[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*b[0],u*u*u*a[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*b[1]];},n);
    const shape=(points,tone,alpha=.68)=>add([...points,points[0]],tone,.55,alpha,'fill');
    const curve=(a,c1,c2,b,tone='ink',weight=1.6,alpha=.75)=>add(cubic(a,c1,c2,b),tone,weight,alpha,'line');
    const wash=(a,c1,c2,b,tone='soft',weight=6,alpha=.14)=>add(cubic(a,c1,c2,b),tone,weight,alpha,'wash');
    const leaf=(x,y,length,angle,tone='pine',alpha=.72)=>{
      const dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
      const px=-Math.sin(angle)*length*.22,py=Math.cos(angle)*length*.22;
      shape([[x,y],[x+dx*.28+px,y+dy*.28+py],[x+dx*.72+px*.48,y+dy*.72+py*.48],[x+dx,y+dy],[x+dx*.68-px*.42,y+dy*.68-py*.42],[x+dx*.20-px,y+dy*.20-py],[x,y]],tone,alpha);
      curve([x,y],[x+dx*.22,y+dy*.22],[x+dx*.54,y+dy*.54],[x+dx*.82,y+dy*.82],'soft',.34,alpha*.52);
    };

    // Japanese landscape foundation: overlapping peaks, ink contours and atmospheric distance.
    wash([-.04,.52],[.15,.38],[.28,.43],[.45,.57],'mist',5.5,.18);
    wash([.47,.55],[.64,.39],[.82,.43],[1.05,.57],'mist',5.0,.16);
    shape([[-.06,.71],[.06,.60],[.16,.63],[.29,.43],[.38,.57],[.51,.28],[.61,.50],[.73,.35],[.83,.55],[.93,.44],[1.06,.65],[1.06,.85],[-.06,.85]],'ridge',.64);
    shape([[-.05,.80],[.10,.71],[.23,.75],[.39,.59],[.52,.72],[.68,.56],[.83,.70],[.96,.62],[1.06,.73],[1.06,.93],[-.05,.93]],'soft',.50);
    shape([[-.04,.90],[.16,.83],[.33,.86],[.50,.76],[.68,.86],[.84,.75],[1.05,.86],[1.05,1.04],[-.04,1.04]],'deep',.22);
    curve([-.01,.70],[.11,.60],[.22,.54],[.29,.43],'soft',1.15,.62);
    curve([.29,.57],[.40,.46],[.45,.35],[.51,.28],'ink',1.2,.56);
    curve([.50,.49],[.60,.39],[.66,.36],[.73,.35],'soft',1.15,.55);
    curve([.72,.54],[.83,.47],[.88,.43],[.93,.44],'ink',.95,.44);
    curve([.08,.76],[.23,.70],[.34,.74],[.47,.71],'soft',.75,.38);
    curve([.54,.79],[.69,.70],[.82,.73],[.98,.70],'ink',.75,.30);

    // Mountain facets and broken dry-brush marks create painted depth, not a wireframe.
    const facets=[
      [[.29,.44],[.26,.53],[.33,.50],[.36,.56]],
      [[.51,.29],[.46,.43],[.51,.39],[.57,.48]],
      [[.73,.36],[.69,.46],[.76,.43],[.80,.51]],
      [[.93,.45],[.89,.54],[.96,.51],[.99,.57]]
    ];
    facets.forEach((poly,i)=>shape(poly,i%2?'foam':'mist',i%2?.62:.34));
    for(let i=0;i<18;i++){
      const x=.09+(i*37%82)/100,y=.57+(i*19%23)/100;
      curve([x,y],[x+.012,y-.015],[x+.025,y-.012],[x+.038,y-.024],i%3?'soft':'paper',.50,.34);
    }
    for(let i=0;i<4;i++){
      const y=.58+i*.052;
      wash([-.04,y],[.24,y-.03],[.62,y+.025],[1.04,y-.01],'mist',4.8,.22);
    }
    if(kind==='snow'){
      shape([[.24,.51],[.29,.43],[.32,.47],[.35,.53],[.31,.50],[.28,.55]],'snow',.84);
      shape([[.44,.43],[.51,.28],[.56,.39],[.53,.37],[.50,.42],[.48,.39]],'snow',.90);
      shape([[.66,.46],[.73,.35],[.77,.43],[.74,.42],[.72,.46],[.70,.42]],'snow',.82);
    }

    // Quiet reflective water; the foreground scene is allowed to remain the hero.
    shape([[-.04,.79],[.13,.75],[.26,.79],[.43,.75],[.61,.79],[.79,.74],[1.04,.78],[1.04,1.04],[-.04,1.04]],'water',.30);
    for(let i=0;i<13;i++){
      const y=.83+i*.012,x=.05+(i%3)*.018;
      curve([x,y],[.25,y-.012],[.44,y+.008],[.67,y-.004],'water',.56,.28);
      if(i%2===0)curve([.56,y+.018],[.70,y],[.86,y+.012],[1.0,y+.004],'soft',.46,.23);
    }

    const addPine=(baseX=.88,baseY=1.0,scale=1)=>{
      // A bent trunk and layered needle-cloud silhouettes; foliage reads as a tree, not scaffolding.
      curve([baseX,baseY],[baseX-.055*scale,baseY-.22*scale],[baseX-.018*scale,baseY-.50*scale],[baseX-.13*scale,baseY-.76*scale],'ink',5.0,.94);
      const tiers=[
        {y:.34,x:-.11,left:-.36,right:.15,drop:.055},
        {y:.47,x:-.085,left:-.43,right:.20,drop:.070},
        {y:.60,x:-.060,left:-.40,right:.22,drop:.078},
        {y:.72,x:-.035,left:-.31,right:.18,drop:.070}
      ];
      for(let i=0;i<tiers.length;i++){
        const q=tiers[i],root=baseX+q.x*scale,yy=baseY-(1-q.y)*scale;
        const left=root+q.left*scale,right=root+q.right*scale;
        curve([root,yy],[root-.07*scale,yy+.04*scale],[left+.08*scale,yy+q.drop*scale],[left,yy+q.drop*scale],'ink',1.85,.88);
        curve([root,yy+.012*scale],[root+.06*scale,yy+.04*scale],[right-.07*scale,yy+q.drop*.8*scale],[right,yy+q.drop*scale],'soft',1.65,.80);
        // Irregular soft foliage masses behind the needles.
        shape([
          [left,yy+q.drop*.66*scale],[left+.035*scale,yy+.005*scale],
          [root-.22*scale,yy-.055*scale],[root-.10*scale,yy-.075*scale],
          [root+.015*scale,yy-.055*scale],[root+.12*scale,yy-.035*scale],
          [right,yy+q.drop*.55*scale],[right-.04*scale,yy+q.drop*1.10*scale],
          [root+.04*scale,yy+q.drop*.82*scale],[left+.06*scale,yy+q.drop*1.05*scale]
        ],i%2?'pine':'deep',.54);
        // short needle marks replace the old dense lattice.
        for(let j=0;j<7;j++){
          const t=.10+j*.125;
          const x=left+(right-left)*t;
          const y=yy+q.drop*.40*scale+Math.sin(t*Math.PI)*.018*scale;
          curve([x,y],[x-.015*scale,y-.018*scale],[x-.028*scale,y-.014*scale],[x-.040*scale,y-.023*scale],'pine',.75,.72);
          curve([x+.01*scale,y+.005*scale],[x+.025*scale,y-.012*scale],[x+.038*scale,y-.008*scale],[x+.050*scale,y-.016*scale],'soft',.65,.62);
        }
        if(kind==='snow'){
          curve([left+.01*scale,yy+q.drop*.55*scale],[left+.10*scale,yy+q.drop*.12*scale],[root-.05*scale,yy-.025*scale],[root+.01*scale,yy+.005*scale],'snow',2.1,.92);
          curve([root+.01*scale,yy+.005*scale],[right-.05*scale,yy-.015*scale],[right-.01*scale,yy+.04*scale],[right,yy+q.drop*.75*scale],'snow',1.8,.88);
        }
      }
      curve([baseX-.13*scale,baseY-.76*scale],[baseX-.20*scale,baseY-.82*scale],[baseX-.22*scale,baseY-.85*scale],[baseX-.26*scale,baseY-.88*scale],'soft',1.0,.60);
    };

    const addWillow=(baseX=.86,baseY=.99,scale=1)=>{
      // A recognisable cascading willow: rounded canopy, arcing boughs and fine hanging curtains.
      shape([
        [baseX-.32*scale,baseY-.61*scale],[baseX-.29*scale,baseY-.75*scale],
        [baseX-.18*scale,baseY-.80*scale],[baseX-.07*scale,baseY-.78*scale],
        [baseX+.06*scale,baseY-.82*scale],[baseX+.22*scale,baseY-.72*scale],
        [baseX+.31*scale,baseY-.59*scale],[baseX+.26*scale,baseY-.49*scale],
        [baseX+.11*scale,baseY-.54*scale],[baseX-.08*scale,baseY-.52*scale]
      ],'pine',.24);
      curve([baseX,baseY],[baseX-.055*scale,baseY-.21*scale],[baseX+.035*scale,baseY-.48*scale],[baseX-.015*scale,baseY-.73*scale],'ink',6.0,.95);
      curve([baseX-.02*scale,baseY-.68*scale],[baseX-.15*scale,baseY-.82*scale],[baseX-.25*scale,baseY-.75*scale],[baseX-.34*scale,baseY-.60*scale],'ink',2.0,.86);
      curve([baseX-.02*scale,baseY-.69*scale],[baseX+.12*scale,baseY-.84*scale],[baseX+.24*scale,baseY-.72*scale],[baseX+.32*scale,baseY-.56*scale],'soft',1.9,.82);
      const curtains=[
        [baseX-.29*scale,baseY-.62*scale,baseX-.36*scale,baseY-.12*scale],
        [baseX-.19*scale,baseY-.72*scale,baseX-.23*scale,baseY-.02*scale],
        [baseX-.06*scale,baseY-.75*scale,baseX-.09*scale,baseY+.005*scale],
        [baseX+.10*scale,baseY-.70*scale,baseX+.15*scale,baseY-.09*scale],
        [baseX+.24*scale,baseY-.60*scale,baseX+.31*scale,baseY-.17*scale]
      ];
      curtains.forEach((f,i)=>{
        const [sx,sy,ex,ey]=f;
        const path=cubic([sx,sy],[sx+(ex-sx)*.20,sy+.18*scale],[ex+(sx-ex)*.18,ey-.16*scale],[ex,ey]);
        add(path,i%2?'soft':'ink',1.25,.76);
        for(let j=0;j<11;j++){
          const t=.10+j*.078,pt=path[Math.round(t*(path.length-1))];
          const side=(i+j)%2?1:-1;
          leaf(pt[0],pt[1],(.025+(j%3)*.004)*scale,side*(.48+(j%2)*.25),j%5===0?'accent':(j%2?'soft':'pine'),.73);
        }
      });
    };

    const addBamboo=(baseX=.84,baseY=1,scale=1)=>{
      [-.13,0,.12].forEach((offset,i)=>{
        const x=baseX+offset*scale;
        curve([x,baseY],[x-.04*scale,baseY-.26*scale],[x+.04*scale,baseY-.55*scale],[x-.01*scale,baseY-.88*scale],'pine',2.4,.92);
        for(let j=0;j<6;j++){
          const y=baseY-(.15+j*.13)*scale;
          curve([x-.01*scale,y],[x-.05*scale,y-.01*scale],[x-.10*scale,y-.035*scale],[x-.14*scale,y-.065*scale],'soft',.8,.58);
          curve([x+.005*scale,y-.03*scale],[x+.05*scale,y-.045*scale],[x+.10*scale,y-.07*scale],[x+.15*scale,y-.10*scale],'ink',.8,.60);
          leaf(x-.09*scale,y-.03*scale,.105*scale,-2.5-(j%2)*.24,'pine',.72);
          leaf(x+.08*scale,y-.05*scale,.095*scale,-.35+(j%2)*.24,j%3?'soft':'accent',.68);
        }
      });
    };

    const addRocks=()=>{
      shape([[.67,.96],[.70,.87],[.76,.84],[.81,.87],[.85,.81],[.90,.84],[.96,.82],[1.04,.90],[1.04,1.03],[.67,1.03]],'stone',.88);
      shape([[.72,.90],[.77,.86],[.82,.87],[.85,.84],[.91,.87],[.88,.92],[.79,.93]],'soft',.60);
      shape([[.86,.94],[.90,.88],[.95,.90],[.99,.91],[1.02,.96],[.93,.97]],'deep',.50);
      curve([.69,.91],[.76,.87],[.82,.89],[.88,.86],'foam',.8,.44);
      curve([.84,.96],[.91,.91],[.97,.92],[1.02,.95],'ink',1.0,.52);
    };

    const addPavilion=(cx=.80,cy=.73,scale=1)=>{
      const x=cx,y=cy,s=scale;
      shape([[x-.15*s,y],[x-.075*s,y-.045*s],[x,y-.078*s],[x+.075*s,y-.045*s],[x+.15*s,y+.006*s],[x+.105*s,y+.014*s],[x,y-.032*s],[x-.11*s,y+.014*s]],'deep',.91);
      curve([x-.16*s,y+.008*s],[x-.08*s,y-.055*s],[x+.08*s,y-.055*s],[x+.16*s,y+.008*s],'ink',2.0,.96);
      curve([x-.13*s,y+.02*s],[x-.04*s,y+.035*s],[x+.05*s,y+.035*s],[x+.13*s,y+.02*s],'soft',.9,.78);
      for(const side of [-1,1]){
        curve([x+side*.09*s,y+.02*s],[x+side*.087*s,y+.11*s],[x+side*.087*s,y+.17*s],[x+side*.087*s,y+.22*s],'ink',1.55,.88);
      }
      shape([[x-.058*s,y+.06*s],[x+.058*s,y+.06*s],[x+.058*s,y+.18*s],[x-.058*s,y+.18*s]],'gold',.52);
      curve([x-.027*s,y+.07*s],[x-.027*s,y+.11*s],[x-.027*s,y+.15*s],[x-.027*s,y+.17*s],'foam',.55,.68);
      curve([x+.027*s,y+.07*s],[x+.027*s,y+.11*s],[x+.027*s,y+.15*s],[x+.027*s,y+.17*s],'foam',.55,.68);
      curve([x-.13*s,y+.23*s],[x-.02*s,y+.20*s],[x+.09*s,y+.20*s],[x+.16*s,y+.23*s],'ink',1.3,.72);
    };

    // Weather-specific foregrounds are separate compositions, never a single generic drawing.
    if(kind==='storm'){
      // A large breaking wave with a curled crest, foam lace and dark coastal rocks.
      shape([[0,.76],[.08,.73],[.16,.66],[.24,.62],[.32,.66],[.39,.74],[.46,.84],[.54,.90],[.60,.96],[.60,1],[0,1]],'deep',.94);
      wash([.03,.82],[.14,.66],[.25,.62],[.36,.76],'water',8,.36);
      curve([.02,.83],[.13,.66],[.25,.63],[.37,.77],'deep',3.6,.96);
      curve([.08,.91],[.20,.76],[.34,.73],[.49,.88],'water',3.0,.72);
      curve([.18,.97],[.31,.84],[.44,.83],[.57,.95],'deep',2.0,.80);
      curve([.20,.68],[.25,.59],[.34,.61],[.39,.73],'foam',2.8,.98);
      curve([.24,.70],[.30,.64],[.36,.65],[.41,.77],'foam',1.45,.92);
      curve([.28,.64],[.33,.61],[.38,.64],[.42,.70],'paper',.85,.82);
      for(let i=0;i<22;i++){
        const x=.10+(i*17%43)/100,y=.67+(i*13%24)/100;
        curve([x,y],[x+.010,y-.018],[x+.027,y-.016],[x+.042,y-.032],i%3?'foam':'paper',.7,.78);
      }
      wash([.39,.86],[.50,.72],[.61,.75],[.75,.91],'water',7,.28);
      curve([.40,.85],[.52,.74],[.63,.76],[.75,.92],'soft',1.8,.78);
      addRocks();addPine(.91,1.02,.94);addPavilion(.75,.77,.78);
      // Distant storm squalls are brushed across the mountain pass, not drawn as interface icons.
      wash([.10,.25],[.24,.18],[.39,.19],[.53,.25],'soft',5,.18);
      wash([.48,.30],[.60,.24],[.73,.25],[.87,.31],'mist',4.5,.17);
      for(let i=0;i<14;i++){
        const x=.10+i*.062,y=.31+(i%3)*.035;
        curve([x,y],[x-.01,y+.025],[x-.023,y+.052],[x-.030,y+.077],'soft',.55,.52);
      }
    } else if(kind==='rain'){
      // A willow over a still pond: cascading leaf curtains and a small waterside pavilion.
      shape([[0,.78],[.12,.73],[.28,.77],[.45,.73],[.64,.77],[.82,.72],[1,.77],[1,1],[0,1]],'water',.44);
      addWillow(.87,1.0,1.02);addPavilion(.23,.77,.82);
      for(let i=0;i<21;i++){
        const x=.06+(i*29%90)/100,y=.20+(i*17%48)/100;
        curve([x,y],[x-.008,y+.025],[x-.018,y+.05],[x-.027,y+.08],'soft',.62,.58);
      }
      for(let i=0;i<12;i++){
        const x=.06+i*.078,y=.84+(i%3)*.024;
        curve([x,y],[x+.024,y-.006],[x+.052,y-.004],[x+.085,y],'water',.55,.44);
      }
    } else if(kind==='snow'){
      shape([[0,.80],[.16,.73],[.32,.78],[.49,.71],[.66,.77],[.84,.72],[1,.79],[1,1],[0,1]],'foam',.76);
      addPine(.88,1.02,1.12);addPavilion(.22,.78,.76);
      for(let i=0;i<26;i++){
        const x=.05+(i*23%92)/100,y=.20+(i*31%58)/100;
        curve([x,y],[x-.003,y+.01],[x-.01,y+.02],[x-.014,y+.03],'snow',.64,.86);
      }
      for(let i=0;i<10;i++){
        const x=.74+(i%2)*.04,y=.37+i*.045;
        curve([x,y],[x+.02,y-.018],[x+.045,y-.015],[x+.066,y-.026],'snow',1.25,.92);
      }
    } else if(kind==='cloudy'){
      shape([[0,.79],[.17,.73],[.34,.77],[.52,.72],[.71,.77],[.89,.72],[1,.78],[1,1],[0,1]],'water',.30);
      addWillow(.84,1.0,.96);addPavilion(.25,.78,.80);
      for(let i=0;i<6;i++){
        const y=.30+i*.055;
        wash([.02,y],[.24,y-.04],[.56,y+.03],[.98,y-.01],'mist',5,.21);
      }
    } else if(kind==='fog'){
      shape([[0,.79],[.18,.73],[.38,.77],[.58,.72],[.78,.76],[1,.73],[1,1],[0,1]],'water',.20);
      addPavilion(.72,.75,1.0);
      for(let i=0;i<9;i++){
        const y=.34+i*.052;
        wash([-.02,y],[.23,y-.035],[.68,y+.03],[1.03,y-.01],'mist',5.8,.25);
      }
    } else if(kind==='wind'){
      shape([[0,.80],[.16,.74],[.34,.78],[.53,.72],[.73,.77],[1,.73],[1,1],[0,1]],'water',.27);
      addBamboo(.84,1.02,1.0);addPine(.16,1.0,.58);
      for(let i=0;i<10;i++){
        const x=.04+i*.103,y=.31+(i%3)*.055;
        curve([x,y],[x+.08,y-.06],[x+.15,y+.035],[x+.24,y-.025],'soft',.86,.62);
      }
    } else if(kind==='night'){
      shape([[0,.79],[.17,.73],[.34,.77],[.53,.71],[.72,.77],[.90,.72],[1,.77],[1,1],[0,1]],'water',.32);
      addPine(.88,1.0,1.0);addPavilion(.23,.77,.78);
      for(let i=0;i<18;i++){
        const x=.05+(i*31%90)/100,y=.16+(i*19%48)/100;
        curve([x,y],[x+.006,y-.006],[x+.015,y-.006],[x+.022,y],'foam',.55,.58);
      }
    } else {
      shape([[0,.80],[.16,.74],[.35,.78],[.54,.72],[.73,.77],[.91,.72],[1,.78],[1,1],[0,1]],'water',.24);
      addPine(.88,1.0,1.0);addPavilion(.24,.77,.78);
    }

    // Shore reeds, broken reflections and a few pigment flecks complete the composition.
    for(let i=0;i<8;i++){
      const x=.04+i*.03,y=.91+(i%2)*.025;
      curve([x,y],[x-.012,y-.06],[x+.012,y-.10],[x+.02,y-.14],'soft',.60,.48);
    }
    for(let i=0;i<12;i++){
      const x=.06+(i*23%90)/100,y=.94+(i%3)*.014;
      curve([x,y],[x+.04,y-.008],[x+.09,y+.004],[x+.13,y],'water',.48,.38);
    }
    return {study,strokes,paper:'#f3efe5'};
  }
  function makeArtStudioPainter(canvas,onProgress){
    let ctx=null;try{ctx=canvas.getContext('2d',{alpha:true});}catch(_){ctx=null;}
    if(!ctx)return {setState(){},replay(){},stop(){}};

    let width=0,height=0,dpr=1,raf=0,startAt=0,frameProgress=1;
    let current=null,study=null,strokes=[],complete=true;
    const reduced=reducedMotion();

    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      width=Math.max(1,rect.width);
      height=Math.max(1,rect.height);
      dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*dpr);
      canvas.height=Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      drawFrame(frameProgress);
    };

    const colors=()=>({
      ink:current?.phase==='night'?'#e6eee4':'#26312b',
      soft:current?.phase==='night'?'#b8c9be':'#718074',
      ridge:current?.phase==='night'?'#8ca398':'#a7b1a5',
      water:current?.phase==='night'?'#98bdb5':'#71928e',
      accent:current?.phase==='night'?'#e58d7b':'#c77b75',
      paper:current?.phase==='night'?'#293a36':'#f3efe5',
      deep:current?.phase==='night'?'#243a35':'#405851',
      pine:current?.phase==='night'?'#809b8d':'#526b58',
      foam:current?.phase==='night'?'#dce6dc':'#f8f5eb',
      snow:current?.phase==='night'?'#eef1e8':'#fbfaf1',
      stone:current?.phase==='night'?'#536b62':'#59655d',
      gold:current?.phase==='night'?'#a98a58':'#c69a5e',
      mist:current?.phase==='night'?'#bdcfc3':'#e8e7dc'
    });

    function strokeOne(stroke,portion){
      if(!stroke.points||stroke.points.length<2||portion<=0)return;
      const palette=colors();
      const tone=stroke.tone==='accent'?palette.accent:
        stroke.tone==='soft'?palette.soft:
        stroke.tone==='ridge'?palette.ridge:
        stroke.tone==='water'?palette.water:
        stroke.tone==='paper'?palette.paper:
        stroke.tone==='deep'?palette.deep:
        stroke.tone==='pine'?palette.pine:
        stroke.tone==='foam'?palette.foam:
        stroke.tone==='snow'?palette.snow:
        stroke.tone==='stone'?palette.stone:
        stroke.tone==='gold'?palette.gold:
        stroke.tone==='mist'?palette.mist:palette.ink;
      const points=stroke.points;
      const scaled=points.map(pt=>[pt[0]*width,pt[1]*height]);
      const total=scaled.length-1;
      const visible=Math.max(1,Math.min(total,Math.ceil(total*portion)));
      const isWash=stroke.kind==='wash';
      const isFill=stroke.kind==='fill';
      ctx.save();
      ctx.globalAlpha=stroke.alpha??.75;
      ctx.strokeStyle=tone;
      ctx.lineWidth=isWash
        ?Math.max(3,Math.min(22,stroke.weight*Math.min(width,height)/140))
        :Math.max(.9,Math.min(18,stroke.weight*Math.min(width,height)/105));
      ctx.lineCap='round';
      ctx.lineJoin='round';
      ctx.beginPath();
      ctx.moveTo(scaled[0][0],scaled[0][1]);
      for(let i=1;i<=visible;i++){
        const index=Math.min(i,scaled.length-1);
        let x=scaled[index][0],y=scaled[index][1];
        if(i===visible&&portion<1){
          const fraction=total*portion-Math.floor(total*portion);
          const next=scaled[Math.min(index+1,scaled.length-1)];
          x=scaled[index][0]+(next[0]-scaled[index][0])*fraction;
          y=scaled[index][1]+(next[1]-scaled[index][1])*fraction;
        }
        if(!isFill&&!isWash&&i<visible){
          const next=scaled[Math.min(index+1,scaled.length-1)];
          const midX=(x+next[0])*.5,midY=(y+next[1])*.5;
          ctx.quadraticCurveTo(x,y,midX,midY);
        }else ctx.lineTo(x,y);
      }
      if(isFill&&portion>=1){
        ctx.closePath();
        const fill=ctx.createLinearGradient(0,0,0,height);
        fill.addColorStop(0,tone);
        fill.addColorStop(1,palette.paper);
        ctx.fillStyle=fill;
        ctx.fill();
        ctx.globalAlpha=(stroke.alpha??.75)*.48;
        ctx.strokeStyle=tone;
        ctx.lineWidth=Math.max(.5,Math.min(1.4,Math.min(width,height)/210));
        ctx.stroke();
      }else ctx.stroke();
      // A restrained dry-brush echo gives the marks an ink-on-paper edge.
      if(!isWash&&!isFill&&stroke.weight>1.2){
        ctx.globalAlpha=(stroke.alpha??.75)*.17;
        ctx.lineWidth=Math.max(.4,ctx.lineWidth*.45);
        ctx.translate(.65,-.45);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawFrame(progress){
      const palette=colors();
      ctx.clearRect(0,0,width,height);
      const paperWash=ctx.createLinearGradient(0,0,width,height);
      paperWash.addColorStop(0,current?.phase==='night'?'#31423b':'#f7f3e9');
      paperWash.addColorStop(1,palette.paper);
      ctx.fillStyle=paperWash;ctx.fillRect(0,0,width,height);
      // Fine, deterministic paper fibres stay subtle so the painting remains clean.
      ctx.save();ctx.globalAlpha=current?.phase==='night'?.055:.045;ctx.strokeStyle=palette.soft;ctx.lineWidth=.42;
      for(let i=0;i<92;i++){
        const x=(i*73.17)%width,y=(i*41.93)%height;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2.2+(i%4),y+(i%3===0?.45:-.35));ctx.stroke();
      }
      ctx.restore();

      // A clear moon after dark; a softly washed vermilion sun during the day.
      ctx.save();
      const markRadius=Math.min(width,height)*.11;
      if(current?.phase==='night'){
        ctx.globalAlpha=.92;
        ctx.fillStyle='#dce8dc';
        ctx.beginPath();
        ctx.arc(width*.76,height*.25,markRadius,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle=palette.paper;
        ctx.globalAlpha=1;
        ctx.beginPath();
        ctx.arc(width*.81,height*.21,markRadius*.88,0,Math.PI*2);
        ctx.fill();
      }else{
        ctx.globalAlpha=.58;
        ctx.fillStyle=palette.accent;
        ctx.beginPath();
        ctx.arc(width*.74,height*.24,markRadius,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      const units=Math.max(0,Math.min(1,progress))*strokes.length;
      const done=Math.floor(units);
      const partial=units-done;
      for(let i=0;i<done;i++)strokeOne(strokes[i],1);
      if(done<strokes.length&&partial>0)strokeOne(strokes[done],partial);

      if(progress>=1){
        ctx.save();
        ctx.globalAlpha=.10;
        ctx.fillStyle=palette.soft;
        for(let i=0;i<7;i++){
          ctx.beginPath();
          ctx.ellipse(width*(.08+i*.14),height*(.17+(i%3)*.21),
            width*.025,height*.008,(i%2)*.2,0,Math.PI*2);
          ctx.fill();
        }
        ctx.restore();
      }

      if(typeof onProgress==='function'){
        onProgress({
          title:study?.title||'Ink study',
          count:Math.min(strokes.length,done+(partial>0?1:0)),
          total:strokes.length,
          complete:progress>=1
        });
      }
    }

    function stopLoop(){
      if(raf)cancelAnimationFrame(raf);
      raf=0;
    }

    function frame(now){
      raf=0;
      if(!canvas.isConnected||!isActive('weather')||document.hidden)return;
      frameProgress=Math.min(1,(now-startAt)/Math.max(10000,Math.min(18000,strokes.length*180)));
      drawFrame(frameProgress);
      if(frameProgress<1)raf=requestAnimationFrame(frame);
      else complete=true;
    }

    // Start with a finished, legible illustration. Animation is an explicit Replay action.
    function choose(next){
      current=next||current;
      const built=makeArtStudyStrokes(current||{weather:'clear',phase:'day'});
      study=built.study;
      strokes=built.strokes;
      frameProgress=1;
      complete=true;
      stopLoop();
      drawFrame(1);
    }

    function startDrawing(){
      stopLoop();
      if(!current)return;
      if(reduced){
        frameProgress=1;
        complete=true;
        drawFrame(1);
        return;
      }
      startAt=performance.now();
      frameProgress=0;
      complete=false;
      drawFrame(0);
      raf=requestAnimationFrame(frame);
    }

    function setState(next){
      if(!next)return;
      const changed=!current||
        current.weather!==next.weather||
        current.phase!==next.phase||
        Math.abs((current.wind||0)-(next.wind||0))>8;
      current=next;
      if(changed)choose(current);
    }

    function replay(){
      if(current)startDrawing();
    }

    function onVisibility(){
      if(document.hidden)stopLoop();
      else if(current&&!complete)startDrawing();
    }

    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('resize',resize,{passive:true});
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>resize()):null;
    observer?.observe(canvas);
    resize();

    return {
      setState,
      replay,
      stop(){
        stopLoop();
        observer?.disconnect();
        window.removeEventListener('resize',resize);
        document.removeEventListener('visibilitychange',onVisibility);
      }
    };
  }

  function makeScreen(){
    const screen=el('div','le-weather-screen');screen.dataset.weather='clear';screen.dataset.phase='day';screen.dataset.preview='true';
    screen.innerHTML=`
      <div class="le-weather-landscape-accents" aria-hidden="true">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" focusable="false">
          <g fill="none" stroke="#75897b" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" opacity=".50">
            <path d="M-28 92 C 35 118 63 71 104 43 C 142 16 171 19 208 -10"/>
            <path d="M45 101 C 54 72 70 57 89 38 M87 68 C 109 65 126 50 138 32 M118 47 C 122 27 139 11 158 1"/>
            <path d="M1228 58 C 1169 84 1155 131 1115 153 C 1083 170 1052 172 1023 205"/>
            <path d="M1167 105 C 1140 87 1120 67 1110 43 M1138 130 C 1109 121 1090 105 1074 82 M1091 165 C 1069 154 1050 139 1040 118"/>
            <path d="M-12 595 C 18 544 32 505 28 466 M7 570 C 45 540 64 507 70 470 M35 594 C 70 564 91 530 98 493"/>
            <path d="M1210 600 C 1177 553 1161 511 1168 469 M1190 578 C 1150 548 1130 516 1126 480 M1163 600 C 1124 569 1105 539 1102 505"/>
          </g>
          <g fill="#c98278" opacity=".42">
            <ellipse cx="87" cy="47" rx="8" ry="13" transform="rotate(-34 87 47)"/>
            <ellipse cx="104" cy="40" rx="8" ry="13" transform="rotate(22 104 40)"/>
            <ellipse cx="96" cy="24" rx="8" ry="13" transform="rotate(4 96 24)"/>
            <ellipse cx="1110" cy="83" rx="8" ry="13" transform="rotate(-31 1110 83)"/>
            <ellipse cx="1127" cy="76" rx="8" ry="13" transform="rotate(22 1127 76)"/>
            <ellipse cx="1119" cy="60" rx="8" ry="13" transform="rotate(4 1119 60)"/>
            <ellipse cx="1055" cy="155" rx="7" ry="11" transform="rotate(-24 1055 155)"/>
            <ellipse cx="1070" cy="146" rx="7" ry="11" transform="rotate(25 1070 146)"/>
          </g>
          <g fill="#d7b981" opacity=".55">
            <circle cx="98" cy="38" r="3.5"/><circle cx="1119" cy="74" r="3.5"/><circle cx="1063" cy="150" r="3"/>
          </g>
        </svg>
      </div>
      <div class="le-weather-content">
        <header class="le-weather-topbar">
          <div class="le-weather-brand">LIVE <span>//</span> EARTH</div>
          <div class="le-weather-date-row"><div class="le-weather-date" id="le-weather-date">LOCAL TIME</div></div>
          <div class="le-weather-place"><svg viewBox="0 0 18 22" fill="none" aria-hidden="true"><path d="M9 20s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5"/></svg><span id="le-weather-place-text">LOCATION PREVIEW</span></div>
          <div class="le-weather-date-row"><label class="le-weather-mode"><span>SCENE</span><select id="le-weather-mode-select" aria-label="Weather scene preview"><option value="auto">AUTO</option><option value="clear">CLEAR</option><option value="cloudy">CLOUDY</option><option value="rain">RAIN</option><option value="storm">STORM</option><option value="snow">SNOW</option><option value="fog">FOG</option><option value="wind">WIND</option><option value="night">NIGHT</option><option value="hot">HOT</option></select></label></div>
        </header>
        <div class="le-weather-dashboard">
          <div class="le-weather-forecast-column">
            <section class="le-weather-hero" aria-label="Current weather"><h1 class="le-weather-headline" id="le-weather-headline">A quiet sky.</h1></section>
                        <div class="le-weather-art-stage" aria-label="Live weather illustration"><canvas class="le-weather-art-canvas" id="le-weather-art-canvas"></canvas><div class="le-weather-temperature-row"><div class="le-weather-temperature" id="le-weather-temperature">—</div><div class="le-weather-condition"><span class="le-weather-condition-icon" id="le-weather-condition-icon"></span><div class="le-weather-condition-name" id="le-weather-condition">Weather preview</div><div class="le-weather-feels" id="le-weather-feels">Sample values</div></div></div></div>
            <section class="le-weather-summary" aria-label="Important weather details"><div class="le-weather-stat"><span class="le-weather-stat-label">HIGH / LOW</span><strong class="le-weather-stat-value" id="le-weather-highlow">—</strong></div><div class="le-weather-stat"><span class="le-weather-stat-label">RAIN CHANCE</span><strong class="le-weather-stat-value" id="le-weather-rainchance">—</strong></div><div class="le-weather-stat"><span class="le-weather-stat-label">WIND</span><strong class="le-weather-stat-value" id="le-weather-wind">—</strong></div></section>
          </div>
          <div class="le-weather-art-column">

            <section class="le-weather-studio" aria-label="Live Japanese art studio">
              <div class="le-weather-studio-head"><div><span class="le-weather-studio-kicker">LIVE ART · PAINTING THE WEATHER</span><h2 class="le-weather-studio-title" id="le-weather-studio-title">Red Sun over Pine Ridge</h2></div><span class="le-weather-studio-state" id="le-weather-studio-state" role="status">PREPARING</span></div>
              <canvas class="le-weather-studio-canvas" id="le-weather-studio-canvas" aria-label="Japanese ink artwork being drawn stroke by stroke"></canvas>
              <div class="le-weather-studio-foot"><span id="le-weather-studio-caption">Original Japanese ink study · Weather matched</span><button class="le-weather-art-replay" id="le-weather-art-replay" type="button">REPLAY ↻</button></div>
            </section>
          </div>
        </div>
        <p class="le-weather-status" id="le-weather-status" aria-live="polite"></p>
        <p class="le-weather-attribution">Weather data: Open-Meteo · Ink art is drawn locally from a weather-matched library</p>
      </div>`;
    return screen;
  }


  /* Temporary, in-app visual layout editor. It changes no files and persists nothing.
     Users can select, drag and uniformly resize every major visible Weather-view layer,
     then copy normalized adjustments as JSON for a deliberate production-code update. */
  function installVisualLayoutEditor(screen) {
    const landscapeQuery = window.matchMedia('(orientation:landscape) and (min-width:650px)');
    const definitions = [
      ['content','Whole Weather content','.le-weather-content'],
      ['masthead','Masthead group','.le-weather-topbar'],
      ['brand','LIVE // EARTH brand','.le-weather-brand'],
      ['date','Date and time','.le-weather-date'],
      ['location','Location label','.le-weather-place'],
      ['sceneSelector','Scene selector','.le-weather-mode'],
      ['dashboard','Weather + Live Art layout','.le-weather-dashboard'],
      ['forecastColumn','Weather column','.le-weather-forecast-column'],
      ['headline','Weather headline','.le-weather-headline'],
      ['weatherScene','Weather scene area','.le-weather-art-stage'],
      ['weatherPainting','Weather illustration canvas','.le-weather-art-canvas'],
      ['temperatureGroup','Temperature + condition group','.le-weather-temperature-row'],
      ['temperature','Temperature number','.le-weather-temperature'],
      ['conditionGroup','Condition group','.le-weather-condition'],
      ['conditionIcon','Condition icon','.le-weather-condition-icon'],
      ['conditionName','Condition name','.le-weather-condition-name'],
      ['feelsLike','Feels-like reading','.le-weather-feels'],
      ['summary','Forecast readings group','.le-weather-summary'],
      ['highLow','High / Low cell','.le-weather-stat:nth-child(1)'],
      ['highLowLabel','High / Low label','.le-weather-stat:nth-child(1) .le-weather-stat-label'],
      ['highLowValue','High / Low value','#le-weather-highlow'],
      ['rainChance','Rain chance cell','.le-weather-stat:nth-child(2)'],
      ['rainChanceLabel','Rain chance label','.le-weather-stat:nth-child(2) .le-weather-stat-label'],
      ['rainChanceValue','Rain chance value','#le-weather-rainchance'],
      ['wind','Wind cell','.le-weather-stat:nth-child(3)'],
      ['windLabel','Wind label','.le-weather-stat:nth-child(3) .le-weather-stat-label'],
      ['windValue','Wind value','#le-weather-wind'],
      ['artColumn','Live Art column','.le-weather-art-column'],
      ['artCard','Live Art card','.le-weather-studio'],
      ['artHeader','Live Art header','.le-weather-studio-head'],
      ['artKicker','Live Art kicker','.le-weather-studio-kicker'],
      ['artTitle','Live Art title','.le-weather-studio-title'],
      ['artState','Live Art drawing status','.le-weather-studio-state'],
      ['artCanvas','Live Art canvas','.le-weather-studio-canvas'],
      ['artFooter','Live Art footer','.le-weather-studio-foot'],
      ['artCaption','Live Art caption','#le-weather-studio-caption'],
      ['replay','Replay button','.le-weather-art-replay'],
      ['status','Weather status message','.le-weather-status'],
      ['attribution','Weather attribution','.le-weather-attribution']
    ];
    const states = new Map();
    const originals = new Map();
    const nodes = new Map();
    const selectorOptions = [];
    let selectedId = 'headline';
    let activeDrag = null;
    let activeResize = null;
    let editing = false;
    let disposed = false;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'le-weather-layout-edit-toggle';
    toggle.textContent = 'EDIT SIZE & POSITION';
    toggle.setAttribute('aria-label','Edit Weather view element size and position');

    const panel = document.createElement('section');
    panel.className = 'le-weather-layout-edit-panel';
    panel.hidden = true;
    panel.setAttribute('aria-label','Temporary Weather layout editor');

    const head = document.createElement('div');
    head.className = 'le-weather-layout-edit-head';
    const title = document.createElement('div');
    title.className = 'le-weather-layout-edit-title';
    title.textContent = 'LAYOUT STUDIO · TEMPORARY';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'le-weather-layout-edit-close';
    close.textContent = 'HIDE TOOLS';
    head.append(title,close);

    const select = document.createElement('select');
    select.className = 'le-weather-layout-edit-select';
    select.setAttribute('aria-label','Choose an element to edit');
    for (const [id,label] of definitions) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = label;
      select.appendChild(option);
    }

    function makeRange(labelText,min,max,value,step) {
      const row = document.createElement('div');
      row.className = 'le-weather-layout-edit-row';
      const label = document.createElement('label');
      label.textContent = labelText;
      const input = document.createElement('input');
      input.type = 'range'; input.min = String(min); input.max = String(max);
      input.step = String(step); input.value = String(value);
      const output = document.createElement('output');
      output.className = 'le-weather-layout-edit-value';
      row.append(label,input,output);
      return {row,input,output};
    }
    const xControl = makeRange('X',-30,30,0,0.5);
    const yControl = makeRange('Y',-30,30,0,0.5);
    const sizeControl = makeRange('SIZE',50,200,100,1);

    const actions = document.createElement('div');
    actions.className = 'le-weather-layout-edit-actions';
    const copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'le-weather-layout-edit-action le-weather-layout-edit-copy';
    copy.textContent = 'COPY LAYOUT JSON';
    const reset = document.createElement('button');
    reset.type = 'button'; reset.className = 'le-weather-layout-edit-action'; reset.textContent = 'RESET ALL';
    const finish = document.createElement('button');
    finish.type = 'button'; finish.className = 'le-weather-layout-edit-action'; finish.textContent = 'FINISH';
    actions.append(copy,reset,finish);
    const status = document.createElement('div');
    status.className = 'le-weather-layout-edit-status';
    status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    status.textContent = 'Tap an element to select it. Drag to move; use the blue corner handle to resize.';
    const jsonBox = document.createElement('textarea');
    jsonBox.className = 'le-weather-layout-edit-json';
    jsonBox.readOnly = true; jsonBox.hidden = true;
    jsonBox.setAttribute('aria-label','Layout JSON to copy manually');
    panel.append(head,select,xControl.row,yControl.row,sizeControl.row,actions,status,jsonBox);

    const handle = document.createElement('div');
    handle.className = 'le-weather-layout-edit-handle';
    handle.hidden = true;
    handle.setAttribute('role','button');
    handle.setAttribute('aria-label','Resize selected element');
    screen.append(toggle,panel,handle);

    for (const [id,label,selectorText] of definitions) {
      const node = screen.querySelector(selectorText);
      if (!node) continue;
      node.dataset.leLayoutId = id;
      node.dataset.leLayoutLabel = label;
      nodes.set(id,node);
      states.set(id,{x:0,y:0,scale:1});
      originals.set(id,{
        transform:node.style.getPropertyValue('transform'),
        transformPriority:node.style.getPropertyPriority('transform'),
        origin:node.style.getPropertyValue('transform-origin'),
        originPriority:node.style.getPropertyPriority('transform-origin')
      });
    }
    for (const option of Array.from(select.options)) {
      if (!nodes.has(option.value)) option.disabled = true;
    }

    function setStatus(message) { status.textContent = message; }
    function apply(id) {
      const node = nodes.get(id), state = states.get(id);
      if (!node || !state) return;
      const dx = state.x * 100;
      const dy = state.y * 100;
      node.style.setProperty('transform',`translate3d(${dx}vw,${dy}vh,0) scale(${state.scale})`,'important');
      node.style.setProperty('transform-origin','center center','important');
    }
    function positionHandle() {
      const node = nodes.get(selectedId);
      if (!editing || !node) { handle.hidden = true; return; }
      const rect = node.getBoundingClientRect();
      handle.style.left = `${rect.right}px`;
      handle.style.top = `${rect.bottom}px`;
      handle.hidden = false;
    }
    function syncControls() {
      const state = states.get(selectedId) || {x:0,y:0,scale:1};
      xControl.input.value = String(Math.round(state.x*1000)/10);
      yControl.input.value = String(Math.round(state.y*1000)/10);
      sizeControl.input.value = String(Math.round(state.scale*100));
      xControl.output.textContent = `${Number(xControl.input.value).toFixed(1)}%`;
      yControl.output.textContent = `${Number(yControl.input.value).toFixed(1)}%`;
      sizeControl.output.textContent = `${sizeControl.input.value}%`;
    }
    function selectElement(id) {
      if (!nodes.has(id)) return;
      const previous = nodes.get(selectedId);
      previous?.removeAttribute('data-le-layout-selected');
      selectedId = id;
      const node = nodes.get(id);
      node?.setAttribute('data-le-layout-selected','true');
      select.value = id;
      syncControls();
      positionHandle();
    }
    function openEditor() {
      if (!landscapeQuery.matches || disposed) return;
      if (!editing) {
        editing = true;
        screen.classList.add('le-layout-editing');
        selectElement(selectedId);
        setStatus('Tap an outlined element or choose it from the list. Drag to move; use the blue handle or SIZE slider to resize.');
      }
      panel.hidden = false; toggle.hidden = true;
    }
    function restoreElement(id) {
      const node = nodes.get(id), original = originals.get(id);
      if (!node || !original) return;
      if (original.transform) node.style.setProperty('transform',original.transform,original.transformPriority);
      else node.style.removeProperty('transform');
      if (original.origin) node.style.setProperty('transform-origin',original.origin,original.originPriority);
      else node.style.removeProperty('transform-origin');
      node.removeAttribute('data-le-layout-selected');
    }
    function minimizePanel() {
      if (!editing) return;
      panel.hidden = true;
      toggle.hidden = !landscapeQuery.matches;
      toggle.textContent = 'SHOW LAYOUT TOOLS';
      positionHandle();
    }
    function exitEditor(resetAll=true) {
      editing = false;
      activeDrag = null; activeResize = null;
      screen.classList.remove('le-layout-editing');
      panel.hidden = true; toggle.hidden = !landscapeQuery.matches;
      toggle.textContent = 'EDIT SIZE & POSITION';
      handle.hidden = true;
      if (resetAll) {
        for (const [id] of nodes) {
          restoreElement(id);
          states.set(id,{x:0,y:0,scale:1});
        }
      }
      jsonBox.hidden = true;
      setStatus('Temporary edits cleared. Nothing was saved to the app.');
    }
    function updateAxis(axis,value) {
      const state = states.get(selectedId); if (!state) return;
      state[axis] = Math.max(-0.30,Math.min(0.30,Number(value)/100));
      apply(selectedId); syncControls(); positionHandle();
    }
    function updateScale(value) {
      const state = states.get(selectedId); if (!state) return;
      state.scale = Math.max(0.5,Math.min(2,Number(value)/100));
      apply(selectedId); syncControls(); positionHandle();
    }
    function layoutExport() {
      const elements = {};
      for (const [id,label] of definitions) {
        if (!nodes.has(id)) continue;
        const state = states.get(id);
        if (Math.abs(state.x)>0.00001 || Math.abs(state.y)>0.00001 || Math.abs(state.scale-1)>0.00001) {
          elements[id] = {
            label,
            selector:definitions.find(item=>item[0]===id)?.[2] || '',
            xPercent:Number((state.x*100).toFixed(2)),
            yPercent:Number((state.y*100).toFixed(2)),
            scalePercent:Number((state.scale*100).toFixed(1))
          };
        }
      }
      return {
        schema:'live-earth-weather-layout-adjustments-v1',
        mode:'temporary-visual-editor',
        orientation:'landscape',
        coordinateReference:'viewport width and height; translations are percentages; scale is uniform',
        viewport:{width:window.innerWidth,height:window.innerHeight},
        elements
      };
    }
    async function copyLayout() {
      const text = JSON.stringify(layoutExport(),null,2);
      jsonBox.value = text;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(text);
        jsonBox.hidden = true;
        setStatus('Layout JSON copied. Paste it into this chat when ready.');
      } catch (_) {
        jsonBox.hidden = false;
        jsonBox.focus(); jsonBox.select();
        setStatus('Select the JSON below and use Copy, then paste it into this chat.');
      }
    }
    function resetAll() {
      for (const [id] of nodes) {
        states.set(id,{x:0,y:0,scale:1});
        restoreElement(id);
      }
      selectElement(selectedId);
      jsonBox.hidden = true;
      setStatus('All temporary sizes and positions reset.');
    }

    function onPointerDown(event) {
      if (!editing || panel.contains(event.target)) return;
      const node = event.target.closest?.('[data-le-layout-id]');
      if (!node || !screen.contains(node)) return;
      if (event.target.closest?.('select')) return;
      const id = node.dataset.leLayoutId;
      selectElement(id);
      const state = states.get(id);
      activeDrag = {id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,baseX:state.x,baseY:state.y,moved:false};
      try { node.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    }
    function onPointerMove(event) {
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
      const dx = event.clientX-activeDrag.startX;
      const dy = event.clientY-activeDrag.startY;
      if (Math.abs(dx)+Math.abs(dy)>2) activeDrag.moved = true;
      const state = states.get(activeDrag.id);
      state.x = Math.max(-0.30,Math.min(0.30,activeDrag.baseX + dx/Math.max(1,screen.clientWidth)));
      state.y = Math.max(-0.30,Math.min(0.30,activeDrag.baseY + dy/Math.max(1,screen.clientHeight)));
      apply(activeDrag.id); syncControls(); positionHandle();
    }
    function onPointerUp(event) {
      if (activeDrag && event.pointerId===activeDrag.pointerId) activeDrag=null;
    }
    function onHandleDown(event) {
      if (!editing) return;
      const node = nodes.get(selectedId); if (!node) return;
      const rect = node.getBoundingClientRect();
      activeResize={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,baseScale:states.get(selectedId).scale,baseExtent:Math.max(1,rect.width+rect.height)};
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault(); event.stopPropagation();
    }
    function onHandleMove(event) {
      if (!activeResize || event.pointerId!==activeResize.pointerId) return;
      const delta=(event.clientX-activeResize.startX + event.clientY-activeResize.startY)/activeResize.baseExtent;
      updateScale(Math.round(Math.max(0.5,Math.min(2,activeResize.baseScale*(1+delta)))*100));
    }
    function onHandleUp(event) { if(activeResize && event.pointerId===activeResize.pointerId)activeResize=null; }
    function onOrientationChange() {
      if (!landscapeQuery.matches) exitEditor(true);
      toggle.hidden = !landscapeQuery.matches;
    }

    const handleClose = minimizePanel;
    const handleFinish = () => exitEditor(true);
    const handleSelect = () => selectElement(select.value);
    toggle.addEventListener('click',openEditor);
    close.addEventListener('click',handleClose);
    finish.addEventListener('click',handleFinish);
    select.addEventListener('change',handleSelect);
    xControl.input.addEventListener('input',()=>updateAxis('x',xControl.input.value));
    yControl.input.addEventListener('input',()=>updateAxis('y',yControl.input.value));
    sizeControl.input.addEventListener('input',()=>updateScale(sizeControl.input.value));
    copy.addEventListener('click',copyLayout);
    reset.addEventListener('click',resetAll);
    screen.addEventListener('pointerdown',onPointerDown,true);
    window.addEventListener('pointermove',onPointerMove,{passive:false});
    window.addEventListener('pointerup',onPointerUp);
    window.addEventListener('pointercancel',onPointerUp);
    handle.addEventListener('pointerdown',onHandleDown);
    handle.addEventListener('pointermove',onHandleMove);
    handle.addEventListener('pointerup',onHandleUp);
    handle.addEventListener('pointercancel',onHandleUp);
    window.addEventListener('resize',positionHandle,{passive:true});
    window.addEventListener('orientationchange',onOrientationChange,{passive:true});
    toggle.hidden = !landscapeQuery.matches;
    selectElement(selectedId);

    return () => {
      if (disposed) return;
      disposed=true;
      exitEditor(true);
      toggle.removeEventListener('click',openEditor);
      close.removeEventListener('click',handleClose);
      finish.removeEventListener('click',handleFinish);
      select.removeEventListener('change',handleSelect);
      screen.removeEventListener('pointerdown',onPointerDown,true);
      window.removeEventListener('pointermove',onPointerMove);
      window.removeEventListener('pointerup',onPointerUp);
      window.removeEventListener('pointercancel',onPointerUp);
      handle.removeEventListener('pointerdown',onHandleDown);
      handle.removeEventListener('pointermove',onHandleMove);
      handle.removeEventListener('pointerup',onHandleUp);
      handle.removeEventListener('pointercancel',onHandleUp);
      window.removeEventListener('resize',positionHandle);
      window.removeEventListener('orientationchange',onOrientationChange);
      for (const [id,node] of nodes) {
        restoreElement(id);
        delete node.dataset.leLayoutId;
        delete node.dataset.leLayoutLabel;
      }
      toggle.remove(); panel.remove(); handle.remove();
    };
  }

  function activateWeather(){
    const view=mount('weather');if(!view)return;
    addStyles();const screen=makeScreen();view.panel.remove();view.root.replaceChildren(screen);const layoutEditorCleanup=installVisualLayoutEditor(screen);

    const weatherDock = document.getElementById('le-feature-dock');
    function syncDockClearance() {
      if (!weatherDock || weatherDock.hidden || getComputedStyle(weatherDock).display === 'none') {
        screen.style.removeProperty('--le-weather-dock-clearance');
        return;
      }
      const dockRect = weatherDock.getBoundingClientRect();
      const screenRect = screen.getBoundingClientRect();
      if (!(dockRect.width > 0) || !(dockRect.height > 0) || !Number.isFinite(dockRect.top)) {
        screen.style.removeProperty('--le-weather-dock-clearance');
        return;
      }
      const clearance = Math.ceil(Math.max(0, screenRect.bottom - dockRect.top) + 12);
      screen.style.setProperty('--le-weather-dock-clearance', `${clearance}px`);
    }
    const weatherDockObserver = weatherDock && typeof ResizeObserver === 'function'
      ? new ResizeObserver(syncDockClearance) : null;
    weatherDockObserver?.observe(weatherDock);
    window.addEventListener('resize', syncDockClearance, { passive:true });
    window.addEventListener('orientationchange', syncDockClearance, { passive:true });
    syncDockClearance();
    const canvas=screen.querySelector('#le-weather-art-canvas');const painter=makePainter(canvas);const studioCanvas=screen.querySelector('#le-weather-studio-canvas');const studioState=screen.querySelector('#le-weather-studio-state');const studioTitle=screen.querySelector('#le-weather-studio-title');const studioCaption=screen.querySelector('#le-weather-studio-caption');const studioPainter=makeArtStudioPainter(studioCanvas,meta=>{if(studioState)studioState.textContent=meta.complete?'FINISHED':`DRAWING · ${String(meta.count).padStart(2,'0')} / ${meta.total}`;if(meta.title&&studioTitle)studioTitle.textContent=meta.title;});const replayButton=screen.querySelector('#le-weather-art-replay');const handleReplay=()=>studioPainter.replay();replayButton?.addEventListener('click',handleReplay);
    let abortController=null,pollTimer=0,refreshTimer=0,clockTimer=0,disposed=false,requestSerial=0,lastFetch=0,manualPreview=false;
    const selector=screen.querySelector('#le-weather-mode-select');
    const handleModeChange=()=>chooseMode(selector.value);
    const stopPolling=()=>{if(pollTimer)clearInterval(pollTimer);pollTimer=0;};
    function paint(data,preview=false){
      const c=data.current||{};const code=Number(c.weather_code);if(!Number.isFinite(code))throw new Error('Weather source returned unusable conditions.');
      paintData(screen,data,preview);painter.setState(screen.__weatherState);studioPainter.setState(screen.__weatherState);lastFetch=Date.now();
      const artKind=screen.__weatherState.phase==='night'?'night':screen.__weatherState.weather;const artRecord=JAPANESE_ART_LIBRARY.find(item=>item.weather.includes(artKind))||JAPANESE_ART_LIBRARY[0];if(studioCaption)studioCaption.textContent=`${artRecord.caption} · ${preview?'Sample scene':'Live weather matched'}`;
    }
    function showPreview(kind='clear',message='SAMPLE SCENE · Turn on Location for your live forecast.'){
      const data=sampleData(kind);paint(data,true);setText(screen,'le-weather-status',message);screen.dataset.preview='true';setText(screen,'le-weather-place-text','LOCATION PREVIEW');
    }
    function showLocationOff(){showPreview('clear','SAMPLE SCENE · Location is off. Choose a weather mode to explore, or turn on Location for live data.');}
    async function fetchLive(){
      if(disposed||!isActive('weather')||manualPreview)return;
      if(window.liveEarthLocationAllowed?.()!==true){showLocationOff();return;}
      if(navigator.onLine===false){showPreview('clear','OFFLINE · Showing sample art, not live conditions.');return;}
      const point=globe()?.getLocation?.();const lat=Number(point?.latitude),lon=Number(point?.longitude);
      if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lon)||lon < -180||lon>180){showLocationOff();return;}
      abortController?.abort();const controller=new AbortController();abortController=controller;const serial=++requestSerial;
      const query=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:'temperature_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,relative_humidity_2m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:'1',timezone:'auto',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});
      try{const response=await fetch(`${API_ROOT}?${query}`,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error(`Weather source returned ${response.status}.`);const data=await response.json();if(disposed||!isActive('weather')||serial!==requestSerial||window.liveEarthLocationAllowed?.()!==true)return;paint(data,false);setText(screen,'le-weather-place-text','YOUR LOCATION');}
      catch(error){if(error?.name!=='AbortError'&&!disposed&&isActive('weather')&&window.liveEarthLocationAllowed?.()===true)showPreview('clear','LIVE DATA UNAVAILABLE · Showing a labelled sample scene.');}
      finally{if(abortController===controller)abortController=null;}
    }
    function pollForFix(){stopPolling();let remaining=24;pollTimer=window.setInterval(()=>{if(disposed||!isActive('weather')){stopPolling();return;}if(window.liveEarthLocationAllowed?.()!==true){stopPolling();showLocationOff();return;}const p=globe()?.getLocation?.();if(p&&Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))){stopPolling();fetchLive();return;}if(--remaining<=0){stopPolling();showLocationOff();}},500);}
    function chooseMode(mode){
      manualPreview=mode!=='auto';if(mode==='auto'){if(window.liveEarthLocationAllowed?.()===true)fetchLive();else showLocationOff();return;}
      stopPolling();requestSerial++;abortController?.abort();abortController=null;showPreview(mode,`PREVIEW · ${mode.toUpperCase()} WEATHER — sample values only.`);
    }
    function onLocationState(event){if(!isActive('weather'))return;if(event.detail?.enabled===true&&window.liveEarthLocationAllowed?.()===true&&!manualPreview)pollForFix();else if(window.liveEarthLocationAllowed?.()!==true&&!manualPreview)showLocationOff();}
    function onLocationStop(){stopPolling();requestSerial++;abortController?.abort();abortController=null;if(!manualPreview)showLocationOff();}
    function onOnline(){if(!manualPreview&&window.liveEarthLocationAllowed?.()===true)fetchLive();}
    function onOffline(){stopPolling();requestSerial++;abortController?.abort();abortController=null;if(!manualPreview)showPreview('clear','OFFLINE · Showing a labelled sample scene, not live weather.');}
    function onVisibility(){if(!document.hidden&&!manualPreview&&window.liveEarthLocationAllowed?.()===true&&Date.now()-lastFetch>REFRESH_MS)fetchLive();}
    function updateLocalClock(){if(!screen.isConnected)return;setText(screen,'le-weather-date',deviceClock());}
    selector.addEventListener('change',handleModeChange);
    window.addEventListener('live-earth-location-state',onLocationState);window.addEventListener('live-earth-location-stop',onLocationStop);window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);document.addEventListener('visibilitychange',onVisibility);
    refreshTimer=window.setInterval(()=>{if(!disposed&&!document.hidden&&!manualPreview&&window.liveEarthLocationAllowed?.()===true)fetchLive();},REFRESH_MS);
    clockTimer=window.setInterval(updateLocalClock,30000);updateLocalClock();
    if(window.liveEarthLocationAllowed?.()===true)pollForFix();else showLocationOff();
    return () => {disposed=true;requestSerial++;stopPolling();if(refreshTimer)clearInterval(refreshTimer);if(clockTimer)clearInterval(clockTimer);abortController?.abort();abortController=null;painter.stop();studioPainter.stop();replayButton?.removeEventListener('click',handleReplay);selector.removeEventListener('change',handleModeChange);window.removeEventListener('live-earth-location-state',onLocationState);window.removeEventListener('live-earth-location-stop',onLocationStop);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);document.removeEventListener('visibilitychange',onVisibility);weatherDockObserver?.disconnect();window.removeEventListener('resize',syncDockClearance);window.removeEventListener('orientationchange',syncDockClearance);layoutEditorCleanup?.();screen.remove();document.getElementById(STYLE_ID)?.remove();};
  }

  runtime.registerFeature('weather',activateWeather);
})();
