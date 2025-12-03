import { Stack } from 'expo-router';
import { useRegistration } from '@/contexts/RegistrationContext';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/theme';

function ProgressIndicator() {
  const { currentStep } = useRegistration();

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>
        Step {currentStep} of 3
      </Text>
      <View style={styles.progressBar}>
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              step <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function RegistrationLayout() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => <ProgressIndicator />,
          headerStyle: {
            backgroundColor: Theme.colors.background,
          },
          headerTintColor: Theme.colors.primary,
        }}
      />
      <Stack>
        <Stack.Screen
          name="step1"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="step2"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="step3"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.backgroundSecondary,
  },
  progressDotActive: {
    backgroundColor: Theme.colors.primary,
  },
});
