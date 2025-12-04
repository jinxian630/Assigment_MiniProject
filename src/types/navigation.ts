export type RootStackParamList = {
  "(auth)": undefined;
  "(tabs)": undefined;
  "modules/memory-book": undefined;
  "modules/health-fitness": undefined;
  "modules/money-management": undefined;
  "modules/task-management": undefined;
  TaskMenu: undefined;
  TaskAdd: undefined;
  EventAdd: undefined;
  EventList: undefined;
  EventEdit: undefined;
  TaskChart: undefined;
  TaskDashboard: undefined;
  Gamification: undefined;

  EmotionSelector: undefined;
  MemoryMenu: undefined;
  MemoryPostCreate: undefined;
  MemoryPostDetail: undefined;
  MemoryTimeline: undefined;
  UserProfile: undefined;
  UserSearch: undefined;
};

export type AuthStackParamList = {
  welcome: undefined;
  login: undefined;
  signup: undefined;
};

export type TabsParamList = {
  index: undefined;
  modules: undefined;
  add: undefined;
  insights: undefined;
  profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
