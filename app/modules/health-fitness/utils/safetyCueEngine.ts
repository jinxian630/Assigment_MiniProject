import { SafetyCue } from '@/types/workout';
import { SessionContext } from '../types/sessionState';
import { AudioCue, ParsedTimeWindow } from '../types/safetyCue';

export class SafetyCueEngine {
  private triggeredCueIds: Set<string> = new Set();

  /**
   * Parse time window string like "0-10s" or "45-60s" into seconds
   */
  private parseTimeWindow(timeWindow: string): ParsedTimeWindow | null {
    try {
      // Remove 's' suffix and split by '-'
      const cleaned = timeWindow.trim().replace(/s$/i, '');
      const parts = cleaned.split('-').map((p) => parseInt(p.trim(), 10));

      if (parts.length !== 2 || parts.some((p) => isNaN(p))) {
        console.warn('⚠️ Invalid time window format:', timeWindow);
        return null;
      }

      return {
        startSeconds: parts[0],
        endSeconds: parts[1],
      };
    } catch (error) {
      console.error('❌ Error parsing time window:', timeWindow, error);
      return null;
    }
  }

  /**
   * Check if a condition is met based on session context
   */
  private isConditionMet(
    condition: string | undefined,
    context: SessionContext
  ): boolean {
    if (!condition || condition === 'always') {
      return true;
    }

    switch (condition) {
      case 'fatigue_high':
        return context.currentFatigueLevel !== undefined && context.currentFatigueLevel >= 4;

      case 'fatigue_low':
        return context.currentFatigueLevel !== undefined && context.currentFatigueLevel <= 2;

      case 'form_check':
        // Form check on every set after the first one
        return !context.isFirstSet;

      default:
        console.warn('⚠️ Unknown condition:', condition);
        return false;
    }
  }

  /**
   * Check if elapsed time is within the time window
   */
  private isInTimeWindow(
    elapsedSeconds: number,
    timeWindow: ParsedTimeWindow
  ): boolean {
    return (
      elapsedSeconds >= timeWindow.startSeconds &&
      elapsedSeconds <= timeWindow.endSeconds
    );
  }

  /**
   * Generate a unique ID for a cue based on its properties
   */
  private generateCueId(cue: SafetyCue, setNumber: number): string {
    return `${setNumber}-${cue.timeWindow}-${cue.cueText.substring(0, 20)}`;
  }

  /**
   * Evaluate all safety cues and return those that should be triggered
   */
  evaluateCues(safetyCues: SafetyCue[], context: SessionContext): AudioCue[] {
    const triggeredCues: AudioCue[] = [];

    // GUARD: Handle null/undefined safety cues array
    if (!safetyCues || !Array.isArray(safetyCues) || safetyCues.length === 0) {
      return triggeredCues;
    }

    for (const cue of safetyCues) {
      // Parse time window
      const timeWindow = this.parseTimeWindow(cue.timeWindow);
      if (!timeWindow) {
        continue;
      }

      // Check if we're in the time window
      if (!this.isInTimeWindow(context.elapsedTimeInSet, timeWindow)) {
        continue;
      }

      // Check if condition is met
      if (!this.isConditionMet(cue.condition, context)) {
        continue;
      }

      // Generate unique ID for this cue
      const cueId = this.generateCueId(cue, context.currentSetNumber);

      // Check if this cue has already been triggered in this set
      if (this.triggeredCueIds.has(cueId)) {
        continue;
      }

      // Mark as triggered
      this.triggeredCueIds.add(cueId);

      // Add to triggered cues
      const audioCue: AudioCue = {
        id: cueId,
        text: cue.cueText,
        priority: cue.priority,
        timestamp: Date.now(),
      };

      triggeredCues.push(audioCue);
      console.log('🔔 Safety cue triggered:', audioCue.text, `[${cue.priority}]`);
    }

    return triggeredCues;
  }

  /**
   * Reset triggered cues for a new set
   */
  resetForNewSet(): void {
    this.triggeredCueIds.clear();
    console.log('🔄 Safety cue engine reset for new set');
  }

  /**
   * Get all triggered cue IDs (for debugging)
   */
  getTriggeredCueIds(): string[] {
    return Array.from(this.triggeredCueIds);
  }
}
