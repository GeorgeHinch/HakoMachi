/*
 * Site Planner's legacy runtime expects the classic Three.js, OrbitControls,
 * and JSZip globals loaded by site-planner.html. Keep shared page setup ahead
 * of the planner runtime so logo hydration, analytics, and 3D previews are
 * available from the same deterministic module entrypoint.
 */
import '../shared/hakomachi-logo.js';
import '../shared/hakomachi-analytics.js';
import '../shared/building-preview-renderer.js?v=hm-assets-20260804-5';
import './main.js?v=hm-assets-20260804-5';
