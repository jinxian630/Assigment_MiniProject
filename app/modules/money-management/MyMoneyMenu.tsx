import React from "react";
import { View, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { MainStackParamList } from "src/types/navigation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_SIZE = (width - 60) / 2; // padding & gap

export default function ({
  navigation,
}: NativeStackScreenProps<MainStackParamList, "MyMoneyMenu">) {
  const { isDarkmode, setTheme } = useTheme();

  const cards = [
    {
      title: "Add Transaction",
      subtitle: "Quick add income\nor expense",
      icon: "add-circle-outline" as const,
      color: "#ff7f50",
      onPress: () => navigation.navigate("TransactionAdd"),
    },
    {
      title: "Transaction List",
      subtitle: "View & manage all\npast records",
      icon: "list-outline" as const,
      color: "#4b7bec",
      onPress: () => navigation.navigate("TransactionList"),
    },
    {
      title: "Charts & Insights",
      subtitle: "Category breakdown\n& trends",
      icon: "pie-chart-outline" as const,
      color: "#20bf6b",
      onPress: () => navigation.navigate("ChartDisplay"),
    },
  ];

  return (
    <Layout>
      <TopNav
        middleContent="Money Overview"
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => navigation.goBack()}
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
      />

      {/* Simple highlight banner like Money Manager */}
      <View
        style={[
          styles.summaryContainer,
          {
            backgroundColor: isDarkmode ? "#222" : "#f4f6fb",
          },
        ]}
      >
        <View>
          <Text style={styles.summaryTitle}>Money Manager</Text>
          <Text style={styles.summarySubtitle}>
            Track income, expenses &\nsee insights at a glance
          </Text>
        </View>
        <Ionicons
          name="wallet-outline"
          size={40}
          color={isDarkmode ? themeColor.white100 : themeColor.dark}
        />
      </View>

      <View style={styles.menuContainer}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.title}
            style={[
              styles.card,
              {
                backgroundColor: isDarkmode ? "#2b2b2b" : "#ffffff",
              },
            ]}
            onPress={card.onPress}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: card.color + "22",
                  borderColor: card.color,
                },
              ]}
            >
              <Ionicons name={card.icon} size={26} color={card.color} />
            </View>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  summaryContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  menuContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: "space-between",
  },
  card: {
    width: CARD_SIZE,
    borderRadius: 18,
    padding: 14,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
});
