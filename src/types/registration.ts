import { RegistrationData } from './user';

// Registration step number (1, 2, or 3)
export type RegistrationStep = 1 | 2 | 3;

// Multi-step registration context interface
export interface RegistrationContextType {
  step: RegistrationStep;
  data: Partial<RegistrationData>;
  updateData: (newData: Partial<RegistrationData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
  completeRegistration: () => Promise<void>;
  isLoading: boolean;
}

// Configuration for each registration step
export interface StepConfig {
  step: RegistrationStep;
  title: string;
  subtitle: string;
  canSkip: boolean;
}

// Step configurations
export const REGISTRATION_STEPS: StepConfig[] = [
  {
    step: 1,
    title: 'Create Account',
    subtitle: 'Step 1 of 3',
    canSkip: false,
  },
  {
    step: 2,
    title: 'Profile Details',
    subtitle: 'Step 2 of 3',
    canSkip: false,
  },
  {
    step: 3,
    title: 'Profile Photo',
    subtitle: 'Step 3 of 3 (Optional)',
    canSkip: true,
  },
];
