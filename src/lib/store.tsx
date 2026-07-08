/**
 * App state: a single JSON document persisted to AsyncStorage
 * (localStorage-backed on web). Loaded once at boot; every mutation
 * goes through `apply` and is written back.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { EMPTY_STATE, type AppState } from './types';

const KEY = 'hybrid-state-v1';

interface StoreValue {
  state: AppState;
  ready: boolean;
  /** apply a pure state transition and persist the result */
  apply: (fn: (prev: AppState) => AppState) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setState({ ...EMPTY_STATE, ...JSON.parse(raw) });
          } catch {
            // corrupted state: start fresh rather than crash
          }
        }
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  const value = useMemo(() => ({ state, ready, apply, reset }), [state, ready, apply, reset]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
