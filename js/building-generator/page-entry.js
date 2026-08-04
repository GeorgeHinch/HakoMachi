/*
 * Building Generator's legacy runtime expects the classic JSZip, Three.js,
 * and OrbitControls globals loaded by building-generator.html. Shared page
 * setup runs before the page runtime from this single module entrypoint.
 */
import '../shared/hakomachi-logo.js';
import '../shared/hakomachi-analytics.js';
import './main.js?v=hm-assets-20260804-8';
