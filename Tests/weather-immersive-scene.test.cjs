const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const weather = fs.readFileSync(path.join(root, 'Weather/weather-view.js'), 'utf8');

assert.ok(weather.includes("runtime.registerFeature('weather',activateWeather)"), 'Weather must remain on the existing Stacks route');
assert.ok(weather.includes("new URL('../vendor/three.module.js', WEATHER_SCRIPT_URL).href"), 'Weather must use the already-cached same-origin Three.js runtime');
assert.ok(weather.includes('await import(THREE_MODULE_URL)'), 'Weather must dynamically load the shared 3D runtime');
assert.ok(weather.includes('new THREE.WebGLRenderer'), 'Weather must render a true 3D environment');

// Portrait art direction: a screen-filling miniature terrain model, not an oval island.
assert.ok(weather.includes('const MAP_W = 13.0'), 'Portrait master model must use a narrow physical footprint');
assert.ok(weather.includes('const MAP_D = 25.6'), 'Portrait master model must retain a deep topographic composition');
assert.ok(weather.includes('function rawLandHeight(x,z)'), 'The landscape must have a continuous procedural height field');
assert.ok(weather.includes('const spine = 3.45*') && weather.includes('const secondarySpine = 1.75*'), 'The landscape must have a connected multi-ridge mountain spine');
assert.ok(weather.includes("const copper = new THREE.Color('#c56d32')"), 'The main ridge must include exposed warm rock');
assert.ok(weather.includes("const ochre = new THREE.Color('#d59a49')"), 'The mountain must include ochre strata');
assert.ok(weather.includes('const terrainUvs=[]'), 'The terrain must support detailed surface texture');
assert.ok(weather.includes('const earthGrain = makeGrainTexture'), 'Soil must use a procedural surface grain texture');
assert.ok(weather.includes('const rockGrain = makeGrainTexture'), 'Exposed mountain rock must use a separate texture');
assert.ok(weather.includes('const plinthCore = new THREE.Mesh'), 'The world must sit on a slim rectangular map-board rather than an oval island');
assert.ok(weather.includes('const coastFront = x =>'), 'The coastline must follow an irregular coastal shelf');
assert.ok(weather.includes('const waterCoverage = (x,z) =>'), 'Land and sea must be defined as a real coastal map mask');
assert.ok(weather.includes('const seaGeometry=new THREE.BufferGeometry()'), 'Coastal water must follow the shore geometry, not a circular ocean backdrop');
assert.ok(weather.includes('const shelfGeometry=new THREE.BufferGeometry()'), 'The coast must have shallow turquoise shelves');
assert.ok(weather.includes('const contourLevels=[0.95,1.55,2.25,3.0,3.8,4.7,5.6,6.5,7.4]'), 'Raised contour detail must follow a range of real elevations');
assert.ok(!weather.includes('function boundaryAt(angle)'), 'The old oval island perimeter must be removed');
assert.ok(!weather.includes('function islandRadius(x, z)'), 'The old island-radius terrain model must be removed');
assert.ok(weather.includes('world.scale.set(1,1,1)'), 'The map must preserve its physical proportions on every screen');
assert.ok(weather.includes('const compact = smallScreen || lowMemory;'), 'Compact/low-memory devices must select the reduced geometry tier');
assert.ok(weather.includes('shortLandscape,tablet,fov'), 'Tablet framing must use its dedicated camera profile');
assert.ok(!weather.includes('world.scale.set(scaleX'), 'The world must never be stretched to fit a viewport');

// Natural detail: varied forest canopy, small-scale ground cover, rock, and scree.
assert.ok(weather.includes('const pineLower=new THREE.InstancedMesh'), 'Conifers must have a layered silhouette');
assert.ok(weather.includes('const pineUpper=new THREE.InstancedMesh'), 'Conifers must include a second canopy tier');
assert.ok(weather.includes('const broadCanopy=new THREE.InstancedMesh'), 'Broadleaf trees must have a distinct silhouette');
assert.ok(weather.includes('const forestClusters=['), 'Trees must grow in irregular ecological clusters');
assert.ok(weather.includes('const shrubs=new THREE.InstancedMesh'), 'The forest floor must include shrubs and understorey');
assert.ok(weather.includes('const rocks=new THREE.InstancedMesh'), 'The landscape must have separate boulder detail');
assert.ok(weather.includes('const scree=new THREE.LineSegments'), 'Exposed mountain slopes must include fine scree detail');
assert.ok(weather.includes('const broadLobes=new THREE.InstancedMesh'), 'Broadleaf crowns must use varied side lobes instead of spherical clumps');

