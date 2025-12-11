import React, { useEffect, useRef } from 'react';
import { FaceBox } from '../types';
import { CANVAS_CONFIG, ShapeConfig } from '../utils/constants';
import { useDraggable } from '../hooks/useDraggable';

interface HeadBubbleProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  faceBox: FaceBox | null;
  color: string;
  isActive: boolean;
  style?: React.CSSProperties;
  onDragMove?: (position: { x: number; y: number }) => void;
  shape: ShapeConfig;
}

// Smoothing factor: 0 = instant (no smoothing), 1 = never moves
// Lower values = more responsive but jittery, higher = smoother but laggy
const SMOOTHING_FACTOR = 0.3;

export const HeadBubble: React.FC<HeadBubbleProps> = ({ videoRef, faceBox, color, isActive, style, onDragMove, shape }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Smoothed face position for stable rendering
  const smoothedFaceRef = useRef<FaceBox | null>(null);
  
  const { position, isDragging, handlers, dragListeners } = useDraggable();

  // Global drag listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', dragListeners.onMouseMove);
      document.addEventListener('mouseup', dragListeners.onMouseUp);
      document.addEventListener('touchmove', dragListeners.onTouchMove);
      document.addEventListener('touchend', dragListeners.onTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', dragListeners.onMouseMove);
        document.removeEventListener('mouseup', dragListeners.onMouseUp);
        document.removeEventListener('touchmove', dragListeners.onTouchMove);
        document.removeEventListener('touchend', dragListeners.onTouchEnd);
      };
    }
  }, [isDragging, dragListeners]);

  // Notify parent of position changes
  useEffect(() => {
    if (onDragMove && (position.x !== 0 || position.y !== 0)) {
      onDragMove(position);
    }
  }, [position, onDragMove]);

  useEffect(() => {
    let animationFrameId: number;
    const TARGET_FPS = 30; // Reduced from 60fps for better performance
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const render = (currentTime: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: true, desynchronized: true });

      if (video && canvas && ctx && isActive && faceBox) {
        // Throttle rendering to target FPS
        const elapsed = currentTime - lastRenderTimeRef.current;
        
        if (elapsed >= FRAME_INTERVAL) {
          lastRenderTimeRef.current = currentTime;

          // Apply smoothing to face position for stability
          const smoothed = smoothedFaceRef.current;
          if (!smoothed) {
            // First detection - use as-is
            smoothedFaceRef.current = { ...faceBox };
          } else {
            // Smooth interpolation toward new position
            smoothedFaceRef.current = {
              x: smoothed.x + (faceBox.x - smoothed.x) * (1 - SMOOTHING_FACTOR),
              y: smoothed.y + (faceBox.y - smoothed.y) * (1 - SMOOTHING_FACTOR),
              width: smoothed.width + (faceBox.width - smoothed.width) * (1 - SMOOTHING_FACTOR),
              height: smoothed.height + (faceBox.height - smoothed.height) * (1 - SMOOTHING_FACTOR),
            };
          }
          
          const face = smoothedFaceRef.current;
          
          // Calculate canvas dimensions based on shape aspect ratio
          const aspectRatio = shape.viewBoxWidth / shape.viewBoxHeight;
          const baseSize = CANVAS_CONFIG.INTERNAL_SIZE;
          const canvasWidth = aspectRatio >= 1 ? baseSize : Math.round(baseSize * aspectRatio);
          const canvasHeight = aspectRatio >= 1 ? Math.round(baseSize / aspectRatio) : baseSize;
          
          // Only resize canvas if dimensions changed (avoid unnecessary resets)
          if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
          }

          // Clear
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          // Background fill (no circular clip - CSS clip-path handles the shape)
          ctx.save();
          ctx.fillStyle = "#222";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // Draw Video
          // Calculate source coordinates with padding around the face
          const padding = face.width * CANVAS_CONFIG.FACE_PADDING_MULTIPLIER; 
          let sx = face.x - padding / 2;
          let sy = face.y - padding * CANVAS_CONFIG.FACE_PADDING_TOP_MULTIPLIER;
          let sw = face.width + padding;
          let sh = face.height + padding * CANVAS_CONFIG.FACE_PADDING_BOTTOM_MULTIPLIER;

          // Get actual video dimensions
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;

          // Clamp source region to stay within video bounds
          if (sx < 0) {
            sw += sx; // reduce width by the overflow
            sx = 0;
          }
          if (sy < 0) {
            sh += sy; // reduce height by the overflow
            sy = 0;
          }
          if (sx + sw > videoWidth) {
            sw = videoWidth - sx;
          }
          if (sy + sh > videoHeight) {
            sh = videoHeight - sy;
          }

          // Ensure minimum size to avoid drawing issues
          sw = Math.max(sw, 10);
          sh = Math.max(sh, 10);

          // Mirror and Draw
          ctx.scale(-1, 1);
          ctx.translate(-canvasWidth, 0);
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
          ctx.restore();
        }
      } else if (canvas && ctx && !isActive) {
        // Reset smoothed position when inactive
        smoothedFaceRef.current = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (isActive) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (isActive) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [videoRef, faceBox, isActive, shape]);

  // Calculate aspect ratio for sizing
  const aspectRatio = shape.viewBoxWidth / shape.viewBoxHeight;
  
  return (
    <div 
      ref={containerRef}
      className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
      style={{
        ...style,
        width: aspectRatio >= 1 
          ? 'var(--bubble-size, 160px)' 
          : `calc(var(--bubble-size, 160px) * ${aspectRatio})`,
        height: aspectRatio >= 1 
          ? `calc(var(--bubble-size, 160px) / ${aspectRatio})` 
          : 'var(--bubble-size, 160px)',
        left: style?.left ? `calc(${style.left} + ${position.x}px)` : position.x,
        top: style?.top ? `calc(${style.top} + ${position.y}px)` : position.y,
        transition: isDragging ? 'none' : 'all 500ms ease-out',
        pointerEvents: 'auto',
      }}
      {...handlers}
    >
      <div 
        className="w-full h-full overflow-hidden shadow-2xl bg-black relative z-10"
        style={{ 
          clipPath: `url(#${shape.clipPathId})`,
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
      </div>
      
      {/* Optional: Shadow/Platform effect underneath - hidden on very small screens */}
      <div 
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/40 blur-md rounded-full -z-10 hidden sm:block"
      />
    </div>
  );
};