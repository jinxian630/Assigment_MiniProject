const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle missing animation modules
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Fix for react-native-web missing animation modules
    if (
      moduleName.includes('react-native-web') &&
      moduleName.includes('/animations/DecayAnimation')
    ) {
      return context.resolveRequest(
        context,
        moduleName.replace('/animations/DecayAnimation', '/animations/TimingAnimation'),
        platform
      );
    }
    if (
      moduleName.includes('react-native-web') &&
      moduleName.includes('/animations/SpringAnimation')
    ) {
      return context.resolveRequest(
        context,
        moduleName.replace('/animations/SpringAnimation', '/animations/TimingAnimation'),
        platform
      );
    }
    // Default resolver
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
