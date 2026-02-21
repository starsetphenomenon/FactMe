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

export interface NotificationFactEntry {
  title: string;
  body: string;
  largeIconDrawableName?: string;
  largeIconTintColor?: string;
}

export interface NotificationFactsByDate {
  [isoDate: string]: NotificationFactEntry;
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
  setNotificationFacts(options: { facts: NotificationFactsByDate }): Promise<void>;
  setNotificationSoundOptions(options: { soundEnabled: boolean }): Promise<void>;
}

const FactMeNotification = registerPlugin<FactMeNotificationPlugin>('FactMeNotification');
export { FactMeNotification };
