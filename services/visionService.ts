import { FaceDetector, FilesetResolver, Detection } from "@mediapipe/tasks-vision";

let faceDetector: FaceDetector | null = null;

export const initializeFaceDetector = async (): Promise<void> => {
  if (faceDetector) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
  });
};

export const detectFaces = (video: HTMLVideoElement, startTimeMs: number): Detection[] => {
  if (!faceDetector) return [];
  try {
    const result = faceDetector.detectForVideo(video, startTimeMs);
    return result.detections;
  } catch (e) {
    console.error("Detection error:", e);
    return [];
  }
};
