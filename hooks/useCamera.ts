/**
 * Custom hook for managing camera initialization and video stream
 * Handles camera permissions, stream setup, and optimized video constraints
 */

import { useEffect, useRef, useState } from 'react';
import { AppStatus } from '../types';
import { CAMERA_CONFIG } from '../utils/constants';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.WAITING_FOR_CAMERA);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initializeCamera = async () => {
      try {
        // Request camera with optimized constraints to reduce lag
        stream = await navigator.mediaDevices.getUserMedia({
          video: CAMERA_CONFIG,
          audio: false, // Explicitly disable audio
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video metadata to be loaded
          videoRef.current.onloadedmetadata = () => {
            setIsVideoReady(true);
            setStatus(AppStatus.READY);
          };
        }
      } catch (err) {
        console.error('Camera initialization failed:', err);
        setStatus(AppStatus.ERROR);
      }
    };

    initializeCamera();

    // Cleanup: Stop all tracks when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsVideoReady(false);
    };
  }, []);

  return {
    videoRef,
    status,
    isVideoReady,
  };
};

