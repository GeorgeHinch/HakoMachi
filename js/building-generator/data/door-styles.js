/* =====================================================================
   DOOR STYLES
   Doors are at the base of the wall (resting on the floor). Each style
   defines its dimensions, optional glass apertures, and surface details
   shown via etched lines on the cladding.
   ===================================================================== */
export const DOOR_STYLES = {
  single: {
    label: 'Single door (solid)',
    description: 'Plain solid single door. Office or service entrance.',
    width: 7, height: 18,
    glassPanes: [],
    features: [
      { type: 'panel', x1: 1.2, y1: 2, x2: 5.8, y2: 9 },
      { type: 'panel', x1: 1.2, y1: 10, x2: 5.8, y2: 16 },
      { type: 'knob',  cx: 5.6, cy: 9.5, r: 0.35 },
    ],
  },
  single_glass: {
    label: 'Single glass door',
    description: 'Single door with upper glass panel. Office and shop entrances.',
    width: 7, height: 18,
    glassPanes: [{ x1: 1.2, y1: 2, x2: 5.8, y2: 10 }],
    features: [
      { type: 'panel', x1: 1.2, y1: 11, x2: 5.8, y2: 16 },
      { type: 'knob',  cx: 5.6, cy: 10.5, r: 0.35 },
    ],
  },
  single_full_glass: {
    label: 'Single full-glass door',
    description: 'Glass door with thin frame. Storefronts.',
    width: 7, height: 18,
    glassPanes: [{ x1: 1.2, y1: 1.5, x2: 5.8, y2: 16.5 }],
    features: [
      { type: 'handle', x1: 5.4, y1: 6, x2: 5.4, y2: 12 },
    ],
  },
  double: {
    label: 'Double door (solid)',
    description: 'Two-leaf solid door. Service entrances, warehouses.',
    width: 12, height: 18,
    glassPanes: [],
    centerSplit: true,
    features: [
      { type: 'panel', x1: 0.9, y1: 2, x2: 5.4, y2: 9 },
      { type: 'panel', x1: 0.9, y1: 10, x2: 5.4, y2: 16 },
      { type: 'panel', x1: 6.6, y1: 2, x2: 11.1, y2: 9 },
      { type: 'panel', x1: 6.6, y1: 10, x2: 11.1, y2: 16 },
      { type: 'knob',  cx: 5.4, cy: 9.5, r: 0.32 },
      { type: 'knob',  cx: 6.6, cy: 9.5, r: 0.32 },
    ],
  },
  double_glass: {
    label: 'Double glass door',
    description: 'Two-leaf doors with glass tops. Office and commercial entrances.',
    width: 12, height: 18,
    glassPanes: [
      { x1: 1.2, y1: 2, x2: 4.8, y2: 10 },
      { x1: 7.2, y1: 2, x2: 10.8, y2: 10 },
    ],
    centerSplit: true,
    features: [
      { type: 'panel', x1: 0.9, y1: 11, x2: 5.4, y2: 16 },
      { type: 'panel', x1: 6.6, y1: 11, x2: 11.1, y2: 16 },
      { type: 'knob',  cx: 5.4, cy: 13, r: 0.32 },
      { type: 'knob',  cx: 6.6, cy: 13, r: 0.32 },
    ],
  },
  double_full_glass: {
    label: 'Double full-glass door',
    description: 'Two glass-leaf doors with thin frames. Modern shop fronts.',
    width: 12, height: 18,
    glassPanes: [
      { x1: 1.2, y1: 1.5, x2: 5.2, y2: 16.5 },
      { x1: 6.8, y1: 1.5, x2: 10.8, y2: 16.5 },
    ],
    centerSplit: true,
    features: [
      { type: 'handle', x1: 5.4, y1: 7, x2: 5.4, y2: 11 },
      { type: 'handle', x1: 6.6, y1: 7, x2: 6.6, y2: 11 },
    ],
  },
  rolling: {
    label: 'Rolling shutter',
    description: 'Roll-up metal door for shops and small workshops.',
    width: 14, height: 22,
    glassPanes: [],
    rollingSlats: true,
    features: [
      { type: 'lockPlate', x1: 6.3, y1: 20.2, x2: 7.7, y2: 21.4 },
    ],
  },
  sliding_glass: {
    label: 'Sliding glass entrance',
    description: 'Wide sliding glass entrance, automatic-style. Modern shops and offices.',
    width: 16, height: 20,
    glassPanes: [
      { x1: 1.2, y1: 1.2, x2: 7.4, y2: 18.8 },
      { x1: 8.6, y1: 1.2, x2: 14.8, y2: 18.8 },
    ],
    features: [
      { type: 'track',  y: 0.8 },
      { type: 'track',  y: 19.2 },
      { type: 'handle', x1: 6.6, y1: 8, x2: 6.6, y2: 12 },
      { type: 'handle', x1: 9.4, y1: 8, x2: 9.4, y2: 12 },
    ],
  },
  single_metal_exterior_handle: {
    label: 'Industrial metal door w/ outside handle',
    description: 'Plain steel personnel door with exterior pull handle, lock plate, hinge edge, and bottom kick plate. Good for factory/service entries where the outside face is visible.',
    width: 7, height: 18,
    glassPanes: [],
    frameColor: '#4f5b62',
    panelFill: '#87939a',
    features: [
      { type: 'panel',     x1: 0.7, y1: 0.9,  x2: 6.3, y2: 17.1 },
      { type: 'handle',    x1: 5.65, y1: 7.0, x2: 5.65, y2: 12.0 },
      { type: 'lockPlate', x1: 5.25, y1: 9.1, x2: 6.05, y2: 10.5 },
      { type: 'kickPlate', x1: 0.7, y1: 15.3, x2: 6.3, y2: 17.1 },
      { type: 'rail',      x1: 0.65, y1: 2.0,  x2: 0.65, y2: 4.0,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 7.6,  x2: 0.65, y2: 9.6,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 13.2, x2: 0.65, y2: 15.2, thick: true },
    ],
  },
  single_metal_window: {
    label: 'Metal service door w/ small window',
    description: 'Steel service door with a small wired-glass lite near the top, exterior handle, lock plate, hinge edge, and kick plate. Great for industrial side entries and stair exits.',
    width: 7, height: 18,
    glassPanes: [{ x1: 1.7, y1: 2.0, x2: 5.3, y2: 6.0 }],
    frameColor: '#55616a',
    panelFill: '#8a959b',
    glassFill: 'rgba(210,230,238,0.90)',
    features: [
      { type: 'panel',     x1: 0.7, y1: 0.9,  x2: 6.3, y2: 17.1 },
      { type: 'kickPlate', x1: 0.7, y1: 15.3, x2: 6.3, y2: 17.1 },
      { type: 'handle',    x1: 5.65, y1: 8.0, x2: 5.65, y2: 12.4 },
      { type: 'lockPlate', x1: 5.25, y1: 9.4, x2: 6.05, y2: 10.7 },
      { type: 'rail',      x1: 0.65, y1: 2.0,  x2: 0.65, y2: 4.0,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 7.6,  x2: 0.65, y2: 9.6,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 13.2, x2: 0.65, y2: 15.2, thick: true },
    ],
  },
  single_louvered_utility: {
    label: 'Louvered utility door',
    description: 'Industrial utility/mechanical-room door with stacked horizontal louvers, exterior handle, and kick plate.',
    width: 7, height: 18,
    glassPanes: [],
    frameColor: '#56626a',
    panelFill: '#838d94',
    features: [
      { type: 'panel',     x1: 0.7, y1: 0.9,  x2: 6.3, y2: 17.1 },
      { type: 'rail',      x1: 1.3, y1: 4.8,  x2: 5.7, y2: 4.8 },
      { type: 'rail',      x1: 1.3, y1: 5.7,  x2: 5.7, y2: 5.7 },
      { type: 'rail',      x1: 1.3, y1: 6.6,  x2: 5.7, y2: 6.6 },
      { type: 'rail',      x1: 1.3, y1: 7.5,  x2: 5.7, y2: 7.5 },
      { type: 'rail',      x1: 1.3, y1: 8.4,  x2: 5.7, y2: 8.4 },
      { type: 'rail',      x1: 1.3, y1: 9.3,  x2: 5.7, y2: 9.3 },
      { type: 'rail',      x1: 1.3, y1: 10.2, x2: 5.7, y2: 10.2 },
      { type: 'handle',    x1: 5.65, y1: 11.0, x2: 5.65, y2: 14.0 },
      { type: 'lockPlate', x1: 5.2, y1: 11.9, x2: 6.0, y2: 13.2 },
      { type: 'kickPlate', x1: 0.7, y1: 15.3, x2: 6.3, y2: 17.1 },
      { type: 'rail',      x1: 0.65, y1: 2.0,  x2: 0.65, y2: 4.0,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 7.6,  x2: 0.65, y2: 9.6,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 13.2, x2: 0.65, y2: 15.2, thick: true },
    ],
  },
  double_metal_exterior_handle: {
    label: 'Double metal doors w/ outside handles',
    description: 'Two-leaf industrial metal access doors with exterior pull handles, lock plates, kick plates, and hinge-edge marks.',
    width: 12, height: 18,
    glassPanes: [],
    centerSplit: true,
    frameColor: '#4f5c65',
    panelFill: '#879298',
    features: [
      { type: 'panel',     x1: 0.7, y1: 0.9,  x2: 5.7,  y2: 17.1 },
      { type: 'panel',     x1: 6.3, y1: 0.9,  x2: 11.3, y2: 17.1 },
      { type: 'handle',    x1: 5.1, y1: 7.0,  x2: 5.1,  y2: 12.0 },
      { type: 'handle',    x1: 6.9, y1: 7.0,  x2: 6.9,  y2: 12.0 },
      { type: 'lockPlate', x1: 4.7, y1: 9.1,  x2: 5.5,  y2: 10.5 },
      { type: 'lockPlate', x1: 6.5, y1: 9.1,  x2: 7.3,  y2: 10.5 },
      { type: 'kickPlate', x1: 0.7, y1: 15.3, x2: 5.7,  y2: 17.1 },
      { type: 'kickPlate', x1: 6.3, y1: 15.3, x2: 11.3, y2: 17.1 },
      { type: 'rail',      x1: 0.65, y1: 2.0,  x2: 0.65, y2: 4.0,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 7.6,  x2: 0.65, y2: 9.6,  thick: true },
      { type: 'rail',      x1: 0.65, y1: 13.2, x2: 0.65, y2: 15.2, thick: true },
      { type: 'rail',      x1: 11.35, y1: 2.0,  x2: 11.35, y2: 4.0,  thick: true },
      { type: 'rail',      x1: 11.35, y1: 7.6,  x2: 11.35, y2: 9.6,  thick: true },
      { type: 'rail',      x1: 11.35, y1: 13.2, x2: 11.35, y2: 15.2, thick: true },
    ],
  },
  single_industrial: {
    label: 'Single industrial w/ crash bar',
    description: 'Solid industrial door with push-bar exit hardware. Warehouses, fire exits, schools.',
    width: 7, height: 18,
    glassPanes: [],
    features: [
      { type: 'crashBar',  y: 11, x1: 0.7, x2: 6.3 },
      { type: 'kickPlate', x1: 0.5, y1: 15.5, x2: 6.5, y2: 17.5 },
    ],
  },
  double_industrial: {
    label: 'Double industrial w/ crash bar',
    description: 'Two-leaf solid industrial door with push-bar exit hardware on each leaf.',
    width: 12, height: 18,
    glassPanes: [],
    centerSplit: true,
    features: [
      { type: 'crashBar',  y: 11, x1: 0.7, x2: 5.3 },
      { type: 'crashBar',  y: 11, x1: 6.7, x2: 11.3 },
      { type: 'kickPlate', x1: 0.5, y1: 15.5, x2: 5.5, y2: 17.5 },
      { type: 'kickPlate', x1: 6.5, y1: 15.5, x2: 11.5, y2: 17.5 },
    ],
  },

  /* ---- Japanese door types ----
   * Three optional preview-rendering hints carry per-style colour identity
   * so toolbox / editor / laser-etched insert all match visually:
   *   frameColor → stroke for outer body + all etched features
   *   panelFill  → fill for the solid door body
   *   glassFill  → fill for glass apertures (defaults to clear blue)
   * `frameMaterial` (e.g. 'plaster') overrides the cut material at laser
   * time — kura-do is cut from plaster card rather than basswood cladding.
   */
  apartment_service_jp: {
    label: 'Japanese aluminum service/apartment door',
    description: 'Common Japanese aluminum apartment/service door with mail slot/vent box, small peep detail, lever pull, and top closer rail.',
    width: 7, height: 18,
    glassPanes: [],
    frameColor: '#6e767d',
    panelFill: 'rgba(196,201,205,0.96)',
    features: [
      { type: 'panel',     x1: 0.6, y1: 0.8,  x2: 6.4, y2: 17.2 },
      { type: 'rail',      x1: 0.8, y1: 1.3,  x2: 6.2, y2: 1.3, thick: true },
      { type: 'panel',     x1: 1.2, y1: 4.3,  x2: 5.8, y2: 6.4 },
      { type: 'rail',      x1: 1.5, y1: 4.95, x2: 5.5, y2: 4.95 },
      { type: 'rail',      x1: 1.5, y1: 5.45, x2: 5.5, y2: 5.45 },
      { type: 'stud',      cx: 4.7, cy: 8.3,  r: 0.16 },
      { type: 'handle',    x1: 5.45, y1: 9.2, x2: 5.45, y2: 12.4 },
      { type: 'lockPlate', x1: 5.05, y1: 10.0, x2: 5.8, y2: 11.2 },
      { type: 'kickPlate', x1: 0.9, y1: 15.1, x2: 6.1, y2: 17.0 },
    ],
  },
  koshi_do: {
    label: 'Koshi-do (格子戸)',
    description: 'Vertical wooden lattice door with top rail and bottom kick panel. Iconic machiya shopfront.',
    width: 7, height: 18,
    glassPanes: [],
    frameColor: '#5a3a1a',
    panelFill:  'rgba(186,148,98,0.88)',
    features: [
      { type: 'rail',            x1: 0.4, y1: 1.6,  x2: 6.6, y2: 1.6,  thick: true },
      { type: 'panel',           x1: 0.4, y1: 14.5, x2: 6.6, y2: 17.6 },
      { type: 'latticeVertical', x1: 0.5, y1: 1.7,  x2: 6.5, y2: 14.4 },
      { type: 'hikite',          x1: 5.6, y1: 8.5,  x2: 6.2, y2: 10.0 },
    ],
  },
  koshi_do_glass: {
    label: 'Koshi-do with glass (格子戸・ガラス入り)',
    description: 'Modern koshi-do with a glass-backed lattice — see-through interior visible through the bars.',
    width: 7, height: 18,
    // Glass aperture covers the lattice region; bars are etched on top.
    glassPanes: [{ x1: 0.5, y1: 1.7, x2: 6.5, y2: 14.4 }],
    frameColor: '#5a3a1a',
    panelFill:  'rgba(186,148,98,0.88)',
    glassFill:  'rgba(252,245,225,0.92)',  // paper-tinted glass behind the lattice
    features: [
      { type: 'rail',            x1: 0.4, y1: 1.6,  x2: 6.6, y2: 1.6,  thick: true },
      { type: 'panel',           x1: 0.4, y1: 14.5, x2: 6.6, y2: 17.6 },
      { type: 'latticeVertical', x1: 0.5, y1: 1.7,  x2: 6.5, y2: 14.4 },
      { type: 'hikite',          x1: 5.6, y1: 8.5,  x2: 6.2, y2: 10.0 },
    ],
  },
  koshi_do_double: {
    label: 'Koshi-do double (両開き格子戸)',
    description: 'Two-leaf koshi-do for wider entrances. Sake shops, tea houses, ryokan main entries.',
    width: 12, height: 18,
    glassPanes: [],
    centerSplit: true,
    frameColor: '#5a3a1a',
    panelFill:  'rgba(186,148,98,0.88)',
    features: [
      { type: 'rail',            x1: 0.4, y1: 1.6,  x2: 11.6, y2: 1.6,  thick: true },
      { type: 'panel',           x1: 0.4, y1: 14.5, x2: 5.8,  y2: 17.6 },
      { type: 'panel',           x1: 6.2, y1: 14.5, x2: 11.6, y2: 17.6 },
      { type: 'latticeVertical', x1: 0.5, y1: 1.7,  x2: 5.7,  y2: 14.4 },
      { type: 'latticeVertical', x1: 6.3, y1: 1.7,  x2: 11.5, y2: 14.4 },
    ],
  },
  sliding_shoji: {
    label: 'Sliding shoji (障子引戸)',
    description: 'Two-leaf sliding entry with kumiko grid and paper/frosted glass. Modern Japanese shop and home entries.',
    width: 14, height: 18,
    // Each leaf is a full glass aperture with kumiko etched on top.
    glassPanes: [
      { x1: 0.3, y1: 0.9, x2: 6.9,  y2: 17.1 },
      { x1: 7.1, y1: 0.9, x2: 13.7, y2: 17.1 },
    ],
    centerSplit: true,
    frameColor: '#6a4a2a',
    panelFill:  'rgba(252,245,225,0.92)',
    glassFill:  'rgba(252,245,225,0.92)',  // paper-tinted glass — uniform appearance
    features: [
      { type: 'track',        y: 0.8 },
      { type: 'track',        y: 17.2 },
      { type: 'latticeGrid',  x1: 0.3, y1: 0.9, x2: 6.9,  y2: 17.1, targetCell: 3.5 },
      { type: 'latticeGrid',  x1: 7.1, y1: 0.9, x2: 13.7, y2: 17.1, targetCell: 3.5 },
      { type: 'hikite',       x1: 6.0, y1: 8.5, x2: 6.7,  y2: 10.0 },
      { type: 'hikite',       x1: 7.3, y1: 8.5, x2: 8.0,  y2: 10.0 },
    ],
  },
  itado: {
    label: 'Itado (板戸)',
    description: 'Heavy vertical-plank wooden door with iron-studded rails. Storehouses, service entries, alley doors.',
    width: 7, height: 18,
    glassPanes: [],
    frameColor: '#3a2410',
    panelFill:  'rgba(140,100,60,0.92)',
    features: [
      { type: 'rail',       x1: 0.4, y1: 2.0,  x2: 6.6, y2: 2.0,  thick: true },
      { type: 'rail',       x1: 0.4, y1: 9.0,  x2: 6.6, y2: 9.0,  thick: true },
      { type: 'rail',       x1: 0.4, y1: 16.0, x2: 6.6, y2: 16.0, thick: true },
      { type: 'plankSeams', x1: 0.4, y1: 0.4,  x2: 6.6, y2: 17.6, count: 5 },
      // Iron studs at top + bottom rail intersections (4 each)
      { type: 'stud', cx: 1.5, cy: 2.0,  r: 0.16 },
      { type: 'stud', cx: 2.8, cy: 2.0,  r: 0.16 },
      { type: 'stud', cx: 4.1, cy: 2.0,  r: 0.16 },
      { type: 'stud', cx: 5.4, cy: 2.0,  r: 0.16 },
      { type: 'stud', cx: 1.5, cy: 16.0, r: 0.16 },
      { type: 'stud', cx: 2.8, cy: 16.0, r: 0.16 },
      { type: 'stud', cx: 4.1, cy: 16.0, r: 0.16 },
      { type: 'stud', cx: 5.4, cy: 16.0, r: 0.16 },
    ],
  },
  kura_do: {
    label: 'Kura-do (蔵戸)',
    description: 'Thick plaster-clad storehouse door with iron banding and studs. Reuses the plaster material.',
    width: 9, height: 18,
    glassPanes: [],
    frameColor: '#5a4a3a',
    panelFill:  'rgba(232,224,208,0.96)',
    frameMaterial: 'plaster',
    features: [
      // Inset frame outline
      { type: 'panel',    x1: 0.7, y1: 0.7,  x2: 8.3, y2: 17.3 },
      // Iron banding (horizontal top + bottom, vertical centre)
      { type: 'ironBand', x1: 0.7, y1: 3.2,  x2: 8.3, y2: 3.7 },
      { type: 'ironBand', x1: 0.7, y1: 14.3, x2: 8.3, y2: 14.8 },
      { type: 'ironBand', x1: 4.25, y1: 0.7, x2: 4.75, y2: 17.3 },
      // Iron studs at the four corners of the banding
      { type: 'stud', cx: 2.0, cy: 3.45,  r: 0.2 },
      { type: 'stud', cx: 3.5, cy: 3.45,  r: 0.2 },
      { type: 'stud', cx: 5.5, cy: 3.45,  r: 0.2 },
      { type: 'stud', cx: 7.0, cy: 3.45,  r: 0.2 },
      { type: 'stud', cx: 2.0, cy: 14.55, r: 0.2 },
      { type: 'stud', cx: 3.5, cy: 14.55, r: 0.2 },
      { type: 'stud', cx: 5.5, cy: 14.55, r: 0.2 },
      { type: 'stud', cx: 7.0, cy: 14.55, r: 0.2 },
      // Lock plate
      { type: 'lockPlate', x1: 6.0, y1: 8.5, x2: 7.2, y2: 9.8 },
    ],
  },
  yotsume_koshi_do: {
    label: 'Yotsume-gōshi-do (四つ目格子戸)',
    description: 'Square-lattice variant of koshi-do — "four-eye" grid. Tea houses, formal residences.',
    width: 7, height: 18,
    glassPanes: [],
    frameColor: '#5a3a1a',
    panelFill:  'rgba(186,148,98,0.88)',
    features: [
      { type: 'rail',         x1: 0.4, y1: 1.6,  x2: 6.6, y2: 1.6,  thick: true },
      { type: 'panel',        x1: 0.4, y1: 14.5, x2: 6.6, y2: 17.6 },
      { type: 'latticeGrid',  x1: 0.4, y1: 1.7,  x2: 6.6, y2: 14.4, targetCell: 2.5 },
    ],
  },
};

