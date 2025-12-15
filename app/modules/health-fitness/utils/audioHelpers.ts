import * as Speech from 'expo-speech';
import { AudioQueueItem } from '../types/safetyCue';

export class AudioService {
  private queue: AudioQueueItem[] = [];
  private isPlaying: boolean = false;
  private currentCue: AudioQueueItem | null = null;

  /**
   * Initialize the audio service
   */
  async initialize(): Promise<void> {
    try {
      // Check if speech is available
      const voices = await Speech.getAvailableVoicesAsync();
      console.log('✅ Audio service initialized with', voices.length, 'voices');
    } catch (error) {
      console.error('❌ Error initializing audio service:', error);
    }
  }

  /**
   * Enqueue a safety cue to be played
   */
  enqueueCue(cue: AudioQueueItem): void {
    // If the cue is critical, interrupt current speech and play immediately
    if (cue.priority === 'critical') {
      this.playImmediate(cue);
      return;
    }

    // Add to queue based on priority
    this.queue.push(cue);

    // Sort queue by priority (critical > high > normal > low)
    this.queue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    console.log('➕ Cue enqueued:', cue.text, `[${cue.priority}]`);

    // Process queue if not already playing
    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  /**
   * Play a cue immediately, interrupting current speech
   */
  async playImmediate(cue: AudioQueueItem): Promise<void> {
    try {
      // Stop current speech
      await Speech.stop();

      // Play the critical cue
      console.log('🔊 Playing critical cue immediately:', cue.text);
      this.currentCue = cue;
      this.isPlaying = true;

      await this.playCue(cue);

      this.currentCue = null;
      this.isPlaying = false;

      // Resume queue processing
      if (this.queue.length > 0) {
        this.processQueue();
      }
    } catch (error) {
      console.error('❌ Error playing immediate cue:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Process the queue and play cues in order
   */
  async processQueue(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return;
    }

    this.isPlaying = true;

    while (this.queue.length > 0) {
      const cue = this.queue.shift();
      if (!cue) break;

      this.currentCue = cue;
      console.log('🔊 Playing cue:', cue.text, `[${cue.priority}]`);

      try {
        await this.playCue(cue);
      } catch (error) {
        console.error('❌ Error playing cue:', error);
      }

      this.currentCue = null;
    }

    this.isPlaying = false;
  }

  /**
   * Play a single cue using expo-speech
   */
  private async playCue(cue: AudioQueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      Speech.speak(cue.text, {
        rate: 0.9,
        pitch: 1.0,
        language: 'en-US',
        onDone: () => {
          console.log('✅ Cue playback finished:', cue.text);
          resolve();
        },
        onError: (error) => {
          console.error('❌ Cue playback error:', error);
          reject(error);
        },
        onStopped: () => {
          console.log('⏹️ Cue playback stopped:', cue.text);
          resolve();
        },
      });
    });
  }

  /**
   * Clear all queued cues
   */
  clearQueue(): void {
    this.queue = [];
    console.log('🗑️ Audio queue cleared');
  }

  /**
   * Stop current playback and clear queue
   */
  async cleanup(): Promise<void> {
    try {
      await Speech.stop();
      this.clearQueue();
      this.isPlaying = false;
      this.currentCue = null;
      console.log('✅ Audio service cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up audio service:', error);
    }
  }

  /**
   * Check if audio is currently playing
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the current cue being played
   */
  getCurrentCue(): AudioQueueItem | null {
    return this.currentCue;
  }

  /**
   * Get the number of cues in the queue
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Pause current speech (note: expo-speech doesn't support native pause/resume)
   */
  async pause(): Promise<void> {
    try {
      await Speech.stop();
      this.isPlaying = false;
      console.log('⏸️ Audio paused');
    } catch (error) {
      console.error('❌ Error pausing audio:', error);
    }
  }

  /**
   * Resume playing the queue
   */
  resume(): void {
    if (!this.isPlaying && this.queue.length > 0) {
      console.log('▶️ Audio resumed');
      this.processQueue();
    }
  }
}
