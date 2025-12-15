import { Timestamp } from 'firebase/firestore';
import { ExerciseCategory, DifficultyLevel } from './workout';

export interface Course {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description: string;
  category: ExerciseCategory;
  difficultyLevel: DifficultyLevel;
  exercises: string[]; // Array of exercise IDs
  duration?: number; // Estimated duration in minutes
  imageUrl?: string;
  tags?: string[];
  enrolledCount?: number;
  rating?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  published: boolean;
}

export interface CreateCourseData {
  coachId: string;
  coachName: string;
  title: string;
  description: string;
  category: ExerciseCategory;
  difficultyLevel: DifficultyLevel;
  exercises: string[];
  duration?: number;
  imageUrl?: string;
  tags?: string[];
}
