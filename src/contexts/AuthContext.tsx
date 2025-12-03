import React, { createContext, useState, useEffect } from 'react';
import { User, LoginCredentials, SignupCredentials } from '@/types/user';
import { authService } from '@/services/auth.service';
import { firestoreService } from '@/services/firestore.service';
import { auth } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  skipLogin: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true to check auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser?.uid || 'logged out');

      if (firebaseUser) {
        // User is signed in, fetch from Firestore
        try {
          const userData = await firestoreService.getUserDocument(firebaseUser.uid);
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            console.log('✅ User data loaded from Firestore');
          }
        } catch (error) {
          console.error('❌ Error loading user data:', error);
        }
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async ({ email, password }: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      // Real Firebase authentication
      const userCredential = await authService.signIn({ email, password });
      console.log('✅ User signed in:', userCredential.user.uid);

      // Fetch user data from Firestore
      const userData = await firestoreService.getUserDocument(userCredential.user.uid);

      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        throw new Error('User profile not found');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async ({
    name,
    email,
    password,
    confirmPassword,
  }: SignupCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      // Mock signup - simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Validation
      if (!name || name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters');
      }

      if (!email.includes('@')) {
        throw new Error('Invalid email format');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Mock user data
      const mockUser: User = {
        id: '1',
        email: email,
        displayName: name,
        createdAt: new Date(),
      };

      setUser(mockUser);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🔓 Logout initiated');
    setIsLoading(true);

    try {
      // Attempt Firebase logout
      await authService.signOut();
      console.log('✅ Firebase signOut successful');
    } catch (error) {
      console.error('⚠️ Firebase signOut failed:', error);
      // Continue with local logout even if Firebase fails
      // User preference: Force local logout anyway for better UX
    }

    // ALWAYS clear local state (even if Firebase failed)
    try {
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ Local auth state cleared');
    } catch (error) {
      console.error('❌ Error clearing auth state:', error);
    } finally {
      setIsLoading(false);
    }

    // Note: Navigation handled automatically by RootNavigator's useEffect
    // when isAuthenticated changes to false (app/_layout.tsx:36-42)
  };

  const skipLogin = (): void => {
    console.log('🚀 skipLogin called');
    // Instant bypass for testing without backend
    const mockUser: User = {
      id: 'test-user',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date(),
    };

    setUser(mockUser);
    setIsAuthenticated(true);
    console.log('✅ Auth state updated - isAuthenticated:', true);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        signup,
        logout,
        skipLogin,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
