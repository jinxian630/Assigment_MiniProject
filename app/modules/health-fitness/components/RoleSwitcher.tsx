import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/common/Card';
import { Theme } from '@/constants/theme';
import { useHealthFitnessRole } from '../hooks/useHealthFitnessRole';
import { HealthFitnessRole } from '@/types/modulePreferences';

const MODULE_COLOR = '#4ECDC4';

interface RoleSwitcherProps {
  currentRole: HealthFitnessRole;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { setRole } = useHealthFitnessRole();
  const router = useRouter();

  const handleSwitch = async (newRole: HealthFitnessRole) => {
    if (newRole === currentRole) {
      setModalVisible(false);
      return;
    }

    try {
      await setRole(newRole);
      setModalVisible(false);

      // Navigate to the appropriate dashboard
      if (newRole === 'student') {
        router.replace('/modules/health-fitness/StudentDashboard');
      } else {
        router.replace('/modules/health-fitness/CoachDashboardScreen');
      }
    } catch (error) {
      console.error('Error switching role:', error);
    }
  };

  return (
    <>
      {/* Trigger Button/Badge */}
      <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.7}>
        <View style={styles.roleBadge}>
          <Ionicons
            name={currentRole === 'student' ? 'barbell-outline' : 'school'}
            size={16}
            color={MODULE_COLOR}
          />
          <Text style={styles.roleText}>
            {currentRole === 'student' ? 'Student' : 'Coach'}
          </Text>
          <Ionicons name="swap-horizontal" size={14} color={MODULE_COLOR} />
        </View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card style={styles.modalCard}>
              <Text style={styles.modalTitle}>Switch Role</Text>
              <Text style={styles.modalSubtitle}>
                Change how you use Health & Fitness
              </Text>

              <View style={styles.roleOptionsContainer}>
                {/* Student Option */}
                <TouchableOpacity
                  onPress={() => handleSwitch('student')}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.roleOption,
                      currentRole === 'student' && styles.roleOptionActive,
                    ]}
                  >
                    <View style={styles.roleOptionLeft}>
                      <Ionicons name="barbell-outline" size={24} color={MODULE_COLOR} />
                      <View style={styles.roleOptionText}>
                        <Text style={styles.roleOptionTitle}>Student</Text>
                        <Text style={styles.roleOptionSubtitle}>
                          Track workouts and follow courses
                        </Text>
                      </View>
                    </View>
                    {currentRole === 'student' && (
                      <Ionicons name="checkmark-circle" size={24} color={MODULE_COLOR} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Coach Option */}
                <TouchableOpacity
                  onPress={() => handleSwitch('coach')}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.roleOption,
                      currentRole === 'coach' && styles.roleOptionActive,
                    ]}
                  >
                    <View style={styles.roleOptionLeft}>
                      <Ionicons name="school" size={24} color={MODULE_COLOR} />
                      <View style={styles.roleOptionText}>
                        <Text style={styles.roleOptionTitle}>Coach</Text>
                        <Text style={styles.roleOptionSubtitle}>
                          Create exercises and manage courses
                        </Text>
                      </View>
                    </View>
                    {currentRole === 'coach' && (
                      <Ionicons name="checkmark-circle" size={24} color={MODULE_COLOR} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${MODULE_COLOR}20`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },

  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: MODULE_COLOR,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: Theme.spacing.xl,
  },

  modalTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },

  modalSubtitle: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },

  roleOptionsContainer: {
    gap: 12,
    marginBottom: Theme.spacing.lg,
  },

  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.background,
  },

  roleOptionActive: {
    borderColor: MODULE_COLOR,
    backgroundColor: `${MODULE_COLOR}10`,
  },

  roleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  roleOptionText: {
    flex: 1,
  },

  roleOptionTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },

  roleOptionSubtitle: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
  },

  cancelButton: {
    padding: Theme.spacing.md,
    borderRadius: 12,
    backgroundColor: Theme.colors.border,
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textSecondary,
  },
});
