export const getMaxScrollLeft = (scrollWidth = 0, clientWidth = 0) =>
  Math.max(0, Number(scrollWidth || 0) - Number(clientWidth || 0));

export const getNextScrollLeft = (currentLeft = 0, direction = 1, step = 0, maxLeft = 0) => {
  const current = Math.max(0, Number(currentLeft || 0));
  const delta = Number(step || 0) * (Number(direction || 0) >= 0 ? 1 : -1);
  const next = current + delta;
  return Math.max(0, Math.min(Number(maxLeft || 0), next));
};
