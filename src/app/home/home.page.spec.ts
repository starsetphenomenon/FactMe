import { fakeAsync, tick } from '@angular/core/testing';
import { HomePage } from './home.page';
import { SettingsService } from '../services/settings.service';
import { FactService } from '../services/fact.service';
import { NotificationService } from '../services/notification.service';
import { ALL_TOPICS } from '../models/fact.models';
import { Topic } from '../enums/topic.enum';
import { TestUtils } from '../testing/test-utils';
import { createFactServiceMock, createNotificationServiceMock } from '../testing/mocks';

describe('HomePage (no TestBed)', () => {
  let settingsService: SettingsService;
  let factService: ReturnType<typeof createFactServiceMock>;
  let notificationService: ReturnType<typeof createNotificationServiceMock>;

  beforeEach(() => {
    settingsService = new SettingsService();
    TestUtils.clearSettingsStorage();
    factService = createFactServiceMock();
    notificationService = createNotificationServiceMock();
  });

  describe('User sees facts based on settings (topics)', () => {
    it('loads facts using selected topics from settings', fakeAsync(() => {
      settingsService.update({
        selectedTopics: [Topic.Science, Topic.Music] as typeof ALL_TOPICS,
      });

      const homePage = TestUtils.createHomePage(
        factService as unknown as FactService,
        settingsService,
        notificationService as unknown as NotificationService
      );
      homePage.ngOnInit();
      tick();

      expect(factService.getRandomFactForDate).toHaveBeenCalled();
      const topicsUsed = factService.getRandomFactForDate.calls.mostRecent().args[1] as typeof ALL_TOPICS;
      expect(topicsUsed).toContain(Topic.Science);
      expect(topicsUsed).toContain(Topic.Music);
      expect(topicsUsed.length).toBe(2);
    }));

    it('uses all topics when settings have default (all selected)', fakeAsync(() => {
      const homePage = TestUtils.createHomePage(
        factService as unknown as FactService,
        settingsService,
        notificationService as unknown as NotificationService
      );
      homePage.ngOnInit();
      tick();

      expect(factService.getRandomFactForDate).toHaveBeenCalled();
      const topicsUsed = factService.getRandomFactForDate.calls.mostRecent().args[1] as typeof ALL_TOPICS;
      expect(topicsUsed.length).toBe(ALL_TOPICS.length);
      expect([...topicsUsed].sort()).toEqual([...ALL_TOPICS].sort());
    }));

    it('when single fact mode enabled and no topic selected, shows single fact from random topic', fakeAsync(() => {
      settingsService.update({
        onePerTopic: false,
        selectedTopics: [],
      });

      const homePage = TestUtils.createHomePage(
        factService as unknown as FactService,
        settingsService,
        notificationService as unknown as NotificationService
      );
      homePage.ngOnInit();
      tick();

      expect(factService.getRandomFactForDate).toHaveBeenCalled();
      const topicsUsed = factService.getRandomFactForDate.calls.mostRecent().args[1] as typeof ALL_TOPICS;
      expect(topicsUsed.length).toBe(ALL_TOPICS.length);
      expect([...topicsUsed].sort()).toEqual([...ALL_TOPICS].sort());
      expect(homePage.facts.length).toBe(1);
      expect(homePage.fact).not.toBeNull();
      expect(homePage.fact?.topic).toBe(Topic.History);
    }));
  });

  describe('Changing topics in settings updates facts on home reactively', () => {
    it('reloads facts when user changes selected topics in settings', fakeAsync(() => {
      const homePage = TestUtils.createHomePage(
        factService as unknown as FactService,
        settingsService,
        notificationService as unknown as NotificationService
      );
      homePage.ngOnInit();
      tick();

      const firstCallTopics = factService.getRandomFactForDate.calls.mostRecent().args[1] as typeof ALL_TOPICS;
      expect(firstCallTopics).toEqual(ALL_TOPICS);

      factService.getRandomFactForDate.calls.reset();
      settingsService.update({
        selectedTopics: [Topic.Psychology, Topic.Literature] as typeof ALL_TOPICS,
      });
      tick();

      expect(factService.getRandomFactForDate).toHaveBeenCalled();
      const secondCallTopics = factService.getRandomFactForDate.calls.mostRecent().args[1] as typeof ALL_TOPICS;
      expect(secondCallTopics).toContain(Topic.Psychology);
      expect(secondCallTopics).toContain(Topic.Literature);
      expect(secondCallTopics.length).toBe(2);
    }));

    it('emits new settings so home subscription triggers reload', fakeAsync(() => {
      const homePage = TestUtils.createHomePage(
        factService as unknown as FactService,
        settingsService,
        notificationService as unknown as NotificationService
      );
      homePage.ngOnInit();
      tick();

      const callsBefore = factService.getRandomFactForDate.calls.count();
      settingsService.update({
        selectedTopics: [Topic.Sports] as typeof ALL_TOPICS,
      });
      tick();

      expect(factService.getRandomFactForDate.calls.count()).toBeGreaterThan(callsBefore);
    }));
  });
});
