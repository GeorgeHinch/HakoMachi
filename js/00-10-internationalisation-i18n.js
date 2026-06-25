'use strict';

/* =====================================================================
   INTERNATIONALISATION  (i18n)
   Two-pass approach:
     1. buildTextRegistry() walks every text node in .controls before the
        first setLanguage() call and stores {node, orig} where orig is the
        original English string.
     2. applyI18n() iterates the registry, looks each orig up in the
        reverse-map (EN value → key), and replaces node.textContent with
        the translation for the target language.
   This covers every piece of static text without needing data-i18n on
   every element.  Elements with mixed HTML (bold, code) use data-i18n-html
   and get their innerHTML replaced instead.
   ===================================================================== */
const TRANSLATIONS = {
  en: {
    /* page header */
    title: 'HakoMachi',
    subtitle: 'For Japanese 1:150 N-scale layouts. Generates laser-cut SVG plans with tongue-and-slot joinery.',
    /* section summaries */
    s_type: 'Building Type',
    s_dim: 'Dimensions',
    s_ground: 'Ground Floor',
    s_defaults: 'Defaults',
    s_roof: 'Roof',
    s_cladding: 'Cladding Style',
    s_windows: 'Windows',
    s_doors: 'Doors',
    s_bay: 'Bay Doors',
    s_trim: 'Trim Strips',
    s_ifloor: 'Inter-Floor Core Panels',
    s_mech: 'Rooftop Mechanical Room',
    s_equip: 'Rooftop Equipment',
    s_shield: 'Rooftop Shield Wall',
    s_bill: 'Billboards',
    s_thick: 'Material Thicknesses',
    s_mat: 'Materials',
    /* dimension labels */
    lbl_width: 'Width (mm in N-scale, ie. final model)',
    lbl_depth: 'Depth (mm)',
    lbl_heightMode: 'Height mode',
    lbl_height: 'Height (mm)',
    lbl_floors: 'Number of floors',
    lbl_floorH: 'Floor height (mm)',
    /* ground-floor labels */
    lbl_ffhEnabled: 'Different ground-floor height',
    lbl_ffh: 'Ground-floor height (mm)',
    lbl_ffwEnabled: 'Different ground-floor window style',
    lbl_ffw: 'Ground-floor window style',
    lbl_ffwScale: 'Ground-floor size scale',
    lbl_ffcEnabled: 'Different ground-floor cladding',
    lbl_ffc: 'Ground-floor cladding style',
    lbl_gfoEnabled: 'Ground floor depth offset (front)',
    lbl_gfoAmount: 'Offset amount (mm; +/−)',
    /* roof labels */
    lbl_roofStyle: 'Roof style',
    lbl_parapetH: 'Parapet height (mm)',
    lbl_parapetInner: 'Add inner parapet top-wrap cladding',
    hlp_parapetInner: 'Four foldable cladding strips that wrap over the parapet wall top and continue down the inside face to the roof deck, hiding both the exposed top edge and the inner parapet face.',
    lbl_pitch: 'Roof pitch (mm rise)',
    lbl_roofOverhangAll: 'Roof overhang on all sides (mm)',
    hlp_roofOverhangAll: 'How far the roof projects past the walls on every side. The cladding above will extend to cover the full overhang.',
    lbl_ridge: 'Ridge direction',
    lbl_slope: 'High side',
    lbl_overhang: 'Roof overhang (mm)',
    lbl_ohFB: 'Front / back',
    lbl_ohEW: 'East / west',
    /* cladding / window / door labels */
    lbl_claddingStyle: 'Style',
    lbl_roofCladding: 'Roof cladding style',
    lbl_winStyle: 'Window style (each style has its own characteristic shape)',
    lbl_winScale: 'Size scale',
    lbl_winDensity: 'Density',
    lbl_doorStyle: 'Door style',
    lbl_doorCount: 'Doors per wall (front / back / side)',
    /* bay labels */
    lbl_baySize: 'Bay size W×H (mm)',
    /* trim labels */
    lbl_trimTop: 'Top trim band',
    lbl_trimBottom: 'Bottom trim band',
    lbl_trimH: 'Trim height (mm)',
    lbl_trimOver: 'Corner overhang past cladding (mm)',
    lbl_cornerTrim: 'Corner trim',
    hlp_cornerTrim: 'Four narrow 3 mm strips with an etched centre fold line. Score along the etch, fold 90°, and glue 1.5 mm to each face that meets at the corner — hides the exposed cladding edges where two walls join.',
    /* inter-floor labels */
    lbl_floorPanels: 'Include inter-floor panels',
    lbl_lastWall: 'Last wall installed',
    /* mech-room labels */
    lbl_mrEnabled: 'Include mechanical room',
    lbl_mrDims: 'Width × Depth × Height (mm)',
    lbl_mrPos: 'Position offset from roof center (mm)',
    /* shield labels */
    lbl_shieldEnabled: 'Include shield wall',
    lbl_shieldStyle: 'Style',
    lbl_shieldH: 'Height (mm)',
    lbl_shieldOffset: 'Inset from roof edge (mm)',
    /* thickness labels */
    lbl_coreT: 'Core thickness (mm)',
    lbl_claddingT: 'Cladding thickness (mm)',
    lbl_tongueW: 'Tongue width (mm)',
    lbl_kerf: 'Kerf compensation (mm)',
    /* descriptions (plain-text .small divs) */
    desc_ground: 'Settings that distinguish the ground floor from the upper floors. Use these for shopfronts, lobbies, factory loading levels, kura with stone bases, or sukiya-style covered walkways.',
    desc_ffh: 'Real buildings often have a taller ground floor for shops, lobbies, or loading. All upper floors keep the standard floor height.',
    desc_ffw: 'Useful for shop fronts, lobbies, or ground-level retail with larger or wider windows than the upper floors.',
    desc_ffc: "Common for kura (stone or namako-kabe base under white plaster upper), brick or stone bases under timber or render, retail facades with stone trim. Splits each wall's cladding into two panels.",
    desc_gfo: 'Common in Japanese architecture: ground-floor shop projects forward of the upper-floor footprint, OR upper floors overhang the ground floor (covered walkway / arcade). Adds an extra sub-assembly on the front face. Positive value = extends forward; negative = recessed under upper-floor overhang.',
    desc_trimOver: 'Each F/B trim strip extends past the cladding by this amount on each end so it wraps to meet the side trim.',
    desc_ifloor: 'Horizontal core-stock panels at each floor height. Panels have tongues on 3 sides; the 4th side rests against the wall installed last.',
    desc_lastWall: "The wall you'll attach last during assembly. This wall has no slots for inter-floor tongues — the panels' open edges rest against its inner face when you close up the building.",
    desc_mech: 'A small penthouse on the roof for HVAC, elevator overrun, water tanks, or stairwell access. Tongue-and-slot connection to the main roof.',
    desc_mechPos: 'Negative X = west, positive X = east. Negative Y = front, positive Y = back. Auto-clamped to fit on roof.',
    desc_equip: '3D-printable rooftop equipment. Each enabled type is included as an STL in the download, with its footprint etched on the roof piece showing where to glue it. A manifest text file lists how many of each are needed.',
    desc_shield: 'A low parapet wall around the rooftop equipment area — common on Japanese commercial buildings to hide AC units and tanks from street level.',
    desc_bill: 'Rooftop billboard structures. Each is a laser-cut assembly that glues to the roof.',
    desc_billEmpty: 'No billboards yet — click Add to place one.',
    desc_doors: "Doors are placed at ground level. Walls with bay openings can't have doors there.",
    desc_mat: 'Name each material. These names become subfolder names in the ZIP download. Assign each cladding style to a material so parts are grouped correctly.',
    /* select options */
    opt_absolute: 'Absolute height (mm)',
    opt_floors: 'Number of floors',
    opt_parapet: 'Parapet (recessed roof)',
    opt_flat: 'Flat (flush)',
    opt_flat_overhang: 'Flat with overhang (metal-clad)',
    opt_slanted: 'Slanted (single slope)',
    opt_gabled: 'Gabled (peaked)',
    opt_ridgeEW: 'East–West (slopes face front & back)',
    opt_ridgeNS: 'North–South (slopes face east & west)',
    opt_slopeBack: 'Back (north) is high',
    opt_slopeFront: 'Front (south) is high',
    opt_slopeEast: 'East is high',
    opt_slopeWest: 'West is high',
    opt_densNone: 'None',
    opt_densSparse: 'Sparse',
    opt_densMedium: 'Medium',
    opt_densDense: 'Dense',
    opt_scSmall: 'Small (75%)',
    opt_scDefault: 'Default (100%)',
    opt_scLarge: 'Large (140%)',
    opt_scXL: 'Extra-large (180%)',
    opt_bayNone: 'No bay',
    opt_bayFront: 'Front only',
    opt_bayDrive: 'Drive-through (front + back)',
    opt_wallBack: 'Back',
    opt_wallFront: 'Front',
    opt_wallEast: 'East side',
    opt_wallWest: 'West side',
    opt_shieldSolid: 'Solid panels',
    opt_shieldLouvered: 'Louvered (horizontal slats)',
    opt_shieldLattice: 'Lattice / grid',
    opt_shieldBraced: 'X-braced (structural with louvered cladding)',
    /* buttons */
    btn_shape: '⬡ Edit Shape',
    btn_open: '✏️ Edit Openings',
    btn_dl: '⬇ Download',
    btn_save: '💾 Save to cache',
    btn_load: '📂 Load from cache',
    btn_clear: '🗑 Clear cache',
    btn_export: '⬇ Export settings (.hako)',
    btn_import: '⬆ Import settings (.hako)',
    btn_reset: '↺ Reset to defaults',
    btn_addBill: '＋ Add Billboard',
    btn_overflowTip: '···',
    /* language / overflow menu */
    menu_lang: '🌐 Language',
    lang_en: 'English',
    lang_ja: '日本語',
    /* HTML-containing elements (innerHTML replacement) */
    html_thickWarn: '⚠️ <strong>Set core thickness to match your actual sheet material.</strong> Side walls (east &amp; west) are cut <code>depth − 2 × core</code> mm long so they fit between the front and back walls. Wrong thickness = wrong-length side panels.',
    /* materials form (dynamically built) */
    mat_clHdr: 'Cladding style → material',
    mat_clHint: 'Route each cladding style to a specific material so panels are grouped into different ZIP folders.',
    mat_addBtn: '+ Add material',
    mat_namePh: 'Folder name (e.g. 1.5mm Plywood)',
    mat_nameTitle: 'Material name — used as subfolder name in the ZIP download',
    mat_swatchTitle: 'Pick a colour for this material',
    mat_idTitle: 'Internal ID (used in part.material)',
    mat_delTitle: 'Remove this material',
    mat_newName: 'New Material',
    ed_grid: 'Grid',
    ed_step: 'Step',
    ed_cladding: 'Cladding',
    ed_roofCladdingStyle: 'Roof cladding style',
    ed_drawMode: 'DRAW MODE',
    ed_drawHint: 'Click & drag on the plan to place a wall. Release to commit.',
    ed_snap: 'SNAP',
    ed_snapAxis: 'Axis-aligned only (H or V)',
    ed_eraseMode: 'ERASE MODE',
    ed_eraseRoofHint: 'Click a roof item to remove it.',
    ed_eraseWallHint: 'Click a wall to delete it.',
    ed_shieldWall: 'SHIELD WALL',
    ed_shieldHint: 'Drag the square corner handles to resize the enclosure, the dashed body to move it, the white round handles to resize each wall, click + to add an opening.',
    ed_placing: 'PLACING',
    ed_placeRelease: 'release over the plan to place.',
    ed_copy: 'Copy',
    ed_paste: 'Paste',
    ed_delete: 'Delete',
    ed_deleteN: 'Delete {n}',
    ed_deleteSelectedTitle: 'Delete selected (Delete)',
    ed_deleteSelectTitle: 'Delete (select ≥ 1)',
    ed_copyTitle: 'Copy (Ctrl/Cmd+C)',
    ed_copySelectTitle: 'Copy (select ≥ 1)',
    ed_pasteTitle: 'Paste (Ctrl/Cmd+V)',
    ed_pasteEmptyTitle: 'Paste (clipboard empty)',
    ed_selectWallItemDelete: 'Select a wall item to delete it',
    ed_deleteWallItemTitle: 'Delete {n} selected wall item{s}',
    ed_autoSeedLayout: 'Auto-seed layout',
    ed_clearAllEquipment: 'Clear all equipment',
    ed_autoSeedReplaceConfirm: 'Replace {n} existing equipment item{s} with an auto-seeded layout?',
    ed_clearEquipmentConfirm: 'Remove all {n} placed equipment item{s}?',
    ed_autoSeedStatus: 'Auto-seeded {n} equipment item{s} using traditional rooftop layout — drag any item to adjust.',
    ed_shieldWallToolHint: 'Click a roof edge to toggle a parapet.',
    ed_eraseItem: 'Erase item',
    ed_eraseItemHint: 'Click a roof item or cutout to remove it.',
    ed_deleteSelected: 'Delete selected',
    ed_deleteSelectedItem: 'Delete selected item',
    ed_wallItem: 'wall item',
    ed_searchPlaceholder: 'Search objects…',
    lbl_parapetCap: 'Parapet cap / coping',
    hlp_parapetCap: 'Adds foldable cap strips that cover the top of parapet walls.',
    lbl_parapetSides: 'Parapet cap sides',
    hlp_parapetSides: 'Choose which parapet sides receive cap/coping strips.',
    opt_parapetSidesAll: 'All sides',
    opt_parapetSidesFB: 'Front / back only',
    opt_parapetSidesEW: 'East / west only',
    lbl_soffitCladding: 'Soffit cladding under overhang',
    hlp_soffitCladding: 'Adds underside cladding panels for roof overhangs.',
    lbl_roofFasciaTrim: 'Roof fascia trim',
    hlp_roofFasciaTrim: 'Adds fascia trim strips around roof edges.',
    lbl_interiorCladding: 'Interior wall cladding',
    hlp_interiorCladding: 'Adds cladding panels to the inside faces of exterior walls.',
    lbl_interiorCladdingStyle: 'Interior cladding style',
    opt_parapet_gable: 'Parapet gable',
  },
  ja: {
    /* page header */
    title: 'HakoMachi',
    subtitle: '日本型Nゲージ（1:150）レイアウト用。タング＆スロット方式のレーザーカットSVGプランを生成します。',
    /* section summaries */
    s_type: '建物タイプ',
    s_dim: '寸法',
    s_ground: '1階設定',
    s_defaults: '既定値',
    s_roof: '屋根',
    s_cladding: '外壁仕上げ',
    s_windows: '窓',
    s_doors: 'ドア',
    s_bay: '搬入口',
    s_trim: 'モール',
    s_ifloor: '中間床パネル',
    s_mech: '屋上機械室',
    s_equip: '屋上設備',
    s_shield: '屋上目隠し',
    s_bill: '看板',
    s_thick: '材料厚さ',
    s_mat: '素材',
    /* dimension labels */
    lbl_width: '幅（mm・Nゲージ実寸）',
    lbl_depth: '奥行き（mm）',
    lbl_heightMode: '高さ指定方法',
    lbl_height: '高さ（mm）',
    lbl_floors: '階数',
    lbl_floorH: '階高（mm）',
    /* ground-floor labels */
    lbl_ffhEnabled: '1階を別の高さにする',
    lbl_ffh: '1階高さ（mm）',
    lbl_ffwEnabled: '1階の窓スタイルを変える',
    lbl_ffw: '1階窓スタイル',
    lbl_ffwScale: '1階窓サイズ',
    lbl_ffcEnabled: '1階の外壁仕上げを変える',
    lbl_ffc: '1階外壁スタイル',
    lbl_gfoEnabled: '1階前面オフセット',
    lbl_gfoAmount: 'オフセット量（mm、プラス／マイナス）',
    /* roof labels */
    lbl_roofStyle: '屋根スタイル',
    lbl_parapetH: 'パラペット高さ（mm）',
    lbl_parapetInner: 'パラペット上端回り込み内側壁材を追加',
    hlp_parapetInner: 'パラペット壁の上端を回り込み、屋根面まで内側に下がる折り曲げ式の壁材4枚です。露出する上端と内側面の両方を隠します。',
    lbl_pitch: '屋根勾配・立ち上がり（mm）',
    lbl_roofOverhangAll: '四方の軒の出（mm）',
    hlp_roofOverhangAll: '屋根が壁より外側にどれだけ張り出すか。上に貼る外装材も張り出し全体を覆います。',
    lbl_ridge: '棟の方向',
    lbl_slope: '高い側',
    lbl_overhang: '軒の出（mm）',
    lbl_ohFB: '前後',
    lbl_ohEW: '東西',
    /* cladding / window / door labels */
    lbl_claddingStyle: 'スタイル',
    lbl_roofCladding: '屋根外装スタイル',
    lbl_winStyle: '窓スタイル（スタイルごとに形状が異なります）',
    lbl_winScale: 'サイズスケール',
    lbl_winDensity: '密度',
    lbl_doorStyle: 'ドアスタイル',
    lbl_doorCount: 'ドア数（前面 / 背面 / 側面）',
    /* bay labels */
    lbl_baySize: '搬入口サイズ 幅×高さ（mm）',
    /* trim labels */
    lbl_trimTop: '上部モール',
    lbl_trimBottom: '下部モール',
    lbl_trimH: 'モール高さ（mm）',
    lbl_trimOver: 'コーナーオーバーハング（mm）',
    lbl_cornerTrim: 'コーナーモール',
    hlp_cornerTrim: '中央に折り目用エッチング線がある幅3mmの細長いストリップ4本。エッチング線に沿ってスコアし、90°に折り、コーナーで接する各面に1.5mmずつ接着します — 2つの壁が接合する場所の露出した外装エッジを隠します。',
    /* inter-floor labels */
    lbl_floorPanels: '中間床パネルを含める',
    lbl_lastWall: '最後に取り付ける壁',
    /* mech-room labels */
    lbl_mrEnabled: '機械室を含める',
    lbl_mrDims: '幅 × 奥行き × 高さ（mm）',
    lbl_mrPos: '屋根中心からのオフセット（mm）',
    /* shield labels */
    lbl_shieldEnabled: '目隠しパネルを含める',
    lbl_shieldStyle: 'スタイル',
    lbl_shieldH: '高さ（mm）',
    lbl_shieldOffset: '屋根端からの内側距離（mm）',
    /* thickness labels */
    lbl_coreT: 'コア材厚さ（mm）',
    lbl_claddingT: '外装材厚さ（mm）',
    lbl_tongueW: 'タング幅（mm）',
    lbl_kerf: 'カーフ補正（mm）',
    /* descriptions */
    desc_ground: '1階と上階を区別する設定です。店舗前面・ロビー・工場搬入口・石積みの蔵・数寄屋造りの庇などに活用できます。',
    desc_ffh: '実際の建物では店舗・ロビー・搬入のため1階を高く設定することが多いです。上階は標準の階高を維持します。',
    desc_ffw: '店舗前面・ロビー・上階より大きい窓が必要な1階小売スペースに便利です。',
    desc_ffc: '蔵（白漆喰の下に石積みや浪板）・木材や塗装の下の石積みベース・石材トリムの小売ファサードなどに一般的です。各壁の外装を2枚のパネルに分割します。',
    desc_gfo: '日本建築によく見られます：1階の店舗が上階より前に張り出す、または上階が1階の上に覆いかぶさる（通り庇・アーケード）。前面にサブアセンブリを追加します。正の値＝前方に張り出し、負の値＝上階庇の下に引っ込みます。',
    desc_trimOver: '各前後面のモール材は、側面モールに接続するよう両端をこの量だけ外装を超えて延長します。',
    desc_ifloor: '各階高さに配置する水平コア材パネルです。3辺にタングがあり、4辺目は最後に取り付ける壁の内面に当たります。',
    desc_lastWall: '組み立て時に最後に取り付ける壁を選択します。この壁には中間床タング用のスロットがなく、パネルの開いた端が建物を閉じる際に内面に当たります。',
    desc_mech: 'HVAC・エレベーター機械室・水タンク・階段室用の小さな屋上ペントハウスです。本体屋根とタング＆スロット接続します。',
    desc_mechPos: '負のX＝西、正のX＝東。負のY＝前面、正のY＝背面。屋根に収まるよう自動調整されます。',
    desc_equip: '3D印刷可能な屋上設備です。有効にした各タイプはSTLとしてダウンロードに含まれ、接着位置を示す設置図が屋根パーツにエッチングされます。必要数を記載したマニフェストファイルも含まれます。',
    desc_shield: '屋上設備エリア周囲の低いパラペット壁です。エアコン室外機やタンクを隠すため、日本の商業建築によく見られます。',
    desc_bill: '屋上看板構造物です。各ユニットは屋根に接着するレーザーカットアセンブリです。',
    desc_billEmpty: 'まだ看板がありません。追加ボタンで配置してください。',
    desc_doors: 'ドアは地面レベルに配置されます。搬入口のある壁にはドアを配置できません。',
    desc_mat: '各素材に名前を付けてください。名前はZIPのサブフォルダ名になります。外装スタイルを素材に割り当ててパーツを正しくグループ化してください。',
    /* select options */
    opt_absolute: '高さを直接入力（mm）',
    opt_floors: '階数から計算',
    opt_parapet: 'パラペット（陸屋根）',
    opt_flat: 'フラット（平葺き）',
    opt_flat_overhang: 'フラット＋庇（金属葺き）',
    opt_slanted: '片流れ',
    opt_gabled: '切妻',
    opt_ridgeEW: '東西棟（勾配は前後面）',
    opt_ridgeNS: '南北棟（勾配は東西面）',
    opt_slopeBack: '奥（北側）が高い',
    opt_slopeFront: '手前（南側）が高い',
    opt_slopeEast: '東側が高い',
    opt_slopeWest: '西側が高い',
    opt_densNone: 'なし',
    opt_densSparse: '少ない',
    opt_densMedium: '中程度',
    opt_densDense: '多い',
    opt_scSmall: '小（75%）',
    opt_scDefault: '標準（100%）',
    opt_scLarge: '大（140%）',
    opt_scXL: '特大（180%）',
    opt_bayNone: '搬入口なし',
    opt_bayFront: '前面のみ',
    opt_bayDrive: '通り抜け（前後）',
    opt_wallBack: '背面',
    opt_wallFront: '前面',
    opt_wallEast: '東側',
    opt_wallWest: '西側',
    opt_shieldSolid: 'ソリッドパネル',
    opt_shieldLouvered: 'ルーバー（横スラット）',
    opt_shieldLattice: '格子',
    opt_shieldBraced: 'X形ブレース（構造材＋ルーバー外装）',
    /* buttons */
    btn_shape: '⬡ 形状編集',
    btn_open: '✏️ 開口編集',
    btn_dl: '⬇ ダウンロード',
    btn_save: '💾 キャッシュ保存',
    btn_load: '📂 キャッシュ読込',
    btn_clear: '🗑 キャッシュ消去',
    btn_export: '⬇ 設定エクスポート（.hako）',
    btn_import: '⬆ 設定インポート（.hako）',
    btn_reset: '↺ デフォルトにリセット',
    btn_addBill: '＋ 看板を追加',
    btn_overflowTip: '···',
    /* language / overflow menu */
    menu_lang: '🌐 言語',
    lang_en: 'English',
    lang_ja: '日本語',
    /* HTML-containing elements (innerHTML replacement) */
    html_thickWarn: '⚠️ <strong>コア材厚さを実際のシート材料に合わせてください。</strong> 側壁（東西）は <code>奥行き − 2 × コア</code> mm 長に切断されます。厚さが間違うと側面パネルの長さが合いません。',
    /* materials form (dynamically built) */
    mat_clHdr: '外壁スタイル → 素材',
    mat_clHint: '各外壁スタイルを特定の素材に割り当てて、パネルをZIPの異なるフォルダにグループ化します。',
    mat_addBtn: '＋ 素材を追加',
    mat_namePh: 'フォルダ名（例：1.5mm合板）',
    mat_nameTitle: '素材名 — ZIPダウンロードのサブフォルダ名として使用されます',
    mat_swatchTitle: 'この素材の色を選択',
    mat_idTitle: '内部ID（part.materialで使用）',
    mat_delTitle: 'この素材を削除',
    mat_newName: '新しい素材',
    ed_grid: 'グリッド',
    ed_step: '間隔',
    ed_cladding: '外装',
    ed_roofCladdingStyle: '屋根外装スタイル',
    ed_drawMode: '作図モード',
    ed_drawHint: '平面図上でクリック＆ドラッグして壁を配置し、離すと確定します。',
    ed_snap: 'スナップ',
    ed_snapAxis: '水平または垂直のみ',
    ed_eraseMode: '削除モード',
    ed_eraseRoofHint: '屋上アイテムをクリックして削除します。',
    ed_eraseWallHint: '壁をクリックして削除します。',
    ed_shieldWall: '目隠し壁',
    ed_shieldHint: '四角い角ハンドルで囲いをリサイズ、破線の本体で移動、白い丸ハンドルで各壁を調整、＋で開口を追加します。',
    ed_placing: '配置中',
    ed_placeRelease: '平面図上で離すと配置します。',
    ed_copy: 'コピー',
    ed_paste: '貼り付け',
    ed_delete: '削除',
    ed_deleteN: '{n}件削除',
    ed_deleteSelectedTitle: '選択項目を削除（Delete）',
    ed_deleteSelectTitle: '削除（1件以上選択）',
    ed_copyTitle: 'コピー（Ctrl/Cmd+C）',
    ed_copySelectTitle: 'コピー（1件以上選択）',
    ed_pasteTitle: '貼り付け（Ctrl/Cmd+V）',
    ed_pasteEmptyTitle: '貼り付け（クリップボード空）',
    ed_selectWallItemDelete: '削除する壁アイテムを選択',
    ed_deleteWallItemTitle: '選択中の壁アイテム{n}件を削除',
    ed_autoSeedLayout: 'レイアウト自動配置',
    ed_clearAllEquipment: '設備をすべて消去',
    ed_autoSeedReplaceConfirm: '既存の設備{n}件を自動配置レイアウトで置き換えますか？',
    ed_clearEquipmentConfirm: '配置済み設備{n}件を削除しますか？',
    ed_autoSeedStatus: '設備{n}件を一般的な屋上配置で自動配置しました。必要に応じて各アイテムをドラッグして調整してください。',
    ed_shieldWallToolHint: '屋根端をクリックしてパラペットを切り替えます。',
    ed_eraseItem: 'アイテム削除',
    ed_eraseItemHint: '屋上アイテムまたは切り抜きをクリックして削除します。',
    ed_deleteSelected: '選択項目を削除',
    ed_deleteSelectedItem: '選択アイテムを削除',
    ed_wallItem: '壁アイテム',
    ed_searchPlaceholder: 'オブジェクト検索…',
    lbl_parapetCap: 'パラペット笠木',
    hlp_parapetCap: 'パラペット壁の上端を覆う折り曲げ式の笠木ストリップを追加します。',
    lbl_parapetSides: '笠木を付ける辺',
    hlp_parapetSides: 'パラペット笠木を取り付ける辺を選択します。',
    opt_parapetSidesAll: '全辺',
    opt_parapetSidesFB: '前後のみ',
    opt_parapetSidesEW: '東西のみ',
    lbl_soffitCladding: '庇裏の外装材',
    hlp_soffitCladding: '屋根の張り出し下面に貼る外装パネルを追加します。',
    lbl_roofFasciaTrim: '屋根鼻隠しトリム',
    hlp_roofFasciaTrim: '屋根端部まわりに鼻隠しトリムを追加します。',
    lbl_interiorCladding: '内壁側外装パネル',
    hlp_interiorCladding: '外周壁の内側面に貼る内装／外装パネルを追加します。',
    lbl_interiorCladdingStyle: '内側パネルスタイル',
    opt_parapet_gable: 'パラペット切妻',
  },
};

