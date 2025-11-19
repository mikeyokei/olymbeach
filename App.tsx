import React, { useEffect, useRef, useState } from 'react';
import { initializeFaceDetector, detectFaces } from './services/visionService';
import { generateBackgroundImage } from './services/geminiService';
import { HeadBubble } from './components/HeadBubble';
import { FaceBox, AppStatus } from './types';

// Tracker Interface
interface TrackedFace {
  id: number;
  data: FaceBox;
  lastSeen: number;
}

// Updated Slot Configuration to match the specific "You Got A Star" artwork provided
// 1st (Winner) -> Middle Top (Star in the cup)
// 2nd -> Right Middle (Fish)
// 3rd -> Left Bottom (Squid)
const SLOTS = [
  { id: 'winner', left: '53%', top: '15%', size: 95, color: '#fbbf24', zIndex: 30 }, // Gold (Star)
  { id: 'second', left: '88%', top: '63%', size: 85, color: '#38bdf8', zIndex: 20 }, // Blue (Fish)
  { id: 'third',  left: '13%', top: '70%', size: 85, color: '#a855f7', zIndex: 20 }, // Purple (Squid)
];

// Specific background image provided
const STATIC_BG_URL = "https://i.ibb.co/HMJ0FWf/Screenshot-2025-11-19-at-8-41-19-PM.png";

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.LOADING_MODEL);
  
  // State for rendering: Maps Slot Index -> FaceBox
  const [displayFaces, setDisplayFaces] = useState<(FaceBox | null)[]>([null, null, null]);
  
  // Persistent tracking refs
  const trackedFacesRef = useRef<TrackedFace[]>([]);
  const nextFaceIdRef = useRef<number>(0);

  const [bgImage, setBgImage] = useState<string>(''); 
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const setup = async () => {
      try {
        await initializeFaceDetector();
        setStatus(AppStatus.WAITING_FOR_CAMERA);

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user' 
          } 
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setStatus(AppStatus.READY);
            startTrackingLoop();
          };
        }
      } catch (err) {
        console.error("Initialization failed", err);
        setStatus(AppStatus.ERROR);
      }
    };
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTrackingLoop = () => {
    const loop = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const now = performance.now();
        const detections = detectFaces(videoRef.current, now);
        
        // Convert to FaceBox format
        const currentBoxes: FaceBox[] = detections.map(d => ({
          x: d.boundingBox.originX,
          y: d.boundingBox.originY,
          width: d.boundingBox.width,
          height: d.boundingBox.height
        }));

        // TRACKING LOGIC
        // 1. Update existing tracks
        const activeTracks = [...trackedFacesRef.current];
        const usedBoxes = new Set<number>();

        activeTracks.forEach(track => {
          let bestIdx = -1;
          let minDist = Number.MAX_VALUE;

          // Find closest box center
          const tx = track.data.x + track.data.width / 2;
          const ty = track.data.y + track.data.height / 2;

          currentBoxes.forEach((box, idx) => {
            if (usedBoxes.has(idx)) return;
            const bx = box.x + box.width / 2;
            const by = box.y + box.height / 2;
            const dist = Math.hypot(tx - bx, ty - by);
            
            if (dist < minDist) {
              minDist = dist;
              bestIdx = idx;
            }
          });

          // Threshold for matching
          if (bestIdx !== -1 && minDist < 200) {
            track.data = currentBoxes[bestIdx];
            track.lastSeen = now;
            usedBoxes.add(bestIdx);
          }
        });

        // 2. Create new tracks for unmatched boxes
        currentBoxes.forEach((box, idx) => {
          if (!usedBoxes.has(idx)) {
            activeTracks.push({
              id: nextFaceIdRef.current++,
              data: box,
              lastSeen: now
            });
          }
        });

        // 3. Prune stale tracks
        const prunedTracks = activeTracks.filter(t => (now - t.lastSeen) < 500);
        
        // 4. Sort by ID (Arrival Time) - Lowest ID = First Arrived = Winner
        prunedTracks.sort((a, b) => a.id - b.id);

        // Update Refs
        trackedFacesRef.current = prunedTracks;

        // 5. Assign to Slots
        // Slot 0: Winner (Middle)
        // Slot 1: Second (Right)
        // Slot 2: Third (Left)
        const newDisplayFaces = [null, null, null] as (FaceBox | null)[];
        
        prunedTracks.slice(0, 3).forEach((track, i) => {
          newDisplayFaces[i] = track.data;
        });

        setDisplayFaces(newDisplayFaces);
      }
      requestAnimationFrame(loop);
    };
    loop();
  };

  const handleGenerateBackground = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
        const newBg = await generateBackgroundImage(prompt);
        setBgImage(newBg);
        setShowControls(false);
    } catch (e) {
        console.error(e);
        alert("Failed to generate background. Check API Key.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-neutral-900 flex items-center justify-center">
      
      {/* Hidden Video */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute opacity-0 pointer-events-none"
        width="1280" 
        height="720"
      />

      {/* Main Stage Container - Portrait Aspect Ratio to match the artwork */}
      <div className="relative h-full max-h-[90vh] aspect-[3/4] bg-black shadow-2xl overflow-hidden border-[8px] border-black rounded-lg">
        
        {/* Background Layer */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src={bgImage || STATIC_BG_URL} 
            alt="Stage Background" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Characters Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {SLOTS.map((slot, idx) => {
             const face = displayFaces[idx];
             const style = {
               '--bubble-size': `${slot.size}px`,
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
               />
             );
          })}
        </div>

        {/* Waiting Message */}
        {status === AppStatus.READY && !displayFaces.some(f => f !== null) && (
           <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-full text-center z-40">
              <div className="inline-block bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-white/20 animate-bounce">
                  <span className="text-white font-bold uppercase tracking-wider">Waiting for players...</span>
              </div>
           </div>
        )}
      </div>

      {/* UI Controls */}
      <div className={`absolute bottom-6 left-6 right-6 z-50 transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-[150%]'}`}>
        <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-lg font-bold text-white">Stage Control</h1>
                <button onClick={() => setShowControls(false)} className="text-neutral-400 hover:text-white">▼</button>
            </div>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Generate new stage..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-pink-500 outline-none"
                />
                <button 
                    onClick={handleGenerateBackground}
                    disabled={isGenerating || !prompt}
                    className="bg-white text-black px-3 py-2 rounded-lg text-sm font-bold"
                >
                    {isGenerating ? '...' : 'Go'}
                </button>
            </div>
        </div>
      </div>

      {!showControls && (
        <button 
            onClick={() => setShowControls(true)}
            className="absolute bottom-6 right-6 bg-neutral-900/80 text-white p-3 rounded-full z-40 border border-white/10"
        >
            ⚙️
        </button>
      )}

    </div>
  );
};

export default App;