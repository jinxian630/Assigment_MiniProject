import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, View, TouchableOpacity } from "react-native";
import { Text } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";

export const MODULE_COLOR = "#38BDF8";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

export const formatDateGB = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/** Neon shell used by multiple screens */
export const createNeonCardShell = (
  accentColor: string,
  theme: any,
  extra: any = {}
) => ({
  borderRadius: 24,
  borderWidth: 1,
  borderColor: `${accentColor}66`,
  shadowColor: accentColor,
  shadowOpacity: theme?.isDark ? 0.9 : 0.5,
  shadowRadius: theme?.isDark ? 30 : 20,
  shadowOffset: { width: 0, height: 0 },
  elevation: theme?.isDark ? 18 : 8,
  ...extra,
});

export const NeonBottomLine = ({
  color,
  style,
}: {
  color: string;
  style?: any;
}) => (
  <View
    style={[
      style,
      {
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      },
    ]}
  />
);

/** Reused Date Picker Modal (TaskAdd + EventAdd + TaskMenuScreen) */
export type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  theme: any;
  title?: string;
};

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  theme,
  title,
}) => {
  const initial = selectedDate || new Date();

  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth() + 1); // 1–12
  const [calendarCurrent, setCalendarCurrent] = useState(
    `${initial.getFullYear()}-${pad2(initial.getMonth() + 1)}-01`
  );

  useEffect(() => {
    if (!visible) return;
    const base = selectedDate || new Date();
    const y = base.getFullYear();
    const m = base.getMonth() + 1;
    setYear(y);
    setMonth(m);
    setCalendarCurrent(`${y}-${pad2(m)}-01`);
  }, [visible, selectedDate]);

  useEffect(() => {
    setCalendarCurrent(`${year}-${pad2(month)}-01`);
  }, [year, month]);

  const goToPrevMonth = () => {
    setMonth((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setMonth((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const goToPrevYear = () => setYear((y) => y - 1);
  const goToNextYear = () => setYear((y) => y + 1);

  const handleDayPress = (day: any) => {
    const d = new Date(day.dateString);
    onSelectDate(d);
    onClose();
  };

  const selectedKey = selectedDate
    ? selectedDate.toISOString().split("T")[0]
    : undefined;

  const markedDates = useMemo(() => {
    if (!selectedKey) return {};
    return {
      [selectedKey]: {
        selected: true,
        selectedColor: MODULE_COLOR,
        selectedTextColor: "#0f172a",
      },
    };
  }, [selectedKey]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 20,
            padding: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.isDark ? "#1f2937" : "#d1d5db",
            shadowColor: MODULE_COLOR,
            shadowOpacity: theme.isDark ? 0.4 : 0.25,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          {title ? (
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                marginBottom: 12,
                textAlign: "center",
                color: theme.colors.textPrimary,
              }}
            >
              {title}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: "#0f172a",
              borderWidth: 1,
              borderColor: theme.isDark ? "#1e293b" : "#cbd5e1",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={goToPrevYear} style={{ padding: 4 }}>
                <Ionicons
                  name="play-back"
                  size={19}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}>
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.textPrimary,
              }}
            >
              {MONTH_NAMES[month - 1]} {year}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }}>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={goToNextYear} style={{ padding: 4 }}>
                <Ionicons
                  name="play-forward"
                  size={19}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Calendar
            current={calendarCurrent}
            hideArrows
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.colors.card,
              calendarBackground: theme.colors.card,
              textSectionTitleColor: theme.colors.textSecondary,
              selectedDayBackgroundColor: MODULE_COLOR,
              selectedDayTextColor: "#0f172a",
              todayTextColor: MODULE_COLOR,
              dayTextColor: theme.colors.textPrimary,
              textDisabledColor: "#6b7280",
              monthTextColor: theme.colors.textPrimary,
            }}
          />

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: MODULE_COLOR,
              borderRadius: 999,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "700" }}>
              Close
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
