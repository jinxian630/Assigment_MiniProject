import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionState } from '../types/sessionState';

const PRIMARY_PURPLE = '#a855f7';

type WorkoutControlsProps = {
  currentState: SessionState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onStartSet?: () => void;
  onCompleteSet?: () => void;
  disabled?: boolean;
  isDarkMode?: boolean;
};

export default function WorkoutControls({
  currentState,
  onPause,
  onResume,
  onStop,
  onStartSet,
  onCompleteSet,
  disabled = false,
  isDarkMode = false,
}: WorkoutControlsProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  const renderPrimaryButton = () => {
    if (currentState === SessionState.Idle || currentState === SessionState.RestPeriod) {
      // Show "Start Set" button
      return (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: PRIMARY_PURPLE },
            disabled && styles.disabledButton,
          ]}
          onPress={onStartSet}
          disabled={disabled || !onStartSet}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={24} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Start Set</Text>
        </TouchableOpacity>
      );
    }

    if (currentState === SessionState.ActiveSet) {
      // Show "Pause" and "Complete Set" buttons
      return (
        <View style={styles.activeSetControls}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border },
              disabled && styles.disabledButton,
            ]}
            onPress={onPause}
            disabled={disabled}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={20} color={PRIMARY_PURPLE} />
            <Text style={[styles.secondaryButtonText, { color: PRIMARY_PURPLE }]}>
              Pause
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: PRIMARY_PURPLE },
              disabled && styles.disabledButton,
            ]}
            onPress={onCompleteSet}
            disabled={disabled || !onCompleteSet}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Complete Set</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentState === SessionState.Paused) {
      // Show "Resume" button
      return (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: PRIMARY_PURPLE },
            disabled && styles.disabledButton,
          ]}
          onPress={onResume}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={24} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Resume</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {renderPrimaryButton()}

      {/* Stop button - always visible except when completed */}
      {currentState !== SessionState.Completed && (
        <TouchableOpacity
          style={[
            styles.stopButton,
            { borderColor: '#EF4444' },
            disabled && styles.disabledButton,
          ]}
          onPress={onStop}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Ionicons name="stop" size={20} color="#EF4444" />
          <Text style={[styles.stopButtonText, { color: '#EF4444' }]}>
            End Workout
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  activeSetControls: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    flex: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    backgroundColor: 'transparent',
  },
  stopButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
