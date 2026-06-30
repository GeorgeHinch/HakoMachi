# SVG Fabrication Colors

HakoMachi SVG exports use three fabrication operations. These names and colors are the source of truth for generator previews and downloaded SVG files.

| Operation | Color | SVG operation name | Use for |
| --- | --- | --- | --- |
| Engrave / score | Blue `#0000ff` | `engrave` | Surface marks that do not cut through material, including labels, alignment marks, fold/score lines, nail marks, panel seams, and placement guides. |
| Retained through-cut | Red `#ff0000` | `cut-retained` | Through-cuts for pieces or outlines intended to stay with the final model, including tabbed outer part boundaries and any keepable separate pieces. |
| Scrap through-cut | Green `#00ff00` | `cut-scrap` | Through-cuts for waste openings, slots, voids, and discard pieces, including internal cutouts that are thrown away after cutting. |

The importable constants live in `js/shared/svg-fabrication-colors.js`.

## Implementation Rules

- Do not classify all through-cuts by a generic `cut` type. A through-cut must be tagged as either `cut-retained` or `cut-scrap`.
- Use blue only for marks that do not cut through the material.
- Use red for retained outlines and keepable pieces, even if the piece is held in the sheet by tabs.
- Use green for internal waste cuts such as window holes, door holes, slots, lattice voids, truss voids, and discard-only openings once the generator has verified those cuts do not produce keepable parts.
- Preview SVGs and downloaded SVGs should use the same operation colors. Preview stroke widths may be thicker for visibility.
- Preserve existing geometry, kerf, tab, slot, and dimension behavior when adding operation metadata or colors.

## Suggested SVG Metadata

Generators should prefer stable operation metadata in addition to color:

```svg
<path class="svg-cut-retained" data-operation="cut-retained" stroke="#ff0000" ... />
<path class="svg-cut-scrap" data-operation="cut-scrap" stroke="#00ff00" ... />
<path class="svg-engrave" data-operation="engrave" stroke="#0000ff" ... />
```

The class names are:

- `svg-engrave`
- `svg-cut-retained`
- `svg-cut-scrap`

## Migration Notes

Existing generators may need a taxonomy pass before color changes:

- Building Generator part data currently contains many generic `type: 'cut'` paths and rects. Agents must classify those cuts before applying red or green.
- Site Planner and utility generators can migrate sooner when their retained/scrap cut paths are locally obvious.
- Keep existing blue engraving behavior for hidden core labels and assembly marks.
