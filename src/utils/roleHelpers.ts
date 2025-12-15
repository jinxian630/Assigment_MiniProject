import { User, UserRole } from '@/types/user';

export const isStudent = (user: User | null): boolean => {
  return user?.role === 'student';
};

export const isCoach = (user: User | null): boolean => {
  return user?.role === 'coach';
};

export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

export const isVerifiedCoach = (user: User | null): boolean => {
  return isCoach(user) && user?.coachInfo?.verified === true;
};

export const canCreateExercises = (user: User | null): boolean => {
  return isCoach(user) || isAdmin(user);
};

export const getRoleDisplayName = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    student: 'Student',
    coach: 'Coach',
    admin: 'Admin',
  };
  return roleMap[role] || 'Unknown';
};
