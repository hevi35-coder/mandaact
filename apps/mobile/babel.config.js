module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // NOTE: react-native-reanimated/plugin is automatically configured by babel-preset-expo
    // Do NOT manually add it here - it causes "TypeError: property is not writable" errors
    // See: https://docs.expo.dev/versions/latest/sdk/reanimated/
  };
};