/** True when the door style has at least one glass pane → needs a core cut-through.
 *  Solid doors (no glass) only need a cladding cutout, not a core hole. */
export function doorHasGlass(styleKey) {
  const spec = DOOR_STYLES[styleKey];
  return spec && Array.isArray(spec.glassPanes) && spec.glassPanes.length > 0;
}

/** Forbidden-zone list for bottom-tongue placement.
 *
 *  Two conditions must BOTH hold for a door to block the bottom edge:
 *    (1) the style requires a wall-core cutout (glass door), so the door
 *        actually breaks the wall material rather than just gluing a
 *        cladding insert onto an intact surface; AND
 *    (2) the door reaches the bottom of the wall (op.y + op.h ≥ wallH),
 *        so its cutout actually intersects the ground-level band where
 *        bottom tongues live. A glass door floating in the middle of a
 *        two-storey wall leaves the lower wall material continuous; a
 *        bottom tongue can pass under it without intersecting anything.
 *
 *  Both criteria are necessary. Drop (1) and solid doors get treated as
 *  obstacles even though they don't cut the core; drop (2) and upper-floor
 *  glass doors interfere with ground-floor tongue spacing they don't
 *  physically touch. The earlier version of this helper only checked (1).
 *
 *  Each door's `style` field is used when present, falling back to the
 *  global `cfg.doorStyle` (which is what auto-generated doors carry when
 *  they don't store a per-door style). Both manual ops (`w`,`h`) and
 *  computeDoors output (`width`,`height`) are accepted. wallH may be
 *  omitted; in that case (2) is skipped — included for callers that
 *  haven't been threaded the value yet, conservatively keeping the door
 *  in the forbidden list. The +/-2 mm padding around the door footprint
 *  matches the rest of the forbidden-zone code. */
