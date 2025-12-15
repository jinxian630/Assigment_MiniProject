import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

interface SummaryCardsProps {
  doNow: number;
  doSoon: number;
  plan: number;
  low: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  doNow,
  doSoon,
  plan,
  low,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginHorizontal: 4,
      borderWidth: 1,
      overflow: "hidden",
    },
    neonBottomLine: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
    cardLabel: {
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.3,
      marginBottom: 4,
      color: "#000000", // Default, will be overridden
    },
    cardValue: {
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: "#000000", // Default, will be overridden
    },
  });

  const cardConfigs = [
    {
      label: "Do Now",
      value: doNow,
      darkBg: "#111827",
      darkBorder: "#FCA5A5",
      darkLabel: "#FFFFFF",
      darkValue: "#FFFFFF",
      lightBg: "#FEE2E2",
      lightBorder: "#FB7185",
      lightLabel: "#7f1d1d",
      lightValue: "#7f1d1d",
      neonColor: "#FB7185",
      marginRight: 4,
    },
    {
      label: "Do Soon",
      value: doSoon,
      darkBg: "#111827",
      darkBorder: "#FCD34D",
      darkLabel: "#FFFFFF",
      darkValue: "#FFFFFF",
      lightBg: "#FEF3C7",
      lightBorder: "#FBBF24",
      lightLabel: "#92400e",
      lightValue: "#92400e",
      neonColor: "#FBBF24",
    },
    {
      label: "Plan",
      value: plan,
      darkBg: "#111827",
      darkBorder: "#60A5FA",
      darkLabel: "#FFFFFF",
      darkValue: "#FFFFFF",
      lightBg: "#DBEAFE",
      lightBorder: "#60A5FA",
      lightLabel: "#1d4ed8",
      lightValue: "#1d4ed8",
      neonColor: "#60A5FA",
    },
    {
      label: "Low",
      value: low,
      darkBg: "#111827",
      darkBorder: "#9CA3AF",
      darkLabel: "#FFFFFF",
      darkValue: "#FFFFFF",
      lightBg: "#E5E7EB",
      lightBorder: "#9CA3AF",
      lightLabel: "#374151",
      lightValue: "#374151",
      neonColor: "#9CA3AF",
      marginLeft: 4,
    },
  ];

  return (
    <View style={styles.summaryRow}>
      {cardConfigs.map((config) => (
        <Card
          key={config.label}
          style={[
            styles.summaryCard,
            theme.isDark
              ? {
                  backgroundColor: config.darkBg,
                  borderColor: config.darkBorder,
                  ...(config.marginRight && {
                    marginRight: config.marginRight,
                  }),
                  ...(config.marginLeft && { marginLeft: config.marginLeft }),
                }
              : {
                  backgroundColor: config.lightBg,
                  borderColor: config.lightBorder,
                  ...(config.marginRight && {
                    marginRight: config.marginRight,
                  }),
                  ...(config.marginLeft && { marginLeft: config.marginLeft }),
                },
          ]}
        >
          <Text
            style={{
              ...styles.cardLabel,
              color: theme.isDark ? config.darkLabel : config.lightLabel,
            }}
          >
            {config.label}
          </Text>
          <Text
            style={{
              ...styles.cardValue,
              color: theme.isDark ? config.darkValue : config.lightValue,
            }}
          >
            {config.value}
          </Text>
          <View
            style={[
              styles.neonBottomLine,
              { backgroundColor: config.neonColor },
            ]}
          />
        </Card>
      ))}
    </View>
  );
};
