import { presetModelMm, roadPresetByKey, sidewalkPresetByKey } from './road-preset-utils.js';

export function createRoadPresetApplicationController({
  state,
  mmToPx,
  currentScaleDivisor,
  rebuildRoadGeometry,
}){
  function roadPresetScaleContext(){
    return {pxPerMm:state.pxPerMm, mmToPx};
  }

  function applyRoadWidthPreset(road, key){
    road.roadWidthPreset = key || 'custom';
    const mm = presetModelMm(roadPresetByKey(key), currentScaleDivisor());
    if(mm!=null){
      road.widthMm = mm;
      road.widthPx = state.pxPerMm ? mmToPx(mm) : (road.widthPx || mm);
      rebuildRoadGeometry(road);
    }
  }

  function applySidewalkWidthPreset(road, key){
    road.sidewalkWidthPreset = key || 'custom';
    const mm = presetModelMm(sidewalkPresetByKey(key), currentScaleDivisor());
    if(mm!=null){
      road.sidewalkWidthMm = mm;
      road.sidewalkWidthPx = state.pxPerMm ? mmToPx(mm) : (road.sidewalkWidthPx || mm);
      rebuildRoadGeometry(road);
    }
  }

  return {
    roadPresetScaleContext,
    applyRoadWidthPreset,
    applySidewalkWidthPreset,
  };
}
