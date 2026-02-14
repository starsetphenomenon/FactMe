import { registerPlugin } from '@capacitor/core';

export interface DailyNotificationItem {
  id: number;
  title: string;
  body: string;
  largeIconDrawableName: string;
  largeIconTintColor: string;
  weekday: number;
  hour: number;
  minute: number;
}

export interface FactMeNotificationPlugin {
  showTestNotification(options: {
    title: string;
    body: string;
    largeIconDrawableName: string;
    largeIconTintColor?: string;
  }): Promise<{ shown: boolean }>;

  scheduleDailyNotifications(options: { notifications: DailyNotificationItem[] }): Promise<void>;
  cancelDailyNotifications(options: { ids: number[] }): Promise<void>;
  clearDisplayedNotifications(): Promise<void>;
}

const FactMeNotification = registerPlugin<FactMeNotificationPlugin>('FactMeNotification');
export { FactMeNotification };
