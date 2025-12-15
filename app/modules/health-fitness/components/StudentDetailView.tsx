import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudentMetrics, AIIntervention, FatigueTrendDataPoint } from '@/types/coach';
import { coachAnalyticsService } from '@/services/coachAnalytics.service';
import FatigueTrendChart from './FatigueTrendChart';
import InterventionLogCard from './InterventionLogCard';

const MODULE_COLOR = '#4ECDC4';

type StudentDetailViewProps = {
  studentId: string;
  onBack: () => void;
  isDarkMode?: boolean;
};

export default function StudentDetailView({
  studentId,
  onBack,
  isDarkMode = false,
}: StudentDetailViewProps) {
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics | null>(null);
  const [fatigueTrend, setFatigueTrend] = useState<FatigueTrendDataPoint[]>([]);
  const [interventions, setInterventions] = useState<AIIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const colors = {
    background: isDarkMode ? '#111827' : '#F9FAFB',
    surface: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
  };

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    setIsLoading(true);
    try {
      const [metrics, trend, interventionLog] = await Promise.all([
        coachAnalyticsService.getStudentDetail(studentId),
        coachAnalyticsService.getFatigueTrend(studentId, 30),
        coachAnalyticsService.getAIInterventionLog(studentId, 20),
      ]);

      if (metrics) {
        setStudentMetrics(metrics);
      }
      setFatigueTrend(trend);
      setInterventions(interventionLog);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MODULE_COLOR} />
          <Text style={[styles.loadingText, { color: colors.textSoft }]}>
            Loading student data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!studentMetrics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.textSoft} />
          <Text style={[styles.errorText, { color: colors.textSoft }]}>
            Unable to load student data
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {studentMetrics.studentName}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Performance Overview
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {studentMetrics.adherenceRate}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSoft }]}>
                Adherence Rate
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="fitness" size={24} color={MODULE_COLOR} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {studentMetrics.averageReadinessScore}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSoft }]}>
                Avg Readiness
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bar-chart" size={24} color="#6366F1" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {studentMetrics.totalWorkoutSessions}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSoft }]}>
                Total Sessions
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bulb" size={24} color="#F59E0B" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {studentMetrics.aiInterventionCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSoft }]}>
                AI Adjustments
              </Text>
            </View>
          </View>
        </View>

        {/* Fatigue Trend Chart */}
        <FatigueTrendChart trendData={fatigueTrend} isDarkMode={isDarkMode} />

        {/* AI Interventions Log */}
        <View style={[styles.interventionsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent AI Interventions
          </Text>
          {interventions.length === 0 ? (
            <View style={styles.emptyInterventions}>
              <Ionicons name="bulb-outline" size={48} color={colors.textSoft} />
              <Text style={[styles.emptyText, { color: colors.textSoft }]}>
                No AI interventions yet
              </Text>
            </View>
          ) : (
            interventions.map((intervention) => (
              <InterventionLogCard
                key={intervention.id}
                intervention={intervention}
                isDarkMode={isDarkMode}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  interventionsSection: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyInterventions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: MODULE_COLOR,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
