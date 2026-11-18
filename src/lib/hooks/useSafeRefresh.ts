import { useRef, useState, useCallback, useEffect } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/**
 * Prevents Android SwipeRefreshLayout / RefreshControl from triggering
 * accidentally while scrolling back to the top of a list.
 * Refreshing is only enabled after the scroll settles at y <= 2.
 */
export function useSafeRefresh() {
  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const enabledRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingTimer, [clearPendingTimer]);

  const setEnabled = useCallback((next: boolean) => {
    if (enabledRef.current !== next) {
      enabledRef.current = next;
      setRefreshEnabled(next);
    }
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y > 2) {
        clearPendingTimer();
        setEnabled(false);
      }
    },
    [clearPendingTimer, setEnabled]
  );

  const scheduleEnableIfAtTop = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      clearPendingTimer();
      if (y <= 2) {
        timerRef.current = setTimeout(() => {
          setEnabled(true);
        }, 180);
      } else {
        setEnabled(false);
      }
    },
    [clearPendingTimer, setEnabled]
  );

  return {
    refreshEnabled,
    scrollHandlers: {
      onScroll,
      onScrollEndDrag: scheduleEnableIfAtTop,
      onMomentumScrollEnd: scheduleEnableIfAtTop,
      scrollEventThrottle: 32,
    },
  };
}
