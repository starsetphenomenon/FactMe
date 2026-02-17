import { Topic } from '../enums/topic.enum';
import { TopicIcon } from '../enums/topic-icon.enum';
import { TopicKey } from '../models/fact.models';

export class TopicIconUtil {
  private static readonly TOPIC_ICON_MAP: Record<TopicKey, TopicIcon> = {
    [Topic.History]: TopicIcon.History,
    [Topic.Science]: TopicIcon.Science,
    [Topic.WorldEvents]: TopicIcon.WorldEvents,
    [Topic.Technology]: TopicIcon.Technology,
    [Topic.Music]: TopicIcon.Music,
    [Topic.FilmTv]: TopicIcon.FilmTv,
    [Topic.Sports]: TopicIcon.Sports,
    [Topic.FunFacts]: TopicIcon.FunFacts,
    [Topic.Literature]: TopicIcon.Literature,
    [Topic.Psychology]: TopicIcon.Psychology,
  };

  static getIcon(topic: TopicKey): TopicIcon {
    return this.TOPIC_ICON_MAP[topic] ?? TopicIcon.Default;
  }
}
