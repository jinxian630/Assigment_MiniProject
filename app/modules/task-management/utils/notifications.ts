import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Send a notification to assignees, creator, and guests when a comment or chat message is added
 * @param assignees - Array of assignee email addresses
 * @param creatorEmail - Email of the task creator
 * @param guests - Array of guest email addresses
 * @param currentUserEmail - Email of the user who added the comment/message (to exclude from notifications)
 * @param taskName - Name of the task
 * @param senderName - Name of the person who added the comment/message
 * @param messageType - "comment" or "chat"
 * @param messageText - Preview of the message (optional)
 */
/**
 * Store notifications in Firestore so they can be received on any device
 * Each recipient will get a notification document created for them
 */
export async function notifyAssignees(
  assignees: string[],
  creatorEmail: string | undefined,
  guests: string[],
  currentUserEmail: string,
  taskName: string,
  senderName: string,
  messageType: "comment" | "chat",
  messageText?: string,
  taskId?: string
) {
  try {
    console.log("🔔 Notification triggered:", {
      messageType,
      taskName,
      senderName,
      currentUserEmail,
      assignees,
      creatorEmail,
      guests,
    });

    const db = getFirestore();

    // Collect all recipients: assignees, creator, and guests
    const allRecipients = new Set<string>();

    assignees.forEach((email) => {
      if (email && typeof email === "string") {
        allRecipients.add(email.toLowerCase());
      }
    });

    if (creatorEmail && typeof creatorEmail === "string") {
      allRecipients.add(creatorEmail.toLowerCase());
    }

    guests.forEach((email) => {
      if (email && typeof email === "string") {
        allRecipients.add(email.toLowerCase());
      }
    });

    // CRITICAL: Filter out the current user (sender) - NEVER notify the sender
    const currentUserEmailLower = currentUserEmail.toLowerCase();
    const recipients = Array.from(allRecipients).filter(
      (email) => email !== currentUserEmailLower
    );

    console.log("📧 Recipients Analysis:", {
      allRecipients: Array.from(allRecipients),
      currentUserEmail: currentUserEmailLower,
      recipientsAfterFilter: recipients,
      willNotify: recipients.length > 0,
    });

    if (recipients.length === 0) {
      console.log(
        "⚠️ No recipients to notify (sender excluded, no other recipients)"
      );
      return;
    }

    console.log(
      `✅ Creating Firestore notifications for ${recipients.length} receiver(s)`
    );

    // Prepare notification content
    const title =
      messageType === "comment"
        ? `💬 New comment on "${taskName}"`
        : `💭 New message in "${taskName}"`;

    const body = messageText
      ? `${senderName}: ${messageText.substring(0, 100)}${
          messageText.length > 100 ? "..." : ""
        }`
      : `${senderName} added a ${
          messageType === "comment" ? "comment" : "message"
        }`;

    // Create a notification document in Firestore for each recipient
    const notificationPromises = recipients.map(async (recipientEmail) => {
      try {
        await addDoc(collection(db, "TaskNotifications"), {
          recipientEmail: recipientEmail.toLowerCase(),
          senderEmail: currentUserEmailLower,
          senderName,
          taskName,
          taskId: taskId || null,
          messageType,
          messageText: messageText || "",
          title,
          body,
          read: false,
          createdAt: Date.now(),
        });
        console.log(
          `✅ Notification created in Firestore for: ${recipientEmail}`
        );
      } catch (error) {
        console.error(
          `❌ Error creating notification for ${recipientEmail}:`,
          error
        );
      }
    });

    await Promise.all(notificationPromises);
    console.log(
      `✅ All notifications stored in Firestore for ${recipients.length} receiver(s)`
    );
    console.log(
      `❌ Sender (${currentUserEmailLower}) did NOT receive notification`
    );
  } catch (error) {
    console.error("❌ Error creating notifications:", error);
  }
}

/**
 * Test notification function - sends a notification immediately for testing
 * This will show a notification even if you're the only user
 */
