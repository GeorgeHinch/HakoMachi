(function(global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function byId(id, root) {
    return (root || document).getElementById(id);
  }

  function numberValue(id, options) {
    const opts = options || {};
    const node = typeof id === 'string' ? byId(id, opts.root) : id;
    const fallback = opts.fallback == null ? 0 : opts.fallback;
    const value = node ? parseFloat(node.value) : NaN;
    let n = Number.isFinite(value) ? value : fallback;
    if (opts.min != null) n = Math.max(opts.min, n);
    if (opts.max != null) n = Math.min(opts.max, n);
    return n;
  }

  function readFormSettings(ids, root) {
    const out = {};
    ids.forEach(id => {
      const node = byId(id, root);
      if (!node) return;
      if (node.type === 'checkbox') out[id] = node.checked;
      else if (node.tagName === 'SELECT') out[id] = node.value;
      else {
        const value = Number(node.value);
        out[id] = Number.isFinite(value) ? value : node.value;
      }
    });
    return out;
  }

  function applyFormSettings(ids, settings, root) {
    ids.forEach(id => {
      const node = byId(id, root);
      if (!node || !settings || settings[id] == null) return;
      if (node.type === 'checkbox') node.checked = !!settings[id];
      else node.value = settings[id];
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function htmlDecode(value) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(value || '');
    return textarea.value;
  }

  function fixed(value, places) {
    const n = Number(value);
    return Number(Number.isFinite(n) ? n.toFixed(places == null ? 4 : places) : 0);
  }

  function formatNumber(value, places) {
    const n = Number(value);
    return (Number.isFinite(n) ? n : 0).toFixed(places == null ? 3 : places);
  }

  function attrsToString(attrs) {
    return Object.entries(attrs || {})
      .filter(([, value]) => value !== undefined && value !== null && value !== false)
      .map(([key, value]) => value === true ? key : `${key}="${escapeAttr(value)}"`)
      .join(' ');
  }

  function svgLine(x1, y1, x2, y2, attrs, rawAttrs) {
    const attrText = attrsToString(Object.assign({
      x1: formatNumber(x1),
      y1: formatNumber(y1),
      x2: formatNumber(x2),
      y2: formatNumber(y2)
    }, attrs || {}));
    return `<line ${attrText}${rawAttrs ? ' ' + rawAttrs : ''}/>`;
  }

  function svgRect(x, y, width, height, attrs, rawAttrs) {
    const attrText = attrsToString(Object.assign({
      x: formatNumber(x),
      y: formatNumber(y),
      width: formatNumber(Math.max(0, width)),
      height: formatNumber(Math.max(0, height))
    }, attrs || {}));
    return `<rect ${attrText}${rawAttrs ? ' ' + rawAttrs : ''}/>`;
  }

  function svgText(x, y, text, attrs) {
    const attrText = attrsToString(Object.assign({
      x: formatNumber(x),
      y: formatNumber(y)
    }, attrs || {}));
    return `<text ${attrText}>${escapeHtml(text)}</text>`;
  }

  function svgPathD(points, options) {
    const opts = options || {};
    if (!points || !points.length) return '';
    const parts = points.map((point, index) => {
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      return `${index ? 'L' : 'M'} ${formatNumber(x)} ${formatNumber(y)}`;
    });
    if (opts.closed) parts.push('Z');
    return parts.join(' ');
  }

  function serializeSvgElement(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', SVG_NS);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }

  function downloadBlob(blob, filename) {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  }

  function downloadText(content, filename, mimeType) {
    downloadBlob(new Blob([content], { type: mimeType || 'text/plain' }), filename);
  }

  function downloadJson(data, filename) {
    downloadText(JSON.stringify(data, null, 2), filename, 'application/json');
  }

  function openTextPreview(content, mimeType) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType || 'text/plain' }));
    const preview = window.open(url, '_blank');
    if (!preview) window.location.href = url;
    else setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function copyText(text, options) {
    const opts = options || {};
    const button = opts.button || null;
    const resetText = opts.resetText || (button ? button.textContent : '');
    const successText = opts.successText || 'Copied';
    const fallback = () => {
      if (opts.fallbackTextarea) opts.fallbackTextarea.value = text;
      if (button) {
        button.textContent = opts.fallbackText || resetText;
        setTimeout(() => { button.textContent = resetText; }, opts.delay || 900);
      }
    };
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      fallback();
      return Promise.resolve(false);
    }
    return navigator.clipboard.writeText(text).then(() => {
      if (button) {
        button.textContent = successText;
        setTimeout(() => { button.textContent = resetText; }, opts.delay || 900);
      }
      return true;
    }, () => {
      fallback();
      return false;
    });
  }

  function extractJsonOrSvgMetadata(text) {
    let source = String(text || '').trim();
    if (!source) return null;
    const meta = source.match(/<metadata[^>]*>([\s\S]*?)<\/metadata>/i);
    if (meta) source = htmlDecode(meta[1]).trim();
    else {
      const jsonBlock = source.match(/\{[\s\S]*\}/);
      if (jsonBlock) source = htmlDecode(jsonBlock[0]).trim();
    }
    return JSON.parse(source);
  }

  function rafDebounce(fn) {
    let pending = null;
    return function debounced() {
      if (pending) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        pending = null;
        fn();
      });
    };
  }

  function crc32Bytes(bytes) {
    if (!crc32Bytes.table) {
      crc32Bytes.table = Array.from({ length: 256 }, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        return c >>> 0;
      });
    }
    let crc = 0xFFFFFFFF;
    for (const b of bytes) crc = crc32Bytes.table[(crc ^ b) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(date) {
    const d = date || new Date();
    const year = Math.max(1980, d.getFullYear());
    return {
      dosTime: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
      dosDate: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function pushU16(arr, n) {
    arr.push(n & 255, (n >>> 8) & 255);
  }

  function pushU32(arr, n) {
    arr.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
  }

  function makeZipBlob(files) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const { dosTime, dosDate } = dosDateTime();

    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = encoder.encode(file.text);
      const crc = crc32Bytes(dataBytes);
      const local = [];
      pushU32(local, 0x04034b50);
      pushU16(local, 20);
      pushU16(local, 0);
      pushU16(local, 0);
      pushU16(local, dosTime);
      pushU16(local, dosDate);
      pushU32(local, crc);
      pushU32(local, dataBytes.length);
      pushU32(local, dataBytes.length);
      pushU16(local, nameBytes.length);
      pushU16(local, 0);
      chunks.push(new Uint8Array(local), nameBytes, dataBytes);

      const cd = [];
      pushU32(cd, 0x02014b50);
      pushU16(cd, 20);
      pushU16(cd, 20);
      pushU16(cd, 0);
      pushU16(cd, 0);
      pushU16(cd, dosTime);
      pushU16(cd, dosDate);
      pushU32(cd, crc);
      pushU32(cd, dataBytes.length);
      pushU32(cd, dataBytes.length);
      pushU16(cd, nameBytes.length);
      pushU16(cd, 0);
      pushU16(cd, 0);
      pushU16(cd, 0);
      pushU16(cd, 0);
      pushU32(cd, 0);
      pushU32(cd, offset);
      central.push(new Uint8Array(cd), nameBytes);

      offset += local.length + nameBytes.length + dataBytes.length;
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const c of central) centralSize += c.length;
    chunks.push(...central);

    const end = [];
    pushU32(end, 0x06054b50);
    pushU16(end, 0);
    pushU16(end, 0);
    pushU16(end, files.length);
    pushU16(end, files.length);
    pushU32(end, centralSize);
    pushU32(end, centralStart);
    pushU16(end, 0);
    chunks.push(new Uint8Array(end));
    return new Blob(chunks, { type: 'application/zip' });
  }

  global.HakoMachiUtils = {
    SVG_NS,
    byId,
    numberValue,
    readFormSettings,
    applyFormSettings,
    escapeHtml,
    escapeAttr,
    htmlDecode,
    fixed,
    formatNumber,
    attrsToString,
    svgLine,
    svgRect,
    svgText,
    svgPathD,
    serializeSvgElement,
    downloadBlob,
    downloadText,
    downloadJson,
    openTextPreview,
    copyText,
    extractJsonOrSvgMetadata,
    rafDebounce,
    makeZipBlob
  };
})(window);
