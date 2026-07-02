export const DEFAULT_STL_MAX_TRIANGLES = 50000;

export function isLikelyStlFile(file) {
  const name = String(file?.name || '');
  const type = String(file?.type || '').toLowerCase();
  return /\.stl$/i.test(name) || type.includes('stl');
}

export function stlFileFromDataTransfer(dataTransfer) {
  const files = Array.from(dataTransfer?.files || []);
  return files.find(isLikelyStlFile) || null;
}

export function emptyStlBounds(format = 'unknown') {
  return { format, vertexCount: 0, minX: 0, minY: 0, minZ: 0, maxX: 20, maxY: 20, maxZ: 8, width: 20, depth: 20, height: 8 };
}

export function boundsFromVertices(vertices, format) {
  if (!vertices.length) return emptyStlBounds(format);
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const zs = vertices.map(v => v.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return {
    format,
    vertexCount: vertices.length,
    minX, minY, minZ, maxX, maxY, maxZ,
    width: Math.max(.1, maxX - minX),
    depth: Math.max(.1, maxY - minY),
    height: Math.max(.1, maxZ - minZ),
  };
}

function parseBinaryStlBounds(buffer) {
  if (!buffer || buffer.byteLength < 84) return null;
  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  const expected = 84 + triangles * 50;
  if (expected !== buffer.byteLength) return null;
  const vertices = [];
  for (let i = 0; i < triangles; i++) {
    const base = 84 + i * 50 + 12;
    for (let v = 0; v < 3; v++) {
      const o = base + v * 12;
      vertices.push({ x: view.getFloat32(o, true), y: view.getFloat32(o + 4, true), z: view.getFloat32(o + 8, true) });
    }
  }
  return boundsFromVertices(vertices, 'binary');
}

function parseAsciiStlBounds(buffer) {
  let text = '';
  try { text = new TextDecoder('utf-8', { fatal: false }).decode(buffer); } catch (_err) { return null; }
  if (!/\bvertex\s+[-+0-9.eE]/i.test(text)) return null;
  const vertices = [];
  const re = /\bvertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/gi;
  let match;
  while ((match = re.exec(text))) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const z = Number(match[3]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) vertices.push({ x, y, z });
  }
  return vertices.length ? boundsFromVertices(vertices, 'ascii') : null;
}

export function parseStlBounds(buffer) {
  return parseBinaryStlBounds(buffer) || parseAsciiStlBounds(buffer) || emptyStlBounds('unknown');
}

function parseBinaryStlVertices(buffer) {
  if (!buffer || buffer.byteLength < 84) return null;
  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  const expected = 84 + triangles * 50;
  if (expected !== buffer.byteLength) return null;
  const vertices = [];
  for (let i = 0; i < triangles; i++) {
    const base = 84 + i * 50 + 12;
    for (let v = 0; v < 3; v++) {
      const o = base + v * 12;
      vertices.push({ x: view.getFloat32(o, true), y: view.getFloat32(o + 4, true), z: view.getFloat32(o + 8, true) });
    }
  }
  return vertices;
}

function parseAsciiStlVertices(buffer) {
  let text = '';
  try { text = new TextDecoder('utf-8', { fatal: false }).decode(buffer); } catch (_err) { return null; }
  if (!/\bvertex\s+[-+0-9.eE]/i.test(text)) return null;
  const vertices = [];
  const re = /\bvertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/gi;
  let match;
  while ((match = re.exec(text))) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const z = Number(match[3]);
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) vertices.push({ x, y, z });
  }
  return vertices.length ? vertices : null;
}

export function parseStlVertices(buffer) {
  return parseBinaryStlVertices(buffer) || parseAsciiStlVertices(buffer) || [];
}

export function estimateStlTriangleCount(buffer, maxTriangles = DEFAULT_STL_MAX_TRIANGLES) {
  if (!buffer || buffer.byteLength < 1) return 0;
  if (buffer.byteLength >= 84) {
    const view = new DataView(buffer);
    const triangles = view.getUint32(80, true);
    if (84 + triangles * 50 === buffer.byteLength) return triangles;
  }
  let text = '';
  try { text = new TextDecoder('utf-8', { fatal: false }).decode(buffer); } catch (_err) { return 0; }
  const re = /\bvertex\s+[-+0-9.eE]+\s+[-+0-9.eE]+\s+[-+0-9.eE]+/gi;
  let vertices = 0;
  while (re.exec(text)) {
    vertices++;
    if (vertices > maxTriangles * 3) return Math.ceil(vertices / 3);
  }
  return Math.floor(vertices / 3);
}
