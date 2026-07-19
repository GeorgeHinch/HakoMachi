export function createSite3DObjectTagging({ THREE, trackAccessoryLabel }) {
  function tagObject(object, item, prefix, fallbackName) {
    if (!object || !item) return object;
    const idKey = `sitePlanner${prefix}Id`;
    const nameKey = `sitePlanner${prefix}Name`;
    const name = item.name || fallbackName;
    object.userData = object.userData || {};
    object.userData[idKey] = item.id;
    object.userData[nameKey] = name;
    object.traverse?.(child => {
      child.userData = child.userData || {};
      child.userData[idKey] = item.id;
      child.userData[nameKey] = name;
    });
    return object;
  }

  const tagSite3DBuilding = (group, building) => tagObject(group, building, 'Building', 'Building');
  const tagSite3DStlObject = (group, object) => tagObject(group, object, 'StlObject', 'STL Object');
  const tagSite3DRoadObject = (object, road) => tagObject(object, road, 'Road', 'Road');
  const tagSite3DTrackObject = (object, track) => tagObject(object, track, 'Track', 'Track');
  const tagSite3DRoadFeatureObject = (object, feature) => tagObject(object, feature, 'RoadFeature', 'Road item');

  function tagSite3DTrackAccessory(group, item) {
    if (!group || !item) return group;
    if (!group.userData?.sitePlannerTrackAccessoryPickProxy) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .001, depthWrite: false });
      const pick = new THREE.Mesh(new THREE.BoxGeometry(30, 36, 30), material);
      pick.name = `${item.name || trackAccessoryLabel(item.kind)} 3D pick volume`;
      pick.position.y = 18;
      pick.userData.sitePlannerTrackAccessoryPickProxy = true;
      group.add(pick);
    }
    return tagObject(group, item, 'TrackAccessory', trackAccessoryLabel(item.kind));
  }

  return { tagSite3DBuilding, tagSite3DStlObject, tagSite3DTrackAccessory, tagSite3DRoadObject, tagSite3DTrackObject, tagSite3DRoadFeatureObject };
}
