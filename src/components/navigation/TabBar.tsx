import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const TabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const icons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    index: 'home-outline',
    modules: 'grid-outline',
    add: 'add',
    insights: 'stats-chart-outline',
    profile: 'person-outline',
  };

  const labels: { [key: string]: string } = {
    index: 'HOME',
    modules: 'MODULES',
    add: '',
    insights: 'DATA',
    profile: 'USER',
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isCenter = route.name === 'add';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.centerButtonContainer}
                activeOpacity={0.8}
              >
                <View style={styles.centerButtonOuter}>
                  <View style={styles.centerButtonInner}>
                    <Ionicons name="add" size={32} color={Theme.colors.black} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                <Ionicons
                  name={icons[route.name]}
                  size={24}
                  color={isFocused ? Theme.colors.primary : Theme.colors.textDisabled}
                />
                {isFocused && <View style={styles.activeGlow} />}
              </View>
              {/* Optional: Hide labels for cleaner look or keep them minimal */}
              {/* <Text
                style={[
                  styles.label,
                  { color: isFocused ? Theme.colors.primary : Theme.colors.textDisabled },
                ]}
              >
                {labels[route.name]}
              </Text> */}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },

  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 16, 21, 0.9)', // Dark Gunmetal with opacity
    borderRadius: 30, // Pill shape
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },

  activeIconContainer: {
    // Optional active state styling
  },

  activeGlow: {
    position: 'absolute',
    bottom: -5,
    width: 20,
    height: 2,
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    borderRadius: 1,
  },

  label: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    fontFamily: 'monospace',
  },

  centerButtonContainer: {
    top: -25,
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerButtonOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },

  centerButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
});
