import { Timestamp } from 'firebase/firestore';

export type HealthFitnessRole = 'student' | 'coach';

export interface HealthFitnessPreferences {
  preferredRole: HealthFitnessRole;
  lastChanged?: Date | Timestamp;
}

export interface ModulePreferences {
  healthFitness?: HealthFitnessPreferences;
}