let currentLang = 'en';

function t(key) {
  return (TRANSLATIONS[currentLang] || TRANSLATIONS.en)[key] || (TRANSLATIONS.en)[key] || key;
}

function tx(key, fallback) {
  const T = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const enT = TRANSLATIONS.en || {};
  return (T && T[key]) || enT[key] || fallback || key;
}

const STYLE_I18N_JA = {
  BUILDING_TYPES: {
    industrial_loading: { label:'工業・荷役施設' },
    storage: { label:'倉庫' },
    office: { label:'オフィスビル' },
    workshop: { label:'小工場・作業場' },
    silo_tower: { label:'サイロ塔・細長い建物' },
    shop: { label:'店舗・商店' },
    traditional_house: { label:'伝統住宅・茶屋' },
    storehouse: { label:'蔵（白壁）' },
    station_brick: { label:'レンガ駅舎・銀行' },
    stone_civic: { label:'石造公共建築' },
  },
  CLADDING_STYLES: {
    alc_panel: { label:'ALCパネル（縦目地・4mm幅）' },
    alc_panel_horizontal: { label:'ALCパネル（横目地・4mm高）' },
    alc_panel_wide: { label:'ALCパネル（1200mm幅）' },
    alc_panel_bolted: { label:'ALCパネル（露出ファスナー）' },
    alc_panel_ribbed: { label:'ALCパネル（装飾リブ）' },
    ribbed_metal_wide: { label:'リブ付き金属パネル（幅広）' },
    ribbed_metal_wide_fasteners: { label:'リブ付き金属パネル（幅広＋ファスナー）' },
    standing_seam_metal: { label:'立平葺き金属屋根' },
    ribbed_metal_narrow: { label:'リブ付き金属パネル（細幅）' },
    cement_siding_lap: { label:'窯業系ラップサイディング' },
    galvalume_vertical: { label:'ガルバリウム縦張り' },
    fluted_concrete: { label:'リブ付きコンクリート' },
    mosaic_tile: { label:'モザイクタイル（50mm）' },
    concrete_panel_large: { label:'コンクリートパネル（大）' },
    concrete_panel_small: { label:'コンクリートパネル（小）' },
    yakisugi: { label:'焼杉板張り' },
    board_batten: { label:'押縁張り' },
    namako: { label:'なまこ壁（斜めタイル）' },
    namako_kabe: { label:'なまこ壁（斜めタイル）' },
    hira_gawara: { label:'平瓦壁（角タイル）' },
    hira_gawara_wall: { label:'平瓦壁（角タイル）' },
    kawara_roof: { label:'瓦屋根' },
    kawara_tile: { label:'瓦（屋根タイル）' },
    corrugated_metal: { label:'波板金属（重ね張り）' },
    corrugated_metal_overlap: { label:'波板金属（重ねあり）' },
    brick_running: { label:'レンガ（馬踏み目地）' },
    brick_course: { label:'レンガ（段積み）' },
    stone_ashlar_small: { label:'切石積み（小）' },
    stone_ashlar_large: { label:'切石積み（大）' },
    stone_rubble: { label:'乱石積み' },
    stone_random_rubble: { label:'乱石積み（ランダム）' },
    smooth: { label:'無地（ディテールなし）' },
  },
  WINDOW_STYLES: {
    industrial_small: { label:'工業窓・小（縦桟）' },
    industrial_tall: { label:'工業窓・縦長（縦桟）' },
    office_grid_2x2: { label:'オフィス窓 2×2格子' },
    office_grid_3x2: { label:'オフィス窓 3×2格子' },
    storefront: { label:'店舗正面（透明・桟なし）' },
    ribbon: { label:'横連窓' },
    industrial_slider_3: { label:'工業用引違い帯窓（3連）' },
    industrial_slider_4: { label:'工業用引違い帯窓（4連）' },
    industrial_slider_6: { label:'工業用引違い帯窓（6連）' },
    factory_square: { label:'工場角窓（4枚）' },
    vertical_strip: { label:'縦スリット窓' },
    renji_mado: { label:'連子窓' },
    mushiko_mado: { label:'虫籠窓' },
    shoji_grid: { label:'障子格子' },
    ranma_lattice: { label:'欄間格子' },
    yukimi_shoji: { label:'雪見障子' },
    renji_tall: { label:'縦連子' },
    blanked_etched: { label:'塞ぎ窓（外装にエッチング）' },
    blanked_filled: { label:'塞ぎ窓（外装裏に埋め材）' },
  },
  DOOR_STYLES: {
    single: { label:'片開きドア（無地）' },
    single_glass: { label:'片開きガラスドア' },
    single_full_glass: { label:'全面ガラス片開きドア' },
    double: { label:'両開きドア（無地）' },
    double_glass: { label:'両開きガラスドア' },
    double_full_glass: { label:'全面ガラス両開きドア' },
    rolling: { label:'シャッター' },
    sliding_glass: { label:'引違いガラス入口' },
    single_metal_exterior_handle: { label:'外部ハンドル付き工業用金属ドア' },
    single_metal_window: { label:'小窓付き金属サービスドア' },
    single_louvered_utility: { label:'ルーバー付き設備ドア' },
    double_metal_exterior_handle: { label:'外部ハンドル付き両開き金属ドア' },
    single_industrial: { label:'クラッシュバー付き片開き工業ドア' },
    double_industrial: { label:'クラッシュバー付き両開き工業ドア' },
    apartment_service_jp: { label:'日本型アルミ玄関・集合住宅ドア' },
    koshi_do: { label:'格子戸' },
    koshi_do_glass: { label:'格子戸（ガラス入り）' },
    koshi_do_double: { label:'両開き格子戸' },
    sliding_shoji: { label:'障子引戸' },
    itado: { label:'板戸' },
    kura_do: { label:'蔵戸' },
    yotsume_koshi_do: { label:'四つ目格子戸' },
  },
  FIXTURE_STYLES: {
    passthrough_circle: { label:'貫通穴（丸）' },
    passthrough_square: { label:'貫通穴（四角）' },
    emergency_hatch: { label:'非常用ハッチ' },
    vent_louvered: { label:'ルーバー換気口' },
    vent_round: { label:'丸型排気口' },
    downspout: { label:'雨樋たて管' },
    noren: { label:'暖簾' },
    sudare: { label:'簾' },
    address_plate: { label:'住所プレート' },
    conduit_box: { label:'配線・ジャンクションボックス' },
    electric_meter: { label:'電力量計' },
    gas_meter: { label:'ガスメーター' },
    sign_wall_plaque: { label:'壁面看板・プレート' },
    mailbox_jp: { label:'郵便受け' },
    mini_split_ac: { label:'壁掛けエアコン室内機' },
    sign_vertical_banner: { label:'縦看板' },
    lantern_chochin: { label:'提灯' },
    sign_kanban: { label:'看板' },
    louver_bank_industrial: { label:'ルーバーバンク' },
    large_vent_grille: { label:'大型換気グリル' },
    pipe_penetration_ring: { label:'配管貫通リング' },
    cable_tray_wall: { label:'ケーブルトレイ' },
    exterior_electrical_cabinet: { label:'屋外電気盤' },
    dust_collector_box: { label:'集塵ボックス' },
    wall_mounted_duct: { label:'壁付けダクト' },
    ladder_strip: { label:'はしごストリップ' },
    safety_cage: { label:'安全ケージ' },
    platform_brackets: { label:'プラットフォームブラケット' },
    service_platform_brackets: { label:'サービス足場ブラケット' },
  },
  ROOFTOP_EQUIPMENT: {
    ac_small: { label:'小型AC室外機' },
    ac_large: { label:'大型・工業用AC室外機' },
    cooling_tower: { label:'冷却塔' },
    water_tank_round: { label:'円筒水槽（脚付き）' },
    water_tank_square: { label:'FRP角型水槽（脚付き）' },
    mushroom_vent: { label:'きのこ型屋上ベント' },
    elec_cabinet: { label:'電気・制御盤' },
    antenna_mast: { label:'アンテナマスト' },
  },
  AWNING_STYLES: {
    narrow: { label:'狭い' },
    standard: { label:'標準' },
    wide: { label:'広い' },
    shopfront: { label:'店舗正面' },
  },
  BALCONY_STYLES: {
    int_s: { label:'内側 S' },
    int_m: { label:'内側 M' },
    int_l: { label:'内側 L' },
    ext_s: { label:'外側 S' },
    ext_m: { label:'外側 M' },
    ext_l: { label:'外側 L' },
  },
};

