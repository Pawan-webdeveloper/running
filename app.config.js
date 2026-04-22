module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      ...(config.ios?.config ?? {}),
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  extra: {
    ...(config.extra ?? {}),
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
});
