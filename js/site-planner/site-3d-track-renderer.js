export function createSite3DTrackRenderer(deps) {
  const {
    THREE,
    state,
    trackProfileDefaults,
    positiveNumber,
    site3DScale,
    normalizeTrack,
    trackPathSamples,
    trackProfilePx,
    offsetPathPolygon,
    site3DAddRaisedPolygon,
    trackTieSegments,
    tagSite3DTrackObject,
    offsetTrackPath,
    site3DAddBoxSegments,
  } = deps;

  function site3DTrackProfileMm(track, profile) {
    return {
      gauge: Math.max(.1, site3DScale(profile.gauge)),
      railWidth: Math.max(.08, site3DScale(profile.railWidth)),
      railHeight: Math.max(.08, positiveNumber(track.railHeightMm, trackProfileDefaults.railHeightMm) || trackProfileDefaults.railHeightMm),
      tieLength: Math.max(.5, site3DScale(profile.tieLength)),
      tieWidth: Math.max(.12, site3DScale(profile.tieWidth)),
      roadbedHeight: Math.max(.12, positiveNumber(track.roadbedHeightMm, trackProfileDefaults.roadbedHeightMm) || trackProfileDefaults.roadbedHeightMm),
    };
  }

  function buildSite3DTrackGroup(bounds) {
    const group = new THREE.Group();
    group.name = 'Site Planner tracks';
    const roadbedMat = new THREE.MeshStandardMaterial({ color: 0xc7b084, roughness: .96, metalness: 0, transparent: false, opacity: 1, depthTest: true, depthWrite: true, side: THREE.DoubleSide });
    const roadbedLineMat = new THREE.LineBasicMaterial({ color: 0x8f7b55, transparent: true, opacity: .62 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x34312b, roughness: .42, metalness: .18, transparent: false, opacity: 1, depthTest: true, depthWrite: true });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x8a6f43, roughness: .82, metalness: 0, transparent: false, opacity: 1, depthTest: true, depthWrite: true });
    (state.tracks || []).forEach(raw => {
      const track = normalizeTrack(raw);
      if (track.hidden || (track.pointsPx || []).length < 2) return;
      const path = trackPathSamples(track, 18);
      const profile = trackProfilePx(track);
      const profileMm = site3DTrackProfileMm(track, profile);
      const railOffset = profile.gauge / 2;
      const roadbedPoly = offsetPathPolygon(path, profile.roadbedWidth / 2);
      const roadbedTop = profileMm.roadbedHeight;
      const sleeperBase = roadbedTop + .03;
      const sleeperHeight = Math.max(.08, Math.min(.32, profileMm.roadbedHeight * .16));
      const railBase = sleeperBase + sleeperHeight;
      tagSite3DTrackObject(site3DAddRaisedPolygon(group, roadbedPoly, roadbedMat, roadbedLineMat, `${track.name || 'Track'} raised cork roadbed`, roadbedTop, profileMm.roadbedHeight), track);
      tagSite3DTrackObject(site3DAddBoxSegments(group, trackTieSegments(track), tieMat, `${track.name || 'Track'} sleeper solids`, profileMm.tieWidth, sleeperHeight, sleeperBase, bounds), track);
      const railPathA = offsetTrackPath(path, railOffset);
      const railPathB = offsetTrackPath(path, -railOffset);
      const railSegmentsA = railPathA.slice(1).map((point, index) => ({ a: railPathA[index], b: point }));
      const railSegmentsB = railPathB.slice(1).map((point, index) => ({ a: railPathB[index], b: point }));
      tagSite3DTrackObject(site3DAddBoxSegments(group, railSegmentsA, railMat, `${track.name || 'Track'} rail A solids`, profileMm.railWidth, profileMm.railHeight, railBase, bounds), track);
      tagSite3DTrackObject(site3DAddBoxSegments(group, railSegmentsB, railMat, `${track.name || 'Track'} rail B solids`, profileMm.railWidth, profileMm.railHeight, railBase, bounds), track);
    });
    return group.children.length ? group : null;
  }

  return { buildSite3DTrackGroup };
}
