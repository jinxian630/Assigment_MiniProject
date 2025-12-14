import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useRegistration } from '@/contexts/RegistrationContext';
import { storageService } from '@/services/storage.service';
import { auth } from '@/config/firebase';
import { Theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function RegisterStep3() {
  const router = useRouter();
  const { data, updateStep3, goToPreviousStep, submitRegistration, isLoading } = useRegistration();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to upload a profile picture.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera to take a profile picture.'
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleComplete = async () => {
    // First, validate that all required data from previous steps is present
    const missingFields: string[] = [];
    
    if (!data.displayName || data.displayName.trim().length === 0) {
      missingFields.push('Display Name');
    }
    if (!data.email || data.email.trim().length === 0) {
      missingFields.push('Email');
    }
    if (!data.password || data.password.trim().length === 0) {
      missingFields.push('Password');
    }
    if (!data.birthDate || data.birthDate.trim().length === 0) {
      missingFields.push('Birth Date');
    }
    if (!data.gender) {
      missingFields.push('Gender');
    }
    if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
      missingFields.push('Phone Number');
    }

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        `Please complete all previous steps first. Missing: ${missingFields.join(', ')}.\n\nPlease go back to Step 1 or Step 2 to complete your registration.`,
        [
          { text: 'Go to Step 1', onPress: () => router.push('/(auth)/register/step1') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setUploading(true);
    try {
      // Debug: Log current registration data
      console.log('📋 Registration data before submit:', {
        displayName: data.displayName,
        email: data.email,
        hasPassword: !!data.password,
        birthDate: data.birthDate,
        gender: data.gender,
        phoneNumber: data.phoneNumber,
        photoURL: imageUri || data.photoURL || 'none',
      });

      // Upload photo if one was selected
      if (imageUri) {
        // We need to create a temp Firebase Auth user to get a UID for storage
        // Since registration happens in submitRegistration, we'll pass the image URI
        // and upload it after user creation in the RegistrationContext
        updateStep3(imageUri);
      } else {
        updateStep3('');
      }

      // Submit registration (this will create Firebase Auth user and Firestore document)
      await submitRegistration();

      // Success - navigation handled by AuthContext
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Get user-friendly error message
      const errorCode = error?.code || '';
      let errorTitle = 'Registration Failed';
      let errorMessage = 'An error occurred during registration. Please try again.';

      // Map Firebase error codes to user-friendly messages
      switch (errorCode) {
        case 'auth/email-already-in-use':
          errorTitle = 'Email Already Registered';
          errorMessage = 'This email address is already registered. Please use a different email or try logging in instead.';
          break;
        case 'auth/invalid-email':
          errorTitle = 'Invalid Email';
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorTitle = 'Weak Password';
          errorMessage = 'Password should be at least 6 characters long.';
          break;
        case 'auth/network-request-failed':
          errorTitle = 'Network Error';
          errorMessage = 'No internet connection. Please check your connection and try again.';
          break;
        case 'auth/too-many-requests':
          errorTitle = 'Too Many Attempts';
          errorMessage = 'Too many registration attempts. Please try again later.';
          break;
        case 'auth/operation-not-allowed':
          errorTitle = 'Registration Disabled';
          errorMessage = 'Email/password registration is currently disabled.';
          break;
        default:
          // Use the error message if available, otherwise use default
          if (error?.message) {
            errorMessage = error.message;
          }
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = async () => {
    updateStep3('');
    await handleComplete();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile Photo</Text>
            <Text style={styles.subtitle}>
              Add a photo so others can recognize you
            </Text>
          </View>

          {/* Photo Preview */}
          <Card style={styles.photoCard}>
            <View style={styles.photoContainer}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person" size={80} color={Theme.colors.textSecondary} />
                </View>
              )}
            </View>

            {/* Photo Actions */}
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="images-outline" size={24} color={Theme.colors.primary} />
                <Text style={styles.photoButtonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={24} color={Theme.colors.primary} />
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>

              {imageUri && (
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="trash-outline" size={24} color={Theme.colors.error} />
                  <Text style={[styles.photoButtonText, { color: Theme.colors.error }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <Button
              variant="outline"
              onPress={goToPreviousStep}
              style={styles.backButton}
              disabled={uploading || isLoading}
            >
              Back
            </Button>

            <Button
              variant="secondary"
              onPress={handleSkip}
              style={styles.skipButton}
              disabled={uploading || isLoading}
            >
              Skip
            </Button>
          </View>

          <Button
            variant="primary"
            onPress={handleComplete}
            fullWidth
            disabled={uploading || isLoading}
            loading={uploading || isLoading}
            style={styles.completeButton}
          >
            {uploading ? 'Uploading...' : 'Complete Registration'}
          </Button>

          {/* Info Text */}
          <Text style={styles.infoText}>
            Step 3 of 3: Profile Photo (Optional)
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
  },
  header: {
    marginBottom: Theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: Theme.typography.fontSizes.xxxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.fontWeights.regular,
    textAlign: 'center',
  },
  photoCard: {
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  photoContainer: {
    marginBottom: Theme.spacing.lg,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
  },
  photoActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  photoButton: {
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  photoButtonText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.primary,
    marginTop: Theme.spacing.xs,
    fontWeight: Theme.typography.fontWeights.medium,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  backButton: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  completeButton: {
    marginBottom: Theme.spacing.lg,
  },
  infoText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: Theme.typography.fontWeights.medium,
  },
});
