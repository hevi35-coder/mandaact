module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxImportSource: 'nativewind',
        // Disable unstable_transformProfile to avoid worklets plugin requirement
        unstable_transformProfile: 'default',
      }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated plugin disabled - app works without advanced animations
    ],
  };
};
