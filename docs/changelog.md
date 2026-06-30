# Changelog

## 2026-06-24

### Fixed

- Matched flat and flat-overhang roof slot rows to the three-position wall-top tongue layout, preventing small flat-roof buildings from generating fewer roof slots than wall tabs.
- Updated flat-overhang side slot spans to account for omitted connection-wall cases using the same offset rule as the flush flat roof.
- Removed the temporary late-loaded override from `js/00-38-shared-block-supplemental-part-generation.js` after moving the flat roof slot-count logic into the canonical roof generator.
