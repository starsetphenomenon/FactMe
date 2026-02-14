import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'FactMe',
  webDir: 'www',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification_app',
      iconColor: '#26A69A',
    },
  },
};

export default config;
