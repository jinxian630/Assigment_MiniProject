import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import {
  Layout,
  TopNav,
  Text,
  TextInput,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

type UserItem = {
  id: string;
  displayName?: string;
  email?: string;
};

export default function UserSearch() {
  const router = useRouter();
  const { isDarkmode } = useTheme();

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  const db = getFirestore();

  const handleSearch = async () => {
    const term = searchText.trim();
    if (!term) return;

    try {
      setLoading(true);
      setResults([]);

      const usersRef = collection(db, "users");
      const found: UserItem[] = [];

      // 1) Try exact email match
      const qEmail = query(usersRef, where("email", "==", term.toLowerCase()));
      const emailSnap = await getDocs(qEmail);
      emailSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        found.push({
          id: docSnap.id,
          displayName: data.displayName,
          email: data.email,
        });
      });

      // 2) If nothing by email, try displayName exact match
      if (found.length === 0) {
        const qName = query(usersRef, where("displayName", "==", term));
        const nameSnap = await getDocs(qName);
        nameSnap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          found.push({
            id: docSnap.id,
            displayName: data.displayName,
            email: data.email,
          });
        });
      }

      setResults(found);
    } catch (err) {
      console.log("Search error:", err);
      // simple fallback, you can show alert if you want
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: UserItem }) => (
    <TouchableOpacity
      onPress={() =>
        router.push(`/modules/memory-book/user-profile?userId=${item.id}`)
      }
      style={styles.resultItem}
    >
      <View style={styles.avatar}>
        <Ionicons name="person-outline" size={20} color={themeColor.white100} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nameText}>{item.displayName || "No name"}</Text>
        <Text style={styles.emailText}>{item.email}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9ca3af"
      />
    </TouchableOpacity>
  );

  return (
    <Layout>
      <TopNav
        middleContent="Find Friends"
        leftContent={
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => router.back()}
      />

      <View style={styles.container}>
        <Text style={styles.label}>Search by email or display name</Text>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder="e.g. alex@gmail.com or Alex Tan"
              autoCapitalize="none"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            style={styles.searchButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Ionicons name="search" size={18} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {results.length === 0 && !loading ? (
          <Text style={styles.hintText}>
            Type an email or exact display name to search.
          </Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={{ marginTop: 16 }}
          />
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b7280",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  nameText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emailText: {
    fontSize: 12,
    color: "#6b7280",
  },
});
