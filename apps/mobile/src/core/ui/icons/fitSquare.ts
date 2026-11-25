/**
 * Exported Figma icons, one component each. Naming: the Figma icon's own name + `Icon`
 * (Outline / Medicine / Pill → PillIcon), never the place it is used, so one icon reused
 * in two places keeps one name. The doc comment gives the export path and current use.
 *
 * Timeline action-bar icons: each viewBox is trimmed to its glyph's own bounds (paths
 * untouched), so `size` is the side of the square the visible glyph fits in and equal
 * sizes look equal, whatever padding each export carried.
 */
export function fitSquare(size: number, viewBoxWidth: number, viewBoxHeight: number) {
  return viewBoxWidth >= viewBoxHeight
    ? { width: size, height: (size * viewBoxHeight) / viewBoxWidth }
    : { width: (size * viewBoxWidth) / viewBoxHeight, height: size };
}
