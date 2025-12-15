import { StyleSheet, Platform } from "react-native";

export function buildTaskIndexStyles(theme: any) {
  const isDark = theme?.isDark === true;

  return StyleSheet.create({
    container: { flex: 1 },

    list: { flex: 1 },
    listContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: theme.spacing.xxl + 190,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.typography.fontSizes.xl,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: theme.spacing.xs,
    },

    iconSection: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      backgroundColor: `${theme.moduleColor ?? "#00E5FF"}10`,
      shadowColor: theme.moduleColor ?? "#00E5FF",
      shadowOpacity: theme.isDark ? 0.7 : 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    moduleTitle: {
      fontSize: theme.typography.fontSizes.xl,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    moduleSubtitle: {
      fontSize: theme.typography.fontSizes.md,
      color: theme.colors.textSecondary,
    },

    section: { marginBottom: theme.spacing.lg },

    neonShellCard: {},
    neonBottomLine: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },

    calendarRibbon: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.md,
    },
    calendarEmoji: { fontSize: 24, marginRight: theme.spacing.sm },
    calendarText: {
      fontSize: theme.typography.fontSizes.md,
      fontWeight: theme.typography.fontWeights.semibold,
      color: theme.colors.textPrimary,
    },

    summaryRow: { flexDirection: "row", columnGap: theme.spacing.sm },
    summaryCard: { flex: 1 },
    summaryLabel: {
      fontSize: theme.typography.fontSizes.xs,
      color: theme.colors.textSecondary,
    },
    summaryValue: {
      fontSize: theme.typography.fontSizes.xl,
      fontWeight: theme.typography.fontWeights.bold,
      marginTop: 4,
      color: theme.colors.textPrimary,
    },

    actionsRow: {
      flexDirection: "row",
      columnGap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    smallButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    smallButtonText: {
      fontSize: theme.typography.fontSizes.sm,
      fontWeight: theme.typography.fontWeights.semibold,
    },

    filterRow: {
      flexDirection: "row",
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    filterChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: 999,
      borderWidth: 1,
      marginRight: theme.spacing.sm,
    },
    filterChipText: { fontSize: theme.typography.fontSizes.xs },
    filterMeta: {
      fontSize: theme.typography.fontSizes.xs,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },

    taskCard: {
      flexDirection: "row",
      alignItems: "stretch",
      padding: theme.spacing.sm,
      borderRadius: 24,
      marginBottom: theme.spacing.sm,
      overflow: "hidden",
      backgroundColor: theme.isDark ? "rgba(3,6,10,0.6)" : "#F8FAFC",
      borderWidth: 1.5,
      borderColor: theme.isDark
        ? "rgba(0,229,255,0.12)"
        : "rgba(3,105,161,0.08)",
      shadowColor: theme.isDark ? "#00E5FF" : "#0369A1",
      shadowOpacity: theme.isDark ? 0.28 : 0.12,
      shadowRadius: theme.isDark ? 18 : 8,
      shadowOffset: { width: 0, height: 8 },
      elevation: theme.isDark ? 14 : 6,
    },
    taskLeftColumn: {
      alignItems: "center",
      marginRight: theme.spacing.md,
      paddingTop: 2,
    },
    taskDateBubble: {
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
      minWidth: 54,
      borderWidth: 1.5,
      borderColor: theme.isDark
        ? "rgba(0,229,255,0.18)"
        : "rgba(3,105,161,0.12)",
      backgroundColor: theme.isDark
        ? "rgba(5,16,24,0.6)"
        : "rgba(247,250,255,0.9)",
      shadowColor: theme.isDark ? "#00E5FF" : "#0369A1",
      shadowOpacity: theme.isDark ? 0.6 : 0.08,
      shadowRadius: 12,
    },
    taskDateDay: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.isDark ? "#00E5FF" : "#0369A1",
    },
    taskDateMon: {
      fontSize: 10,
      letterSpacing: 1,
      fontWeight: "800",
      color: theme.isDark ? "#A7FFF6" : "#0369A1",
    },
    taskStatusTag: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: theme.isDark
        ? "rgba(255,122,226,0.16)"
        : "rgba(236,72,153,0.08)",
      backgroundColor: theme.isDark
        ? "rgba(255,122,226,0.04)"
        : "rgba(236,72,153,0.02)",
    },
    taskStatusTagText: {
      fontSize: 10,
      fontWeight: "800",
      color: theme.isDark ? "#FF7AE2" : "#EC4899",
    },

    taskContent: { flex: 1, minWidth: 0 },
    taskHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    taskTitleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      flexShrink: 1,
      minWidth: 0,
    },
    taskTitle: {
      fontSize: theme.typography.fontSizes.md,
      fontWeight: theme.typography.fontWeights.semibold,
      color: theme.isDark ? "#CFFAFE" : "#0f172a",
      letterSpacing: 0.3,
      textShadowColor: theme.isDark ? "rgba(0,229,255,0.12)" : "transparent",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: theme.isDark ? 6 : 0,
    },
    taskDetails: {
      fontSize: theme.typography.fontSizes.xs,
      color: theme.isDark ? "#9CA6BF" : "#64748B",
      marginTop: 2,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
      flexWrap: "wrap",
      columnGap: 10,
      rowGap: 6,
    },
    metaPill: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      backgroundColor: theme.isDark
        ? "rgba(7,20,28,0.6)"
        : "rgba(248,250,252,0.9)",
      borderColor: theme.isDark
        ? "rgba(0,229,255,0.12)"
        : "rgba(3,105,161,0.08)",
      shadowColor: theme.isDark ? "#00E5FF" : "#0369A1",
      shadowOpacity: theme.isDark ? 0.18 : 0,
      shadowRadius: 6,
    },
    metaPillText: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.isDark ? "#7EE9FF" : "#0369A1",
    },

    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.md,
      backgroundColor: "rgba(15,23,42,0.55)",
    },
    modalCard: {
      borderRadius: 20,
      padding: theme.spacing.lg,
      maxHeight: "90%",
      backgroundColor: "#020617",
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
      borderWidth: 1,
      borderColor: "#1E293B",
      overflow: "hidden",
    },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm,
    },
    modalTitle: {
      fontSize: theme.typography.fontSizes.lg,
      fontWeight: theme.typography.fontWeights.bold,
      color: "#F9FAFB",
    },
    modalHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      columnGap: 10,
    },

    label: {
      fontSize: theme.typography.fontSizes.xs,
      color: "#9CA3AF",
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: "#4B5563",
      borderRadius: 10,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical:
        Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.xs,
      color: "#F9FAFB",
      backgroundColor: "#020617",
      fontSize: theme.typography.fontSizes.sm,
      marginBottom: theme.spacing.sm,
    },

    chipRow: { flexDirection: "row", flexWrap: "wrap" },
    emailChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: 999,
      marginRight: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
      backgroundColor: `${theme.moduleColor ?? "#00E5FF"}22`,
    },
    emailChipText: {
      fontSize: theme.typography.fontSizes.xs,
      color: "#E5E7EB",
      marginRight: 4,
    },

    subtaskRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
    },
    subtaskText: {
      fontSize: theme.typography.fontSizes.sm,
      color: "#E5E7EB",
    },

    commentListBox: {
      marginTop: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}33`,
      backgroundColor: "#050B16",
      padding: 10,
      maxHeight: 260,
    },

    commentBubble: {
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}33`,
    },

    replyLine: {
      position: "absolute",
      left: 8,
      top: 0,
      bottom: 0,
      width: 2,
      borderRadius: 999,
      backgroundColor: `${theme.moduleColor ?? "#00E5FF"}33`,
    },

    commentHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },

    commentAuthor: {
      fontSize: theme.typography.fontSizes.xs,
      fontWeight: theme.typography.fontWeights.semibold,
      color: "#E5E7EB",
    },
    commentMeta: {
      fontSize: theme.typography.fontSizes.xs,
      color: "#94A3B8",
      fontWeight: theme.typography.fontWeights.normal,
    },

    commentTextCompact: {
      fontSize: 13,
      marginTop: 6,
      color: "#E5E7EB",
      lineHeight: 18,
    },

    commentActions: {
      flexDirection: "row",
      columnGap: 10,
      alignItems: "center",
    },

    mentionInline: {
      color: theme.moduleColor ?? "#00E5FF",
      fontWeight: "900",
    },

    viewRepliesBtn: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}55`,
      backgroundColor: `${theme.moduleColor ?? "#00E5FF"}14`,
      marginTop: 8,
    },
    viewRepliesText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.moduleColor ?? "#00E5FF",
    },

    commentEditInput: {
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}55`,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: "#E5E7EB",
      backgroundColor: "#020617",
      fontSize: theme.typography.fontSizes.sm,
    },

    replyBanner: {
      marginTop: 10,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}55`,
      backgroundColor: "#0B1220",
    },

    mentionBox: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}55`,
      backgroundColor: "#07101E",
      overflow: "hidden",
    },
    mentionItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#0f172a",
    },
    mentionItemText: {
      color: "#E5E7EB",
      fontSize: 13,
      fontWeight: "700",
    },

    commentRow: {
      flexDirection: "row",
      columnGap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    commentInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#4B5563",
      borderRadius: 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical:
        Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.xs,
      color: "#F9FAFB",
      backgroundColor: "#020617",
      fontSize: theme.typography.fontSizes.sm,
    },

    chipButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    chipButtonText: {
      fontSize: theme.typography.fontSizes.sm,
      fontWeight: theme.typography.fontWeights.semibold,
    },

    chatDrawerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    chatDrawer: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: Math.min(360, Math.floor((theme.screenWidth || 360) * 0.86)),
      backgroundColor: "#050B16",
      borderLeftWidth: 1,
      borderLeftColor: "#1E293B",
      padding: 12,
    },
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#0f172a",
      marginBottom: 10,
    },
    chatTitle: {
      color: "#E5E7EB",
      fontSize: 14,
      fontWeight: "900",
    },
    chatList: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}22`,
      backgroundColor: "#07101E",
      padding: 10,
    },
    chatBubbleMine: {
      alignSelf: "flex-end",
      maxWidth: "88%",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${theme.moduleColor ?? "#00E5FF"}55`,
      backgroundColor: `${theme.moduleColor ?? "#00E5FF"}14`,
      marginBottom: 8,
    },
    chatBubbleOther: {
      alignSelf: "flex-start",
      maxWidth: "88%",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#1E293B",
      backgroundColor: "#0B1220",
      marginBottom: 8,
    },
    chatName: {
      color: "#94A3B8",
      fontSize: 11,
      fontWeight: "800",
      marginBottom: 2,
    },
    chatText: {
      color: "#E5E7EB",
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    chatTime: {
      color: "#64748B",
      fontSize: 10,
      marginTop: 4,
      fontWeight: "700",
    },
    chatInputRow: {
      flexDirection: "row",
      columnGap: 10,
      paddingTop: 10,
    },
    chatInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#334155",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      color: "#E5E7EB",
      backgroundColor: "#020617",
      fontSize: 13,
    },

    floatingAdd: {
      position: "absolute",
      top: -34,
      alignSelf: "center",
      zIndex: 10,
      elevation: 10,
    },
    floatingAddButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.moduleColor ?? "#00E5FF",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: (theme.moduleColor ?? "#00E5FF") + "AA",
      shadowColor: theme.moduleColor ?? "#00E5FF",
      shadowOpacity: 0.9,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 0 },
      elevation: 25,
      zIndex: 400,
    },

    bottomBar: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: Platform.OS === "ios" ? 16 : 12,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: isDark ? "rgba(10,10,15,0.98)" : "rgba(15,23,42,0.95)",
      borderRadius: 26,
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#111827",
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -2 },
      zIndex: 10,
      elevation: 10,
    },
    bottomBarItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    bottomBarIconWrapper: {
      padding: 6,
      borderRadius: 999,
    },
    bottomBarLabel: {
      fontSize: 11,
      marginTop: 2,
      color: theme.colors.textSecondary,
    },
  });
}
