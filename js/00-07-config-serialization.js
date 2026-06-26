'use strict';

/* Current HakoMachi config serialization helpers. */
function serializableCurrentConfig(cfg) {
  const copy = JSON.parse(JSON.stringify(cfg || {}));
  upgradeConfigToCurrentStorage(copy);
  stripLegacyWallBuckets(copy);
  for (const wing of (copy.wings || [])) stripLegacyWallBuckets(wing);
  copy.storageVersion = Math.max(Number(copy.storageVersion) || 0, 2);
  return copy;
}
