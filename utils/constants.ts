/**
 * Application Configuration and Constants
 */

export interface SlotConfig {
  id: string;
  left: string;
  top: string;
  size: number;
  color: string;
  zIndex: number;
}

// Slot Configuration matching "CÚP" trophy artwork
// 1st (Winner) -> Middle Top (Inside the cup)
// 2nd -> Right position
// 3rd -> Left position
// Note: Sizes will be responsive via CSS (scaled down on mobile)
export const SLOTS: SlotConfig[] = [
  { id: 'winner', left: '50%', top: '30%', size: 180, color: '#fbbf24', zIndex: 30 }, // Gold (Inside Cup)
  { id: 'second', left: '80%', top: '50%', size: 140, color: '#38bdf8', zIndex: 20 }, // Blue (Right)
  { id: 'third',  left: '20%', top: '50%', size: 140, color: '#a855f7', zIndex: 20 }, // Purple (Left)
];

// Background image - using CÚP.png trophy image (relative path for GitHub Pages)
export const STATIC_BG_URL = "./CÚP.png";

// Face tracking thresholds
export const FACE_TRACKING = {
  // Maximum distance (pixels) between frames to consider same face
  MATCH_DISTANCE_THRESHOLD: 200,
  // Time (ms) before removing a face from tracking
  STALE_TRACK_TIMEOUT: 500,
  // Detection frame rate (ms between detections) - reduces from 60fps to ~20fps
  DETECTION_INTERVAL: 50,
} as const;

// Camera configuration
export const CAMERA_CONFIG = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
  // Optimize for performance
  frameRate: { ideal: 30, max: 30 },
  aspectRatio: { ideal: 16/9 },
} as const;

// Canvas rendering
export const CANVAS_CONFIG = {
  // Internal resolution for face bubble canvas
  INTERNAL_SIZE: 300,
  // Padding around detected face
  FACE_PADDING_MULTIPLIER: 0.6,
  FACE_PADDING_TOP_MULTIPLIER: 1.0,
  FACE_PADDING_BOTTOM_MULTIPLIER: 1.5,
} as const;

