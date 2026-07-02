import typeColors from '../data/typeColors';

/**
 * Convert hex color to rgba string
 */
export const hexToRgba = (hex, alpha) => {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Get a type-based background style for a Pokemon (gradient for dual type)
 */
export const getBackgroundStyle = (pokemon) => {
  if (!pokemon || !pokemon.summary || !pokemon.summary.types) return undefined;
  const types = pokemon.summary.types;
  if (types.length === 1) {
    const c = typeColors[types[0]];
    return hexToRgba(c, 0.4);
  } else if (types.length >= 2) {
    const c1 = hexToRgba(typeColors[types[0]], 0.4);
    const c2 = hexToRgba(typeColors[types[1]], 0.4);
    return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
  }
  return undefined;
};
