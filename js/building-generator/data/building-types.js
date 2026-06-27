/* =====================================================================
   BUILDING TYPE PRESETS
   Each defines defaults that get applied when the user picks the type.
   ===================================================================== */
export const BUILDING_TYPES = {
  industrial_loading: {
    label: 'Industrial / Loading station',
    description: 'Drive-through cement or concrete plant, like Taiheiyo Cement loading towers.',
    defaults: {
      width: 80, depth: 80, height: 120,
      claddingStyle: 'alc_panel',
      windowStyle: 'industrial_small',
      windowScale: 'default',
      windowDensity: 'sparse',
      manualOpenings: {
        front: [{ type: 'bay', style: 'through', x: 15, y: 96, w: 50, h: 24 }],
        back:  [{ type: 'bay', style: 'through', x: 15, y: 96, w: 50, h: 24 }],
        east: null, west: null,
      },
      roofStyle: 'parapet',
      parapetHeight: 2,
      doorStyle: 'single',
      frontDoorCount: 0, backDoorCount: 0, sideDoorCount: 1,
    }
  },
  storage: {
    label: 'Storage / Warehouse',
    description: 'Large utilitarian box. Few windows, large rolling doors. Common in Japanese industrial parks.',
    defaults: {
      width: 120, depth: 80, height: 60,
      claddingStyle: 'ribbed_metal_wide',
      windowStyle: 'industrial_small',
      windowScale: 'default',
      windowDensity: 'sparse',
      manualOpenings: {
        front: [{ type: 'bay', style: 'side', x: 30, y: 36, w: 60, h: 24 }],
        back: null, east: null, west: null,
      },
      roofStyle: 'slanted',
      parapetHeight: 1,
      doorStyle: 'single',
      frontDoorCount: 0, backDoorCount: 1, sideDoorCount: 1,
    }
  },
  office: {
    label: 'Office building',
    description: 'Generic Japanese mid-rise office. Many windows, ribbed concrete cladding.',
    defaults: {
      width: 80, depth: 60, height: 90,
      claddingStyle: 'concrete_panel_large',
      windowStyle: 'office_grid_2x2',
      windowScale: 'default',
      windowDensity: 'dense',
      roofStyle: 'parapet',
      parapetHeight: 3,
      doorStyle: 'double_glass',
      frontDoorCount: 1, backDoorCount: 1, sideDoorCount: 0,
    }
  },
  workshop: {
    label: 'Small workshop / Factory',
    description: 'Small-to-medium factory ("町工場"). One bay door, modest windows, sometimes corrugated metal.',
    defaults: {
      width: 80, depth: 70, height: 50,
      claddingStyle: 'ribbed_metal_narrow',
      windowStyle: 'factory_square',
      windowScale: 'default',
      windowDensity: 'medium',
      manualOpenings: {
        front: [{ type: 'bay', style: 'side', x: 17.5, y: 26, w: 45, h: 24 }],
        back: null, east: null, west: null,
      },
      roofStyle: 'gabled',
      parapetHeight: 1,
      doorStyle: 'single',
      frontDoorCount: 0, backDoorCount: 0, sideDoorCount: 1,
    }
  },
  silo_tower: {
    label: 'Silo tower / Tall narrow',
    description: 'Tall narrow utility tower for elevators, stairs, or process equipment.',
    defaults: {
      width: 50, depth: 50, height: 150,
      claddingStyle: 'alc_panel',
      windowStyle: 'vertical_strip',
      windowScale: 'default',
      windowDensity: 'sparse',
      roofStyle: 'parapet',
      parapetHeight: 2,
      doorStyle: 'single',
      frontDoorCount: 1, backDoorCount: 0, sideDoorCount: 0,
    }
  },
  shop: {
    label: 'Storefront / Shop',
    description: 'Small commercial shop ("商店"). Wide front windows, narrow facade.',
    defaults: {
      width: 60, depth: 80, height: 50,
      claddingStyle: 'concrete_panel_small',
      windowStyle: 'storefront',
      windowScale: 'default',
      windowDensity: 'dense',
      roofStyle: 'flat',
      parapetHeight: 1,
      doorStyle: 'sliding_glass',
      frontDoorCount: 1, backDoorCount: 1, sideDoorCount: 0,
    }
  },
  traditional_house: {
    label: 'Traditional house / Tea house',
    description: 'Older Japanese residential or tea house style. Yakisugi siding, kawara roof, slatted screens.',
    defaults: {
      width: 70, depth: 60, height: 45,
      claddingStyle: 'yakisugi',
      windowStyle: 'industrial_small',
      windowScale: 'default',
      windowDensity: 'medium',
      roofStyle: 'gabled',
      parapetHeight: 1,
      doorStyle: 'single',
      frontDoorCount: 1, backDoorCount: 0, sideDoorCount: 0,
    }
  },
  storehouse: {
    label: 'Kura (white storehouse)',
    description: 'Traditional fireproof storehouse. Namako-kabe diagonal-tile lower walls, white plaster above.',
    defaults: {
      width: 50, depth: 50, height: 60,
      claddingStyle: 'namako_kabe',
      windowStyle: 'industrial_small',
      windowScale: 'small',
      windowDensity: 'sparse',
      roofStyle: 'gabled',
      parapetHeight: 1,
      doorStyle: 'double',
      frontDoorCount: 1, backDoorCount: 0, sideDoorCount: 0,
    }
  },
  station_brick: {
    label: 'Brick station / Bank',
    description: 'Meiji-era brick civic building. Tokyo Station style.',
    defaults: {
      width: 100, depth: 70, height: 60,
      claddingStyle: 'brick_course',
      windowStyle: 'office_grid_2x2',
      windowScale: 'large',
      windowDensity: 'dense',
      roofStyle: 'parapet',
      parapetHeight: 4,
      doorStyle: 'double_glass',
      frontDoorCount: 1, backDoorCount: 1, sideDoorCount: 0,
    }
  },
  stone_civic: {
    label: 'Stone civic building',
    description: 'Government / monumental. Large dressed-stone ashlar walls, regular windows.',
    defaults: {
      width: 110, depth: 80, height: 70,
      claddingStyle: 'stone_ashlar_large',
      windowStyle: 'office_grid_3x2',
      windowScale: 'large',
      windowDensity: 'medium',
      roofStyle: 'parapet',
      parapetHeight: 5,
      doorStyle: 'double',
      frontDoorCount: 1, backDoorCount: 0, sideDoorCount: 0,
    }
  },
};
