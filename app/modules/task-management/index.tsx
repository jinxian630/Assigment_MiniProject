import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { useTheme } from '@/hooks/useTheme';

const MODULE_COLOR = '#6C4DFF';

export default function TaskManagementScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xl,
    },
    headerTitle: {
      fontSize: theme.typography.fontSizes.xl,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    iconSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
      ...theme.shadows.medium,
    },
    moduleTitle: {
      fontSize: theme.typography.fontSizes.xxl,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    moduleSubtitle: {
      fontSize: theme.typography.fontSizes.md,
      color: theme.colors.textSecondary,
    },
    section: {
      marginBottom: theme.spacing.lg,
    },
    calendarRibbon: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    calendarIcon: {
      fontSize: 24,
      marginRight: theme.spacing.sm,
    },
    calendarText: {
      fontSize: theme.typography.fontSizes.md,
      fontWeight: theme.typography.fontWeights.semibold,
      color: theme.colors.textPrimary,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    statusTitle: {
      fontSize: theme.typography.fontSizes.lg,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    emptyTaskList: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontSize: theme.typography.fontSizes.sm,
      color: theme.colors.textSecondary,
    },
    addButtonContainer: {
      alignItems: 'flex-end',
      marginTop: theme.spacing.lg,
    },
    addButton: {
      opacity: 0.5,
    },
  }), [theme]);

  const statuses = ['To Do', 'In Progress', 'Completed'];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <IconButton
              icon="arrow-back"
              onPress={() => router.back()}
              variant="secondary"
              size="medium"
            />
            <Text style={styles.headerTitle}>Task Management</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Module Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconContainer, { backgroundColor: `${MODULE_COLOR}20` }]}>
              <Ionicons name="checkmark-done-outline" size={64} color={MODULE_COLOR} />
            </View>
            <Text style={styles.moduleTitle}>Task Management</Text>
            <Text style={styles.moduleSubtitle}>Stay organized and productive</Text>
          </View>

          {/* Calendar Ribbon */}
          <View style={styles.section}>
            <Card>
              <View style={styles.calendarRibbon}>
                <Text style={styles.calendarIcon}>📅</Text>
                <Text style={styles.calendarText}>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </Card>
          </View>

          {/* Task Status Sections */}
          {statuses.map((status, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusTitle}>{status}</Text>
                <Badge
                  variant={
                    status === 'Completed'
                      ? 'success'
                      : status === 'In Progress'
                      ? 'warning'
                      : 'info'
                  }
                >
                  0
                </Badge>
              </View>
              <Card>
                <View style={styles.emptyTaskList}>
                  <Text style={styles.emptyIcon}>
                    {status === 'Completed'
                      ? '✅'
                      : status === 'In Progress'
                      ? '🔄'
                      : '📝'}
                  </Text>
                  <Text style={styles.emptyText}>No {status.toLowerCase()} tasks</Text>
                </View>
              </Card>
            </View>
          ))}

          {/* Disabled Add Button */}
          <View style={styles.addButtonContainer}>
            <IconButton
              icon="add"
              onPress={() => {}}
              variant="primary"
              size="large"
              disabled
              style={[styles.addButton, { backgroundColor: theme.colors.disabled }]}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
