export const normalizePriceValue = (value) =>
  Number.isFinite(value) && value > 0 ? value : null;

export const formatCurrency = (value) => `DKK ${value}`;

export const formatPriceRangeLabel = (priceType, min, max, formatMessage) => {
  if (priceType === 'free') {
    return formatMessage('price_free', {});
  }
  const minValue = normalizePriceValue(min);
  const maxValue = normalizePriceValue(max);
  if (minValue !== null && maxValue !== null) {
    return `від ${formatCurrency(minValue)} до ${formatCurrency(maxValue)}`;
  }
  if (minValue !== null) return formatCurrency(minValue);
  if (maxValue !== null) return formatCurrency(maxValue);
  return formatMessage('price_tbd', {}) || 'Ціна уточнюється';
};
