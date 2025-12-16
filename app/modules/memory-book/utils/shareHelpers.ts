import { Share, Platform, Alert } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

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
          const fileUri = `${
            FileSystem.cacheDirectory
          }memory_${Date.now()}.jpg`;
          console.log("📥 Downloading image for sharing...");
          const downloadResult = await FileSystem.downloadAsync(
            imageURL,
            fileUri
          );

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
            throw new Error(
              `Download failed with status: ${downloadResult.status}`
            );
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

    // Download image to local cache first
    const fileUri = `${FileSystem.cacheDirectory}memory_${Date.now()}.jpg`;
    console.log("📥 Downloading image for saving...");
    const downloadResult = await FileSystem.downloadAsync(imageURL, fileUri);

    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status: ${downloadResult.status}`);
    }

    // Try to use expo-media-library first (requires rebuild)
    let useMediaLibrary = true;
    let permissionResult;

    try {
      // Check current permissions first - handle audio permission error gracefully
      let currentPermission;
      try {
        currentPermission = await MediaLibrary.getPermissionsAsync();
      } catch (permError: any) {
        // If it's the audio permission error, fall back to share method
        if (
          permError.message &&
          permError.message.includes("AUDIO permission") &&
          permError.message.includes("AndroidManifest")
        ) {
          console.warn(
            "Audio permission not declared - using share method as fallback"
          );
          useMediaLibrary = false;
        } else {
          throw permError;
        }
      }

      if (useMediaLibrary && currentPermission) {
        // Request permissions if not already granted
        if (!currentPermission.granted) {
          try {
            permissionResult = await MediaLibrary.requestPermissionsAsync();
          } catch (requestError: any) {
            if (
              requestError.message &&
              requestError.message.includes("AUDIO permission")
            ) {
              console.warn(
                "Audio permission error - using share method as fallback"
              );
              useMediaLibrary = false;
            } else {
              throw requestError;
            }
          }
        } else {
          permissionResult = currentPermission;
        }

        if (
          useMediaLibrary &&
          permissionResult &&
          permissionResult.status !== "granted"
        ) {
          if (permissionResult.canAskAgain === false) {
            Alert.alert(
              "Permission Denied",
              "Photo library access was denied. Using share method instead."
            );
            useMediaLibrary = false;
          } else {
            Alert.alert(
              "Permission Required",
              "Please grant photo library access to save images to your gallery."
            );
            return;
          }
        }
      }
    } catch (error: any) {
      console.warn("Error with media library, using share method:", error);
      useMediaLibrary = false;
    }

    // Method 1: Use expo-media-library (requires rebuild, but works seamlessly)
    if (useMediaLibrary) {
      try {
        console.log("✅ Image downloaded, saving to gallery...");

        // Save directly to gallery
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

        // Try to get existing album, or create new one
        let album = await MediaLibrary.getAlbumAsync("Memories");
        if (!album) {
          album = await MediaLibrary.createAlbumAsync("Memories", asset, false);
        } else {
          // Add asset to existing album
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }

        console.log("✅ Image saved to gallery successfully");
        Alert.alert("Success", "Image saved to your gallery!");
        return;
      } catch (error: any) {
        console.warn(
          "Error saving with media library, falling back to share:",
          error
        );
        useMediaLibrary = false;
      }
    }

    // Method 2: Fallback - Use share dialog (works without rebuild)
    // User can select "Save to Gallery" or "Photos" from the share menu
    if (!useMediaLibrary && Sharing) {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: "image/jpeg",
            dialogTitle: "Save Image",
            UTI: "public.jpeg",
          });
          Alert.alert(
            "Save Image",
            "Please select 'Save to Gallery' or 'Photos' from the share menu to save the image."
          );
          return;
        }
      } catch (shareError: any) {
        console.error("Error sharing image:", shareError);
      }
    }

    // Final fallback - show instructions
    Alert.alert(
      "Save Image",
      "Please use the share menu and select 'Save to Gallery' or 'Photos' to save this image. The app needs to be rebuilt for direct saving."
    );
  } catch (error: any) {
    console.error("Error saving image:", error);
    Alert.alert(
      "Error",
      error.message || "Failed to save image. Please try again."
    );
  }
}
