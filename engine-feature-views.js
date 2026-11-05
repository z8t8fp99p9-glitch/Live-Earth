/* LIVE // EARTH — seven dedicated full-screen Feature Orb workspaces.
   The five operational views are visual workspaces only; they do not create
   duplicate Collector, Checker, Editorial, Image, Manager or Publisher engines. */
(() => {
  'use strict';
  if (window.__liveEarthEngineFeatureViewsInstalled) return;

  const views = [
    {
      id: 'editorial-engine', title: 'Editorial Engine', shortLabel: 'Editorial', symbol: '✍️',
      description: 'A full-screen workspace for the shared Global Editorial Engine.',
      label: 'LIVE // EARTH  ·  GLOBAL EDITORIAL SYSTEM', titleLine: 'Editorial', accent: 'Engine',
      subtitle: 'Clarity, structure and visual rhythm — brought together in one editorial workspace.',
      theme: 'editorial', connected: true
    },
    {
      id: 'image-engine', title: 'Image Engine', shortLabel: 'Image', symbol: '🪄',
      description: 'A full-screen workspace for the shared Global Image Engine.',
      label: 'LIVE // EARTH  ·  GLOBAL IMAGE SYSTEM', titleLine: 'Image', accent: 'Engine',
      subtitle: 'Discovery, preparation and visual intelligence — together in one image workspace.',
      theme: 'image', connected: true
    },
    {
      id: 'source-scout', title: 'Source Scout', shortLabel: 'Source Scout', symbol: '🧭',
      description: 'A full-screen Source Scout workspace. It will use the existing shared LIVE // EARTH pipeline.',
      label: 'LIVE // EARTH  ·  SOURCE DISCOVERY', titleLine: 'Source', accent: 'Scout',
      subtitle: 'Explore trusted places, discover useful reporting and bring relevant sources into view.',
      theme: 'source-scout', connected: false
    },
    {
      id: 'collection-manager', title: 'Collection Manager', shortLabel: 'Collection', symbol: '🗂️',
      description: 'A full-screen Collection Manager workspace for view-specific source assignments.',
      label: 'LIVE // EARTH  ·  COLLECTION CONTROL', titleLine: 'Collection', accent: 'Manager',
      subtitle: 'Organise source assignments and view requirements while keeping collection engines shared.',
      theme: 'collection-manager', connected: false
    },
    {
      id: 'feed-collector', title: 'Feed Collector', shortLabel: 'Collector', symbol: '📡',
      description: 'A full-screen Feed Collector workspace for the shared Global Collector.',
      label: 'LIVE // EARTH  ·  GLOBAL COLLECTION', titleLine: 'Feed', accent: 'Collector',
      subtitle: 'A live-inspired workspace for gathering source material and preserving its original details.',
      theme: 'feed-collector', connected: false
    },
    {
      id: 'feed-policy-checker', title: 'Feed Policy Checker', shortLabel: 'Policy Check', symbol: '🛡️',
      description: 'A full-screen Feed Policy Checker workspace for the shared Global Checker.',
      label: 'LIVE // EARTH  ·  GLOBAL POLICY REVIEW', titleLine: 'Policy', accent: 'Checker',
      subtitle: 'A clear review space for permissions, educational use, non-commercial terms and source checks.',
      theme: 'feed-policy-checker', connected: false
    },
    {
      id: 'publisher', title: 'Publisher', shortLabel: 'Publisher', symbol: '🌐',
      description: 'A full-screen Publisher workspace. Publishing remains a view-specific responsibility.',
      label: 'LIVE // EARTH  ·  FEED PUBLISHING', titleLine: 'Publisher', accent: 'Network',
      subtitle: 'Prepare approved stories for their intended LIVE // EARTH view and final presentation.',
      theme: 'publisher', connected: false
    }
  ];

  const css = `
    .le-engine-view{position:fixed;inset:0;z-index:6;display:grid;place-items:center;isolation:isolate;overflow:hidden;padding:calc(env(safe-area-inset-top) + 38px) 24px calc(env(safe-area-inset-bottom) + 112px);color:#f6f7f8;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .le-engine-view[hidden]{display:none!important}.le-engine-view *{box-sizing:border-box}
    .le-engine-view:before,.le-engine-view:after,.le-engine-art,.le-engine-art:before,.le-engine-art:after{content:"";position:absolute;inset:0;pointer-events:none}
    .le-engine-view:before{z-index:-2}.le-engine-view:after{z-index:-1;opacity:.42}.le-engine-art{z-index:-1;overflow:hidden}
    .le-engine-art:before,.le-engine-art:after{inset:auto;left:50%;top:50%;border-radius:50%;transform:translate(-50%,-50%)}

    /* Editorial Engine — warm vellum, ink and brass. */
    .le-engine-view--editorial{background:radial-gradient(ellipse at 50% 43%,#56371f 0,transparent 46%),radial-gradient(ellipse at 5% 5%,#a86a3444,transparent 40%),linear-gradient(145deg,#17120f,#090a0d 55%,#140d0b)}
    .le-engine-view--editorial:before{background:repeating-linear-gradient(0deg,transparent 0 47px,#dbb8890a 48px,transparent 49px),linear-gradient(90deg,transparent 10%,#d4a76b10 10.1%,transparent 10.3% 89.7%,#d4a76b10 89.9%,transparent 90%)}
    .le-engine-view--editorial:after{background-image:radial-gradient(1px 1px at 13% 20%,#efd4a588 98%,transparent),radial-gradient(1px 1px at 82% 17%,#efd4a566 98%,transparent),radial-gradient(1px 1px at 74% 76%,#efd4a577 98%,transparent)}
    .le-engine-view--editorial .le-engine-art:before{width:min(78vw,620px);aspect-ratio:1;border:1px solid #d6a66935;box-shadow:0 0 0 25px #d6a6690a,0 0 0 70px #d6a66908,inset 0 0 70px #d6a66912;transform:translate(-50%,-50%) rotate(-18deg)}
    .le-engine-view--editorial .le-engine-art:after{width:min(54vw,420px);aspect-ratio:1;background:radial-gradient(circle,#d0975330,#d0975309 48%,transparent 72%);filter:blur(5px)}
    .le-engine-view--editorial .le-engine-eyebrow{color:#e2bf89}.le-engine-view--editorial .le-engine-title span{color:#e2b777;text-shadow:0 0 34px #cf975355}.le-engine-view--editorial .le-engine-mark{background:linear-gradient(90deg,transparent,#c89a65,#f0d3a1,transparent)}

    /* Image Engine — deep ocean blue with a violet visual halo. */
    .le-engine-view--image{background:radial-gradient(ellipse at 50% 43%,#126f9350,transparent 46%),radial-gradient(ellipse at 88% 12%,#6656d34d,transparent 38%),linear-gradient(145deg,#06111c,#050a14 52%,#0c0b22)}
    .le-engine-view--image:before{background:linear-gradient(#65c3e10b 1px,transparent 1px),linear-gradient(90deg,#65c3e10b 1px,transparent 1px);background-size:38px 38px;mask-image:radial-gradient(ellipse at center,#000 12%,transparent 78%)}
    .le-engine-view--image:after{background-image:radial-gradient(1px 1px at 16% 18%,#b7f4ffbb 98%,transparent),radial-gradient(1px 1px at 85% 24%,#b7f4ff88 98%,transparent),radial-gradient(1px 1px at 76% 82%,#b7f4ff99 98%,transparent)}
    .le-engine-view--image .le-engine-art:before{width:min(82vw,660px);aspect-ratio:1;border:1px solid #59d2ef3d;box-shadow:0 0 0 24px #59d2ef10,0 0 0 62px #59d2ef08,0 0 0 108px #7e69e80c,inset 0 0 80px #37b7dc19}
    .le-engine-view--image .le-engine-art:after{width:min(58vw,460px);aspect-ratio:1;background:radial-gradient(circle,#37cae13a,#665be020 42%,transparent 72%);filter:blur(8px)}
    .le-engine-view--image .le-engine-eyebrow{color:#9ee9f7}.le-engine-view--image .le-engine-title span{color:#91e5f5;text-shadow:0 0 34px #39c5e75f}.le-engine-view--image .le-engine-mark{background:linear-gradient(90deg,transparent,#4fc3df,#a4a0ff,transparent)}

    /* Source Scout — indigo discovery field with a constellation of signal points. */
    .le-engine-view--source-scout{background:radial-gradient(ellipse at 50% 42%,#4539a7a8 0,transparent 42%),radial-gradient(ellipse at 14% 76%,#1766ad58,transparent 42%),linear-gradient(145deg,#080d28,#111044 52%,#050b1d)}
    .le-engine-view--source-scout:before{background:linear-gradient(32deg,transparent 49.7%,#9b9aff20 50%,transparent 50.3%),linear-gradient(148deg,transparent 49.7%,#63c9f020 50%,transparent 50.3%),radial-gradient(circle at 20% 30%,#b2aaff 0 1px,transparent 2px),radial-gradient(circle at 78% 22%,#7ce7ff 0 1.5px,transparent 2.5px),radial-gradient(circle at 72% 72%,#d8b5ff 0 1.5px,transparent 2.5px),radial-gradient(circle at 28% 78%,#6de4ff 0 1px,transparent 2px);background-size:auto,auto,100% 100%,100% 100%,100% 100%,100% 100%}
    .le-engine-view--source-scout:after{background:radial-gradient(ellipse at 50% 50%,transparent 20%,#05091c88 100%)}
    .le-engine-view--source-scout .le-engine-art:before{width:min(92vw,760px);aspect-ratio:1;border:1px solid #9b91ff55;box-shadow:0 0 0 24px #6e70ff12,0 0 0 62px #60caff0d,0 0 0 112px #a58aff0a,inset 0 0 90px #6a6cff24}
    .le-engine-view--source-scout .le-engine-art:after{width:min(54vw,440px);aspect-ratio:1;background:radial-gradient(circle,#8275ff38,#51c9ff13 48%,transparent 72%);filter:blur(9px)}
    .le-engine-view--source-scout .le-engine-eyebrow{color:#b8b1ff}.le-engine-view--source-scout .le-engine-title span{color:#aaa1ff;text-shadow:0 0 34px #8373ff77}.le-engine-view--source-scout .le-engine-mark{background:linear-gradient(90deg,transparent,#7c77ff,#77dbff,transparent)}

    /* Collection Manager — emerald control room, fine grids and flowing green light. */
    .le-engine-view--collection-manager{background:radial-gradient(ellipse at 50% 43%,#126f4e99 0,transparent 45%),radial-gradient(ellipse at 90% 15%,#66c95b39,transparent 36%),linear-gradient(145deg,#061b1b,#06251f 50%,#07120f)}
    .le-engine-view--collection-manager:before{background:linear-gradient(#7de3b00b 1px,transparent 1px),linear-gradient(90deg,#7de3b00b 1px,transparent 1px),linear-gradient(112deg,transparent 25%,#7de3b018 25.1%,transparent 25.4% 74.6%,#7de3b018 74.9%,transparent 75%);background-size:42px 42px,42px 42px,100% 100%;mask-image:radial-gradient(ellipse at center,#000 5%,transparent 82%)}
    .le-engine-view--collection-manager:after{background:radial-gradient(ellipse at 50% 50%,transparent 24%,#03131099 100%)}
    .le-engine-view--collection-manager .le-engine-art:before{width:min(88vw,720px);aspect-ratio:1;border:1px solid #66e0ae40;box-shadow:0 0 0 25px #3acb8d10,0 0 0 72px #3acb8d08,inset 0 0 90px #36dca51c;transform:translate(-50%,-50%) rotate(22deg)}
    .le-engine-view--collection-manager .le-engine-art:after{width:min(58vw,470px);aspect-ratio:1;background:radial-gradient(circle,#52e6a52d,#a1e9780c 50%,transparent 72%);filter:blur(8px)}
    .le-engine-view--collection-manager .le-engine-eyebrow{color:#8fe6bc}.le-engine-view--collection-manager .le-engine-title span{color:#79e4ad;text-shadow:0 0 34px #36db9670}.le-engine-view--collection-manager .le-engine-mark{background:linear-gradient(90deg,transparent,#3dd59b,#c5f29b,transparent)}

    /* Feed Collector — electric-blue energy streams and signal particles. */
    .le-engine-view--feed-collector{background:radial-gradient(ellipse at 50% 42%,#075a9ab5 0,transparent 44%),radial-gradient(ellipse at 15% 18%,#00b6d844,transparent 38%),linear-gradient(145deg,#041324,#062345 52%,#030b1c)}
    .le-engine-view--feed-collector:before{background:repeating-linear-gradient(165deg,transparent 0 25px,#68cfff0c 26px,transparent 28px),radial-gradient(circle at 18% 24%,#81f1ff 0 1px,transparent 2px),radial-gradient(circle at 82% 31%,#a1dfff 0 1.5px,transparent 2.5px),radial-gradient(circle at 26% 79%,#4ad4ff 0 1px,transparent 2px),radial-gradient(circle at 77% 73%,#7ceaff 0 1.5px,transparent 2.5px)}
    .le-engine-view--feed-collector:after{background:linear-gradient(90deg,transparent,#22baf00b 50%,transparent),radial-gradient(ellipse at 50% 50%,transparent 22%,#020a1888 100%)}
    .le-engine-view--feed-collector .le-engine-art:before{width:min(92vw,760px);aspect-ratio:1;border:1px solid #59d9ff43;box-shadow:0 0 0 24px #20bdf014,0 0 0 66px #20bdf00c,0 0 0 112px #579aff09,inset 0 0 90px #2dc9ff20}
    .le-engine-view--feed-collector .le-engine-art:after{width:min(56vw,450px);aspect-ratio:1;background:radial-gradient(circle,#15c9ff37,#236be01c 48%,transparent 72%);filter:blur(8px)}
    .le-engine-view--feed-collector .le-engine-eyebrow{color:#85e3ff}.le-engine-view--feed-collector .le-engine-title span{color:#62d9ff;text-shadow:0 0 34px #22baff77}.le-engine-view--feed-collector .le-engine-mark{background:linear-gradient(90deg,transparent,#28bff0,#9feeff,transparent)}

    /* Feed Policy Checker — regal violet, silver rings and amber verification light. */
    .le-engine-view--feed-policy-checker{background:radial-gradient(ellipse at 50% 42%,#56378fa8 0,transparent 44%),radial-gradient(ellipse at 85% 78%,#bd853a35,transparent 38%),linear-gradient(145deg,#130d26,#211435 52%,#0a0b19)}
    .le-engine-view--feed-policy-checker:before{background:repeating-linear-gradient(45deg,transparent 0 34px,#d5d1ef08 35px,transparent 36px),radial-gradient(circle at 18% 22%,#f4d59a 0 1px,transparent 2px),radial-gradient(circle at 82% 28%,#c7c5ef 0 1.5px,transparent 2px),radial-gradient(circle at 72% 78%,#f0c27c 0 1px,transparent 2px)}
    .le-engine-view--feed-policy-checker:after{background:radial-gradient(ellipse at 50% 50%,transparent 18%,#0a071488 100%)}
    .le-engine-view--feed-policy-checker .le-engine-art:before{width:min(88vw,720px);aspect-ratio:1;border:1px solid #d6c9f04a;box-shadow:0 0 0 24px #c2b5e011,0 0 0 66px #d5a85b0c,inset 0 0 90px #bfa8e01b}
    .le-engine-view--feed-policy-checker .le-engine-art:after{width:min(52vw,420px);aspect-ratio:1;background:radial-gradient(circle,#a98adf35,#e3ba7030 48%,transparent 72%);filter:blur(8px)}
    .le-engine-view--feed-policy-checker .le-engine-eyebrow{color:#d7c9f5}.le-engine-view--feed-policy-checker .le-engine-title span{color:#d0b2f5;text-shadow:0 0 34px #a78be577}.le-engine-view--feed-policy-checker .le-engine-mark{background:linear-gradient(90deg,transparent,#bca4e9,#eac27f,transparent)}

    /* Publisher — teal-and-gold global broadcast atmosphere. */
    .le-engine-view--publisher{background:radial-gradient(ellipse at 50% 42%,#087a7a9e 0,transparent 44%),radial-gradient(ellipse at 82% 14%,#c5a04a40,transparent 38%),linear-gradient(145deg,#041b20,#073137 52%,#07131d)}
    .le-engine-view--publisher:before{background:repeating-radial-gradient(ellipse at 50% 50%,transparent 0 44px,#8de3d30d 45px,transparent 47px),radial-gradient(circle at 16% 24%,#f0d28d 0 1px,transparent 2px),radial-gradient(circle at 83% 26%,#77e7d8 0 1.5px,transparent 2px),radial-gradient(circle at 24% 80%,#8fe8dc 0 1px,transparent 2px)}
    .le-engine-view--publisher:after{background:radial-gradient(ellipse at 50% 50%,transparent 18%,#03131788 100%)}
    .le-engine-view--publisher .le-engine-art:before{width:min(94vw,780px);aspect-ratio:1;border:1px solid #73ded14a;box-shadow:0 0 0 25px #43cdb20e,0 0 0 72px #d8b45b0b,0 0 0 120px #40c5bd08,inset 0 0 100px #3ed1c51d}
    .le-engine-view--publisher .le-engine-art:after{width:min(58vw,470px);aspect-ratio:1;background:radial-gradient(circle,#2bd6c23b,#e0b34b20 48%,transparent 72%);filter:blur(9px)}
    .le-engine-view--publisher .le-engine-eyebrow{color:#8fe4d6}.le-engine-view--publisher .le-engine-title span{color:#d7bd77;text-shadow:0 0 34px #cfad5b66}.le-engine-view--publisher .le-engine-mark{background:linear-gradient(90deg,transparent,#46c9b8,#e2bd6b,transparent)}

    .le-engine-header{position:absolute;top:calc(env(safe-area-inset-top) + 26px);left:24px;right:24px;display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left}
    .le-engine-brand{font-size:10px;font-weight:850;letter-spacing:.2em;color:#edf4f7;text-shadow:0 2px 12px #0008}.le-engine-label{font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:#e2edf4a6;text-align:right}
    .le-engine-content{position:relative;z-index:1;width:min(100%,720px);margin-top:-2vh}
    .le-engine-eyebrow{margin:0 0 18px;font-size:9px;font-weight:800;letter-spacing:.23em;line-height:1.5;text-transform:uppercase}
    .le-engine-title{margin:0;font-size:clamp(43px,11.5vw,82px);font-weight:650;letter-spacing:-.065em;line-height:.94;color:#f7f5f0;text-wrap:balance}
    .le-engine-title span{display:block;margin-top:.08em;font-weight:420;letter-spacing:-.045em}
    .le-engine-mark{width:min(120px,28vw);height:1px;margin:28px auto 22px;opacity:.9}
    .le-engine-subtitle{max-width:460px;margin:0 auto;color:#e5ebefc9;font-size:clamp(12px,3.2vw,14px);line-height:1.8;letter-spacing:.015em;text-wrap:balance}

    /* Feature Orb artwork: saturated glass colours, generous glyph size and a bright rim. */
    .le-feature-library-item .le-feature-symbol{font-size:clamp(30px,8vmin,42px);filter:drop-shadow(0 2px 5px rgba(0,0,0,.72))}
    #le-feature-dock .le-feature-orb .le-feature-symbol{font-size:clamp(30px,8vmin,42px)}
    #le-feature-library .le-feature-library-item[data-feature="editorial-engine"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="editorial-engine"] .orbShell{background:radial-gradient(circle at 30% 22%,#ffe0a8 0,#b7793d 24%,#4b281b 67%,#160e0b 100%);border-color:#f4d09a;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #160a0acc,0 0 22px #d69c5577,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item[data-feature="image-engine"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="image-engine"] .orbShell{background:radial-gradient(circle at 30% 22%,#c8f8ff 0,#2689bd 27%,#392b84 70%,#07101e 100%);border-color:#a5edff;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #050a20cc,0 0 24px #40c7f077,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item[data-feature="source-scout"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="source-scout"] .orbShell{background:radial-gradient(circle at 30% 22%,#e8d8ff 0,#7666df 30%,#28205f 72%,#0b0d28 100%);border-color:#c4bcff;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #080a24cc,0 0 24px #8877ff88,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item[data-feature="collection-manager"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="collection-manager"] .orbShell{background:radial-gradient(circle at 30% 22%,#dbffd9 0,#40b982 29%,#0d6049 70%,#06251f 100%);border-color:#a8f1c7;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #031b15cc,0 0 24px #47e7a477,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item[data-feature="feed-collector"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="feed-collector"] .orbShell{background:radial-gradient(circle at 30% 22%,#d7fbff 0,#40bce9 28%,#075b9c 70%,#06172d 100%);border-color:#a9f0ff;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #031126cc,0 0 24px #34caff88,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item[data-feature="feed-policy-checker"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="feed-policy-checker"] .orbShell{background:radial-gradient(circle at 30% 22%,#fff2d6 0,#a58ad9 28%,#503678 68%,#180f2a 100%);border-color:#f3d8ac;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #130b20cc,0 0 24px #c49af477,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item[data-feature="publisher"] .orbShell,#le-feature-dock .le-feature-orb[data-feature="publisher"] .orbShell{background:radial-gradient(circle at 30% 22%,#fff1ba 0,#42b9a7 29%,#086b70 68%,#06242b 100%);border-color:#f5d98e;box-shadow:inset 2px 2px 7px #fff9,inset -5px -7px 12px #03191fcc,0 0 24px #42d9c188,0 5px 12px #000b}
    #le-feature-library .le-feature-library-item .orbShell:before{background:radial-gradient(ellipse at 28% 16%,rgba(255,255,255,.58),transparent 30%),linear-gradient(138deg,rgba(255,255,255,.25),rgba(255,255,255,.035) 27%,transparent 47%,rgba(255,255,255,.09) 76%,rgba(255,255,255,.22))}

    @media(min-width:700px){.le-engine-header{left:38px;right:38px}.le-engine-content{margin-top:-3vh}}
    @media(orientation:landscape) and (max-height:520px){.le-engine-view{padding-top:70px;padding-bottom:100px}.le-engine-content{margin-top:0}.le-engine-eyebrow{margin-bottom:10px}.le-engine-title{font-size:clamp(36px,9vh,58px)}.le-engine-mark{margin:16px auto 12px}.le-engine-subtitle{font-size:11px;max-width:540px}}
    @media(prefers-reduced-motion:reduce){.le-engine-view *{animation:none!important;transition:none!important}}
  `;

  const roots = new Map();
  function ensureStyles() {
    if (document.getElementById('le-engine-feature-views-style')) return;
    const style = document.createElement('style');
    style.id = 'le-engine-feature-views-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function build(view) {
    if (roots.has(view.id)) return roots.get(view.id);
    ensureStyles();
    const root = document.createElement('section');
    root.id = 'le-' + view.id + '-view';
    root.className = 'le-engine-view le-engine-view--' + view.theme;
    root.dataset.feature = view.id;
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', view.title);
    root.setAttribute('aria-hidden', 'true');

    const art = document.createElement('div');
    art.className = 'le-engine-art';
    art.setAttribute('aria-hidden', 'true');

    const header = document.createElement('header');
    header.className = 'le-engine-header';
    const brand = document.createElement('span');
    brand.className = 'le-engine-brand';
    brand.textContent = 'LIVE // EARTH';
    const label = document.createElement('span');
    label.className = 'le-engine-label';
    label.textContent = view.label;
    header.append(brand, label);

    const main = document.createElement('main');
    main.className = 'le-engine-content';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'le-engine-eyebrow';
    eyebrow.textContent = view.label;
    const title = document.createElement('h1');
    title.className = 'le-engine-title';
    title.textContent = view.titleLine;
    const accent = document.createElement('span');
    accent.textContent = view.accent;
    title.appendChild(accent);
    const mark = document.createElement('div');
    mark.className = 'le-engine-mark';
    mark.setAttribute('aria-hidden', 'true');
    const subtitle = document.createElement('p');
    subtitle.className = 'le-engine-subtitle';
    subtitle.textContent = view.subtitle;
    main.append(eyebrow, title, mark, subtitle);
    root.append(art, header, main);
    document.body.appendChild(root);
    roots.set(view.id, root);
    return root;
  }

  function openSourceScoutFrame(host) {
    if (!host) return;
    let frame = document.getElementById('le-source-scout-frame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'le-source-scout-frame';
      frame.title = 'Source Scout';
      frame.setAttribute('allow', 'clipboard-write');
      frame.setAttribute('aria-label', 'Source Scout workspace');
      // Keep the frame inside the normal Feature Orb view (z-index 6).
      // The shared Orb dock remains above it (z-index 9) and owns closing.
      frame.style.cssText = 'position:absolute;inset:0;z-index:1;width:100%;height:100%;border:0;background:#f7f8fa;';
      frame.src = new URL('./source-scout/source-scout.html', document.baseURI).href;
    }
    if (frame.parentElement !== host) host.appendChild(frame);
    frame.hidden = false;
    frame.setAttribute('aria-hidden', 'false');
  }

  function closeSourceScoutFrame() {
    const frame = document.getElementById('le-source-scout-frame');
    if (!frame) return;
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
  }

  function activate(view) {
    const stage = document.getElementById('le-feature-stage');
    if (stage) stage.hidden = true;
    const root = build(view);
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    if (view.id === 'source-scout') openSourceScoutFrame(root);
  }

  function deactivate(view) {
    if (view.id === 'source-scout') closeSourceScoutFrame();
    const root = roots.get(view.id);
    if (root) {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
    }
  }

  function install() {
    const api = window.LiveEarthFeatureViews;
    if (!api || typeof api.register !== 'function') return false;
    for (const view of views) {
      api.register(view.id, {
        title: view.title,
        shortLabel: view.shortLabel,
        symbol: view.symbol,
        description: view.description,
        connected: view.connected,
        activate: () => activate(view),
        deactivate: () => deactivate(view)
      });
    }

    const open = id => api.open(id, 'api');
    window.__liveEarthEngineFeatureViewsInstalled = true;
    window.LiveEarthEngineViews = Object.freeze({
      open,
      openEditorial: () => open('editorial-engine'),
      openImage: () => open('image-engine'),
      openSourceScout: () => open('source-scout'),
      openCollectionManager: () => open('collection-manager'),
      openFeedCollector: () => open('feed-collector'),
      openFeedPolicyChecker: () => open('feed-policy-checker'),
      openPublisher: () => open('publisher'),
      close: () => api.close('api'),
      isActive: id => api.isActive(id)
    });
    window.dispatchEvent(new Event('live-earth-engine-feature-views-ready'));
    return true;
  }

  if (!install()) window.addEventListener('live-earth-feature-views-ready', install, { once: true });
})();
