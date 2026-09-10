import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.najahai.comeup',
  appName: 'ComeUp',
  webDir: 'dist',
  server: {
    // Native builds require an absolute VITE_API_URL at build time.
    androidScheme: 'https',
  },
};

export default config;