export function bottomTongueForbiddenZones(doors, cfg, wallH) {
  return doors
    .filter(d => {
      if (!doorHasGlass(d.style || (cfg && cfg.doorStyle))) return false;
      if (!wallH) return true;
      const doorY = d.y || 0;
      const doorH = (d.h !== undefined ? d.h : d.height) || 0;
      return (doorY + doorH) >= wallH - 0.1;
    })
    .map(d => [d.x - 2, d.x + (d.w !== undefined ? d.w : d.width) + 2]);
}

/** Cut per-aperture core-wall holes for a glass door's glass panes.
 *
 *  Follows the same sandwich pattern as windows:
 *    - core hole = visible glass aperture + 1 mm overlap on each side
 *    - glass pane (oversized by 0.9 mm each side after fit clearance) slots
 *      into the core hole and is glued to the lip
 *    - the door insert (cladding-level) then glues on top of the glass and
 *      its smaller cladding aperture reveals only the visible glass area
 *
 *  Solid doors produce no core cut at all — the cladding insert glues
 *  directly to the wall surface.
 *
 *  Aperture coordinates are scaled from the base DOOR_STYLES dims to the
 *  opening's actual w/h, and X-mirrored if the wall stores X right-to-left
 *  (east side wall internal-view convention).
 */
