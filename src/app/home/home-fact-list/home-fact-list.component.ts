import { Component, Input } from '@angular/core';
import { Fact, TopicKey } from '../../models/fact.models';
import { HomeText } from '../../enums/home-text.enum';
import { Topic } from '../../enums/topic.enum';
import { TopicIcon } from '../../enums/topic-icon.enum';

@Component({
  selector: 'app-home-fact-list',
  templateUrl: './home-fact-list.component.html',
  styleUrls: ['./home-fact-list.component.scss'],
  standalone: false,
})
export class HomeFactListComponent {
  @Input() dateLabel = '';
  @Input() facts: Fact[] = [];
  @Input() isLoading = false;
  @Input() error: string | null = null;
  @Input() homeText!: typeof HomeText;

  get hasFacts(): boolean {
    return !!this.facts.length;
  }

  getTopicIcon(topic: TopicKey): TopicIcon {
    switch (topic) {
      case Topic.History:
        return TopicIcon.History;
      case Topic.Science:
        return TopicIcon.Science;
      case Topic.WorldEvents:
        return TopicIcon.WorldEvents;
      case Topic.Technology:
        return TopicIcon.Technology;
      case Topic.Music:
        return TopicIcon.Music;
      case Topic.Movies:
        return TopicIcon.Movies;
      case Topic.Sports:
        return TopicIcon.Sports;
      case Topic.FunFacts:
        return TopicIcon.FunFacts;
      case Topic.Literature:
        return TopicIcon.Literature;
      case Topic.Psychology:
        return TopicIcon.Psychology;
      default:
        return TopicIcon.Default;
    }
  }
}
