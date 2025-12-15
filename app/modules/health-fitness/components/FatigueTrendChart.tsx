import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { FatigueTrendDataPoint } from '@/types/coach';

const MODULE_COLOR = '#4ECDC4';

type FatigueTrendChartProps = {
  trendData: FatigueTrendDataPoint[];
  isDarkMode?: boolean;
};

export default function FatigueTrendChart({
  trendData,
  isDarkMode = false,
}: FatigueTrendChartProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    grid: isDarkMode ? '#374151' : '#E5E7EB',
  };

  // Prepare data for the chart
  const chartData = trendData.map((point, index) => ({
    value: point.readinessScore,
    label: index % 5 === 0 ? formatDate(point.date) : '', // Show label every 5 points
    dataPointColor: getDataPointColor(point.readinessScore),
  }));

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function getDataPointColor(score: number): string {
    if (score >= 70) return '#10B981'; // green
    if (score >= 40) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  }

  if (trendData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSoft }]}>
          No readiness data available yet
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        30-Day Readiness Trend
      </Text>

      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          height={200}
          width={300}
          spacing={10}
          thickness={3}
          color={MODULE_COLOR}
          dataPointsColor={MODULE_COLOR}
          dataPointsRadius={4}
          textColor1={colors.textSoft}
          textShiftY={-5}
          textShiftX={-5}
          textFontSize={10}
          yAxisColor={colors.grid}
          xAxisColor={colors.grid}
          yAxisTextStyle={{ color: colors.textSoft }}
          maxValue={100}
          noOfSections={5}
          stepValue={20}
          hideRules={false}
          rulesColor={colors.grid}
          rulesType="solid"
          yAxisLabelSuffix=""
          showVerticalLines={false}
          curved
          areaChart
          startFillColor={MODULE_COLOR}
          startOpacity={0.3}
          endOpacity={0.05}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: colors.textSoft }]}>
            Good (70+)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.legendText, { color: colors.textSoft }]}>
            Moderate (40-70)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: colors.textSoft }]}>
            Low (&lt;40)
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 32,
  },
});