export function cutDoorCoreHoles(rects, x, y, w, h, style, mirrorX) {
  if (!doorHasGlass(style)) return;
  const spec = DOOR_STYLES[style];
  if (!spec || !Array.isArray(spec.glassPanes) || spec.glassPanes.length === 0) return;
  const sx = w / spec.width;
  const sy = h / spec.height;
  for (const gp of spec.glassPanes) {
    let lx1 = gp.x1 * sx, lx2 = gp.x2 * sx;
    const ly1 = gp.y1 * sy, ly2 = gp.y2 * sy;
    if (mirrorX) {
      const t = lx1; lx1 = w - lx2; lx2 = w - t;
    }
    rects.push({
      type: 'cut',
      x: x + lx1 - 1,
      y: y + ly1 - 1,
      w: (lx2 - lx1) + 2,
      h: (ly2 - ly1) + 2,
      compensateKerf: false,
    });
  }
}

/** Expand a door style's feature list into a flat array of primitive shapes
 *  in door-local mm coordinates (0..width × 0..height).
 *
 *  Used by three consumers so the toolbox icon, the editor canvas, and the
 *  laser-etched insert are always identical:
 *    - oePopulateToolbox renders these as inline SVG inside each door card.
 *    - oeRender renders them on top of the door rectangle on the wall canvas.
 *    - generateDoorInserts converts them into etched lines + outline rects
 *      on the cladding insert.
 *
 *  Primitive shapes returned:
 *    { type: 'rect', x, y, w, h, tint? }     outline rectangle (optional tinted fill in preview)
 *    { type: 'line', x1, y1, x2, y2, thick? } line segment
 *    { type: 'circle', cx, cy, r, fill? }   circle (filled = solid disc for knobs)
 *
 *  Feature → shape mapping (semantics of each feature kept in one place):
 *    panel      → 1 outline rect
 *    knob       → 1 filled circle
 *    handle     → 1 thick line
 *    crashBar   → 1 tinted thin rect (the bar) + 2 outline rects (end brackets)
 *    kickPlate  → 1 outline rect
 *    lockPlate  → 1 outline rect
 *    track      → 1 line spanning the door
 *  Plus the boolean style flags:
 *    centerSplit  → 1 vertical line at x = width/2
 *    rollingSlats → 1 tinted drum-band rect + N horizontal slat lines
 */
