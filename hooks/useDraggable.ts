import { useState, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  position: Position;
}

export const useDraggable = (initialPosition: Position = { x: 0, y: 0 }) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    position: initialPosition,
  });
  
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const elementStartPos = useRef<Position>(initialPosition);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = dragState.position;
    
    setDragState(prev => ({ ...prev, isDragging: true }));
  }, [dragState.position]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState.isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStartPos.current.x;
    const deltaY = clientY - dragStartPos.current.y;
    
    setDragState(prev => ({
      ...prev,
      position: {
        x: elementStartPos.current.x + deltaX,
        y: elementStartPos.current.y + deltaY,
      },
    }));
  }, [dragState.isDragging]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  }, []);

  return {
    position: dragState.position,
    isDragging: dragState.isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleMouseDown,
    },
    dragListeners: {
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchMove: handleMouseMove,
      onTouchEnd: handleMouseUp,
    },
  };
};





