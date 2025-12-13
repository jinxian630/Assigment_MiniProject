import { Share, Platform, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

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

    // For mobile: Share image file directly (not URL) to show actual image
    if (imageURL && Platform.OS !== "web" && Sharing) {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          // Download image to local cache
          const fileUri = `${FileSystem.cacheDirectory}memory_${Date.now()}.jpg`;
          console.log("📥 Downloading image for sharing...");
          const downloadResult = await FileSystem.downloadAsync(imageURL, fileUri);

          if (downloadResult.status === 200) {
            console.log("✅ Image downloaded, sharing image file directly...");
            
            // Share the image file directly using expo-sharing
            // This will show the actual image in apps like Messenger, not a link
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: "image/jpeg",
              dialogTitle: `Share Memory: ${title}`,
              UTI: "public.jpeg",
            });
            console.log("✅ Image file shared successfully");
            return;
          } else {
            throw new Error(`Download failed with status: ${downloadResult.status}`);
          }
        }
      } catch (imageError: any) {
        console.error("❌ Error sharing image file:", imageError);
        // Fall through to text-only sharing (without URL to avoid showing link)
      }
    }

    // Text-only sharing (fallback, web, or when image sharing fails)
    // IMPORTANT: Don't include imageURL in message to avoid showing link
    const shareOptions: any = {
      message: message, // Only text, no URL
      title: title, // Subject for email apps
    };

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      console.log("✅ Memory shared successfully");
    }
  } catch (error: any) {
    console.error("❌ Error sharing memory:", error);
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


