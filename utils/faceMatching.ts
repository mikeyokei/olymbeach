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
  slotIndex?: number; // Assigned slot index (random assignment)
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
 * Get available slot indices that are not currently assigned
 */
const getAvailableSlots = (trackedFaces: TrackedFace[], numSlots: number): number[] => {
  const usedSlots = new Set(
    trackedFaces
      .filter(track => track.slotIndex !== undefined)
      .map(track => track.slotIndex!)
  );
  
  const available: number[] = [];
  for (let i = 0; i < numSlots; i++) {
    if (!usedSlots.has(i)) {
      available.push(i);
    }
  }
  return available;
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Assign random slot to a new face
 */
export const assignRandomSlot = (
  trackedFaces: TrackedFace[],
  newFace: TrackedFace,
  numSlots: number
): number | undefined => {
  const available = getAvailableSlots(trackedFaces, numSlots);
  if (available.length === 0) return undefined;
  
  // Pick a random available slot
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
};

/**
 * Convert tracked faces to display slots
 * Uses random slot assignment - faces keep their assigned slot
 */
export const assignFacesToSlots = (
  trackedFaces: TrackedFace[],
  numSlots: number = 3
): (FaceBox | null)[] => {
  const slots: (FaceBox | null)[] = new Array(numSlots).fill(null);
  
  // Assign faces that already have a slot
  trackedFaces.forEach((track) => {
    if (track.slotIndex !== undefined && track.slotIndex < numSlots) {
      slots[track.slotIndex] = track.data;
    }
  });
  
  // Find faces without slots and available slots
  const unassignedFaces = trackedFaces.filter(
    track => track.slotIndex === undefined || track.slotIndex >= numSlots
  );
  const availableSlots = getAvailableSlots(trackedFaces, numSlots);
  
  // Randomly assign unassigned faces to available slots
  const shuffledSlots = shuffleArray(availableSlots);
  unassignedFaces.slice(0, shuffledSlots.length).forEach((track, i) => {
    track.slotIndex = shuffledSlots[i];
    slots[shuffledSlots[i]] = track.data;
  });

  return slots;
};