function i18nStyleGroupObject(groupName) {
  try {
    return ({
      BUILDING_TYPES, CLADDING_STYLES, WINDOW_STYLES, DOOR_STYLES,
      FIXTURE_STYLES, ROOFTOP_EQUIPMENT, AWNING_STYLES, BALCONY_STYLES,
    })[groupName] || null;
  } catch (e) { return null; }
}

function applyDynamicObjectI18n() {
  const groups = Object.keys(STYLE_I18N_JA);
  for (const groupName of groups) {
    const group = i18nStyleGroupObject(groupName);
    if (!group) continue;
    for (const [key, obj] of Object.entries(group)) {
      if (!obj || typeof obj !== 'object') continue;
      if (!obj._i18n_en) obj._i18n_en = { label: obj.label, description: obj.description };
      const ja = STYLE_I18N_JA[groupName][key] || {};
      if (currentLang === 'ja') {
        if (ja.label) obj.label = ja.label;
        if (ja.description) obj.description = ja.description;
      } else {
        if (obj._i18n_en.label != null) obj.label = obj._i18n_en.label;
        if (obj._i18n_en.description != null) obj.description = obj._i18n_en.description;
      }
    }
  }
}

/* -------------------------------------------------------------------
   Text-node registry — populated once before the first translation.
   Each entry: { node: TextNode, orig: string (original English text) }
   ------------------------------------------------------------------- */
