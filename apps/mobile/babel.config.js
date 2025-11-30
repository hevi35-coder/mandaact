module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        jsxImportSource: 'nativewind',
      }],
    ],
    plugins: [
      // NativeWind v4 babel plugin (without worklets - using reanimated instead)
      require('react-native-css-interop/dist/babel-plugin').default,
      [
        '@babel/plugin-transform-react-jsx',
        {
          runtime: 'automatic',
          importSource: 'react-native-css-interop',
        },
      ],
      // Use reanimated plugin instead of worklets (worklets is incompatible with RN 0.76)
      'react-native-reanimated/plugin',
    ],
  };
};
