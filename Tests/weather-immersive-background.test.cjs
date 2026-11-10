const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','Weather/weather-view.js'),'utf8');
assert.ok(s.includes("runtime.registerFeature('weather',activateWeather)"));assert.ok(s.includes('function makePainter(canvas)'));
for(const field of ['temperature_2m','apparent_temperature','is_day','precipitation','snowfall','weather_code','cloud_cover','wind_speed_10m','wind_direction_10m','relative_humidity_2m','precipitation_probability','temperature_2m_max','temperature_2m_min'])assert.ok(s.includes(field),`Missing weather field ${field}`);
for(const draw of ['drawSky','drawMountains','drawWater','drawPagoda','drawBambooAndLeaves','drawWindLines','drawRain','drawSnow','drawFog'])assert.ok(s.includes(`function ${draw}`),`Missing live drawing layer ${draw}`);
assert.ok(s.includes('requestAnimationFrame(loop)'));assert.ok(s.includes('getContext(\'2d\''));assert.ok(!/WebGLRenderer|new THREE\.|navigator\.geolocation|\.getCurrentPosition\s*\(|\.watchPosition\s*\(/.test(s));
console.log('Live 2D canvas drawing, weather-driven scene layers, real data contract and no-3D/no-GPS checks passed.');