export function doorFeatureShapes(spec) {
  if (!spec) return [];
  const out = [];
  const W = spec.width, H = spec.height;

  if (spec.centerSplit) {
    out.push({ type: 'line', x1: W / 2, y1: 0.5, x2: W / 2, y2: H - 0.5 });
  }

  if (spec.rollingSlats) {
    out.push({ type: 'rect', x: 0.2, y: 0.2, w: W - 0.4, h: 1.5, tint: true });
    const spacing = 1.5;
    for (let y = 3; y < H - 0.6; y += spacing) {
      out.push({ type: 'line', x1: 0.5, y1: y, x2: W - 0.5, y2: y });
    }
  }

  for (const f of (spec.features || [])) {
    switch (f.type) {
      case 'panel':
        out.push({ type: 'rect', x: f.x1, y: f.y1, w: f.x2 - f.x1, h: f.y2 - f.y1 });
        break;
      case 'knob':
        out.push({ type: 'circle', cx: f.cx, cy: f.cy, r: f.r, fill: true });
        break;
      case 'handle':
        out.push({ type: 'line', x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, thick: true });
        break;
      case 'crashBar': {
        const inset = 0.7;
        out.push({ type: 'rect', x: f.x1 + inset, y: f.y - 0.3, w: (f.x2 - f.x1) - inset * 2, h: 0.6, tint: true });
        out.push({ type: 'rect', x: f.x1,         y: f.y - 0.6, w: inset, h: 1.2 });
        out.push({ type: 'rect', x: f.x2 - inset, y: f.y - 0.6, w: inset, h: 1.2 });
        break;
      }
      case 'kickPlate':
      case 'lockPlate':
        out.push({ type: 'rect', x: f.x1, y: f.y1, w: f.x2 - f.x1, h: f.y2 - f.y1 });
        break;
      case 'track':
        out.push({ type: 'line', x1: 0.4, y1: f.y, x2: W - 0.4, y2: f.y });
        break;
      case 'rail':
        // Plain etched line (horizontal or vertical), used for top rails on
        // Japanese doors. Optional thick=true for a heavier visual weight.
        out.push({ type: 'line', x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2, thick: !!f.thick });
        break;
      case 'latticeVertical': {
        // N vertical etched bars across {f.x1..f.x2} × {f.y1..f.y2}. Bar
        // count is picked from the available width to match the renji-mado
        // window engine. Bars are etched (no kerf concern).
        const usable = f.x2 - f.x1;
        const n = Math.max(3, Math.min(12, Math.floor(usable / 0.9)));
        const pitch = usable / (n + 1);
        for (let i = 1; i <= n; i++) {
          const x = f.x1 + i * pitch;
          out.push({ type: 'line', x1: x, y1: f.y1, x2: x, y2: f.y2 });
        }
        break;
      }
      case 'latticeGrid': {
        // Cell grid across {f.x1..f.x2} × {f.y1..f.y2}. Cell size targets
        // ~2.5 mm by default; override with f.targetCell. Used by sliding
        // shoji and yotsume-gōshi.
        const targetCell = f.targetCell || 2.5;
        const cols = Math.max(2, Math.round((f.x2 - f.x1) / targetCell));
        const rows = Math.max(2, Math.round((f.y2 - f.y1) / targetCell));
        for (let c = 1; c < cols; c++) {
          const x = f.x1 + (c / cols) * (f.x2 - f.x1);
          out.push({ type: 'line', x1: x, y1: f.y1, x2: x, y2: f.y2 });
        }
        for (let r = 1; r < rows; r++) {
          const y = f.y1 + (r / rows) * (f.y2 - f.y1);
          out.push({ type: 'line', x1: f.x1, y1: y, x2: f.x2, y2: y });
        }
        break;
      }
      case 'plankSeams': {
        // N-1 vertical etched lines dividing {f.x1..f.x2} into N planks,
        // running between {f.y1..f.y2}. Used by itado.
        const usable = f.x2 - f.x1;
        const count = f.count || Math.max(3, Math.floor(usable / 1.5));
        for (let i = 1; i < count; i++) {
          const x = f.x1 + (i / count) * usable;
          out.push({ type: 'line', x1: x, y1: f.y1, x2: x, y2: f.y2 });
        }
        break;
      }
      case 'ironBand':
        // Thin filled rect used for the visible iron banding on kura-do.
        out.push({ type: 'rect', x: f.x1, y: f.y1, w: f.x2 - f.x1, h: f.y2 - f.y1, tint: true });
        break;
      case 'stud':
        // Small filled circle (iron stud on plank / kura door).
        out.push({ type: 'circle', cx: f.cx, cy: f.cy, r: f.r || 0.18, fill: true });
        break;
      case 'hikite':
        // Recessed pull handle on traditional Japanese sliding doors —
        // rendered as a small etched rectangle outline.
        out.push({ type: 'rect', x: f.x1, y: f.y1, w: f.x2 - f.x1, h: f.y2 - f.y1 });
        break;
      case 'horizontalRails': {
        // Many parallel horizontal etched lines, count auto-picked from
        // height range. Used by sudare (bamboo blind) and similar
        // densely-banded fixtures.
        const startY = f.y1, endY = f.y2;
        const spacing = f.spacing || 0.45;
        const span = endY - startY;
        const n = Math.max(2, Math.floor(span / spacing));
        const pitch = span / (n + 1);
        for (let i = 1; i <= n; i++) {
          const y = startY + i * pitch;
          out.push({ type: 'line', x1: f.x1, y1: y, x2: f.x2, y2: y });
        }
        break;
      }
    }
  }
  return out;
}

