import { Share, Platform, Alert } from "react-native";
import * as FileSystem from "expo-file-system";

// Conditionally import expo-sharing (not available on web)
let Sharing: any = null;
if (Platform.OS !== "web") {
  try {
    Sharing = require("expo-sharing");
  } catch (e) {
    console.log("expo-sharing not available");
  }
}

export async function shareMemory(
  title: string,
  description: string,
  imageURL?: string
): Promise<void> {
  try {
    const message = `${title}\n\n${description}`;

    // For email and text sharing, use React Native Share API
    // This works better with email apps
    const shareOptions: any = {
      message,
      title: title, // Subject for email apps
    };

    // Try to share with image if available (not on web)
    if (imageURL && Platform.OS !== "web" && Sharing) {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          const fileUri = `${FileSystem.cacheDirectory}memory_${Date.now()}.jpg`;
          const downloadResult = await FileSystem.downloadAsync(imageURL, fileUri);

          if (downloadResult.status === 200) {
            // Share image - this will allow email apps to attach the image
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: "image/jpeg",
              dialogTitle: "Share Memory",
            });
            return;
          }
        }
      } catch (imageError) {
        console.log("Could not share image, falling back to text:", imageError);
      }
    }

    // Text sharing (works with email apps - they'll use title as subject)
    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      console.log("Memory shared successfully");
    }
  } catch (error: any) {
    console.error("Error sharing memory:", error);
    Alert.alert("Error", "Failed to share memory. Please try again.");
  }
}

export async function saveImageToGallery(imageURL: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Saving images is not available on web.");
      return;
    }

    if (!Sharing) {
      Alert.alert("Not Available", "Sharing is not available on this device.");
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Not Available", "Sharing is not available on this device.");
      return;
    }

    const fileUri = `${FileSystem.cacheDirectory}memory_${Date.now()}.jpg`;
    const downloadResult = await FileSystem.downloadAsync(imageURL, fileUri);

    if (downloadResult.status === 200) {
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: "image/jpeg",
        dialogTitle: "Save Image",
        UTI: "public.jpeg",
      });
    }
  } catch (error: any) {
    console.error("Error saving image:", error);
    Alert.alert("Error", "Failed to save image. Please try again.");
  }
}

