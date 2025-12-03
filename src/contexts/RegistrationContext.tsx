import React, { createContext, useState, useContext } from 'react';
import { useRouter } from 'expo-router';
import { authService } from '@/services/auth.service';

interface RegistrationData {
  // Step 1
  displayName: string;
  email: string;
  password: string;

  // Step 2
  birthDate: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phoneNumber: string;

  // Step 3
  photoURL: string;
}

interface Step1Data {
  displayName: string;
  email: string;
  password: string;
}

interface Step2Data {
  birthDate: string;
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phoneNumber: string;
}

interface RegistrationContextType {
  currentStep: 1 | 2 | 3;
  data: Partial<RegistrationData>;
  isLoading: boolean;
  updateStep1: (data: Step1Data) => void;
  updateStep2: (data: Step2Data) => void;
  updateStep3: (photoURL: string) => void;
  submitRegistration: () => Promise<void>;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  resetRegistration: () => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<Partial<RegistrationData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const updateStep1 = (step1Data: Step1Data) => {
    setData((prev) => ({
      ...prev,
      ...step1Data,
    }));
  };

  const updateStep2 = (step2Data: Step2Data) => {
    setData((prev) => ({
      ...prev,
      ...step2Data,
    }));
  };

  const updateStep3 = (photoURL: string) => {
    setData((prev) => ({
      ...prev,
      photoURL,
    }));
  };

  const submitRegistration = async () => {
    setIsLoading(true);
    try {
      // Validate all required data is present
      if (
        !data.displayName ||
        !data.email ||
        !data.password ||
        !data.birthDate ||
        !data.gender ||
        !data.phoneNumber
      ) {
        throw new Error('Missing required registration data');
      }

      // Step 1: Create Firebase Auth user and Firestore document (without photo first)
      const userCredential = await authService.registerUser({
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        birthDate: data.birthDate,
        gender: data.gender,
        phoneNumber: data.phoneNumber,
        photoURL: '', // Empty for now
      });

      console.log('✅ User created in Firebase');

      // Step 2: Upload photo if provided
      let photoURL = '';
      if (data.photoURL) {
        // data.photoURL contains the local image URI at this point
        const { storageService } = await import('@/services/storage.service');
        const { firestoreService } = await import('@/services/firestore.service');

        console.log('📤 Uploading profile photo...');
        photoURL = await storageService.uploadProfilePhoto(
          userCredential.user.uid,
          data.photoURL
        );

        // Update Firestore document with photo URL
        await firestoreService.updateUserDocument(userCredential.user.uid, {
          photoURL,
        });
        console.log('✅ Profile photo uploaded and document updated');
      }

      console.log('✅ User registered successfully with Firebase');

      // Reset registration data
      resetRegistration();

      // Navigation to dashboard will be handled by AuthContext's auth state listener
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
      router.push(`/(auth)/register/step${currentStep + 1}` as any);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
      router.back();
    }
  };

  const resetRegistration = () => {
    setData({});
    setCurrentStep(1);
  };

  return (
    <RegistrationContext.Provider
      value={{
        currentStep,
        data,
        isLoading,
        updateStep1,
        updateStep2,
        updateStep3,
        submitRegistration,
        goToNextStep,
        goToPreviousStep,
        resetRegistration,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};
