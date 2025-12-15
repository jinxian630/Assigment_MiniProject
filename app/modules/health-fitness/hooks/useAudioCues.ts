import { useEffect, useRef } from 'react';
import { AudioService } from '../utils/audioHelpers';
import { AudioQueueItem } from '../types/safetyCue';

interface UseAudioCuesReturn {
  speakCue: (text: string, priority?: 'low' | 'normal' | 'high' | 'critical') => void;
  clearQueue: () => void;
  cleanup: () => Promise<void>;
}

export const useAudioCues = (): UseAudioCuesReturn => {
  const audioServiceRef = useRef<AudioService | null>(null);

  useEffect(() => {
    // Initialize audio service on mount
    const initAudio = async () => {
      audioServiceRef.current = new AudioService();
      await audioServiceRef.current.initialize();
    };

    initAudio();

    // Cleanup on unmount
    return () => {
      audioServiceRef.current?.cleanup();
    };
  }, []);

  const speakCue = (
    text: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): void => {
    if (!audioServiceRef.current) {
      console.warn('⚠️ Audio service not initialized');
      return;
    }

    const cue: AudioQueueItem = {
      id: `${Date.now()}-${text.substring(0, 10)}`,
      text,
      priority,
      timestamp: Date.now(),
    };

    audioServiceRef.current.enqueueCue(cue);
  };

  const clearQueue = (): void => {
    audioServiceRef.current?.clearQueue();
  };

  const cleanup = async (): Promise<void> => {
    await audioServiceRef.current?.cleanup();
  };

  return {
    speakCue,
    clearQueue,
    cleanup,
  };
};
