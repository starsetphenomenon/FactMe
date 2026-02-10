import { Language } from "../enums/language.enum";

export type TopicKey =
  | 'history'
  | 'science'
  | 'world-events'
  | 'technology'
  | 'music'
  | 'movies'
  | 'sports'
  | 'fun-facts'
  | 'literature'
  | 'psychology';

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

export interface AppSettings {
  selectedTopics: TopicKey[];
  notificationsEnabled: boolean;
  notificationTime: string;
  lastShownDate?: string;
  lastShownFactId?: string;
  shownFactIds?: string[];
  onePerTopic: boolean;
  language?: Language;
}

export const ALL_TOPICS: TopicKey[] = [
  'history',
  'science',
  'world-events',
  'technology',
  'music',
  'movies',
  'sports',
  'fun-facts',
  'literature',
  'psychology',
];
