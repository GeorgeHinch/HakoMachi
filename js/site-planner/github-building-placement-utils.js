import { deriveFootprintFromHakoConfig, firstNum } from './hako-footprint-utils.js';

export function githubRecordConfigForPlacement(record){
  const footprint=record?.footprint||{};
  const cfg=structuredClone(record?.hakoConfig || record?.config || record?.hakoSeed || {});
  if(footprint && typeof footprint==='object' && !cfg.footprint) cfg.footprint=structuredClone(footprint);
  return cfg && typeof cfg==='object' ? cfg : {};
}

export function githubRecordPlacementShape(record){
  const footprint=record?.footprint||{};
  const cfg=githubRecordConfigForPlacement(record);
  let derived=deriveFootprintFromHakoConfig(cfg);
  if(!derived){
    const width=firstNum(footprint.widthMm,footprint.width,cfg.widthMm,cfg.width,cfg.dimensions?.widthMm,cfg.dimensions?.width);
    const depth=firstNum(footprint.depthMm,footprint.depth,cfg.depthMm,cfg.depth,cfg.dimensions?.depthMm,cfg.dimensions?.depth);
    if(width && depth) derived={padType:'rect',widthMm:width,depthMm:depth,source:'library footprint'};
  }
  if(!derived) return null;
  const points=Array.isArray(derived.pointsMm) ? derived.pointsMm : null;
  const origin=points?.length ? {
    x:(Math.min(...points.map(point=>point.x))+Math.max(...points.map(point=>point.x)))/2,
    y:(Math.min(...points.map(point=>point.y))+Math.max(...points.map(point=>point.y)))/2
  } : {
    x:(derived.widthMm||firstNum(footprint.widthMm,footprint.width,cfg.widthMm,cfg.width)||20)/2,
    y:(derived.depthMm||firstNum(footprint.depthMm,footprint.depth,cfg.depthMm,cfg.depth)||20)/2
  };
  return {derived,cfg,origin};
}

export function githubPlacementPreviewPolygon(placement, center, mmToPx){
  if(!placement || !center) return [];
  const derived=placement.derived||{};
  const origin=placement.origin||{x:0,y:0};
  if(derived.padType==='polygon' && Array.isArray(derived.pointsMm) && derived.pointsMm.length>=3){
    return derived.pointsMm.map(point=>({x:center.x+mmToPx(point.x-origin.x),y:center.y+mmToPx(point.y-origin.y)}));
  }
  const width=mmToPx(derived.widthMm||20);
  const depth=mmToPx(derived.depthMm||20);
  return [
    {x:center.x-width/2,y:center.y-depth/2},
    {x:center.x+width/2,y:center.y-depth/2},
    {x:center.x+width/2,y:center.y+depth/2},
    {x:center.x-width/2,y:center.y+depth/2}
  ];
}