let _textRegistry = null;

const _I18N_SKIP = new Set(['SCRIPT','STYLE','SELECT','SVG','CANVAS','TEXTAREA']);

function buildTextRegistry() {
  _textRegistry = [];
  const roots = [
    document.querySelector('.controls-scroll'),
    document.querySelector('.sticky-actions'),
    document.querySelector('#openingEditorModal'),
    document.querySelector('#iwModal'),
    document.querySelector('#shapeEditorModal'),
    document.querySelector('#partsPanel'),
    document.querySelector('#preview'),
  ];
  function walk(el) {
    if (!el) return;
    // Skip elements with data-i18n-html (replaced via innerHTML elsewhere)
    if (el.hasAttribute && el.hasAttribute('data-i18n-html')) return;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent.trim()) {
          _textRegistry.push({ node: child, orig: child.textContent });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (!_I18N_SKIP.has(child.tagName)) walk(child);
      }
    }
  }
  roots.forEach(walk);
}

function applyI18n() {
  const T = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const enT = TRANSLATIONS.en;

  // Build reverse map: English string value → key (built fresh each call so
  // duplicate values resolve consistently — last key in object order wins,
  // which is fine because duplicates always share the same translation).
  const enToKey = Object.create(null);
  for (const [k, v] of Object.entries(enT)) {
    if (typeof v === 'string' && !k.startsWith('html_')) enToKey[v] = k;
  }

  // Walk every registered text node, look up its original English text, swap.
  if (_textRegistry) {
    for (const entry of _textRegistry) {
      const trimmed = entry.orig.trim();
      if (!trimmed) continue;
      const key = enToKey[trimmed];
      if (!key || !T[key]) continue;
      // Preserve leading/trailing whitespace from the original node
      const lead  = entry.orig.slice(0, entry.orig.length - entry.orig.trimStart().length);
      const trail = entry.orig.slice(entry.orig.trimEnd().length) || '';
      entry.node.textContent = lead + T[key] + trail;
    }
  }

  // HTML-containing elements (can't use text nodes — replace innerHTML)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (T[key]) el.innerHTML = T[key];
  });

  // Select options (static ones with data-i18n-opt; dynamic selects like
  // building-type are English-only for now)
  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const key = el.getAttribute('data-i18n-opt');
    if (T[key]) el.textContent = T[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (T[key]) el.setAttribute('placeholder', T[key]);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (T[key]) el.setAttribute('title', T[key]);
  });

  document.documentElement.lang = currentLang;

  // Re-render dynamically-built sections so they pick up the new language
  if (typeof applyDynamicObjectI18n === 'function') applyDynamicObjectI18n();
  if (typeof renderMaterialsForm === 'function') renderMaterialsForm();
  if (typeof populateStyleSelects === 'function') populateStyleSelects();
  if (typeof writeForm === 'function') {
    try { writeForm(); } catch (e) {}
  }
  if (typeof OpeningEditorToolbox !== 'undefined' && document.getElementById('openingEditorModal')?.style.display !== 'none') {
    try { OpeningEditorToolbox.populate(); OpeningEditorTopbar.populate(); oeUpdateFloatingActionBarState(); oeRender(); } catch (e) {}
  }
  if (document.getElementById('iwModal')?.style.display !== 'none') {
    try { iwPopulateToolbox(); iwPopulateTopbar(); iwRender(); } catch (e) {}
  }
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  try { localStorage.setItem('hakomachi_lang', lang); } catch(e) {}
  if (typeof applyDynamicObjectI18n === 'function') applyDynamicObjectI18n();
  applyI18n();
}
