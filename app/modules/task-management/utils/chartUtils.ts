export type ViewMode = "combined" | "tasks" | "events";

export interface SegmentButtonConfig {
  activeColor: string;
  activeBgColor: string;
  iconName: string;
  label: string;
}

export const getSegmentButtonConfig = (mode: ViewMode): SegmentButtonConfig => {
  switch (mode) {
    case "combined":
      return {
        activeColor: "#00F5FF", // Cyan (green mixed blue)
        activeBgColor: "#00F5FF",
        iconName: "grid-outline",
        label: "Combined",
      };
    case "tasks":
      return {
        activeColor: "#38BDF8", // Blue - matches chart color
        activeBgColor: "#38BDF8",
        iconName: "checkmark-done-outline",
        label: "Tasks",
      };
    case "events":
      return {
        activeColor: "#22C55E", // Green
        activeBgColor: "#22C55E",
        iconName: "calendar-outline",
        label: "Events",
      };
  }
};