/** Emit SVG markup for the given door-local shapes. Used by the toolbox card
 *  and the editor canvas. `s` is the input→output unit scale (e.g. px/mm),
 *  `ox`/`oy` translate the shapes' origin into the output coordinate space.
 *  Stroke widths are given in OUTPUT units (so the caller picks pixels or
 *  mm depending on what the surrounding SVG uses).
 */
export function emitDoorShapesSvg(shapes, ox, oy, s, opts) {
  opts = opts || {};
  const stroke    = opts.stroke    || '#c84a3a';
  const knobFill  = opts.knobFill  || '#4a3a30';
  const tintFill  = opts.tintFill  || 'rgba(200,74,58,0.18)';
  const sw        = (opts.strokeWidth != null) ? opts.strokeWidth : 0.3;
  const swThick   = (opts.thickStrokeWidth != null) ? opts.thickStrokeWidth : sw * 1.4;
  const pe        = opts.pointerEvents ? '' : ' pointer-events="none"';

  let svg = '';
  for (const sh of shapes) {
    if (sh.type === 'rect') {
      const x = (ox + sh.x * s).toFixed(2);
      const y = (oy + sh.y * s).toFixed(2);
      const w = (sh.w * s).toFixed(2);
      const h = (sh.h * s).toFixed(2);
      const fill = sh.tint ? tintFill : 'none';
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${pe}/>`;
    } else if (sh.type === 'line') {
      const x1 = (ox + sh.x1 * s).toFixed(2);
      const y1 = (oy + sh.y1 * s).toFixed(2);
      const x2 = (ox + sh.x2 * s).toFixed(2);
      const y2 = (oy + sh.y2 * s).toFixed(2);
      const w  = sh.thick ? swThick : sw;
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"${pe}/>`;
    } else if (sh.type === 'circle') {
      const cx = (ox + sh.cx * s).toFixed(2);
      const cy = (oy + sh.cy * s).toFixed(2);
      const r  = (sh.r * s).toFixed(2);
      const fill = sh.fill ? knobFill : 'none';
      const st   = sh.fill ? 'none'    : stroke;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${st}" stroke-width="${sw}"${pe}/>`;
    }
  }
  return svg;
}

