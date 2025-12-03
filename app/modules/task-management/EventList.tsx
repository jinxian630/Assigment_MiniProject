import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";

import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
  Button,
} from "react-native-rapi-ui";

import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print"; // 👈 NEW
import { shareAsync } from "expo-sharing"; // 👈 NEW
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  deleteDoc,
  query,
} from "firebase/firestore";

import { SwipeListView } from "react-native-swipe-list-view";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";
import * as Clipboard from "expo-clipboard"; // 👈 for copy

export default function () {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const [loading, setLoading] = useState<boolean>(true);
  const [EventArray, setEventArray] = useState<any[]>([]);

  // Menus like Task menu layout
  const [showAddMenu, setShowAddMenu] = useState(false); // FAB +
  const [showListMenu, setShowListMenu] = useState(false); // left list icon

  useEffect(() => {
    const q = query(collection(db, "Events"));

    const subscriber = onSnapshot(q, (querySnapshot) => {
      const eventData: any[] = [];

      querySnapshot.forEach((docSnap) => {
        eventData.push({
          ...docSnap.data(),
          key: docSnap.id,
        });
      });

      console.log("Events fetched:", eventData.length);

      // sort newest first
      eventData.sort(
        (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)
      );

      setEventArray(eventData);
      setLoading(false);
    });

    return () => subscriber();
  }, []);

  const closeRow = (rowMap: any, rowKey: any) => {
    if (rowMap[rowKey]) rowMap[rowKey].closeRow();
  };

  const deleteRow = (rowMap: any, rowKey: any, attachments: string[]) => {
    closeRow(rowMap, rowKey);

    try {
      deleteDoc(doc(db, "Events", rowKey))
        .then(() => {
          console.log("Event deleted!");

          attachments?.map(async (fileURL) => {
            const fileRef = ref(storage, fileURL);

            deleteObject(fileRef)
              .then(() => {
                console.log("Attachment deleted:", fileURL);
              })
              .catch((error) => console.log(error));
          });
        })
        .catch((err) => alert(err.message));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyLocation = async (text: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Location copied to clipboard");
  };

  const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // 🔻 NEW: export all events (EventArray) to PDF
  const handlePrintEvents = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to export your events.");
        return;
      }

      // ----- Summary stats -----
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMs = today.getTime();

      const totalEvents = EventArray.length;
      const upcomingEvents = EventArray.filter(
        (e: any) => typeof e.date === "number" && e.date >= todayMs
      ).length;
      const pastEvents = EventArray.filter(
        (e: any) => typeof e.date === "number" && e.date < todayMs
      ).length;

      const onlineEvents = EventArray.filter(
        (e: any) => (e.mode || "").toLowerCase() === "online"
      ).length;
      const offlineEvents = EventArray.filter(
        (e: any) => (e.mode || "").toLowerCase() === "offline"
      ).length;

      // ----- Table rows -----
      const eventRowsHtml =
        EventArray.length === 0
          ? `<tr><td colspan="7" class="empty-cell">No events found.</td></tr>`
          : EventArray.map((e: any, index: number) => {
              const safeTitle = (e.title || "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
              const safeDescription = (e.description || "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
              const safeLocation = (e.location || "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
              const safeMode = (e.mode || "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
              // guests can be string OR array OR undefined
              let guestRaw = "";
              if (Array.isArray(e.guests)) {
                guestRaw = e.guests.join(", ");
              } else if (typeof e.guests === "string") {
                guestRaw = e.guests;
              }

              const safeGuest = guestRaw
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

              const date =
                typeof e.date === "number"
                  ? new Date(e.date).toLocaleDateString("en-GB")
                  : "-";

              let attachmentUrl: string | undefined;
              if (Array.isArray(e.attachments) && e.attachments.length > 0) {
                attachmentUrl = e.attachments[0];
              } else if (typeof e.attachments === "string" && e.attachments) {
                attachmentUrl = e.attachments;
              }

              const attachmentHtml = attachmentUrl
                ? `
                <img 
                  src="${attachmentUrl}" 
                  style="
                    max-width: 120px;
                    max-height: 80px;
                    border-radius: 8px;
                    object-fit: cover;
                  "
                />
              `
                : `
                <div class="no-image-box">
                  No Image
                </div>
              `;

              return `
              <tr>
                <td>${index + 1}</td>
                <td>
                  <div class="event-title">${safeTitle}</div>
                  ${
                    safeDescription
                      ? `<div class="event-details">${safeDescription}</div>`
                      : ""
                  }
                </td>
                <td class="date-cell">${date}</td>
                <td>${safeLocation}</td>
                <td>${safeMode}</td>
                <td>${safeGuest}</td>
                <td class="attachment-cell">${attachmentHtml}</td>
              </tr>
            `;
            }).join("");

      const generatedAt = new Date().toLocaleString();

      const html = `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: #f3f4f6;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
            }
            .page {
              max-width: 800px;
              margin: 0 auto;
              padding: 16px;
            }
            .header-card {
              background: linear-gradient(135deg, #16a34a, #15803d);
              border-radius: 16px;
              padding: 16px 18px;
              color: #ffffff;
              margin-bottom: 16px;
              box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
            }
            .app-name {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              opacity: 0.9;
            }
            .title-row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-top: 4px;
              gap: 8px;
            }
            .main-title {
              font-size: 22px;
              font-weight: 700;
            }
            .user-email {
              font-size: 11px;
              opacity: 0.9;
              text-align: right;
            }
            .generated-text {
              margin-top: 6px;
              font-size: 11px;
              opacity: 0.85;
            }

            .section-card {
              background: #ffffff;
              border-radius: 14px;
              padding: 14px;
              box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
              margin-bottom: 16px;
              border: 1px solid #e5e7eb;
            }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              margin: 0 0 8px 0;
            }
            .section-subtitle {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 10px;
            }

            /* Summary cards */
            .summary-row {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 10px;
            }
            .summary-card {
              flex: 1;
              min-width: 140px;
              border-radius: 10px;
              padding: 8px 10px;
              background: #ecfdf5;
              border: 1px solid #bbf7d0;
            }
            .summary-title {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 2px;
            }
            .summary-value {
              font-size: 16px;
              font-weight: 700;
              color: #022c22;
            }
            .summary-chip {
              font-size: 10px;
              color: #15803d;
              margin-top: 2px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            thead {
              background-color: #f3f4f6;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 6px 7px;
              text-align: left;
              vertical-align: top;
            }
            th {
              font-size: 11px;
              font-weight: 600;
              color: #374151;
            }
            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .empty-cell {
              text-align: center;
              color: #6b7280;
              padding: 10px 0;
            }
            .event-title {
              font-weight: 600;
              margin-bottom: 2px;
              color: #111827;
            }
            .event-details {
              font-size: 10px;
              color: #6b7280;
            }
            .date-cell {
              white-space: nowrap;
            }
            .attachment-cell {
              text-align: center;
            }
            .no-image-box {
              width: 120px;
              height: 80px;
              border-radius: 8px;
              background-color: #e5e7eb;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 10px;
              color: #6b7280;
            }
            .footer-text {
              margin-top: 4px;
              font-size: 9px;
              color: #9ca3af;
              text-align: right;
            }
            @media print {
              .page { padding: 12px; }
              .header-card, .section-card { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header-card">
              <div class="app-name">FinTrack Pro – Event Module</div>
              <div class="title-row">
                <div class="main-title">My Events Overview</div>
                <div class="user-email">${user.email || ""}</div>
              </div>
              <div class="generated-text">Generated on ${generatedAt}</div>
            </div>

            <div class="section-card">
              <div class="section-title">Summary</div>
              <div class="section-subtitle">
                Quick overview of your scheduled events.
              </div>
              <div class="summary-row">
                <div class="summary-card">
                  <div class="summary-title">Total Events</div>
                  <div class="summary-value">${totalEvents}</div>
                  <div class="summary-chip">${
                    totalEvents > 0 ? "Nice planning!" : "No events yet."
                  }</div>
                </div>
                <div class="summary-card">
                  <div class="summary-title">Upcoming / Past</div>
                  <div class="summary-value">${upcomingEvents} / ${pastEvents}</div>
                  <div class="summary-chip">${
                    upcomingEvents > 0
                      ? "You have upcoming events to prepare."
                      : "No future events scheduled."
                  }</div>
                </div>
                <div class="summary-card">
                  <div class="summary-title">Online / Offline</div>
                  <div class="summary-value">${onlineEvents} / ${offlineEvents}</div>
                  <div class="summary-chip">Online vs physical sessions overview.</div>
                </div>
              </div>
            </div>

            <div class="section-card">
              <div class="section-title">Event List</div>
              <div class="section-subtitle">
                Overview of your events, including date, location, mode and guest email.
              </div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Event</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Mode</th>
                    <th>Guest</th>
                    <th>Attachment</th>
                  </tr>
                </thead>
                <tbody>
                  ${eventRowsHtml}
                </tbody>
              </table>
              <div class="footer-text">
                Report generated from mobile app.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message ?? "Failed to generate PDF.");
    }
  };

  const renderItem = (data: any) => {
    const isOnline = data.item.mode === "online";
    const locationLabel = isOnline ? "Online Link" : "Location";
    const locationValue = data.item.location;
    const guestLabel = Array.isArray(data.item.guests)
      ? data.item.guests.join(", ")
      : data.item.guests || "—";

    const isPastEvent =
      typeof data.item.date === "number" &&
      data.item.date < new Date().getTime();

    const baseTitleStyle = StyleSheet.flatten(styles.title);
    const titleStyle: TextStyle = isPastEvent
      ? {
          ...baseTitleStyle,
          textDecorationLine: "line-through",
          color: "#555",
        }
      : baseTitleStyle;

    const cardBackgroundColor = isPastEvent ? "#888" : "#87c3a4ff";

    return (
      <TouchableHighlight
        style={{ borderRadius: 10, marginVertical: 5 }}
        underlayColor={"#DADADA"}
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: cardBackgroundColor,
            borderRadius: 10,
            padding: 12,
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* IMAGE */}
          {data.item.attachments && data.item.attachments.length > 0 ? (
            <Image
              source={{ uri: data.item.attachments[0] }}
              style={styles.image}
            />
          ) : (
            <View style={styles.noImageBox}>
              <Ionicons name="image-outline" size={32} color="#888" />
            </View>
          )}

          {/* INFO */}
          <View style={styles.infoContainer}>
            <Text fontWeight="bold" style={titleStyle}>
              {data.item.title}
            </Text>
            <Text style={styles.smallText}>
              Date: {formatDate(data.item.date)}
            </Text>
            <Text style={styles.smallText}>Mode: {data.item.mode}</Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: "#444",
                  flexShrink: 1,
                }}
              >
                {locationLabel}: {locationValue}
              </Text>

              <TouchableOpacity
                onPress={() => handleCopyLocation(locationValue)}
                style={{ marginLeft: 6, padding: 4 }}
              >
                <Ionicons name="copy-outline" size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <Text style={styles.smallText}>
              Details: {data.item.description}
            </Text>
            <Text style={styles.smallText}>Guest Email: {guestLabel}</Text>
            <Text style={styles.createdBy}>
              Created By: {data.item.createdBy?.name}
            </Text>
          </View>
        </View>
      </TouchableHighlight>
    );
  };

  const renderHiddenItem = (data: any, rowMap: any) => {
    const isOwner =
      auth.currentUser && data.item.createdBy?.id === auth.currentUser.uid;

    return (
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          borderRadius: 10,
          marginVertical: 5,
          overflow: "hidden",
        }}
      >
        {/* Close */}
        <TouchableOpacity
          style={{
            backgroundColor: "#999",
            justifyContent: "center",
            alignItems: "center",
            width: 75,
            height: "100%",
          }}
          onPress={() => closeRow(rowMap, data.item.key)}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
        </TouchableOpacity>

        {/* Edit */}
        <TouchableOpacity
          style={{
            backgroundColor: "#0a0",
            justifyContent: "center",
            alignItems: "center",
            width: 75,
            height: "100%",
            opacity: isOwner ? 1 : 0.5,
          }}
          onPress={() => {
            if (!isOwner) {
              Alert.alert(
                "Permission denied",
                "You can only edit events that you created."
              );
              closeRow(rowMap, data.item.key);
              return;
            }
            router.push({
              pathname: "/modules/task-management/EventEdit",
              params: { id: data.item.key },
            });
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Edit</Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          style={{
            backgroundColor: "#f00",
            justifyContent: "center",
            alignItems: "center",
            width: 75,
            height: "100%",
            opacity: isOwner ? 1 : 0.5,
          }}
          onPress={() => {
            if (!isOwner) {
              Alert.alert(
                "Permission denied",
                "You can only delete events that you created."
              );
              closeRow(rowMap, data.item.key);
              return;
            }
            deleteRow(rowMap, data.item.key, data.item.attachments);
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Layout>
      <TopNav
        middleContent="My Event"
        leftContent={
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => {
          router.push("/modules/task-management/TaskMenu");
        }}
        rightContent={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setTheme(isDarkmode ? "light" : "dark")}
              style={{ marginRight: 16 }}
            >
              <Ionicons
                name={isDarkmode ? "sunny" : "moon"}
                size={20}
                color={isDarkmode ? themeColor.white100 : themeColor.dark}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowListMenu(true)}>
              <Ionicons
                name="list"
                size={22}
                color={isDarkmode ? themeColor.white100 : themeColor.dark}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={{ flex: 1, padding: 20 }}>
        {/* Header + export button */}
        <View style={{ alignItems: "center", marginBottom: 10 }}>
          <Text fontWeight="bold" style={{ fontSize: 24 }}>
            My Event
          </Text>
          <Text size="sm" style={{ marginTop: 4, opacity: 0.7 }}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>

          <Button
            text="Export Events (PDF)"
            size="sm"
            style={{ marginTop: 10 }}
            onPress={handlePrintEvents}
          />
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <SwipeListView
            data={EventArray}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-225}
            previewRowKey={"0"}
            previewOpenValue={-40}
            previewOpenDelay={3000}
          />
        )}
      </View>

      {/* ADD MENU */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setShowAddMenu(false)}
        >
          <View
            style={{
              width: "70%",
              backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text fontWeight="bold" style={{ marginBottom: 10 }}>
              Add...
            </Text>
            <Button
              text="Add Task"
              onPress={() => {
                setShowAddMenu(false);
                router.push("/modules/task-management/TaskAdd");
              }}
              style={{ marginBottom: 8 }}
            />
            <Button
              text="Add Event"
              onPress={() => {
                setShowAddMenu(false);
                router.push("/modules/task-management/EventAdd");
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* LIST MENU */}
      <Modal
        visible={showListMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowListMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setShowListMenu(false)}
        >
          <View
            style={{
              width: "70%",
              backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text fontWeight="bold" style={{ marginBottom: 10 }}>
              Go to...
            </Text>
            <Button
              text="My Task"
              onPress={() => {
                setShowListMenu(false);
                router.push("/modules/task-management/TaskMenu");
              }}
              style={{ marginBottom: 8 }}
            />
            <Button
              text="My Event"
              onPress={() => {
                setShowListMenu(false);
              }}
              style={{ marginBottom: 8 }}
            />

            <Button
              text="AI Task Dashboard"
              onPress={() => {
                setShowListMenu(false);
                router.push("/modules/task-management/TaskDashboard");
              }}
              style={{ marginBottom: 8 }}
            />
            <Button
              text="My Productivity"
              onPress={() => {
                setShowListMenu(false);
                router.push("/modules/task-management/Gamification");
              }}
              style={{ marginBottom: 8 }}
            />
            <Button
              text="My Chart"
              onPress={() => {
                setShowListMenu(false);
                router.push("/modules/task-management/TaskChart");
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating + button */}
      <TouchableOpacity
        onPress={() => setShowAddMenu(true)}
        style={{
          position: "absolute",
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#2563EB",
          justifyContent: "center",
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </Layout>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  noImageBox: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
    flexDirection: "column",
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  smallText: {
    fontSize: 13,
    color: "#444",
  },
  createdBy: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
    fontStyle: "italic",
  },
});