// The sky/sea horizon is a separate, weather-coloured environment behind the land.
assert.ok(weather.includes('const horizonRows = [-24.0, -5.0, 0.7, 2.1, 3.1, 5.2, 42.0]'), 'The scene must contain a distinct sky-to-sea horizon gradient');
assert.ok(weather.includes('function addDistantHeadland('), 'Layered coastal silhouettes must sit at the distant horizon');
assert.ok(weather.includes('const horizonPalettes ='), 'Horizon colours must have phase-specific palettes');
assert.ok(weather.includes('horizonCurrentColors.forEach((color,index)=>color.lerp(targetHorizonColors[index],morph))'), 'The horizon must transition with the selected forecast hour');
assert.ok(weather.includes('const celestialBody = new THREE.Mesh'), 'A forecast-time sun/moon cue must be placed at the horizon');
assert.ok(weather.includes('celestialMaterial.color.set(daylight?'), 'The visible sky body must change for day and night');

// Working weather instrument: the forecast drives every environmental subsystem.
assert.ok(weather.includes('const cloudCover=Number.isFinite(Number(next.cloudCover))'), 'Cloud coverage must use forecast cloud-cover data');
assert.ok(weather.includes('const effectiveCloudCover=Math.max'), 'Rain/snow/storm states must retain appropriate cloud cover');
assert.ok(weather.includes('cloud.visible=visibility>0.005'), 'Cloud formations must appear and recede with forecast coverage');
assert.ok(weather.includes('activeWind / 42'), 'Wind speed must change cloud drift');
assert.ok(weather.includes('targetSunColor.set'), 'Local time and weather must recolour sunlight');
assert.ok(weather.includes('targetSunPosition.set'), 'Local time must change the sun-light direction');
assert.ok(weather.includes('const sunArc=(localHour-12)/12*Math.PI'), 'Selected local hour must move the sun across its daily arc');
assert.ok(weather.includes('targetHemisphereSky.set'), 'Dawn/day/evening/night must change ambient sky lighting');
assert.ok(weather.includes('targetHumidity=humidity'), 'Humidity must feed the atmospheric system');
assert.ok(weather.includes("(kind==='rain'||kind==='storm')?clamp(precipitation/3.8,0,1):0"), 'Visible rain intensity must follow actual forecast precipitation, not probability alone');
assert.ok(weather.includes('const rainStreaks=new THREE.LineSegments'), 'Rain must have visible falling streaks, not static cloud supports');
assert.ok(weather.includes("activeWeather==='rain'||activeWeather==='storm'"), 'Rain shafts must only animate during rain or storm');
assert.ok(weather.includes("activeWeather === 'snow'"), 'Snow must use its own slower particle behaviour');
assert.ok(weather.includes("if(kind==='storm')nextLightningAt"), 'Lightning must only be enabled for thunderstorm conditions');
assert.ok(weather.includes('const riverFoam=[]'), 'The river must have visible flow markers');
assert.ok(weather.includes('riverFlowRate=0.62+Math.min(1.35,precipitation*0.28'), 'River flow must respond to measured precipitation while wind independently affects the sea');
assert.ok(weather.includes('waterTexture.offset.y='), 'Water texture must visibly flow');
assert.ok(weather.includes('waterfallMaterial.opacity='), 'Waterfall strength must react to precipitation');
assert.ok(weather.includes('seaMaterial.roughness=clamp'), 'Wind must affect the coastal water surface');
assert.ok(weather.includes('mistMaterial.opacity=0.045+targetHumidity'), 'Humidity and temperature must affect atmospheric haze');

// Clouds are independent volume masses at several altitudes, with no static support rods.
assert.ok(weather.includes('const lobes = ['), 'Clouds must be formed from layered 3D volume masses');
assert.ok(weather.includes('addCloud(-5.3, 11.2'), 'A high cloud layer must sit above the mountain range');
assert.ok(weather.includes('addCloud(2.5, 10.4'), 'Additional clouds must sit at a separate altitude/depth');
assert.ok(!/support rod|cloud pole|cloud rod/i.test(weather), 'Cloud formations must not be held by static support rods');

