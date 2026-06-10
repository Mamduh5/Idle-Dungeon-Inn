export function clampInnCameraScroll(scrollX: number, maxScrollX: number): number {
  if (!Number.isFinite(scrollX)) {
    return 0;
  }

  return Math.min(Math.max(scrollX, 0), maxScrollX);
}

export function getInnCameraScrollForCreate(
  savedScrollX: number | undefined,
  initialScrollX: number,
  maxScrollX: number
): number {
  if (!Number.isFinite(savedScrollX)) {
    return clampInnCameraScroll(initialScrollX, maxScrollX);
  }

  return clampInnCameraScroll(savedScrollX, maxScrollX);
}
