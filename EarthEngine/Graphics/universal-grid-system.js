/* LIVE // EARTH — Universal Grid System
 * Fetches, verifies, decodes and normalizes provider grids. Presentation is
 * deliberately kept out of this module so every numerical world can reuse it.
 */
(() => {
  'use strict';
  const VERSION = '1.0.0';

  function requireObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
    return value;
  }
  function finite(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new TypeError(`${label} must be a finite number.`);
    return n;
  }
  function validateMetadata(meta) {
    requireObject(meta, 'Grid metadata');
    const width = Number(meta.width), height = Number(meta.height);
    if (!Number.isInteger(width) || width < 2 || !Number.isInteger(height) || height < 2) throw new RangeError('Grid dimensions are invalid.');
    const coordinateOrder = meta.coordinate_order || meta.coordinateOrder;
    const rowOrder = meta.row_order || meta.rowOrder;
    const longitudeConvention = meta.longitude_convention || meta.longitudeConvention;
    if (!['latitude-longitude', 'lat-lon'].includes(coordinateOrder)) throw new TypeError(`Unsupported coordinate order: ${coordinateOrder || 'missing'}.`);
    if (!['south-to-north', 'north-to-south'].includes(rowOrder)) throw new TypeError(`Unsupported row order: ${rowOrder || 'missing'}.`);
    if (!['0..360', '-180..180'].includes(longitudeConvention)) throw new TypeError(`Unsupported longitude convention: ${longitudeConvention || 'missing'}.`);
    const latitudeFirst = finite(meta.latitude_first ?? meta.latStart, 'latitude_first');
    const longitudeFirst = finite(meta.longitude_first ?? meta.lonStart, 'longitude_first');
    const latitudeStep = finite(meta.latitude_step ?? meta.latStep, 'latitude_step');
    const longitudeStep = finite(meta.longitude_step ?? meta.lonStep, 'longitude_step');
    if (latitudeStep === 0 || longitudeStep === 0 || Math.abs(latitudeFirst) > 90 || Math.abs(latitudeStep) * (height - 1) > 180.001 || Math.abs(longitudeStep) * (width - 1) > 360.001) throw new RangeError('Grid coordinate bounds are invalid.');
    if (rowOrder === 'south-to-north' && latitudeStep < 0) throw new RangeError('South-to-north metadata requires a positive latitude step.');
    if (rowOrder === 'north-to-south' && latitudeStep > 0) throw new RangeError('North-to-south metadata requires a negative latitude step.');
    return Object.freeze({
      width, height, latStart: latitudeFirst, lonStart: longitudeFirst,
      latStep: latitudeStep, lonStep: longitudeStep,
      coordinateOrder: 'lat-lon', rowOrder,
      longitudeConvention, noDataValue: meta.nodata ?? meta.nodata_value ?? meta.no_data_value ?? meta.noDataValue ?? null,
      units: meta.units || null, variable: meta.variable || null,
      provider: meta.provider || null, product: meta.product || null,
      qualityStatus: meta.quality_status || meta.qualityStatus || null,
      sourceFile: meta.source_file || meta.sourceFile || null
    });
  }
  async function fetchBytes(url, signal) {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Scientific data request failed (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  }
  async function sha256Hex(bytes) {
    if (!globalThis.crypto?.subtle) throw new Error('This browser cannot verify the current grid value checksum.');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  async function gunzip(bytes) {
    if (typeof DecompressionStream !== 'function') throw new Error('This browser does not support secure gzip decoding.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function decodeInt16Scaled(bytes, expectedCount, scaleFactor) {
    if (bytes.byteLength !== expectedCount * 2) throw new RangeError(`Decoded grid has ${bytes.byteLength} bytes; expected ${expectedCount * 2}.`);
    if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) throw new RangeError('Grid scale factor must be positive.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const values = new Float32Array(expectedCount);
    for (let i = 0; i < expectedCount; i++) values[i] = view.getInt16(i * 2, true) / scaleFactor;
    return values;
  }
  async function loadCurrentGrid(options = {}) {
    const baseUrl = String(options.baseUrl || '');
    const datasetId = String(options.datasetId || '');
    if (!/^https:\/\//i.test(baseUrl) || !datasetId || /[\/\\]/.test(datasetId) || datasetId.split('.').some(part => part === '.' || part === '..')) {
      throw new TypeError('A secure current-values base URL and dataset id are required.');
    }
    const controller = options.signal ? null : new AbortController();
    const signal = options.signal || controller.signal;
    const folderUrl = new URL(`${encodeURIComponent(datasetId)}/`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    const metadataUrl = new URL('metadata.json', folderUrl).href;
    const metadataBytes = await fetchBytes(metadataUrl, signal);
    let metadata;
    try { metadata = JSON.parse(new TextDecoder().decode(metadataBytes)); }
    catch (_) { throw new Error('The current dataset metadata is not valid JSON.'); }
    if (metadata.dataset_id !== datasetId || metadata.data_kind !== 'grid' || metadata.value_file !== 'values.bin') {
      throw new TypeError('The current dataset entry is not a supported stored grid.');
    }
    if (!/^[a-f0-9]{64}$/i.test(metadata.value_sha256 || '') || !/^[a-f0-9]{64}$/i.test(metadata.sha256_uncompressed_values || '')) {
      throw new TypeError('Current grid metadata is missing its value checksums.');
    }
    const definition = validateMetadata(metadata);
    const encoding = String(metadata.encoding || '').toLowerCase();
    const encodedScale = encoding.match(/\/\s*(\d+(?:\.\d+)?)/);
    const scaleFactor = Number(metadata.scale_factor ?? metadata.scaleFactor ?? (encodedScale ? encodedScale[1] : NaN));
    if (!(encoding.includes('int16') && encoding.includes('little-endian') && encodedScale && Number.isFinite(scaleFactor) && scaleFactor > 0 && Math.abs(Number(encodedScale[1]) - scaleFactor) < 1e-9)) {
      throw new Error(`No decoder is approved for the declared grid encoding: ${metadata.encoding || 'missing'}.`);
    }
    const valuesUrl = new URL('values.bin', folderUrl).href;
    const compressedBytes = await fetchBytes(valuesUrl, signal);
    const storedHash = await sha256Hex(compressedBytes);
    if (storedHash.toLowerCase() !== metadata.value_sha256.toLowerCase()) {
      throw new Error('Current grid values failed their stored-file checksum.');
    }
    const uncompressed = await gunzip(compressedBytes);
    const actualHash = await sha256Hex(uncompressed);
    if (actualHash.toLowerCase() !== metadata.sha256_uncompressed_values.toLowerCase()) {
      throw new Error('Current grid values failed their decoded-value checksum. The data was not displayed.');
    }
    const values = decodeInt16Scaled(uncompressed, definition.width * definition.height, scaleFactor);
    let min = Infinity, max = -Infinity, validCount = 0;
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (!Number.isFinite(value) || (definition.noDataValue !== null && value === Number(definition.noDataValue))) continue;
      if (value < min) min = value;
      if (value > max) max = value;
      validCount++;
    }
    if (!validCount) throw new Error('The verified current grid contains no valid numeric cells.');
    return Object.freeze({
      datasetId, dataset: metadata.dataset || datasetId,
      gridId: metadata.grid_id || null, definition, values,
      min, max, validCount,
      units: definition.units || 'unknown',
      observedAt: metadata.valid_time_utc || metadata.source_cycle_utc || null,
      retrievedAt: metadata.updated_at_utc || metadata.retrieved_at_utc || null,
      provider: definition.provider, product: definition.product,
      qualityStatus: definition.qualityStatus,
      checksum: actualHash, sourceUrl: metadata.source_url || metadata.source_urls?.[0] || metadataUrl
    });
  }

  window.LiveEarthUniversalGridSystem = Object.freeze({ version: VERSION, validateMetadata, loadCurrentGrid });
  window.dispatchEvent?.(new CustomEvent('live-earth-universal-grid-system-ready', { detail: { version: VERSION } }));
})();
