import { FactService } from '../services/fact.service';
import { NotificationService } from '../services/notification.service';
import { Fact } from '../models/fact.models';
import { Topic } from '../enums/topic.enum';
import { TestUtils } from './test-utils';

export type FactServiceMock = jasmine.SpyObj<Pick<FactService, 'getRandomFactForDate' | 'getFactById'>>;
export type NotificationServiceMock = jasmine.SpyObj<Pick<NotificationService, 'rescheduleDailyNotification'>>;

export interface FactServiceMockOptions {
  randomFact?: Fact | null;
  factById?: Fact | null;
}

export function createFactServiceMock(options: FactServiceMockOptions = {}): FactServiceMock {
  const {
    randomFact = TestUtils.createMockFact(Topic.History),
    factById = null,
  } = options;

  const mock = jasmine.createSpyObj('FactService', [
    'getRandomFactForDate',
    'getFactById',
  ]);
  mock.getRandomFactForDate.and.returnValue(Promise.resolve(randomFact));
  mock.getFactById.and.returnValue(Promise.resolve(factById));
  return mock;
}

export function createNotificationServiceMock(): NotificationServiceMock {
  const mock = jasmine.createSpyObj('NotificationService', [
    'rescheduleDailyNotification',
  ]);
  mock.rescheduleDailyNotification.and.returnValue(Promise.resolve());
  return mock;
}
