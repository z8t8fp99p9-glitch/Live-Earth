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
      .le-weather-screen:before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.23;background-image:repeating-linear-gradient(7deg,transparent 0 11px,rgba(78,68,51,.035) 12px,transparent 13px),repeating-linear-gradient(93deg,transparent 0 17px,rgba(78,68,51,.025) 18px,transparent 19px);mix-blend-mode:multiply}
      .le-weather-screen[data-phase="night"]{--paper:#202a2a;--paper-deep:#152223;--ink:#f0eee5;--muted:#bdc8bf;--accent:#d36b55;background:radial-gradient(ellipse at 77% 47%,rgba(74,103,98,.28),transparent 45%),linear-gradient(160deg,var(--paper),var(--paper-deep))}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"],.le-weather-screen[data-weather="fog"]{--paper:#e8e9df;--paper-deep:#d7dfd7}
      .le-weather-screen[data-phase="night"][data-weather="rain"],.le-weather-screen[data-phase="night"][data-weather="storm"],.le-weather-screen[data-phase="night"][data-weather="fog"]{--paper:#1b272b;--paper-deep:#101c21}
      .le-weather-content{box-sizing:border-box;position:relative;z-index:2;width:min(100%,760px);margin:0 auto;padding:calc(env(safe-area-inset-top) + 17px) clamp(20px,5vw,34px) calc(env(safe-area-inset-bottom) + 264px)}
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
      .le-weather-headline{max-width:510px;margin:0;font-family:"Bodoni 72",Didot,"Bodoni MT",Georgia,"Times New Roman",serif;font-size:clamp(43px,11vw,70px);font-weight:400;line-height:.91;letter-spacing:-.055em;text-wrap:balance;color:var(--ink)}
      .le-weather-headline em{font-style:italic;font-weight:400;color:var(--ink)}
      .le-weather-headline:after{content:"";display:block;width:34px;height:2px;margin:15px 0 13px;background:var(--accent)}
      .le-weather-temperature-row{position:absolute;top:clamp(8px,2vh,18px);left:clamp(12px,2vw,24px);z-index:3;display:flex;align-items:flex-start;gap:14px;max-width:calc(100% - 24px);margin:0;pointer-events:none}
      .le-weather-temperature{font-family:"Bodoni 72",Didot,"Bodoni MT",Georgia,"Times New Roman",serif;font-size:clamp(78px,21vw,116px);font-weight:400;letter-spacing:-.095em;line-height:.82;white-space:nowrap;color:var(--ink)}
      .le-weather-temperature sup{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:.27em;vertical-align:top;letter-spacing:0;margin-left:5px}
      .le-weather-condition{min-width:0;padding:3px 0 4px 14px;border-left:1px solid color-mix(in srgb,var(--ink) 38%,transparent)}
      .le-weather-condition-icon{display:block;width:34px;height:31px;margin-bottom:4px;color:var(--ink)}
      .le-weather-condition-name{font-family:"Bodoni 72",Didot,"Bodoni MT",Georgia,"Times New Roman",serif;font-size:16px;line-height:1.15}
      .le-weather-feels{margin-top:4px;color:var(--muted);font-size:10px}
      .le-weather-dashboard{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"hero" "scene" "summary" "studio";row-gap:12px;align-items:start;margin-top:14px}
      .le-weather-forecast-column,.le-weather-art-column{display:contents}
      .le-weather-hero{grid-area:hero;position:relative;z-index:2;max-width:520px;margin:0}
      .le-weather-art-stage{grid-area:scene;position:relative;z-index:1;height:clamp(190px,30vh,260px);margin:0 -10px;pointer-events:none;overflow:hidden}
      .le-weather-art-canvas{display:block;width:100%;height:100%;touch-action:none}
      .le-weather-summary{grid-area:summary;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:0;padding:12px 0;border-top:1px solid color-mix(in srgb,var(--ink) 20%,transparent);border-bottom:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}
      .le-weather-stat{min-width:0;padding:0 10px;border-right:1px solid color-mix(in srgb,var(--ink) 17%,transparent)}.le-weather-stat:first-child{padding-left:2px}.le-weather-stat:last-child{border-right:0}
      .le-weather-stat-label{display:block;color:var(--muted);font-size:7px;font-weight:750;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
      .le-weather-stat-value{display:block;margin-top:6px;color:var(--ink);font-family:"Bodoni 72",Didot,"Bodoni MT",Georgia,"Times New Roman",serif;font-size:clamp(15px,4vw,18px);font-weight:400;letter-spacing:-.025em;line-height:1.05;white-space:nowrap}
      .le-weather-studio{grid-area:studio;position:relative;min-width:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--ink) 16%,transparent);border-radius:17px;background:linear-gradient(145deg,rgba(255,255,255,.40),rgba(214,218,204,.20));box-shadow:0 8px 26px rgba(41,48,40,.06),inset 0 1px rgba(255,255,255,.68);padding:13px 13px 10px}
      .le-weather-studio-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px}
      .le-weather-studio-kicker{display:block;color:var(--muted);font-size:7px;font-weight:850;letter-spacing:.20em;text-transform:uppercase}
      .le-weather-studio-title{margin:4px 0 0;font-family:"Bodoni 72",Didot,"Bodoni MT",Georgia,"Times New Roman",serif;font-size:20px;font-weight:400;line-height:1.05;letter-spacing:-.025em;color:var(--ink)}
      .le-weather-studio-state{flex:0 0 auto;color:var(--accent);font-size:7px;font-weight:850;letter-spacing:.13em;text-align:right;white-space:nowrap;padding-top:2px}
      .le-weather-studio-canvas{display:block;width:100%;height:clamp(180px,28vh,245px);border-radius:10px;background:radial-gradient(ellipse at 50% 46%,rgba(255,255,255,.48),rgba(231,229,215,.12) 72%);touch-action:none}
      .le-weather-studio-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;color:var(--muted);font-size:8px;letter-spacing:.03em}
      .le-weather-art-replay{appearance:none;border:1px solid color-mix(in srgb,var(--ink) 22%,transparent);border-radius:999px;padding:5px 9px;background:rgba(255,255,255,.34);color:var(--ink);font:750 7px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.12em;cursor:pointer}
      .le-weather-art-replay:active{transform:scale(.97)}
      .le-weather-status{min-height:15px;margin:12px 1px 0;color:var(--muted);font-size:8px;line-height:1.45}.le-weather-status:empty{display:none}
      .le-weather-screen[data-weather="rain"],.le-weather-screen[data-weather="storm"]{--accent:#4e8285}.le-weather-screen[data-weather="snow"]{--accent:#718c9e}.le-weather-screen[data-weather="hot"]{--accent:#bd6945}
      .le-weather-attribution{margin:13px 1px 0;color:var(--muted);font-size:7px;line-height:1.4;opacity:.78}
      @media(min-width:600px) and (orientation:portrait){.le-weather-content{width:min(100%,760px);padding-left:clamp(32px,7vw,60px);padding-right:clamp(32px,7vw,60px)}.le-weather-headline{font-size:clamp(64px,9vw,88px)}.le-weather-temperature{font-size:126px}.le-weather-art-stage{height:clamp(240px,34vh,320px)}.le-weather-studio-canvas{height:clamp(210px,30vh,280px)}}
      /* Landscape: a quiet Weather overview on the left; Live Art is the visual feature on the right.
         Header elements stay inside the physical horizontal safe areas on notched iPhones. */
      @media (orientation:landscape) and (min-width:650px) {
        .le-weather-screen { overflow-y:auto; }
        .le-weather-content {
          width:min(100%,1380px);
          min-height:100%;
          padding-top:calc(env(safe-area-inset-top) + clamp(8px,1.6vh,12px));
          padding-right:max(env(safe-area-inset-right),clamp(40px,5.8vw,64px));
          padding-bottom:var(--le-weather-dock-clearance,calc(env(safe-area-inset-bottom) + 112px));
          padding-left:max(env(safe-area-inset-left),clamp(40px,5.8vw,64px));
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
          grid-template-columns:minmax(218px,.42fr) minmax(0,1fr);
          grid-template-areas:"forecast artwork";
          column-gap:clamp(15px,2vw,23px);
          row-gap:0;
          align-items:stretch;
          height:clamp(190px,calc(100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,126px) - 80px),292px);
          margin-top:clamp(7px,1.5vh,11px);
        }
        .le-weather-forecast-column {
          grid-area:forecast;
          display:grid;
          grid-template-columns:minmax(0,1fr);
          grid-template-rows:auto minmax(58px,1fr) auto;
          grid-template-areas:"hero" "scene" "summary";
          row-gap:6px;
          min-width:0;
          min-height:0;
        }
        .le-weather-art-column {
          grid-area:artwork;
          display:grid;
          grid-template-columns:minmax(0,1fr);
          grid-template-rows:minmax(0,1fr);
          grid-template-areas:"studio";
          min-width:0;
          min-height:0;
        }
        .le-weather-hero {
          grid-area:hero;
          display:block;
          position:relative;
          z-index:2;
          max-width:none;
          min-width:0;
          margin:0;
        }
        .le-weather-headline {
          max-width:100%;
          font-size:clamp(31px,4.4vw,42px);
          line-height:.89;
          letter-spacing:-.06em;
        }
        .le-weather-headline:after {
          width:27px;
          height:2px;
          margin:7px 0 3px;
        }
        /* A quiet, borderless scene leaves the detailed painting to Live Art. */
        .le-weather-art-stage {
          grid-area:scene;
          position:relative;
          z-index:1;
          isolation:isolate;
          box-sizing:border-box;
          width:100%;
          height:100%;
          min-height:58px;
          max-height:none;
          margin:0;
          overflow:hidden;
          border-radius:0;
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
          top:clamp(5px,1vh,8px);
          left:9px;
          display:flex;
          align-items:flex-start;
          gap:8px;
          max-width:calc(100% - 18px);
        }
        .le-weather-temperature { font-size:clamp(53px,6.1vw,66px); }
        .le-weather-condition { padding:2px 0 2px 9px; }
        .le-weather-condition-icon { width:27px;height:25px;margin-bottom:2px; }
        .le-weather-condition-name { font-size:13px; }
        .le-weather-feels { margin-top:3px;font-size:9px; }
        .le-weather-summary {
          grid-area:summary;
          align-self:end;
          margin:0;
          padding:6px 0;
        }
        .le-weather-stat { padding:0 4px; }
        .le-weather-stat:first-child { padding-left:1px; }
        .le-weather-stat-label { font-size:7px;letter-spacing:.04em; }
        .le-weather-stat-value { margin-top:4px;font-size:clamp(13px,1.55vw,16px); }

        /* The painting receives the remaining ~70% of the usable width. */
        .le-weather-studio {
          grid-area:studio;
          box-sizing:border-box;
          position:relative;
          display:block;
          width:100%;
          height:100%;
          min-height:0;
          max-height:none;
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
        .le-weather-studio-head > div { min-width:0; }
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
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
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
        .le-weather-topbar {
          grid-template-columns:minmax(0,1fr) auto;
          grid-template-rows:auto auto;
          row-gap:9px;
          min-height:54px;
        }
        .le-weather-brand { grid-column:1;grid-row:1;font-size:11px; }
        .le-weather-date { grid-column:1;grid-row:2;font-size:9px;letter-spacing:.12em; }
        .le-weather-place { grid-column:2;grid-row:1;font-size:9px; }
        .le-weather-mode { grid-column:2;grid-row:2;min-height:32px;padding:3px 9px; }
        .le-weather-dashboard {
          height:clamp(178px,calc(100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,126px) - 94px),260px);
        }
      }
      @media (orientation:landscape) and (max-height:390px) {
        .le-weather-dashboard {
          height:clamp(168px,calc(100svh - env(safe-area-inset-top) - var(--le-weather-dock-clearance,116px) - 72px),238px);
        }
        .le-weather-content { padding-top:calc(env(safe-area-inset-top) + 6px); }
        .le-weather-topbar { min-height:34px; }
        .le-weather-brand { font-size:clamp(11px,1.2vw,12px); }
        .le-weather-date { font-size:clamp(8px,.95vw,9px); }
        .le-weather-place { font-size:clamp(8px,.95vw,9px); }
        .le-weather-mode { min-height:31px;padding:3px 9px; }
        .le-weather-headline { font-size:clamp(29px,4vw,36px); }
        .le-weather-temperature { font-size:clamp(49px,5.8vw,60px); }
        .le-weather-studio-title { font-size:clamp(20px,2.5vw,26px); }
      }
      @media(max-width:430px){.le-weather-content{padding-left:17px;padding-right:17px;padding-bottom:calc(env(safe-area-inset-bottom) + 278px)}.le-weather-date-row{margin-top:24px;align-items:flex-start}.le-weather-headline{font-size:clamp(42px,11.5vw,52px)}.le-weather-temperature{font-size:clamp(74px,20vw,86px)}.le-weather-art-stage{height:clamp(158px,21vh,180px);margin-left:-9px;margin-right:-9px}.le-weather-summary{padding:10px 0}.le-weather-stat{padding:0 6px}.le-weather-stat-label{font-size:6px;letter-spacing:.08em}.le-weather-stat-value{font-size:11px}.le-weather-studio{padding:11px 10px 9px;border-radius:14px}.le-weather-studio-title{font-size:18px}.le-weather-studio-canvas{height:clamp(138px,18vh,155px)}}

      /* Portrait composition: the weather readings and artwork form one scene.
         Live Art is a full-card painting with its controls layered above it. */
      @media (orientation:portrait) {
        .le-weather-content {
          padding-top:calc(env(safe-area-inset-top) + 0px);
          padding-bottom:var(--le-weather-dock-clearance,calc(env(safe-area-inset-bottom) + 112px));
        }
        .le-weather-topbar { row-gap:clamp(15px,1.8dvh,21px); }
        .le-weather-dashboard {
          grid-template-areas:"headline" "scene" "summary" "studio";
          margin-top:clamp(4px,.55dvh,6px);
          row-gap:clamp(5px,.65dvh,7px);
        }
        .le-weather-hero { display:contents; }
        .le-weather-headline {
          grid-area:headline;
          position:relative;
          z-index:3;
          margin:0;
        }
        .le-weather-art-stage {
          grid-area:scene;
          position:relative;
          isolation:isolate;
          box-sizing:border-box;
          width:100vw;
          height:15dvh;
          min-height:118px;
          max-height:154px;
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
        /* This overlay is deliberately a child of the same scene canvas. */
        .le-weather-temperature-row {
          position:absolute;
          z-index:3;
          top:0;
          left:50%;
          width:min(calc(100% - 34px),60dvh);
          max-width:100%;
          margin:0;
          align-items:flex-start;
          transform:translateX(-50%);
          pointer-events:none;
        }
        .le-weather-temperature { font-size:clamp(78px,21vw,100px); }
        .le-weather-condition { padding-top:5px; }
        .le-weather-condition-icon { width:36px;height:34px;margin-bottom:3px; }
        .le-weather-condition-name { font-size:17px; }
        .le-weather-feels { font-size:10px; }
        .le-weather-summary { padding:8px 0; }

        /* The painting reaches every edge of its inset card; copy is overlay UI. */
        .le-weather-studio {
          box-sizing:border-box;
          position:relative;
          width:min(95vw,760px);
          height:auto;
          aspect-ratio:10 / 7;
          margin-left:calc(50% - min(47.5vw,380px));
          margin-right:calc(50% - min(47.5vw,380px));
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
          font-size:6px;
          line-height:1.1;
          letter-spacing:.17em;
        }
        .le-weather-studio-title {
          margin:4px 0 0;
          font-size:clamp(15px,3.9vw,19px);
          line-height:1.02;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .le-weather-studio-state {
          flex:0 0 auto;
          padding-top:1px;
          font-size:6px;
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
          min-height:24px;
          padding:5px 11px;
          font-size:7px;
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

      @media(prefers-reduced-motion:reduce){.le-weather-screen *,.le-weather-screen *:before,.le-weather-screen *:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      @media(prefers-reduced-transparency:reduce){.le-weather-mode{background:var(--paper)}}
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
      const {ink,soft,accent}=p;const night=state.phase==='night';
      const sx=width*(state.phase==='evening'?.78:.76),sy=height*.34,r=Math.min(width,height)*.115;
      ctx.save();ctx.globalAlpha=state.weather==='storm'?.42:state.weather==='fog'?.38:.68;ctx.fillStyle=night?'#dfe3d6':accent;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
      if(night){ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(sx+r*.36,sy-r*.22,r*.84,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';}
      ctx.globalAlpha=night?.48:.23;ctx.strokeStyle=ink;ctx.lineWidth=.7;for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(sx,sy,r*(.56+i*.13),r*(.62+i*.09),-.2,0,Math.PI*2);ctx.stroke();}ctx.restore();
      const cloudCount=state.cloud>72?4:state.cloud>32?2:1;
      for(let i=0;i<cloudCount;i++){const x=width*(.48+i*.12)+Math.sin(t*.12+i)*Math.max(2,state.wind*.45);const y=height*(.25+i*.075);const s=Math.min(width,height)*(.045+i*.006);ctx.save();ctx.globalAlpha=(.25+state.cloud/440)*(night?1.28:1);ctx.strokeStyle=soft;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,s,.95,2.7);ctx.arc(x+s*.85,y-s*.12,s*.78,Math.PI,Math.PI*1.98);ctx.arc(x+s*1.65,y,s,.45,2.4);ctx.stroke();ctx.restore();}
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
    function drawSnow(p,t){if(state.weather!=='snow'){snowLoad=Math.max(0,snowLoad-.0015);return;}const {soft}=p;const amount=Math.max(.12,Math.min(1,state.snowfall/2));snowLoad=reduced?Math.max(snowLoad,amount*.32):Math.min(.92,snowLoad+amount*.00055);const count=Math.round(12+amount*22);for(let i=0;i<count;i++){const x=((i*83+Math.sin(t*.3+i)*13)%width+width)%width;const y=((i*47+t*(4+(i%4)*1.2))%height*.78);ctx.save();ctx.globalAlpha=.45+(i%3)*.12;ctx.fillStyle=soft;ctx.beginPath();ctx.arc(x,y,1+(i%3)*.45,0,Math.PI*2);ctx.fill();ctx.restore();}}
    function drawRain(p,t){if(state.weather!=='rain'&&state.weather!=='storm')return;const {soft,ink}=p;const intensity=Math.min(1,Math.max(.18,state.precipitation/6));const count=Math.round(16+intensity*22);for(let i=0;i<count;i++){const x=((i*73+t*(state.wind*.8+9))%width+width)%width;const y=((i*49+t*(90+intensity*90))%height*.86);line([[x,y],[x-2+Math.sin(state.direction*Math.PI/180)*6,y+8+intensity*7]],soft,.23+intensity*.18,.65);}
      for(let i=0;i<5;i++){const x=width*(.12+i*.19);const y=height*(.75+(i%2)*.12);const phase=(t*.55+i*.27)%1;ctx.save();ctx.globalAlpha=.32*(1-phase);ctx.strokeStyle=ink;ctx.lineWidth=.75;ctx.beginPath();ctx.ellipse(x,y,4+phase*15,1.5+phase*3,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
    function drawWindLines(p,t){if(state.wind<18)return;const {soft}=p;const alpha=Math.min(.30,state.wind/180);for(let i=0;i<4;i++){const y=height*(.38+i*.095)+Math.sin(t*.55+i)*3;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=soft;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(width*(.10+i*.03),y);ctx.bezierCurveTo(width*.35,y-5,width*.56,y+6,width*.88,y-3);ctx.stroke();ctx.restore();}}
    function drawFog(p,t){if(state.weather!=='fog'&&state.cloud<85)return;const {paper,soft}=p;for(let i=0;i<3;i++){const y=height*(.49+i*.075)+Math.sin(t*.15+i)*7;const g=ctx.createLinearGradient(0,y,width,y);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.48,state.weather==='fog'?'rgba(238,238,224,.34)':'rgba(238,238,224,.15)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.save();ctx.fillStyle=g;ctx.fillRect(0,y-9,width,19);ctx.restore();}}
    function drawMinimalLandscape(p,t){
      const night=state.phase==='night';
      const horizon=height*.68;
      drawSky(p,t);
      ctx.save();
      const far=ctx.createLinearGradient(0,height*.28,0,height*.84);
      far.addColorStop(0,night?'#6e8578':'#c7cec4');
      far.addColorStop(1,night?'#40574d':'#e2e4da');
      ctx.fillStyle=far;
      ctx.globalAlpha=.72;
      ctx.beginPath();
      ctx.moveTo(0,height*.72);
      ctx.quadraticCurveTo(width*.18,height*.48,width*.34,height*.64);
      ctx.quadraticCurveTo(width*.54,height*.38,width*.72,height*.62);
      ctx.quadraticCurveTo(width*.86,height*.51,width,height*.65);
      ctx.lineTo(width,height);
      ctx.lineTo(0,height);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha=night?.48:.34;
      ctx.strokeStyle=night?'#dbe6dc':'#718176';
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(0,height*.73);
      ctx.quadraticCurveTo(width*.20,height*.54,width*.37,height*.68);
      ctx.quadraticCurveTo(width*.58,height*.46,width*.76,height*.66);
      ctx.quadraticCurveTo(width*.89,height*.56,width,height*.68);
      ctx.stroke();
      const water=ctx.createLinearGradient(0,horizon,0,height);
      water.addColorStop(0,night?'rgba(116,151,139,.34)':'rgba(142,161,148,.24)');
      water.addColorStop(1,'rgba(255,255,255,.015)');
      ctx.fillStyle=water;
      ctx.globalAlpha=1;
      ctx.fillRect(0,horizon,width,height-horizon);
      for(let i=0;i<4;i++){
        const y=horizon+(height-horizon)*(i+1)/5;
        const wave=Math.sin(t*.45+i)*Math.min(2.2,state.wind*.06);
        line([[width*.04,y],[width*.34,y+wave],[width*.63,y-wave*.35],[width*.96,y]],p.soft,.25-i*.035,.65);
      }
      ctx.restore();
      if(state.weather==='rain'||state.weather==='storm')drawRain(p,t);
      else if(state.weather==='snow')drawSnow(p,t);
      else if(state.weather==='fog')drawFog(p,t);
      else if(state.weather==='wind')drawWindLines(p,t);
    }
    function draw(){
      const p=palette();const t=elapsed;ctx.clearRect(0,0,width,height);
      const compactLandscape=window.innerWidth>window.innerHeight&&width<560;
      if(compactLandscape){drawMinimalLandscape(p,t);return;}
      drawSky(p,t);drawMountains(p,t);drawWater(p,t);drawPagoda(p);drawPagodaReflection(p);drawBambooAndLeaves(p,t);drawWindLines(p,t);drawRain(p,t);drawSnow(p,t);drawFog(p,t);
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
    const study=JAPANESE_ART_LIBRARY.find(item=>item.weather.includes(kind)) || JAPANESE_ART_LIBRARY[0];
    const strokes=[];
    const add=(points,tone='ink',weight=1.7,alpha=.78,kind='line')=>strokes.push({points,tone,weight,alpha,kind});
    const sample=(fn,count=22)=>Array.from({length:count+1},(_,i)=>fn(i/count));
    const quad=(a,c,b,n=18)=>sample(t=>[(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]],n);
    const cubic=(a,c1,c2,b,n=24)=>sample(t=>{const u=1-t;return [u*u*u*a[0]+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*b[0],u*u*u*a[1]+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*b[1]];},n);
    const paper=state.phase==='night'?'#d8ddd2':'#344239';
    // A quiet red sun / moon is the signature mark in every composition.
    if(state.phase==='night'||study.motif==='moon'){
      // Subtle lunar surface marks; the filled crescent is rendered by the canvas layer.
      add([[.718,.225],[.735,.220],[.748,.224]],'soft',.65,.42);
      add([[.756,.265],[.768,.260],[.776,.264]],'soft',.55,.34);
    } else {
      // Fine horizontal pigment striations sit inside the vermilion sun disk.
      for(let i=0;i<5;i++){
        const y=.205+i*.014;
        add([[.685,y],[.715,y+.002],[.755,y],[.795,y+.002]],'soft',.55,.28);
      }
    }
    // Broad, translucent ink washes establish the paper-and-pigment depth first.
    add(cubic([-.08,.66],[.16,.50],[.27,.55],[.43,.65]),'ridge',8.5,.16,'wash');
    add(cubic([.24,.69],[.43,.55],[.62,.58],[.82,.68]),'soft',7.2,.13,'wash');
    add(cubic([-.02,.78],[.23,.69],[.48,.73],[.71,.80]),'ridge',9.5,.12,'wash');
    // Broad, layered mountain planes are the backbone of this 4:1 panorama.
    const farMountain=[
      ...cubic([-.08,.69],[.08,.40],[.19,.52],[.35,.66]),
      ...cubic([.35,.66],[.53,.38],[.69,.48],[1.08,.64]).slice(1),
      [1.08,.92],[-.08,.92],[-.08,.69]
    ];
    add(farMountain,'ridge',1.2,state.phase==='night'?.72:.62,'fill');

    const middleMountain=[
      ...cubic([-.08,.82],[.13,.58],[.28,.72],[.47,.80]),
      ...cubic([.47,.80],[.63,.58],[.80,.66],[1.08,.78]).slice(1),
      [1.08,.96],[-.08,.96],[-.08,.82]
    ];
    add(middleMountain,'soft',1.1,state.phase==='night'?.57:.48,'fill');

    const foregroundRidge=[
      ...cubic([-.04,.91],[.18,.79],[.35,.83],[.53,.88]),
      ...cubic([.53,.88],[.70,.76],[.86,.82],[1.04,.88]).slice(1),
      [1.04,1.02],[-.04,1.02],[-.04,.91]
    ];
    add(foregroundRidge,'ink',.8,state.phase==='night'?.22:.13,'fill');

    // A few clear crest lines give the soft pigment planes their Japanese ink contour.
    add(cubic([-.03,.69],[.13,.48],[.23,.54],[.35,.66]),'soft',1.55,.58);
    add(cubic([.34,.66],[.52,.42],[.68,.49],[.83,.67]),'ink',1.65,.62);
    add(cubic([.66,.70],[.80,.55],[.91,.58],[1.05,.66]),'soft',1.25,.48);

    // Tree motif follows the selected artwork: a willow has a readable trunk,
    // a light crown and separate cascading boughs (not a tangled pine lattice).
    if(study.motif==='willow'){
      // A recognisable willow silhouette: one leaning trunk, an open crown,
      // and four separated curtains of long foliage. Keep the canopy on the right.
      add(cubic([.89,.98],[.82,.79],[.93,.57],[.88,.34]),'ink',4.8,.96);
      add(cubic([.89,.43],[.79,.34],[.70,.38],[.64,.47]),'ink',2.0,.82);
      add(cubic([.89,.42],[.97,.33],[1.03,.39],[1.08,.50]),'soft',1.8,.82);
      add(cubic([.87,.47],[.77,.45],[.72,.51],[.68,.60]),'soft',1.45,.72);

      const curtains=[
        [.67,.46,.61,.88],
        [.77,.40,.74,.94],
        [.88,.38,.88,.93],
        [.98,.43,1.04,.88]
      ];
      for(let i=0;i<curtains.length;i++){
        const [sx,sy,ex,ey]=curtains[i];
        const path=cubic([sx,sy],
          [sx+(ex-sx)*.10,sy+.17],
          [ex+(sx-ex)*.16,ey-.12],
          [ex,ey]);
        add(path,i%2?'soft':'ink',1.75,.82);

        // Individual tapered leaves attach to alternating sides of each bough.
        for(let j=0;j<5;j++){
          const t=.20+j*.15;
          const point=path[Math.min(path.length-1,Math.round(t*(path.length-1)))];
          const side=(i+j)%2?1:-1;
          const lx=point[0],ly=point[1];
          const leaf=[
            [lx,ly],
            [lx+side*.018,ly-.006],
            [lx+side*.050,ly+.006],
            [lx+side*.031,ly+.040],
            [lx+side*.008,ly+.034],
            [lx,ly]
          ];
          const tone=(j===1&&i%2===0)?'accent':(j%2?'soft':'ink');
          add(leaf,tone,.75,.78,'fill');
          add([[lx,ly],[lx+side*.040,ly+.014]],'soft',.48,.50);
        }
      }

      // Fine tips hang below the main foliage, without crossing the open centre.
      for(let i=0;i<4;i++){
        const x=.71+i*.085,y=.62+(i%2)*.035;
        add(cubic([x,y],[x-.015,y+.08],[x+.012,y+.15],[x-.005,y+.23]),
          i%2?'soft':'ink',1.0,.66);
      }
    } else {
      // Pine is drawn as an open, asymmetric silhouette. Boughs fall away from
      // the trunk in distinct tiers; short needle marks replace the old dense lattice.
      add(cubic([.88,.98],[.82,.78],[.86,.53],[.79,.27]),'ink',4.2,.92);
      const tiers=[
        {y:.38,x:.81,left:.68,right:.91,drop:.10},
        {y:.49,x:.83,left:.59,right:.98,drop:.13},
        {y:.61,x:.84,left:.55,right:1.03,drop:.15},
        {y:.74,x:.85,left:.62,right:1.06,drop:.15}
      ];
      tiers.forEach((tier,index)=>{
        const leftPath=cubic([tier.x,tier.y],
          [tier.x-.045,tier.y+.025],[tier.left+.055,tier.y+tier.drop*.76],[tier.left,tier.y+tier.drop]);
        const rightPath=cubic([tier.x,tier.y+.012],
          [tier.x+.045,tier.y+.035],[tier.right-.055,tier.y+tier.drop*.72],[tier.right,tier.y+tier.drop]);
        add(leftPath,'ink',1.65,.78);
        add(rightPath,'soft',1.45,.72);

        // Small paired needle clusters follow each bough's slope with breathing room.
        for(let j=1;j<=3;j++){
          for(const [path,side] of [[leftPath,-1],[rightPath,1]]){
            const point=path[Math.round(j/4*(path.length-1))];
            const [x,y]=point;
            add(cubic([x,y],[x+side*.012,y+.018],[x+side*.027,y+.032],[x+side*.043,y+.038]),
              index===1&&j===2?'accent':'ink',.72,.62);
            add(cubic([x,y+.008],[x-side*.010,y+.022],[x-side*.020,y+.034],[x-side*.028,y+.043]),
              'soft',.62,.52);
          }
        }
      });
      // Fine upper twigs keep the crown light instead of forming a solid mesh.
      add(cubic([.79,.30],[.75,.24],[.73,.20],[.71,.16]),'soft',1.0,.58);
      add(cubic([.80,.32],[.84,.25],[.87,.22],[.91,.20]),'ink',1.0,.56);
    }
    // Small Japanese roof / pavilion silhouette, drawn as separate brush lines.
    const roofY=.67,rx=.53;
    add(cubic([rx-.145,roofY+.035],[rx-.070,roofY-.030],[rx+.070,roofY-.030],[rx+.145,roofY+.035]),'ink',2.4,.88);
    add([[rx-.145,roofY+.035],[rx+.145,roofY+.035]],'ink',1.8,.84);
    add([[rx-.105,roofY+.045],[rx-.105,roofY+.245],[rx+.105,roofY+.245],[rx+.105,roofY+.045]],'ink',1.65,.78);
    add([[rx-.105,roofY+.245],[rx+.105,roofY+.245]],'ink',1.5,.78);
    add(cubic([rx-.125,roofY+.25],[rx,roofY+.225],[rx+.125,roofY+.25],[rx+.155,roofY+.275]),'ink',1.45,.78);
    // Weather-specific motifs make the library selection visible, not just metadata.
    if(kind==='rain'||kind==='storm'){
      // Rain-cloud scallops, falling brush strokes and repeated water rings.
      add(cubic([.20,.30],[.24,.25],[.29,.27],[.31,.30]),'soft',1.5,.66);
      add(cubic([.31,.30],[.34,.25],[.40,.25],[.43,.30]),'soft',1.5,.66);
      // Drooping willow tassels: long, tapered, individually painted strokes.
      if(kind==='rain'){
        add(cubic([.17,.34],[.15,.48],[.20,.55],[.18,.67]),'ink',1.8,.65);
        add(cubic([.20,.33],[.23,.48],[.20,.57],[.25,.70]),'soft',1.2,.68);
        for(let i=0;i<9;i++){const x=.15+(i%3)*.035,y=.43+Math.floor(i/3)*.07;add(cubic([x,y],[x-.018,y+.045],[x-.010,y+.075],[x-.024,y+.12]),i%3?'ink':'soft',.8,.62);}
      }
      for(let i=0;i<11;i++){const x=.19+(i%6)*.105,y=.34+Math.floor(i/6)*.045;add([[x,y],[x-.012,y+.045],[x-.02,y+.075]],'soft',.9,.48);}
      for(let i=0;i<5;i++){
        const x=.16+i*.16,y=.88+(i%2)*.035;
        add(sample(t=>[x+Math.cos(t*Math.PI*2)*(.012+t*.025),y+Math.sin(t*Math.PI*2)*(.004+t*.008)],16),'water',.9,.52);
      }
      if(kind==='storm'){
        add(cubic([.10,.24],[.24,.14],[.40,.17],[.52,.25]),'ink',2.1,.72);
        add([[.49,.30],[.46,.38],[.51,.37],[.47,.46]],'accent',2.0,.82);
        // Large crashing wave and curling foam, built as layered brush arcs.
        add(cubic([.02,.82],[.16,.66],[.28,.67],[.38,.82]),'water',10,.20,'wash');
        add(cubic([.04,.80],[.18,.65],[.28,.66],[.40,.80]),'ink',2.8,.82);
        add(cubic([.23,.84],[.32,.72],[.44,.74],[.52,.85]),'soft',5.5,.20,'wash');
        add(cubic([.28,.79],[.38,.70],[.48,.76],[.53,.83]),'ink',1.9,.74);
        for(let i=0;i<8;i++){const x=.12+i*.045,y=.73-(i%3)*.025;add(cubic([x,y],[x+.018,y-.025],[x+.035,y-.018],[x+.044,y-.035]),'paper',.9,.82);}
      }
    } else if(kind==='snow'){
      for(let i=0;i<9;i++){
        const x=.16+(i%3)*.28,y=.24+Math.floor(i/3)*.16;
        add([[x-.012,y],[x+.012,y]],'soft',1.0,.70);add([[x,y-.012],[x,y+.012]],'soft',1.0,.70);
        add([[x-.008,y-.008],[x+.008,y+.008]],'soft',.75,.58);
      }
      for(let i=0;i<6;i++){const x=.78+(i-2.5)*.035,y=.45+i*.045;add([[x-.018,y],[x+.016,y-.006],[x+.035,y+.002]],'paper',2.2,.86);}
    } else if(kind==='fog'){
      for(let i=0;i<5;i++)add(cubic([.03,.47+i*.065],[.24,.42+i*.065],[.62,.52+i*.065],[.98,.46+i*.065]),'wash',6.5,.18,'wash');
    } else if(kind==='wind'||kind==='bamboo'){
      for(let i=0;i<7;i++){const x=.20+i*.11,y=.40+(i%3)*.06;add(cubic([x,y],[x+.06,y-.07],[x+.13,y+.04],[x+.22,y-.03]),'soft',1.15,.62);}
      for(let i=0;i<8;i++){const x=.82+(i%2)*.018,y=.29+i*.036;add(cubic([x,y],[x+.07,y-.01],[x+.12,y-.05],[x+.16,y-.02]),i%3?'ink':'accent',1.0,.72);}
    } else if(kind==='cloudy'){
      for(let i=0;i<4;i++)add(cubic([.08,.30+i*.055],[.20,.25+i*.055],[.31,.35+i*.055],[.45,.30+i*.055]),'soft',1.7,.55);
    } else if(kind==='night'){
      for(let i=0;i<9;i++){const x=.13+(i*37%70)/100,y=.18+(i*23%32)/100;add([[x-.006,y],[x+.006,y]],'soft',.9,.68);add([[x,y-.006],[x,y+.006]],'soft',.9,.68);}
    } else {
      add(cubic([.13,.34],[.24,.28],[.33,.30],[.43,.34]),'soft',1.25,.48);
    }
    // Atmospheric cloud banks and distant reflected ridges make each study read as a complete landscape.
    add(cubic([.04,.42],[.19,.36],[.32,.39],[.45,.43]),'wash',6.0,.13,'wash');
    add(cubic([.54,.46],[.68,.39],[.84,.42],[1.03,.45]),'wash',5.0,.12,'wash');
    add(cubic([.02,.76],[.22,.69],[.38,.71],[.56,.77]),'soft',1.0,.34);
    add(cubic([.42,.79],[.61,.72],[.80,.73],[1.02,.78]),'ink',1.0,.30);
    // A few short water / ground lines anchor the composition.
    for(let i=0;i<9;i++){
      const y=.86+i*.014;
      add(cubic([.08,y],[.26,y-.018],[.48,y+.012],[.70,y-.006]),'water',.78,.34);
      if(i%2===0)add(cubic([.55,y+.018],[.70,y],[.86,y+.02],[.98,y+.01]),'soft',.62,.27);
    }
    return {study,strokes,paper};
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
      ridge:current?.phase==='night'?'#8ca398':'#9aa99d',
      water:current?.phase==='night'?'#98bdb5':'#789a98',
      accent:current?.phase==='night'?'#e58d7b':'#c77b75',
      paper:current?.phase==='night'?'#293a36':'#f3efe5'
    });

    function strokeOne(stroke,portion){
      if(!stroke.points||stroke.points.length<2||portion<=0)return;
      const palette=colors();
      const tone=stroke.tone==='accent'?palette.accent:
        stroke.tone==='soft'?palette.soft:
        stroke.tone==='ridge'?palette.ridge:
        stroke.tone==='water'?palette.water:
        stroke.tone==='paper'?palette.paper:palette.ink;
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
        ?Math.max(5,Math.min(38,stroke.weight*Math.min(width,height)/62))
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
        ctx.lineTo(x,y);
      }
      if(isFill&&portion>=1){
        ctx.closePath();
        ctx.fillStyle=tone;
        ctx.fill();
      }
      ctx.stroke();
      // A restrained dry-brush echo gives the marks an ink-on-paper edge.
      if(!isWash&&stroke.weight>1.2){
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
      ctx.fillStyle=palette.paper;
      ctx.fillRect(0,0,width,height);

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

  function activateWeather(){
    const view=mount('weather');if(!view)return;
    addStyles();const screen=makeScreen();view.panel.remove();view.root.replaceChildren(screen);

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
    return () => {disposed=true;requestSerial++;stopPolling();if(refreshTimer)clearInterval(refreshTimer);if(clockTimer)clearInterval(clockTimer);abortController?.abort();abortController=null;painter.stop();studioPainter.stop();replayButton?.removeEventListener('click',handleReplay);selector.removeEventListener('change',handleModeChange);window.removeEventListener('live-earth-location-state',onLocationState);window.removeEventListener('live-earth-location-stop',onLocationStop);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);document.removeEventListener('visibilitychange',onVisibility);weatherDockObserver?.disconnect();window.removeEventListener('resize',syncDockClearance);window.removeEventListener('orientationchange',syncDockClearance);screen.remove();document.getElementById(STYLE_ID)?.remove();};
  }

  runtime.registerFeature('weather',activateWeather);
})();