// Adaptive framing changes camera composition only; no non-uniform map scaling.
const profileMatch = weather.match(/function weatherViewportProfile\(width, height\) \{[\s\S]*?\n  \}/);
assert.ok(profileMatch, 'A pure viewport profile must drive adaptive camera framing');
const viewportProfile = vm.runInNewContext(`(${profileMatch[0]})`);
const viewports = [
  ['compact phone portrait',320,568],['standard phone portrait',393,852],['large phone portrait',430,932],
  ['phone landscape',844,390],['tablet portrait',820,1180],['tablet landscape',1180,820],
  ['desktop',1440,900],['ultrawide desktop',2560,1080]
];
const profiles=viewports.map(([name,width,height])=>({name,...viewportProfile(width,height)}));
for(const profile of profiles){
  assert.ok(Number.isFinite(profile.aspect)&&profile.aspect>0,`${profile.name} needs a valid aspect`);
  assert.ok(profile.fov>=30&&profile.fov<=40,`${profile.name} needs a bounded camera FOV`);
  assert.ok(profile.elevation>0.4&&profile.elevation<0.7,`${profile.name} needs a consistent three-quarter view`);
  assert.equal(profile.scaleX,undefined,`${profile.name} must not stretch the terrain horizontally`);
  assert.equal(profile.scaleZ,undefined,`${profile.name} must not stretch the terrain in depth`);
}
assert.ok(profiles[0].portrait&&profiles[1].portrait&&profiles[2].portrait&&!profiles[3].portrait,'Phone portrait and landscape must select different camera compositions');
assert.ok(profiles[0].fov!==profiles[3].fov,'Portrait and landscape must use different camera framing');
assert.ok(profiles[4].tablet&&!profiles[5].portrait,'Tablet profiles must remain distinct');
assert.ok(weather.includes('const resizeObserver = typeof ResizeObserver'), 'The camera must respond to container resizing');
assert.ok(weather.includes("window.visualViewport?.addEventListener('resize', resize"), 'Mobile visual viewport changes must reframe the camera');
assert.ok(weather.includes("window.visualViewport?.removeEventListener('resize', resize)"), 'Mobile viewport listeners must be cleaned up');
assert.ok(weather.includes('renderer.setPixelRatio'), 'Rendering resolution must be capped for device performance');
assert.ok(weather.includes('const pixelBudget=Math.sqrt(2300000'), 'Rendering must respect a bounded pixel budget');

// Existing app/data/privacy/lifecycle contracts.
assert.ok(weather.includes('const MAX_FORECAST_HOURS = 18'), 'Weather must retain its 18-hour forecast');
assert.ok(weather.includes('https://api.open-meteo.com/v1/forecast'), 'Open-Meteo must remain the live data source');
assert.ok(weather.includes("wind_speed_unit:'kmh'"), 'Wind values must remain km/h');
assert.ok(weather.includes("temperature_unit:'celsius'"), 'Temperature values must remain Celsius');
assert.ok(weather.includes("precipitation_unit:'mm'"), 'Precipitation values must remain mm');
assert.ok(!/navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(weather), 'Weather must never request geolocation itself');
assert.ok(weather.includes('liveEarthLocationAllowed'), 'Weather must respect Location Orb permission');
assert.ok(weather.includes("removeEventListener('live-earth-location-state'"), 'Location listeners must be removed');
assert.ok(weather.includes("removeEventListener('offline'"), 'Offline listeners must be removed');
assert.ok(weather.includes("removeEventListener('online'"), 'Online listeners must be removed');
assert.ok(weather.includes('abortController?.abort()'), 'Requests must abort when privacy or lifecycle changes');
assert.ok(weather.includes('No old forecast is presented as current'), 'Offline must not present stale data as current');
assert.ok(weather.includes('renderer.forceContextLoss?.()'), 'The GPU context must be released when Weather closes');
assert.ok(weather.includes('return () => {engineDisposed=true'), 'The Stacks feature must provide deactivation cleanup');
assert.ok(!/resident|Residents|LiveEarthResidentLibrary|data-resident-host/i.test(weather), 'Retired Residents content must not return');

console.log('Portrait-first topographic Weather scene, weather-reactive environment, framing, privacy and lifecycle checks passed.');
