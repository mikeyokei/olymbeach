/**
 * Custom hook for face detection and tracking
 * Manages the detection loop with throttling and face tracking state
 */

import { useEffect, useRef, useState, RefObject } from 'react';
import { FaceBox } from '../types';
import { detectFaces } from '../services/visionService';
import { updateTrackedFaces, assignFacesToSlots, TrackedFace } from '../utils/faceMatching';
import { FACE_TRACKING, SLOTS } from '../utils/constants';

interface UseFaceTrackingProps {
  videoRef: RefObject<HTMLVideoElement>;
  isVideoReady: boolean;
  isModelReady: boolean;
}

export const useFaceTracking = ({ videoRef, isVideoReady, isModelReady }: UseFaceTrackingProps) => {
  // State for rendering: Maps Slot Index -> FaceBox
  const [displayFaces, setDisplayFaces] = useState<(FaceBox | null)[]>(
    new Array(SLOTS.length).fill(null)
  );

  // Persistent tracking refs
  const trackedFacesRef = useRef<TrackedFace[]>([]);
  const nextFaceIdRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isVideoReady || !isModelReady) return;

    let animationFrameId: number;
    let isRunning = true;

    const trackingLoop = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const now = performance.now();

        // Throttle detection to reduce CPU usage (from 60fps to ~20fps)
        if (now - lastDetectionTimeRef.current >= FACE_TRACKING.DETECTION_INTERVAL) {
          lastDetectionTimeRef.current = now;

          // Run face detection
          const detections = detectFaces(video, now);

          // Convert to FaceBox format
          const currentBoxes: FaceBox[] = detections.map((d) => ({
            x: d.boundingBox.originX,
            y: d.boundingBox.originY,
            width: d.boundingBox.width,
            height: d.boundingBox.height,
          }));

          // Update tracking
          const { updatedTracks, newNextId } = updateTrackedFaces(
            currentBoxes,
            trackedFacesRef.current,
            nextFaceIdRef.current,
            now
          );

          trackedFacesRef.current = updatedTracks;
          nextFaceIdRef.current = newNextId;

          // Assign to display slots
          const newDisplayFaces = assignFacesToSlots(updatedTracks, SLOTS.length);
          setDisplayFaces(newDisplayFaces);
        }
      }

      animationFrameId = requestAnimationFrame(trackingLoop);
    };

    trackingLoop();

    return () => {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [videoRef, isVideoReady, isModelReady]);

  return { displayFaces };
};

