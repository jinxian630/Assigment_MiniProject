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
  onSave?: () => void;
};

export default function ImageZoomViewer({
  visible,
  imageURL,
  onClose,
  onSave,
}: ImageZoomViewerProps) {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [lastScale, setLastScale] = useState(1);
  const [lastTranslate, setLastTranslate] = useState({ x: 0, y: 0 });

  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const translateXAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
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
          {onSave && (
            <TouchableOpacity
              onPress={onSave}
              style={styles.saveButton}
              accessibilityLabel="Save image to gallery"
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Image */}
        <View style={styles.imageContainer} {...panResponder.panHandlers}>
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
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleDoubleTap}
              style={styles.imageTouchable}
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
  saveButton: {
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

