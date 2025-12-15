import React, { useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";

type TabKey = "Task" | "Event" | "Productivity" | "Chart";

type Props = {
  active: TabKey;

  /** If true, floating add opens Add menu modal (Task/Event). If false, goes directly to TaskAdd. */
  useAddMenu?: boolean;

  /** Override default paths (if your app paths differ) */
  paths?: Partial<
    Record<
      | "TaskHome"
      | "EventList"
      | "Gamification"
      | "Chart"
      | "TaskAdd"
      | "EventAdd",
      string
    >
  >;

  /** Accent color */
  accentColor?: string;
};

const DEFAULT_ACCENT = "#38BDF8";

const DEFAULT_PATHS = {
  TaskHome: "/modules/task-management",
  EventList: "/modules/task-management/EventList",
  Gamification: "/modules/task-management/Gamification",
  Chart: "/modules/task-management/TaskChart",
  TaskAdd: "/modules/task-management/TaskAdd",
  EventAdd: "/modules/task-management/EventAdd",
};

export default function TaskBottomBar({
  active,
  useAddMenu = true,
  paths,
  accentColor = DEFAULT_ACCENT,
}: Props) {
  const router = useRouter();
  const { theme }: any = useTheme();
  const isDark = theme?.isDark === true;

  const p = { ...DEFAULT_PATHS, ...(paths || {}) };

  const [showAddMenu, setShowAddMenu] = useState(false);

  const barStyle = useMemo(
    () => [
      styles.bar,
      {
        backgroundColor: isDark ? "rgba(10,10,15,0.98)" : "rgba(15,23,42,0.95)",
        borderColor: isDark ? "#1F2937" : "#111827",
      },
    ],
    [isDark]
  );

  const iconColor = (k: TabKey) =>
    k === active ? accentColor : theme.colors.textSecondary;

  const labelStyle = (k: TabKey) => ({
    ...styles.label,
    color: k === active ? accentColor : theme.colors.textSecondary,
    fontWeight: k === active ? "600" : "400",
  });

  const go = (k: TabKey) => {
    if (k === "Task") router.push(p.TaskHome as any);
    if (k === "Event") router.push(p.EventList as any);
    if (k === "Productivity") router.push(p.Gamification as any);
    if (k === "Chart") router.push(p.Chart as any);
  };

  const handlePressAdd = () => {
    if (!useAddMenu) {
      router.push(p.TaskAdd as any);
      return;
    }
    setShowAddMenu(true);
  };

  return (
    <>
      {/* Add Menu Modal (reused everywhere) */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPressOut={() => setShowAddMenu(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? "#020617" : "#0B1220",
                borderColor: `${accentColor}55`,
                shadowColor: accentColor,
              },
            ]}
          >
            <View
              style={[
                styles.modalNeonLine,
                {
                  backgroundColor: accentColor,
                  shadowColor: accentColor,
                },
              ]}
            />

            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: theme.colors.textPrimary,
                marginBottom: 10,
              }}
            >
              Add...
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowAddMenu(false);
                router.push(p.TaskAdd as any);
              }}
              style={[styles.modalBtn, { backgroundColor: accentColor }]}
            >
              <Text style={styles.modalBtnText}>Add Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowAddMenu(false);
                router.push(p.EventAdd as any);
              }}
              style={[styles.modalBtn, { backgroundColor: "#0256ffff" }]}
            >
              <Text style={styles.modalBtnText}>Add Event</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Bar */}
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={barStyle}>
          <TouchableOpacity style={styles.item} onPress={() => go("Task")}>
            <View
              style={[
                styles.iconCircle,
                active === "Task" && {
                  backgroundColor: `${accentColor}22`,
                  shadowColor: accentColor,
                },
              ]}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={iconColor("Task")}
              />
            </View>
            <Text style={labelStyle("Task")}>Task</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => go("Event")}>
            <View
              style={[
                styles.iconCircle,
                active === "Event" && {
                  backgroundColor: `${accentColor}22`,
                  shadowColor: accentColor,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={iconColor("Event")}
              />
            </View>
            <Text style={labelStyle("Event")}>Event</Text>
          </TouchableOpacity>

          {/* Space for FAB */}
          <View style={{ width: 28 }} />

          <TouchableOpacity
            style={styles.item}
            onPress={() => go("Productivity")}
            disabled={active === "Productivity"}
          >
            <View
              style={[
                styles.iconCircle,
                active === "Productivity" && {
                  backgroundColor: `${accentColor}22`,
                  shadowColor: accentColor,
                },
              ]}
            >
              <Ionicons
                name="game-controller-outline"
                size={20}
                color={iconColor("Productivity")}
              />
            </View>

            <Text style={labelStyle("Productivity")}>Productivity</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => go("Chart")}>
            <View
              style={[
                styles.iconCircle,
                active === "Chart" && {
                  backgroundColor: `${accentColor}22`,
                  shadowColor: accentColor,
                },
              ]}
            >
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={iconColor("Chart")}
              />
            </View>
            <Text style={labelStyle("Chart")}>Chart</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Add */}
        <View style={styles.fabSlot} pointerEvents="box-none">
          <View
            style={[
              styles.fabOuter,
              {
                borderColor: accentColor,
                shadowColor: accentColor,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.fab,
                {
                  backgroundColor: accentColor,
                  borderColor: `${accentColor}AA`,
                  shadowColor: accentColor,
                },
              ]}
              onPress={handlePressAdd}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={34} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: Platform.OS === "ios" ? 16 : 12,
  },

  bar: {
    height: 64,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,

    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },

  item: { flex: 1, alignItems: "center", justifyContent: "center" },

  label: { fontSize: 11, marginTop: 2 },

  fabSlot: {
    position: "absolute",
    top: -34,
    alignSelf: "center",
    zIndex: 30,
    elevation: 30,
  },

  fabOuter: {
    width: 65,
    height: 65,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 25,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "70%",
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    overflow: "hidden",
  },
  modalNeonLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  modalBtn: {
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  iconCircle: {
    padding: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "800" },
});
