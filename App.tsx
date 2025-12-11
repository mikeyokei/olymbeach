import React, { useEffect, useState } from 'react';
import { initializeFaceDetector } from './services/visionService';
import { HeadBubble } from './components/HeadBubble';
import { AppStatus } from './types';
import { useCamera } from './hooks/useCamera';
import { useFaceTracking } from './hooks/useFaceTracking';
import { SLOTS, STATIC_BG_URL, SHAPES } from './utils/constants';

const App: React.FC = () => {
  const [modelReady, setModelReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize camera
  const { videoRef, status, isVideoReady } = useCamera();
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Initialize face detection model
  useEffect(() => {
    const initModel = async () => {
      try {
        await initializeFaceDetector();
        setModelReady(true);
      } catch (err) {
        console.error('Model initialization failed:', err);
      }
    };
    initModel();
  }, []);
  
  // Track faces
  const { displayFaces } = useFaceTracking({
    videoRef,
    isVideoReady,
    isModelReady: modelReady,
  });


  return (
    <div className="w-full h-screen overflow-hidden bg-neutral-900 flex items-center justify-center">
      
      {/* SVG Clip Path Definitions */}
      <svg width="0" height="0" className="absolute">
        <defs>
          {SHAPES.map((shape) => (
            <clipPath 
              key={shape.clipPathId} 
              id={shape.clipPathId}
              clipPathUnits="objectBoundingBox"
            >
              <path 
                d={shape.path} 
                transform={`scale(${1/shape.viewBoxWidth}, ${1/shape.viewBoxHeight})`}
              />
            </clipPath>
          ))}
        </defs>
      </svg>

      {/* Hidden Video - Optimized for performance */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute opacity-0 pointer-events-none"
        style={{ objectFit: 'cover' }}
      />

      {/* Main Stage Container - Wrapper for proper positioning */}
      <div className="relative inline-block shadow-2xl sm:border-[8px] border-black sm:rounded-lg" style={{ width: '720px', height: '1280px', maxWidth: '100vw', maxHeight: '100vh' }}>
        
        {/* Background Video - Defines the exact size (720x1280) */}
        <video 
          src={STATIC_BG_URL} 
          autoPlay 
          loop 
          muted 
          playsInline
          className="block w-full h-full object-cover"
        />

        {/* Characters Layer - Positioned absolutely over the video */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {SLOTS.map((slot, idx) => {
             const face = displayFaces[idx];
             // Responsive bubble size: smaller on mobile
             const responsiveSize = isMobile ? slot.size * 0.7 : slot.size;
             const style = {
               '--bubble-size': `${responsiveSize}px`,
               left: slot.left,
               top: slot.top,
               transform: 'translate(-50%, -50%)',
               zIndex: slot.zIndex
             } as React.CSSProperties;

             return (
               <HeadBubble 
                  key={slot.id}
                  isActive={!!face}
                  faceBox={face}
                  videoRef={videoRef}
                  color={slot.color}
                  style={style}
                  shape={slot.shape}
               />
             );
          })}
        </div>
      </div>

      {/* Status Indicator (optional - only for errors) */}
      {status === AppStatus.ERROR && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500/90 backdrop-blur px-4 py-2 rounded-lg border border-red-400">
            <span className="text-white font-semibold">Camera Error</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;