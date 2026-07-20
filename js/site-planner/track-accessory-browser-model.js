export const TRACK_ACCESSORY_OBJECT_FILTERS = Object.freeze([
  { key: 'all', label: 'All track items', kinds: null },
  { key: 'sensors', label: 'Sensors', kinds: ['sensor'] },
  { key: 'signals', label: 'Signals', kinds: ['signal', 'occupancyLight'] },
  { key: 'crossings', label: 'Crossing equipment', kinds: ['crossingArm', 'intrusionDetector'] },
  { key: 'catenary', label: 'Catenary', kinds: ['catenarySingleSide', 'catenaryDoublePortal'] },
  { key: 'switches', label: 'Switches', kinds: ['trackSwitchLeft', 'trackSwitchRight', 'trackSwitchTomix1279Left', 'trackSwitchTomix1278Right'] },
  { key: 'buffers', label: 'Buffer stops', kinds: ['trackBufferTomix1428', 'trackBufferTomix1428Catenary'] },
]);

export function createTrackAccessoryBrowserModel({ state, normalizeTrackAccessory }) {
  function trackAccessoryObjectFilterDefinition(key = 'all') {
    return TRACK_ACCESSORY_OBJECT_FILTERS.find((filter) => filter.key === key) || TRACK_ACCESSORY_OBJECT_FILTERS[0];
  }

  function trackAccessoryMatchesObjectFilter(item, filterKey = 'all') {
    const filter = trackAccessoryObjectFilterDefinition(filterKey);
    return !filter.kinds || filter.kinds.includes(item?.kind);
  }

  function trackAccessoryFilterCounts() {
    const items = (state.trackAccessories || []).map(normalizeTrackAccessory);
    return TRACK_ACCESSORY_OBJECT_FILTERS.map((filter) => ({
      ...filter,
      count: filter.kinds ? items.filter((item) => filter.kinds.includes(item.kind)).length : items.length,
    }));
  }

  return { trackAccessoryObjectFilterDefinition, trackAccessoryMatchesObjectFilter, trackAccessoryFilterCounts };
}
