import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Dimensions, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";

import {
  getFirestore,
  collection,
  query,
  onSnapshot,
} from "firebase/firestore";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function TaskChart() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
  const db = getFirestore();

  const [taskCounts, setTaskCounts] = useState<number[]>(new Array(12).fill(0));
  const [eventCounts, setEventCounts] = useState<number[]>(
    new Array(12).fill(0)
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ===== TASKS =====
    const qTasks = query(collection(db, "Tasks"));

    const unsubscribeTasks = onSnapshot(
      qTasks,
      (snapshot) => {
        console.log("TaskChart (Tasks) snapshot size:", snapshot.size);

        const counts = new Array(12).fill(0);

        snapshot.forEach((doc) => {
          const data: any = doc.data();

          // use scheduled dates if possible: startDate -> dueDate -> createdAt
          const rawDate = data.startDate ?? data.dueDate ?? data.createdAt;

          console.log("Task doc:", doc.id, "rawDate:", rawDate);

          if (!rawDate) return;

          let date: Date | null = null;

          if (typeof rawDate === "number") {
            date = new Date(rawDate);
          } else if (rawDate.toDate) {
            date = rawDate.toDate();
          } else if (typeof rawDate === "string") {
            date = new Date(rawDate);
          }

          if (!date || isNaN(date.getTime())) {
            console.warn("Invalid task date", doc.id, rawDate);
            return;
          }

          const monthIndex = date.getMonth(); // 0–11

          if (monthIndex >= 0 && monthIndex < 12) {
            counts[monthIndex]++;
          }
        });

        console.log("TaskChart monthly task counts:", counts);

        setTaskCounts(counts);
        setIsLoading(false); // we can show chart once tasks are loaded
      },
      (error) => {
        console.error("TaskChart Firestore error (Tasks):", error);
        setIsLoading(false);
      }
    );

    // ===== EVENTS =====
    const qEvents = query(collection(db, "Events"));

    const unsubscribeEvents = onSnapshot(
      qEvents,
      (snapshot) => {
        console.log("TaskChart (Events) snapshot size:", snapshot.size);

        const counts = new Array(12).fill(0);

        snapshot.forEach((doc) => {
          const data: any = doc.data();

          // use event date if possible: date -> createdAt
          const rawDate = data.date ?? data.createdAt;

          console.log("Event doc:", doc.id, "rawDate:", rawDate);

          if (!rawDate) return;

          let date: Date | null = null;

          if (typeof rawDate === "number") {
            date = new Date(rawDate);
          } else if (rawDate.toDate) {
            date = rawDate.toDate();
          } else if (typeof rawDate === "string") {
            date = new Date(rawDate);
          }

          if (!date || isNaN(date.getTime())) {
            console.warn("Invalid event date", doc.id, rawDate);
            return;
          }

          const monthIndex = date.getMonth(); // 0–11

          if (monthIndex >= 0 && monthIndex < 12) {
            counts[monthIndex]++;
          }
        });

        console.log("TaskChart monthly event counts:", counts);

        setEventCounts(counts);
      },
      (error) => {
        console.error("TaskChart Firestore error (Events):", error);
      }
    );

    return () => {
      unsubscribeTasks();
      unsubscribeEvents();
    };
  }, []);

  const allZero =
    taskCounts.every((v) => v === 0) && eventCounts.every((v) => v === 0);

  // ========== RENDERING ==========
  if (isLoading) {
    return (
      <Layout>
        <TopNav
          middleContent="Task & Event Chart"
          leftContent={
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          leftAction={() => router.back()}
          rightContent={
            <Ionicons
              name={isDarkmode ? "sunny" : "moon"}
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </Layout>
    );
  }

  if (allZero) {
    return (
      <Layout>
        <TopNav
          middleContent="Task & Event Chart"
          leftContent={
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          leftAction={() => router.back()}
          rightContent={
            <Ionicons
              name={isDarkmode ? "sunny" : "moon"}
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
        />
        <View style={styles.center}>
          <Text>No tasks or events created yet.</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <TopNav
        middleContent="Task & Event Chart"
        leftContent={
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => router.back()}
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
      />

      <View style={{ flex: 1, paddingHorizontal: 8, paddingTop: 10 }}>
        <Text
          fontWeight="bold"
          style={{ textAlign: "center", marginBottom: 4 }}
        >
          Monthly Tasks & Events
        </Text>
        <Text
          size="sm"
          style={{ textAlign: "center", marginBottom: 8, opacity: 0.7 }}
        >
          Tasks counted by start/due date; events counted by event date
        </Text>

        <LineChart
          data={{
            labels: MONTH_LABELS,
            datasets: [
              {
                data: taskCounts,
                strokeWidth: 2,
                color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`, // blue
              },
              {
                data: eventCounts,
                strokeWidth: 2,
                color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`, // green
              },
            ],
            legend: ["Tasks", "Events"],
          }}
          width={Dimensions.get("window").width - 16}
          height={260}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#eff3ff",
            backgroundGradientTo: "#efefef",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "3",
            },
          }}
          style={{
            marginVertical: 16,
            borderRadius: 16,
          }}
          bezier
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
