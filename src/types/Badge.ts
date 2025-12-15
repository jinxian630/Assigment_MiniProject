export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or URL to asset
  pointThreshold?: number; // Auto-unlock if points > this
  conditionType: 'streak' | 'volume' | 'consistency';
}

// Static Master Data
export const BADGES_MASTER: Record<string, Badge> = {
  badge_streak_3: {
    id: 'badge_streak_3',
    title: 'On Fire',
    description: 'Maintained a 3-day streak',
    icon: '🔥',
    conditionType: 'streak'
  },
  badge_volume_1000: {
    id: 'badge_volume_1000',
    title: 'Iron Lifter',
    description: 'Lifted over 1000kg total volume',
    icon: '🏋️',
    conditionType: 'volume'
  },
  badge_early_bird: {
    id: 'badge_early_bird',
    title: 'Early Bird',
    description: 'Completed a workout before 8 AM',
    icon: '🌅',
    conditionType: 'consistency'
  }
};
