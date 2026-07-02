import githubData from '../shared/github-data.js';

export function normalizeGithubLibrary(library) {
  return githubData.normalizeLibrary(library);
}

export function upsertGithubSitePlan(library, record) {
  return githubData.upsertRecord(library, 'sitePlans', record);
}

export function githubProjectName(project) {
  return project.hakomachiCloud?.name
    || project.projectName
    || (Array.isArray(project.buildings) && project.buildings.length ? `HakoMachi site (${project.buildings.length} buildings)` : 'HakoMachi site');
}

export function githubSiteRecord(id, name, path, project) {
  const now = new Date().toISOString();
  const imageAsset = project.image?.asset || null;
  const assets = Array.isArray(project.assetManifest?.assets) ? project.assetManifest.assets : (imageAsset ? [imageAsset] : []);
  return {
    kind: 'sitePlan',
    recordType: 'hakomachi-site-plan',
    schemaVersion: 1,
    id,
    name,
    path,
    paths: { project: path, assets: assets.map(asset => asset.path).filter(Boolean) },
    app: 'hakomachi-site-planner',
    source: { format: 'hako-site-json', version: project.version || null },
    summary: {
      buildings: project.buildings?.length || 0,
      roads: project.roads?.length || 0,
      tracks: project.tracks?.length || 0,
      benchworkOutlines: project.benchworkOutlines?.length || 0,
      streetlights: project.streetlights?.length || 0,
      imageEmbedded: !!project.image?.dataUrl,
      imageAssetPath: imageAsset?.path || null,
      buildingHakoAssetCount: assets.filter(asset => asset?.kind === 'building-hako').length,
      stlObjects: project.stlObjects?.length || 0,
      stlAssetCount: assets.filter(asset => asset?.kind === 'stl').length,
      stlSourceAssetCount: assets.filter(asset => asset?.kind === 'stl-source').length,
      calibrated: !!project.scale?.calibrated,
    },
    updatedAt: now,
    createdAt: now,
  };
}

export function looksLikeSitePlanPayload(value) {
  if (!value || typeof value !== 'object') return false;
  return value.app === 'HakoMachi Site Planner'
    || value.portableProject === true
    || Array.isArray(value.buildings)
    || Array.isArray(value.buildingPads)
    || Array.isArray(value.pads)
    || Array.isArray(value.lots)
    || Array.isArray(value.roads)
    || Array.isArray(value.benchworkOutlines)
    || value.coordinateSystem?.type === 'imagePixels'
    || value.hakomachiCloud?.kind === 'sitePlan'
    || Array.isArray(value.site?.buildings)
    || Array.isArray(value.site?.buildingPads);
}

export function isGithubContentsMetadata(value) {
  return !!(value && typeof value === 'object' && value.type === 'file' && value.path && value.url && value.git_url && value.encoding);
}

export function normalizeLoadedSitePlanPayload(value) {
  const candidates = [
    ['top-level', value],
    ['project', value?.project],
    ['sitePlan', value?.sitePlan],
    ['payload', value?.payload],
    ['data', value?.data],
    ['document', value?.document],
    ['site', value?.site],
  ];
  for (const [source, payload] of candidates) {
    if (looksLikeSitePlanPayload(payload)) return { payload, source };
  }
  return { payload: value, source: 'top-level' };
}
