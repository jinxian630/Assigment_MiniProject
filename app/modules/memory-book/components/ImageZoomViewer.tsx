import React, { useState } from "react";
import {
  View,
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ImageZoomViewerProps = {
  visible: boolean;
  imageURL: string;
  onClose: () => void;
  onShare?: () => void;
};

export default function ImageZoomViewer({
  visible,
  imageURL,
  onClose,
  onShare,
}: ImageZoomViewerProps) {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [lastScale, setLastScale] = useState(1);
  const [lastTranslate, setLastTranslate] = useState({ x: 0, y: 0 });

  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const translateXAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(0)).current;
  
  // Double tap detection
  const lastTap = React.useRef<number | null>(null);
  const doubleTapDelay = 300; // milliseconds

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => scale > 1, // Only capture when zoomed
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture if there's significant movement (dragging, not tapping)
        return scale > 1 && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
      },
      onPanResponderGrant: () => {
        setLastTranslate({ x: translateX, y: translateY });
      },
      onPanResponderMove: (evt, gestureState) => {
        if (scale > 1) {
          const newX = lastTranslate.x + gestureState.dx;
          const newY = lastTranslate.y + gestureState.dy;
          setTranslateX(newX);
          setTranslateY(newY);
          translateXAnim.setValue(newX);
          translateYAnim.setValue(newY);
        }
      },
      onPanResponderRelease: () => {
        setLastTranslate({ x: translateX, y: translateY });
      },
    })
  ).current;

  const handleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      handleDoubleTap();
      lastTap.current = null;
    } else {
      // Single tap - wait to see if it's a double tap
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          // It was a single tap, do nothing or handle single tap if needed
          lastTap.current = null;
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleDoubleTap = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newScale = scale === 1 ? 2 : 1;
    setScale(newScale);
    setTranslateX(0);
    setTranslateY(0);
    setLastTranslate({ x: 0, y: 0 });

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: newScale,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(translateXAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const handleClose = () => {
    // Reset zoom
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setLastTranslate({ x: 0, y: 0 });
    scaleAnim.setValue(1);
    translateXAnim.setValue(0);
    translateYAnim.setValue(0);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityLabel="Close image viewer"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {onShare && (
            <TouchableOpacity
              onPress={onShare}
              style={styles.shareButton}
              accessibilityLabel="Share image"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Animated.View
            style={[
              styles.imageWrapper,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateX: translateXAnim },
                  { translateY: translateYAnim },
                ],
              },
            ]}
            {...(scale > 1 ? panResponder.panHandlers : {})}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleTap}
              style={styles.imageTouchable}
              delayPressIn={0}
            >
              <Image
                source={{ uri: imageURL }}
                style={styles.image}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer hint */}
        <View style={styles.footer}>
          <Text style={styles.hintText}>
            Double tap to zoom • Pinch to zoom • Drag when zoomed
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  imageTouchable: {
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  footer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  hintText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    textAlign: "center",
  },
});

