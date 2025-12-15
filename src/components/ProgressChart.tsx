import React from 'react';
import { View, Dimensions, Text } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface ProgressChartProps {
  recentScores: number[]; // Array of numbers
  labels: string[];       // Array of Day names (e.g., ["Mon", "Tue"])
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ recentScores, labels }) => {
  // Graceful fallback if data is missing or empty
  if (!recentScores || recentScores.length === 0) {
    return (
      <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 16 }}>
        <Text style={{ color: '#666' }}>No activity data yet</Text>
      </View>
    );
  }

  // Ensure arrays are same length for safety, though chart-kit handles typical mismatch
  // If we have more scores than labels, slice scores. 
  // Ideally caller aligns them.

  return (
    <View>
      <LineChart
        data={{
          labels: labels,
          datasets: [{ data: recentScores }]
        }}
        width={Dimensions.get("window").width - 40} 
        height={220}
        yAxisLabel=""
        yAxisSuffix=" pts"
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0, 
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#007aff"
          }
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16
        }}
      />
    </View>
  );
};
