import { Language } from '../enums/language.enum';
import { Topic } from '../enums/topic.enum';
import { HomeText } from '../enums/home-text.enum';

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
  notificationWeekdays: Weekday[];
  /** ISO date (YYYY-MM-DD) when facts were last shown for Home, or null if never. */
  lastShownDate: string | null;
  /** ID of the last fact shown in single-fact mode, or null if none. */
  lastShownFactId: string | null;
  /** All fact IDs that have been shown for lastShownDate. */
  shownFactIds: string[];
  /** IDs of the facts currently visible on the Home page for the lastShownDate. */
  currentFactIds: string[];
  /** Translation key of the current error shown on the Home page (if any). */
  currentErrorKey: HomeText | null;
  /** Settings key (onePerTopic + topics) used when currentFactIds/currentErrorKey were last updated. */
  currentFactsSettingsKey: string | null;
  onePerTopic: boolean;
  /** Current UI language; null means "use default". */
  language: Language | null;
  theme: Theme;
}

export const ALL_TOPICS: TopicKey[] = [
  Topic.History,
  Topic.Science,
  Topic.WorldEvents,
  Topic.Technology,
  Topic.Music,
  Topic.FilmTv,
  Topic.Sports,
  Topic.FunFacts,
  Topic.Literature,
  Topic.Psychology,
];

export const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];
