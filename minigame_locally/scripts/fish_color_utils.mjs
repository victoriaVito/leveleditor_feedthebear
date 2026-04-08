/**
 * Fish Color System Utilities
 * Provides helpers for working with fish colors in minigame levels
 * 
 * 14 Fish Colors:
 * R (Red): fish_red, fish_red_striped
 * B (Blue): fish_blue, fish_blue_striped
 * G (Green): fish_green, fish_green_striped
 * Y (Yellow): fish_yellow, fish_yellow_striped
 * O (Orange): fish_orange, fish_orange_striped
 * P (Purple): fish_purple, fish_purple_striped
 * C (Cyan): fish_cyan, fish_cyan_striped
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load color configuration
const FISH_COLORS_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/fish_colors.json'), 'utf8')
);

/**
 * Get all available fish colors
 */
export function getAllFishColors() {
  return FISH_COLORS_CONFIG.colors;
}

/**
 * Get color by ID (e.g., 'fish_red', 'fish_blue_striped')
 */
export function getFishColorById(colorId) {
  return FISH_COLORS_CONFIG.colors.find(c => c.id === colorId);
}

/**
 * Normalize hex colors to uppercase so lookups are stable.
 */
export function normalizeHexColor(hex) {
  return typeof hex === 'string' ? hex.trim().toUpperCase() : null;
}

/**
 * Get color for a given letter (e.g., 'A' returns fish_red)
 */
export function getColorByLetter(letter) {
  const colorId = FISH_COLORS_CONFIG.letterMap[letter];
  if (!colorId) throw new Error(`Letter '${letter}' not found in fish color map`);
  return getFishColorById(colorId);
}

/**
 * Get all colors for a species (e.g., 'red' returns red and red_striped)
 */
export function getColorsBySpecies(species) {
  return FISH_COLORS_CONFIG.colors.filter(c => c.species === species);
}

/**
 * Get hex color by ID
 */
export function getHexColorById(colorId) {
  const color = getFishColorById(colorId);
  return color ? color.hex : null;
}

/**
 * Get letter for a color ID
 */
export function getLetterForColor(colorId) {
  const color = getFishColorById(colorId);
  return color ? color.letter : null;
}

/**
 * Check if a color ID is striped variant
 */
export function isStripedVariant(colorId) {
  return typeof colorId === 'string' && colorId.includes('striped');
}

/**
 * Get solid variant for a color (returns the non-striped version)
 */
export function getSolidVariant(colorId) {
  const color = getFishColorById(colorId);
  if (!color) return null;
  
  if (isStripedVariant(colorId)) {
    // Return solid version
    return getFishColorById(colorId.replace('_striped', ''));
  }
  return color;
}

/**
 * Get striped variant for a color
 */
export function getStripedVariant(colorId) {
  const color = getFishColorById(colorId);
  if (!color) return null;
  
  if (!isStripedVariant(colorId)) {
    // Return striped version
    return getFishColorById(`${colorId}_striped`);
  }
  return color;
}

/**
 * Convert hex color to color ID
 */
export function getColorIdByHex(hex) {
  const normalizedHex = normalizeHexColor(hex);
  if (!normalizedHex) return null;
  return FISH_COLORS_CONFIG.colorMap[normalizedHex] || FISH_COLORS_CONFIG.legacyColorMap?.[normalizedHex] || null;
}

/**
 * Get the canonical fish color entry for any supported or legacy hex color.
 */
export function getCanonicalColorByHex(hex) {
  const colorId = getColorIdByHex(hex);
  return colorId ? getFishColorById(colorId) : null;
}

/**
 * Get color statistics
 */
export function getColorStats() {
  return {
    totalColors: FISH_COLORS_CONFIG.colors.length,
    solidColors: FISH_COLORS_CONFIG.colors.filter(c => c.variant === 'solid').length,
    stripedColors: FISH_COLORS_CONFIG.colors.filter(c => c.variant === 'striped').length,
    uniqueLetters: Object.keys(FISH_COLORS_CONFIG.letterMap).length,
  };
}

/**
 * Generate color palette HTML for preview
 */
export function generateColorPaletteHTML() {
  let html = `
<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 20px;">
`;

  FISH_COLORS_CONFIG.colors.forEach(color => {
    html += `
  <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
    <div style="
      width: 100%;
      height: 60px;
      background-color: ${color.hex};
      border-radius: 4px;
      margin-bottom: 8px;
    "></div>
    <strong>${color.name}</strong><br/>
    <small>ID: ${color.id}<br/>Letter: ${color.letter}<br/>Hex: ${color.hex}</small>
  </div>
`;
  });

  html += `</div>`;
  return html;
}

export default {
  getAllFishColors,
  getFishColorById,
  normalizeHexColor,
  getColorByLetter,
  getColorsBySpecies,
  getHexColorById,
  getLetterForColor,
  isStripedVariant,
  getSolidVariant,
  getStripedVariant,
  getColorIdByHex,
  getCanonicalColorByHex,
  getColorStats,
  generateColorPaletteHTML,
};
