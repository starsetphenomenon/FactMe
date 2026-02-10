import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SettingsText } from '../../enums/settings-text.enum';
import { TopicKey } from '../../models/fact.models';

@Component({
  selector: 'app-settings-topics-section',
  templateUrl: './settings-topics-section.component.html',
  styleUrls: ['./settings-topics-section.component.scss'],
  standalone: false,
})
export class SettingsTopicsSectionComponent {
  @Input() settingsText!: typeof SettingsText;
  @Input() topics: TopicKey[] = [];
  @Input() selectedTopics: TopicKey[] = [];
  @Input() allTopicsLabel!: string;
  @Input() onePerTopic = false;

  @Output() toggleAllTopics = new EventEmitter<void>();
  @Output() topicChipClicked = new EventEmitter<TopicKey>();
  @Output() onePerTopicChange = new EventEmitter<boolean>();

  isTopicSelected(topic: TopicKey): boolean {
    return this.selectedTopics.includes(topic);
  }

  isAllTopicsSelected(): boolean {
    return (
      this.selectedTopics.length === this.topics.length &&
      this.topics.every((t) => this.selectedTopics.includes(t))
    );
  }
}
