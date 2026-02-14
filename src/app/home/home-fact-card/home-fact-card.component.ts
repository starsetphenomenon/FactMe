import { Component, Input } from '@angular/core';
import { Fact, TopicKey } from '../../models/fact.models';
import { TopicIcon } from '../../enums/topic-icon.enum';
import { TopicIconUtil } from '../../utils/topic-icon.util';

@Component({
  selector: 'app-home-fact-card',
  templateUrl: './home-fact-card.component.html',
  styleUrls: ['./home-fact-card.component.scss'],
  standalone: false,
})
export class HomeFactCardComponent {
  @Input() fact!: Fact;

  get topicClass(): string {
    return this.fact?.topic ? `topic-${this.fact.topic}` : '';
  }

  getTopicIcon(topic: TopicKey): TopicIcon {
    return TopicIconUtil.getIcon(topic);
  }
}

