import { StyleSheet, Platform } from "react-native";

export const createDashboardStyles = (theme: any, MODULE_COLOR: string) =>
  StyleSheet.create({
    container: { flex: 1 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 6,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 8,
    },
    contentScroll: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    headerOrb: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      backgroundColor: `${MODULE_COLOR}10`,
      shadowColor: MODULE_COLOR,
      shadowOpacity: theme.isDark ? 0.7 : 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    headerTitleText: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    headerSubtitleText: {
      fontSize: 15,
      fontWeight: "400",
      color: theme.colors.textSecondary,
      letterSpacing: 0.1,
    },
    headerContainer: {
      alignItems: "center",
      marginBottom: 20,
    },
    activeTasksHint: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.1,
    },
    emptyState: {
      marginTop: 40,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
  });
