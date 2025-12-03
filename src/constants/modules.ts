export interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

export const MODULES: Module[] = [
  {
    id: 'memory-book',
    title: 'Memory Book',
    description: 'Capture your precious moments',
    icon: 'book-outline',
    color: '#9333EA', // Purple
    route: '/modules/memory-book',
  },
  {
    id: 'health-fitness',
    title: 'Health & Fitness',
    description: 'Track your wellness journey',
    icon: 'fitness-outline',
    color: '#10B981', // Green
    route: '/modules/health-fitness',
  },
  {
    id: 'money-management',
    title: 'Money Management',
    description: 'Manage your finances',
    icon: 'wallet-outline',
    color: '#F59E0B', // Amber
    route: '/modules/money-management',
  },
  {
    id: 'task-management',
    title: 'Task Management',
    description: 'Stay organized and productive',
    icon: 'checkmark-done-outline',
    color: '#3B82F6', // Blue
    route: '/modules/task-management',
  },
];
