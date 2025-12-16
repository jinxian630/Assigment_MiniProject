module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // react-native-dotenv removed - using native Expo environment variables
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
        },
      ],
      // react-native-reanimated plugin MUST be listed last
      "react-native-reanimated/plugin",
    ],
  };
};
