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
  shape?: ShapeConfig;
  initialOffset?: { x: number; y: number };
  onDragMove?: (position: { x: number; y: number }) => void;
}

// Smoothing factor: 0 = instant (no smoothing), 1 = never moves
// Lower values = more responsive but jittery, higher = smoother but laggy
const SMOOTHING_FACTOR = 0.3;

export const HeadBubble: React.FC<HeadBubbleProps> = ({ videoRef, faceBox, color, isActive, style, shape, initialOffset, onDragMove }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Smoothed face position for stable rendering
  const smoothedFaceRef = useRef<FaceBox | null>(null);
  
  const { position, isDragging, handlers, dragListeners } = useDraggable(initialOffset || { x: 0, y: 0 });

  // Calculate aspect ratio for the shape to prevent stretching
  const shapeAspectRatio = shape 
    ? shape.viewBoxWidth / shape.viewBoxHeight 
    : 1;

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
          const baseSize = CANVAS_CONFIG.INTERNAL_SIZE;
          
          // Calculate canvas dimensions based on shape aspect ratio
          let canvasWidth: number;
          let canvasHeight: number;
          if (shapeAspectRatio >= 1) {
            // Wide or square shape
            canvasWidth = baseSize;
            canvasHeight = Math.round(baseSize / shapeAspectRatio);
          } else {
            // Tall shape
            canvasWidth = Math.round(baseSize * shapeAspectRatio);
            canvasHeight = baseSize;
          }
          
          // Only resize canvas if dimensions changed (avoid unnecessary resets)
          if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
          }

          // Clear
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          // Background fill
          ctx.fillStyle = "#222";
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // No canvas clipping - using CSS clip-path instead
          ctx.save();

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

          // Adjust source region to match canvas aspect ratio
          // This ensures the face isn't stretched
          const sourceAspect = sw / sh;
          const canvasAspect = canvasWidth / canvasHeight;
          
          const centerX = sx + sw / 2;
          const centerY = sy + sh / 2;
          
          if (sourceAspect > canvasAspect) {
            // Source is wider, need to increase height
            const newHeight = sw / canvasAspect;
            sy = centerY - newHeight / 2;
            sh = newHeight;
          } else {
            // Source is taller, need to increase width
            const newWidth = sh * canvasAspect;
            sx = centerX - newWidth / 2;
            sw = newWidth;
          }

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
  }, [videoRef, faceBox, isActive, shapeAspectRatio]);

  // Calculate dimensions that maintain aspect ratio within the bubble size
  // Wide shapes (aspect > 1): width = bubbleSize, height = bubbleSize / aspect
  // Tall shapes (aspect < 1): height = bubbleSize, width = bubbleSize * aspect
  const getShapeDimensions = () => {
    if (shapeAspectRatio >= 1) {
      // Wide or square shape
      return { width: '100%', height: `${100 / shapeAspectRatio}%` };
    } else {
      // Tall shape (like CÚP-01)
      return { width: `${100 * shapeAspectRatio}%`, height: '100%' };
    }
  };

  const shapeDims = getShapeDimensions();

  return (
    <div 
      ref={containerRef}
      className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
      style={{
        ...style,
        width: 'var(--bubble-size, 160px)',
        height: 'var(--bubble-size, 160px)',
        left: style?.left ? `calc(${style.left} + ${position.x}px)` : position.x,
        top: style?.top ? `calc(${style.top} + ${position.y}px)` : position.y,
        transition: isDragging ? 'none' : 'all 500ms ease-out',
        pointerEvents: 'auto',
      }}
      {...handlers}
    >
      {/* Inner wrapper with padding for stroke - centered */}
      <div className="absolute inset-[-5%] flex items-center justify-center">
        <div 
          className="shadow-2xl bg-black relative"
          style={{ 
            width: shapeDims.width,
            height: shapeDims.height,
            clipPath: shape ? `url(#${shape.clipPathId})` : 'circle(50%)',
          }}
        >
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
        </div>
        
        {/* SVG Stroke Overlay - same dimensions as clipped area */}
        {shape && (
          <svg 
            className="absolute pointer-events-none"
            style={{
              width: shapeDims.width,
              height: shapeDims.height,
            }}
            viewBox={`0 0 ${shape.viewBoxWidth} ${shape.viewBoxHeight}`}
            preserveAspectRatio="none"
          >
            <path
              d={shape.path}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      
      {/* Optional: Shadow/Platform effect underneath - hidden on very small screens */}
      <div 
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/40 blur-md rounded-full -z-10 hidden sm:block"
      />
    </div>
  );
};