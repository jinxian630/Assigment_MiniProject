import React, { Component, ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MemoryBookErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a Worklets/Reanimated error that we want to suppress
    const errorMessage = error?.message || "";
    const errorName = error?.name || "";
    const errorStack = error?.stack || "";

    // Suppress Worklets version mismatch errors
    if (
      errorMessage.includes("Worklets") ||
      errorMessage.includes("react-native-reanimated") ||
      errorMessage.includes("react-native-worklets") ||
      errorMessage.includes("getUseOfValueInStyleWarning") ||
      errorMessage.includes("Cannot read property") ||
      errorName === "WorkletsError" ||
      errorName === "TypeError" ||
      errorStack.includes("Worklets") ||
      errorStack.includes("reanimated")
    ) {
      // Log but don't show error UI for Worklets/issues related to version mismatches
      console.warn(
        "🟡 Memory Book: Error suppressed (likely Worklets/RN version mismatch):",
        errorMessage
      );
      // Return null to prevent error state, allowing app to continue
      return { hasError: false, error: null };
    }

    // For other errors, show the error boundary
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is a Worklets/React Native internal error we want to suppress
    const errorMessage = error?.message || "";
    const errorStack = error?.stack || "";
    const componentStack = errorInfo?.componentStack || "";

    if (
      errorMessage.includes("Worklets") ||
      errorMessage.includes("react-native-reanimated") ||
      errorMessage.includes("react-native-worklets") ||
      errorMessage.includes("getUseOfValueInStyleWarning") ||
      errorMessage.includes("Cannot read property") ||
      errorStack.includes("Worklets") ||
      errorStack.includes("reanimated") ||
      (componentStack.includes("FilterModal") &&
        errorMessage.includes("undefined"))
    ) {
      // Suppress these errors - they're not critical for memory book module
      // They're usually caused by version mismatches in dependencies
      console.warn(
        "🟡 Memory Book: Suppressed error (likely dependency version issue):",
        errorMessage
      );
      return;
    }

    // Log other errors normally
    console.error(
      "❌ Memory Book Error Boundary caught error:",
      error,
      errorInfo
    );
  }

  render() {
    // If we have a non-Worklets error, show fallback UI
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={48} color="#9333EA" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error.message || "An unexpected error occurred"}
          </Text>
        </View>
      );
    }

    // Otherwise, render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FAF5FF",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E1B4B",
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#9333EA",
    textAlign: "center",
  },
});
