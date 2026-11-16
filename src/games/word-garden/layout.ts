export const STEP_X = 140;
export const STEP_Y = 128;
export type PairCount = 4 | 8 | 12 | 18;
export function getBoardLayout(mobile: boolean, pairs: number) {
  const cols = mobile || pairs <= 8 ? 4 : 6;
  const rows = (pairs * 2) / cols;
  const width = mobile ? 640 : cols === 4 ? 680 : 960;
  const height = Math.max(660, rows * STEP_Y + (mobile ? 112 : 148));
  return {
    width,
    height,
    cols,
    rows,
    centerX: (width - (cols - 1) * STEP_X) / 2,
    centerY: rows < 4 ? (height - (rows - 1) * STEP_Y) / 2 : mobile ? 100 : 120,
  };
}
export type BoardLayout = ReturnType<typeof getBoardLayout>;
/** The logical empty border is drawn in the visible gutter, never outside the canvas. */
export function routePoint(layout: BoardLayout, cell: { x: number; y: number }) {
  return {
    x:
      cell.x === 0
        ? layout.centerX - 86
        : cell.x === layout.cols + 1
          ? layout.centerX + (layout.cols - 1) * STEP_X + 86
          : layout.centerX + (cell.x - 1) * STEP_X,
    y:
      cell.y === 0
        ? layout.centerY - 78
        : cell.y === layout.rows + 1
          ? layout.centerY + (layout.rows - 1) * STEP_Y + 78
          : layout.centerY + (cell.y - 1) * STEP_Y,
  };
}
