import React, { useEffect, useRef } from 'react';
import { FaceBox } from '../types';
import { CANVAS_CONFIG } from '../utils/constants';

interface HeadBubbleProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  faceBox: FaceBox | null;
  color: string;
  isActive: boolean;
  style?: React.CSSProperties;
}

export const HeadBubble: React.FC<HeadBubbleProps> = ({ videoRef, faceBox, color, isActive, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTimeRef = useRef<number>(0);

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

          const size = CANVAS_CONFIG.INTERNAL_SIZE;
          
          // Only resize canvas if dimensions changed (avoid unnecessary resets)
          if (canvas.width !== size || canvas.height !== size) {
            canvas.width = size;
            canvas.height = size;
          }

          // Clear
          ctx.clearRect(0, 0, size, size);

          // Circular Clip
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.clip();

          // Background fill
          ctx.fillStyle = "#222";
          ctx.fillRect(0, 0, size, size);

          // Draw Video
          // Calculate source coordinates with padding around the face
          const padding = faceBox.width * CANVAS_CONFIG.FACE_PADDING_MULTIPLIER; 
          const sx = Math.max(0, faceBox.x - padding / 2);
          const sy = Math.max(0, faceBox.y - padding * CANVAS_CONFIG.FACE_PADDING_TOP_MULTIPLIER);
          const sw = faceBox.width + padding;
          const sh = faceBox.height + padding * CANVAS_CONFIG.FACE_PADDING_BOTTOM_MULTIPLIER;

          // Mirror and Draw
          ctx.scale(-1, 1);
          ctx.translate(-size, 0);
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size);
          ctx.restore();

          // Inner Border (adds a nice sticker effect)
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, (size / 2) - 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (canvas && ctx && !isActive) {
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
  }, [videoRef, faceBox, isActive]);

  return (
    <div 
      className={`absolute transition-all duration-500 ease-out ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
      style={{
        ...style,
        width: 'var(--bubble-size, 160px)',
        height: 'var(--bubble-size, 160px)',
      }}
    >
      <div 
        className="w-full h-full rounded-full overflow-hidden shadow-2xl bg-black border-[3px] sm:border-[4px] relative z-10"
        style={{ borderColor: color }}
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