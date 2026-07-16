import { roadAssetSvgExport } from './export-utils.js';
import { paintStencilExportSpecs, physicalGrateExportSpecs } from './road-asset-export-specs.js';
import { filterRoadExportDataByRoadIds, roadExportContentBounds, roadExportTransformForMedia } from './road-export-review-panel.js';
import { serializeGrateInsertSheetsByMaterial } from './road-grate-sheet-serializer.js';
import { serializePaintStencilSheetsByMaterial } from './road-paint-stencil-templates.js';

export function reviewedRoadExportIds(reviewSettings, data) {
  const ids = (data?.roads || []).map(road => road.id).filter(Boolean);
  const allowed = new Set(ids);
  const selected = Array.isArray(reviewSettings?.includedRoadIds)
    ? reviewSettings.includedRoadIds.filter(id => allowed.has(id))
    : ids;
  return new Set(selected);
}

export function roadFeatureIncludedForExport(feature, includedRoadIds) {
  if (!includedRoadIds || !includedRoadIds.size) return true;
  return !feature?.roadId || includedRoadIds.has(feature.roadId);
}

export function generatedRoadRecordIncludedForExport(record, includedRoadIds) {
  if (!includedRoadIds || !includedRoadIds.size) return true;
  return !record?.roadId || includedRoadIds.has(record.roadId);
}

export function createRoadAssetExportController({
  state,
  generateRoadExportData,
  generatedRailCrossings,
  railCrossingInfillPanels,
  roadSystem,
  railCrossingSvgRecords,
  fabricationDeps,
  normalizeRoadFeature,
  markingPresetByKey,
  downloadText,
  downloadBlob,
  slugify,
  zipFactory = () => (typeof JSZip !== 'undefined' ? new JSZip() : null),
}) {
  function roadFeaturesForIncludedIds(includedRoadIds) {
    return (state.roadFeatures || []).filter(feature => roadFeatureIncludedForExport(feature, includedRoadIds));
  }

  function svgRoadAssetExport(review = {}) {
    const rawData = generateRoadExportData();
    const includedRoadIds = reviewedRoadExportIds(review.settings, rawData);
    const data = filterRoadExportDataByRoadIds(rawData, Array.from(includedRoadIds));
    const filteredRoadFeatures = roadFeaturesForIncludedIds(includedRoadIds);
    const crossings = generatedRailCrossings();
    const generatedIntersectionRecords = roadSystem
      .generatedRoadIntersectionSvgRecords({ includeCurbGuides: false })
      .filter(record => generatedRoadRecordIncludedForExport(record, includedRoadIds));
    const generatedRailCrossingRecords = railCrossingSvgRecords(crossings, {
      infillPanels: railCrossingInfillPanels(crossings),
    }).filter(record => generatedRoadRecordIncludedForExport(record, includedRoadIds));
    let width = state.image?.width || 1200;
    let height = state.image?.height || 800;
    let contentTransform = '';
    if (review.media) {
      width = review.media.widthMm;
      height = review.media.heightMm;
      const bounds = roadExportContentBounds(data, filteredRoadFeatures);
      contentTransform = roadExportTransformForMedia({
        bounds,
        media: review.media,
        pxPerMm: state.pxPerMm,
      }).transform;
    }
    return roadAssetSvgExport({
      data,
      roadFeatures: filteredRoadFeatures,
      generatedIntersectionRecords,
      generatedRailCrossingRecords,
      width,
      height,
      contentTransform,
    }, fabricationDeps);
  }

  async function downloadRoadAssetExport(review = {}) {
    const rawData = generateRoadExportData();
    const includedRoadIds = reviewedRoadExportIds(review.settings, rawData);
    const roadFeaturesForExport = roadFeaturesForIncludedIds(includedRoadIds);
    const roadSvg = svgRoadAssetExport(review);
    const exportDeps = { normalizeRoadFeature, markingPresetByKey, pxPerMm: state.pxPerMm };
    const grates = physicalGrateExportSpecs(roadFeaturesForExport, exportDeps);
    const stencils = paintStencilExportSpecs(roadFeaturesForExport, exportDeps);
    if (!grates.length && !stencils.length) {
      downloadText(roadSvg, 'hakomachi-road-assets.svg', 'image/svg+xml');
      return;
    }
    const zip = zipFactory();
    if (!zip) {
      downloadText(roadSvg, 'hakomachi-road-assets.svg', 'image/svg+xml');
      return;
    }
    zip.file('hakomachi-road-assets.svg', roadSvg);
    serializeGrateInsertSheetsByMaterial(grates).forEach((sheet, index) => {
      const materialId = slugify(sheet.materialId || `grate-material-${index + 1}`);
      zip.file(`road-grate-inserts/${materialId}.svg`, sheet.svg);
    });
    serializePaintStencilSheetsByMaterial(stencils, { includeGuides: true }).forEach((sheet, index) => {
      const materialId = slugify(sheet.materialId || `stencil-material-${index + 1}`);
      zip.file(`road-paint-stencils/${materialId}.svg`, sheet.svg);
    });
    zip.file('road-grate-inserts/manifest.json', JSON.stringify({
      schema: 'hakomachi.road-asset-export',
      schemaVersion: 1,
      roadDeck: 'hakomachi-road-assets.svg',
      physicalGrates: grates.map(spec => ({
        id: spec.id,
        label: spec.label,
        key: spec.key,
        widthMm: spec.widthMm,
        depthMm: spec.depthMm,
        shape: spec.shape || 'rect',
      })),
    }, null, 2) + '\n');
    zip.file('road-paint-stencils/manifest.json', JSON.stringify({
      schema: 'hakomachi.road-paint-stencils',
      schemaVersion: 1,
      roadDeck: 'hakomachi-road-assets.svg',
      paintStencils: stencils.map(spec => ({
        id: spec.id,
        label: spec.label,
        preset: spec.preset?.key,
        materialId: spec.materialId,
        widthMm: spec.preset?.widthMm,
        depthMm: spec.preset?.depthMm,
        rotationDeg: spec.rotationDeg,
        marginMm: spec.options?.marginMm ?? 2,
        bridgeMm: spec.options?.bridgeMm ?? 0.35,
      })),
    }, null, 2) + '\n');
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'hakomachi-road-assets.zip');
  }

  return {
    svgRoadAssetExport,
    downloadRoadAssetExport,
  };
}
