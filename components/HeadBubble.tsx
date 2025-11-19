import React, { useEffect, useRef } from 'react';
import { FaceBox } from '../types';

interface HeadBubbleProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  faceBox: FaceBox | null;
  color: string;
  isActive: boolean;
  style?: React.CSSProperties;
}

export const HeadBubble: React.FC<HeadBubbleProps> = ({ videoRef, faceBox, color, isActive, style }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (video && canvas && ctx && isActive && faceBox) {
        const size = 300; // Internal resolution
        canvas.width = size;
        canvas.height = size;

        // Clear
        ctx.clearRect(0, 0, size, size);

        // Circular Clip
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        // Background fill
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, size, size);

        // Draw Video
        // Calculate source coordinates with some padding around the face
        const padding = faceBox.width * 0.6; 
        const sx = Math.max(0, faceBox.x - padding / 2);
        const sy = Math.max(0, faceBox.y - padding);
        const sw = faceBox.width + padding;
        const sh = faceBox.height + padding * 1.5;

        // Mirror and Draw
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-size, 0);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size);
        ctx.restore();

        // Inner Border (optional, adds a nice sticker effect)
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, (size / 2) - 2, 0, Math.PI * 2);
        ctx.stroke();

      } else if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (isActive) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (isActive) {
      render();
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [videoRef, faceBox, isActive, color]);

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
        className="w-full h-full rounded-full overflow-hidden shadow-2xl bg-black border-[4px] relative z-10"
        style={{ borderColor: color }}
      >
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
      </div>
      
      {/* Optional: Shadow/Platform effect underneath */}
      <div 
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/40 blur-md rounded-full -z-10"
      />
    </div>
  );
};