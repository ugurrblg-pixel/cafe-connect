import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (event: React.TouchEvent | React.MouseEvent) => {
      // Store start position for movement detection
      if ('touches' in event) {
        startPos.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }

      isLongPress.current = false;
      timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (shouldTriggerClick && !isLongPress.current && onClick) {
        onClick();
      }
    },
    [onClick]
  );

  const move = useCallback(
    (event: React.TouchEvent) => {
      // Cancel if moved too much (prevents accidental long press during scroll)
      if ('touches' in event && timerRef.current) {
        const moveX = Math.abs(event.touches[0].clientX - startPos.current.x);
        const moveY = Math.abs(event.touches[0].clientY - startPos.current.y);
        
        if (moveX > 10 || moveY > 10) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    },
    []
  );

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: () => clear({} as React.MouseEvent, false),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress();
    },
  };
}
