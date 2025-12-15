import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Course, CreateCourseData } from '@/types/course';
import { Exercise } from '@/types/workout';
import { removeUndefinedFields } from '@/utils/firestoreHelpers';

class CourseService {
  private readonly COURSES_COLLECTION = 'Courses';
  private readonly EXERCISES_COLLECTION = 'ExerciseMaster';

  /**
   * Create a new course (coach only)
   */
  async createCourse(courseData: CreateCourseData): Promise<string> {
    try {
      const courseRef = doc(collection(db, this.COURSES_COLLECTION));
      const courseId = courseRef.id;

      const cleanedData = removeUndefinedFields(courseData);
      await setDoc(courseRef, {
        ...cleanedData,
        enrolledCount: 0,
        rating: 0,
        published: false, // Courses start as drafts
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Course created:', courseId);
      return courseId;
    } catch (error) {
      console.error('❌ Error creating course:', error);
      throw error;
    }
  }

  /**
   * Create a new exercise (coach only)
   */
  async createExercise(exerciseData: Omit<Exercise, 'id'>, coachId: string): Promise<string> {
    try {
      const exerciseRef = doc(collection(db, this.EXERCISES_COLLECTION));
      const exerciseId = exerciseRef.id;

      const cleanedData = removeUndefinedFields(exerciseData);
      await setDoc(exerciseRef, {
        ...cleanedData,
        createdBy: coachId, // Track who created it
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Exercise created:', exerciseId);
      return exerciseId;
    } catch (error) {
      console.error('❌ Error creating exercise:', error);
      throw error;
    }
  }

  /**
   * Update an existing course
   */
  async updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    try {
      const courseRef = doc(db, this.COURSES_COLLECTION, courseId);
      const cleanedUpdates = removeUndefinedFields(updates);
      await updateDoc(courseRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Course updated:', courseId);
    } catch (error) {
      console.error('❌ Error updating course:', error);
      throw error;
    }
  }

  /**
   * Get all courses by a specific coach
   */
  async getCoachCourses(coachId: string): Promise<Course[]> {
    try {
      const coursesRef = collection(db, this.COURSES_COLLECTION);
      const q = query(
        coursesRef,
        where('coachId', '==', coachId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);

      const courses: Course[] = [];
      snapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() } as Course);
      });

      console.log('✅ Fetched coach courses:', courses.length);
      return courses;
    } catch (error) {
      console.error('❌ Error fetching coach courses:', error);
      throw error;
    }
  }

  /**
   * Get all published courses
   */
  async getAllPublishedCourses(): Promise<Course[]> {
    try {
      const coursesRef = collection(db, this.COURSES_COLLECTION);
      const q = query(
        coursesRef,
        where('published', '==', true),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);

      const courses: Course[] = [];
      snapshot.forEach((doc) => {
        courses.push({ id: doc.id, ...doc.data() } as Course);
      });

      console.log('✅ Fetched published courses:', courses.length);
      return courses;
    } catch (error) {
      console.error('❌ Error fetching published courses:', error);
      throw error;
    }
  }

  /**
   * Delete a course (coach or admin only)
   */
  async deleteCourse(courseId: string): Promise<void> {
    try {
      const courseRef = doc(db, this.COURSES_COLLECTION, courseId);
      await deleteDoc(courseRef);

      console.log('✅ Course deleted:', courseId);
    } catch (error) {
      console.error('❌ Error deleting course:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const courseService = new CourseService();
