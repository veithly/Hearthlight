const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Completely disable source maps and symbolication
config.transformer.minifierConfig = {
  sourceMap: false,
};

// Disable all debugging features that might cause anonymous file issues
config.resolver.platforms = ['ios', 'android', 'web'];
config.transformer.enableBabelRCLookup = false;
config.transformer.enableBabelRuntime = false;

// Disable symbolication completely
config.symbolicator = false;

module.exports = config;