/* Build the inline SVG body for a door preview. Used by the toolbox card and
 * the editor canvas, so both show the actual style-specific door (body fill,
 * glass apertures, etched features) rather than diverging. Mirrors the
 * windows' `buildWindowSvgBody` so doors get the same per-style colour
 * identity (frameColor / panelFill / glassFill) — Western doors fall through
 * to the existing orange-cream defaults.
 *
 * Output coordinates use the spec's mm units, scaled to (w, h) for any
 * custom-sized door. Caller wraps in <svg viewBox> or <g transform> as needed.
 */
export function buildDoorSvgBody(style, w, h, opts) {
  if (!style) return '';
  opts = opts || {};
  const styleScale  = w / style.width;
  const styleScaleY = h / style.height;
  // Per-style colour identity. Japanese doors override; Western doors use
  // the existing defaults via the `||` fallbacks.
  const frameColor = style.frameColor || '#c84a3a';
  const panelFill  = style.panelFill  || 'rgba(245,185,130,0.85)';
  const glassFill  = style.glassFill  || 'rgba(160,205,245,0.85)';
  const glassStroke = style.glassFill ? frameColor : '#2a64aa';
  const sw         = (opts.strokeWidth      != null) ? opts.strokeWidth      : 0.3;
  const swThick    = (opts.thickStrokeWidth != null) ? opts.thickStrokeWidth : 0.4;
  const glassSw    = (opts.glassStrokeWidth != null) ? opts.glassStrokeWidth : 0.25;
  // Tint fill — used by rolling-shutter drum band, crash-bar bar etc.
  // Defaults to a translucent dark on Japanese doors (better against the
  // brown body) and the original reddish wash on Western doors.
  const tintFill = opts.tintFill || (style.frameColor ? 'rgba(0,0,0,0.32)' : 'rgba(200,74,58,0.18)');

  // 1. Door body
  let svg = `<rect x="0.2" y="0.2" width="${(w-0.4).toFixed(2)}" height="${(h-0.4).toFixed(2)}"`
          + ` fill="${panelFill}" stroke="${frameColor}" stroke-width="${sw}"/>`;

  // 2. Glass apertures (scaled into target size)
  for (const gp of (style.glassPanes || [])) {
    const gx = gp.x1 * styleScale, gy = gp.y1 * styleScaleY;
    const gw = (gp.x2 - gp.x1) * styleScale, gh = (gp.y2 - gp.y1) * styleScaleY;
    svg += `<rect x="${gx.toFixed(2)}" y="${gy.toFixed(2)}" width="${gw.toFixed(2)}" height="${gh.toFixed(2)}"`
         + ` fill="${glassFill}" stroke="${glassStroke}" stroke-width="${glassSw}"/>`;
  }

  // 3. Engraved features — shape data is in spec base coords, wrap in a <g>
  //    that scales to target size.
  const shapes = doorFeatureShapes(style);
  if (shapes.length) {
    svg += `<g transform="scale(${styleScale.toFixed(4)} ${styleScaleY.toFixed(4)})">`;
    svg += emitDoorShapesSvg(shapes, 0, 0, 1, {
      stroke: frameColor,
      knobFill: frameColor,
      tintFill: tintFill,
      strokeWidth: sw * 0.85,
      thickStrokeWidth: swThick * 0.85,
      pointerEvents: opts.pointerEvents,
    });
    svg += `</g>`;
  }
  return svg;
}
