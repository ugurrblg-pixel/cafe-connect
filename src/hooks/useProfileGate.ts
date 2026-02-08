import { useState, useCallback } from 'react';
import { useProfileCompletion } from './useProfileCompletion';
import { GatedAction } from '@/components/ProfileGateModal';

interface UseProfileGateReturn {
  isGateOpen: boolean;
  gatedAction: GatedAction;
  openGate: (action: GatedAction) => void;
  closeGate: () => void;
  checkAndProceed: (action: GatedAction, onAllowed: () => void) => void;
  isProfileComplete: boolean;
}

export function useProfileGate(): UseProfileGateReturn {
  const { isComplete } = useProfileCompletion();
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [gatedAction, setGatedAction] = useState<GatedAction>('message');

  const openGate = useCallback((action: GatedAction) => {
    setGatedAction(action);
    setIsGateOpen(true);
  }, []);

  const closeGate = useCallback(() => {
    setIsGateOpen(false);
  }, []);

  const checkAndProceed = useCallback((action: GatedAction, onAllowed: () => void) => {
    if (isComplete) {
      onAllowed();
    } else {
      setGatedAction(action);
      setIsGateOpen(true);
    }
  }, [isComplete]);

  return {
    isGateOpen,
    gatedAction,
    openGate,
    closeGate,
    checkAndProceed,
    isProfileComplete: isComplete,
  };
}
