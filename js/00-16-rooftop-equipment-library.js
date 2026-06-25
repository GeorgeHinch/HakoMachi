'use strict';

/* =====================================================================
   ROOFTOP EQUIPMENT LIBRARY
   Each entry is a piece of rooftop equipment that can be placed on the roof.
   All sizes are in mm at 1:150 N-scale.
   Each entry defines:
     label: short human-readable name
     description: longer description
     w, d, h: width × depth × height of the equipment's bounding box (mm)
     shape: 'box', 'cylinder', 'box_louvered', 'mushroom', 'cabinet_tall', 'antenna'
     details: shape-specific parameters used by the STL generator
     etchInset: mm to inset the etched outline from the bbox edges (0 = full bbox)
   ===================================================================== */
const ROOFTOP_EQUIPMENT = {
  ac_small: {
    label: 'AC condenser (small)',
    description: 'Small split-AC outdoor unit. Real ~60×30×40cm.',
    w: 4.0, d: 2.0, h: 2.7,
    shape: 'box_louvered',
    details: { louverSide: 'front', louverCount: 5 },
  },
  ac_large: {
    label: 'AC condenser (large / industrial)',
    description: 'Large rooftop AC condenser. Real ~120×60×80cm.',
    w: 8.0, d: 4.0, h: 5.3,
    shape: 'box_louvered',
    details: { louverSide: 'front', louverCount: 7 },
  },
  cooling_tower: {
    label: 'Cooling tower',
    description: 'Industrial cooling tower with vertical louvers and fan on top. Real ~150×100×200cm.',
    w: 10.0, d: 6.7, h: 13.3,
    shape: 'cooling_tower',
    details: { fanRadius: 2.5, fanHeight: 1.5, louverCount: 8 },
  },
  water_tank_round: {
    label: 'Water tank (cylindrical, on legs)',
    description: 'Round FRP rooftop water tank on a steel frame. Real ~150cm dia × 200cm tall, frame ~50cm.',
    w: 10.0, d: 10.0, h: 16.7,
    shape: 'tank_round_legged',
    details: { tankRadius: 5.0, tankHeight: 13.3, legHeight: 3.3, legCount: 4 },
  },
  water_tank_square: {
    label: 'Water tank (FRP square, on legs)',
    description: 'Modular FRP panel water tank on a steel frame. Real ~200×100×150cm tank, frame ~50cm.',
    w: 13.3, d: 6.7, h: 13.3,
    shape: 'tank_square_legged',
    details: { tankH: 10.0, legH: 3.3, legCount: 4 },
  },
  mushroom_vent: {
    label: 'Mushroom roof vent',
    description: 'Cylindrical exhaust vent with rain cap on top. Real ~50cm dia × 80cm tall.',
    w: 3.3, d: 3.3, h: 5.3,
    shape: 'mushroom',
    details: { stackRadius: 1.0, stackHeight: 3.5, capRadius: 1.65, capHeight: 1.0 },
  },
  elec_cabinet: {
    label: 'Electrical / control cabinet',
    description: 'Tall narrow weatherproof cabinet for electrical or control gear. Real ~80×60×150cm.',
    w: 5.3, d: 4.0, h: 10.0,
    shape: 'cabinet_tall',
    details: { doorLines: 1 },
  },
  antenna_mast: {
    label: 'Antenna mast',
    description: 'Slender antenna or whip mast on a small base. Real base ~40×40cm, mast ~3-5m tall.',
    w: 2.7, d: 2.7, h: 27.0,
    shape: 'antenna',
    details: { baseW: 2.7, baseH: 1.0, mastRadius: 0.3, mastHeight: 26.0 },
  },
};