export async function sendTestNotification() {
  try {
    console.log("🧪 Sending test notification...");
    console.log("📱 Platform:", Platform.OS);

    // Check if running on web (notifications don't work on web)
    if (Platform.OS === "web") {
      throw new Error(
        "Notifications are not supported on web. Please test on a physical device or emulator."
      );
    }

    // Ensure notification handler is set up
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Ensure Android channel is set up
    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync("taskNotifications", {
          name: "Task Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
        });
        console.log("✅ Android notification channel set up");
      } catch (channelError: any) {
        console.warn(
          "⚠️ Channel setup warning:",
          channelError?.message || channelError
        );
        // Continue anyway - channel might already exist
      }
    }

    // Check if running on a physical device
    const isDevice = Device.isDevice;
    console.log("📱 Is physical device:", isDevice);

    if (!isDevice) {
      console.warn(
        "⚠️ Not running on a physical device - notifications may not work"
      );
      // Still try to send, but warn the user
    }

    // Check permissions first
    const { status } = await Notifications.getPermissionsAsync();
    console.log("🔐 Current permission status:", status);

    if (status !== "granted") {
      console.log("📝 Requesting permissions...");
      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();
      console.log("📝 New permission status:", newStatus);

      if (newStatus !== "granted") {
        const errorMsg =
          Platform.OS === "ios"
            ? "Please enable notifications in Settings > Your App > Notifications"
            : "Please enable notifications in your device settings";
        throw new Error(errorMsg);
      }
    }

    // Schedule notification with immediate trigger
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🧪 Test Notification",
        body: "If you see this, notifications are working!",
        data: { test: true },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });

    console.log("✅ Test notification scheduled successfully:", notificationId);
    return notificationId;
  } catch (error: any) {
    console.error("❌ Error sending test notification:", error);
    // Provide more detailed error message
    const errorMessage =
      error?.message || String(error) || "Unknown error occurred";
    throw new Error(`Failed to send notification: ${errorMessage}`);
  }
}

/**
 * Send a notification immediately (for testing - bypasses recipient filtering)
 */
export async function sendNotificationDirectly(
  title: string,
  body: string,
  delaySeconds: number = 1
) {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      },
    });
    console.log("✅ Direct notification scheduled:", notificationId);
    return notificationId;
  } catch (error) {
    console.error("❌ Error sending direct notification:", error);
    throw error;
  }
}

/**
 * Listen for notifications in Firestore and show local notifications
 * This should be called once when the app starts or when user logs in
 */
export function setupNotificationListener(
  userEmail: string | null | undefined
) {
  if (!userEmail) {
    console.warn(
      "⚠️ No user email provided, cannot setup notification listener"
    );
    return () => {}; // Return empty unsubscribe function
  }

  const db = getFirestore();
  const userEmailLower = userEmail.toLowerCase();

  console.log(
    "👂 Setting up Firestore notification listener for:",
    userEmailLower
  );

  // Query for notifications for this user
  // Note: Removed orderBy to avoid index requirement - we'll sort in memory if needed
  const notificationsQuery = query(
    collection(db, "TaskNotifications"),
    where("recipientEmail", "==", userEmailLower),
    limit(100) // Increased limit since we're not ordering
  );

  const unsubscribe = onSnapshot(
    notificationsQuery,
    async (snapshot) => {
      // Only process new unread notifications (not initial load)
      const newNotifications = snapshot
        .docChanges()
        .filter((change) => {
          if (change.type !== "added") return false;
          const data = change.doc.data();
          return data.read === false; // Filter unread in memory
        })
        .map((change) => ({ id: change.doc.id, ...change.doc.data() }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Sort by createdAt descending in memory

      if (newNotifications.length === 0) return;

      console.log(`📬 Found ${newNotifications.length} new notification(s)`);

      // Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        console.warn("⚠️ Notification permissions not granted");
        return;
      }

      // Ensure Android channel is set up
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("taskNotifications", {
            name: "Task Notifications",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
            sound: "default",
          });
        } catch (error) {
          console.warn("⚠️ Channel setup warning:", error);
        }
      }

      // Show local notification for each new notification
      for (const notif of newNotifications) {
        try {
          // Use scheduleNotificationAsync with immediate trigger (more reliable across platforms)
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: notif.title || "New Task Notification",
              body: notif.body || "You have a new notification",
              data: {
                type: notif.messageType,
                taskName: notif.taskName,
                taskId: notif.taskId,
                senderName: notif.senderName,
                notificationId: notif.id,
              },
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1, // Show immediately (1 second delay)
            },
          });
          console.log(
            `✅ Local notification scheduled for: ${notif.id} (notification ID: ${notificationId})`
          );

          // Mark as read in Firestore (optional - you can remove this if you want to keep unread count)
          try {
            await updateDoc(doc(db, "TaskNotifications", notif.id), {
              read: true,
              readAt: Date.now(),
            });
          } catch (updateError) {
            console.warn(
              `⚠️ Could not mark notification as read:`,
              updateError
            );
          }
        } catch (error) {
          console.error(`❌ Error showing notification ${notif.id}:`, error);
        }
      }
    },
    (error) => {
      console.error("❌ Error in notification listener:", error);
    }
  );

  return unsubscribe;
}

/**
 * Initialize notification permissions (call this once when the app starts)
 */
export async function initializeNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("taskNotifications", {
      name: "Task Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Notification permissions not granted");
      return false;
    }

    return true;
  } else {
    console.warn("Must use physical device for Push Notifications");
    return false;
  }
}
