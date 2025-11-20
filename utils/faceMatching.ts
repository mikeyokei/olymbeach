/**
 * Face Tracking Algorithms
 * Handles matching detected faces across frames and managing tracked face lifecycle
 */

import { FaceBox } from '../types';
import { FACE_TRACKING } from './constants';

export interface TrackedFace {
  id: number;
  data: FaceBox;
  lastSeen: number;
}

/**
 * Calculate Euclidean distance between two face centers
 */
export const calculateFaceDistance = (face1: FaceBox, face2: FaceBox): number => {
  const center1X = face1.x + face1.width / 2;
  const center1Y = face1.y + face1.height / 2;
  const center2X = face2.x + face2.width / 2;
  const center2Y = face2.y + face2.height / 2;
  
  return Math.hypot(center1X - center2X, center1Y - center2Y);
};

/**
 * Find the best matching tracked face for a new detection
 * Returns the index of the matched track, or -1 if no match found
 */
export const findBestMatch = (
  newFace: FaceBox,
  trackedFaces: TrackedFace[],
  usedIndices: Set<number>
): number => {
  let bestIdx = -1;
  let minDistance = Number.MAX_VALUE;

  trackedFaces.forEach((track, idx) => {
    if (usedIndices.has(idx)) return;
    
    const distance = calculateFaceDistance(newFace, track.data);
    
    if (distance < minDistance && distance < FACE_TRACKING.MATCH_DISTANCE_THRESHOLD) {
      minDistance = distance;
      bestIdx = idx;
    }
  });

  return bestIdx;
};

/**
 * Update tracked faces with new detections
 * Returns updated list of tracked faces
 */
export const updateTrackedFaces = (
  currentDetections: FaceBox[],
  trackedFaces: TrackedFace[],
  nextFaceId: number,
  currentTime: number
): { updatedTracks: TrackedFace[]; newNextId: number } => {
  const activeTracks = [...trackedFaces];
  const usedDetectionIndices = new Set<number>();

  // Step 1: Update existing tracks with matching detections
  activeTracks.forEach((track) => {
    let bestDetectionIdx = -1;
    let minDistance = Number.MAX_VALUE;

    currentDetections.forEach((detection, idx) => {
      if (usedDetectionIndices.has(idx)) return;
      
      const distance = calculateFaceDistance(detection, track.data);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestDetectionIdx = idx;
      }
    });

    // Update track if match found within threshold
    if (bestDetectionIdx !== -1 && minDistance < FACE_TRACKING.MATCH_DISTANCE_THRESHOLD) {
      track.data = currentDetections[bestDetectionIdx];
      track.lastSeen = currentTime;
      usedDetectionIndices.add(bestDetectionIdx);
    }
  });

  // Step 2: Create new tracks for unmatched detections
  let currentNextId = nextFaceId;
  currentDetections.forEach((detection, idx) => {
    if (!usedDetectionIndices.has(idx)) {
      activeTracks.push({
        id: currentNextId++,
        data: detection,
        lastSeen: currentTime,
      });
    }
  });

  // Step 3: Prune stale tracks
  const prunedTracks = activeTracks.filter(
    (track) => currentTime - track.lastSeen < FACE_TRACKING.STALE_TRACK_TIMEOUT
  );

  // Step 4: Sort by ID (arrival time) - lowest ID arrived first
  prunedTracks.sort((a, b) => a.id - b.id);

  return {
    updatedTracks: prunedTracks,
    newNextId: currentNextId,
  };
};

/**
 * Convert tracked faces to display slots
 * Takes top 3 tracked faces and assigns them to slots
 */
export const assignFacesToSlots = (
  trackedFaces: TrackedFace[],
  numSlots: number = 3
): (FaceBox | null)[] => {
  const slots: (FaceBox | null)[] = new Array(numSlots).fill(null);
  
  trackedFaces.slice(0, numSlots).forEach((track, i) => {
    slots[i] = track.data;
  });

  return slots;
};

