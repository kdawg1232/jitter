export default {
  expo: {
    name: "Jitter",
    slug: "jitter",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#A259FF"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.jitter.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#A259FF"
      },
      package: "com.jitter.app"
    }
  }
}; 