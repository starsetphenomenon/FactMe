import { Language } from '../enums/language.enum';
import { Topic } from '../enums/topic.enum';

export type TopicKey = Topic;

export type Theme = 'dark' | 'light';

export interface Fact {
  id: string;
  title: string;
  description: string;
  topic: TopicKey;
}

export interface FactJsonEntry {
  id: string;
  title: string;
  description: string;
}

export interface TopicFactsFile {
  topic: TopicKey;
  facts: {
    [dateKey: string]: FactJsonEntry[];
  };
}

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface AppSettings {
  selectedTopics: TopicKey[];
  notificationsEnabled: boolean;
  notificationTime: string;
  notificationWeekdays?: Weekday[];
  lastShownDate?: string;
  lastShownFactId?: string;
  shownFactIds?: string[];
  onePerTopic: boolean;
  language?: Language;
  theme: Theme;
}

export const ALL_TOPICS: TopicKey[] = [
  Topic.History,
  Topic.Science,
  Topic.WorldEvents,
  Topic.Technology,
  Topic.Music,
  Topic.Movies,
  Topic.Sports,
  Topic.FunFacts,
  Topic.Literature,
  Topic.Psychology,
];

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];
