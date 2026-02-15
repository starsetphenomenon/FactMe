import { HomePage } from '../home/home.page';
import { SettingsService } from '../services/settings.service';
import { FactService } from '../services/fact.service';
import { NotificationService } from '../services/notification.service';
import { Fact } from '../models/fact.models';
import { Topic } from '../enums/topic.enum';
import { StorageKey } from '../enums/storage-key.enum';

export class TestUtils {
  static createMockFact(topic: Topic, idSuffix = 'test-1'): Fact {
    return {
      id: `${topic}-${idSuffix}`,
      title: 'Test fact',
      description: 'Description',
      topic,
    };
  }

  static createHomePage(
    factService: FactService,
    settingsService: SettingsService,
    notificationService: NotificationService
  ): HomePage {
    return new HomePage(factService, settingsService, notificationService);
  }

  static clearSettingsStorage(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(StorageKey.DailyFactsSettings);
    }
  }
}
