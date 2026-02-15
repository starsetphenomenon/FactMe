import { SettingsService } from './settings.service';
import { ALL_TOPICS, AppSettings } from '../models/fact.models';
import { Topic } from '../enums/topic.enum';
import { TestUtils } from '../testing/test-utils';

describe('SettingsService (no TestBed)', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService();
    TestUtils.clearSettingsStorage();
  });

  describe('User sees topics based on settings', () => {
    it('returns default settings with all topics when none stored', () => {
      const settings = service.getSettings();
      expect(settings.selectedTopics).toEqual(ALL_TOPICS);
      expect(settings.selectedTopics).toContain(Topic.History);
      expect(settings.selectedTopics).toContain(Topic.Psychology);
    });

    it('returns only selected topics after user changes selection', () => {
      const selected = [Topic.History, Topic.Science] as typeof ALL_TOPICS;
      service.update({ selectedTopics: selected });
      const settings = service.getSettings();
      expect(settings.selectedTopics).toEqual(selected);
      expect(settings.selectedTopics.length).toBe(2);
    });

    it('persists selected topics across getSettings() calls', () => {
      const selected = [Topic.Music, Topic.Movies] as typeof ALL_TOPICS;
      service.update({ selectedTopics: selected });
      const first = service.getSettings();
      const second = service.getSettings();
      expect(first.selectedTopics).toEqual(second.selectedTopics);
      expect(second.selectedTopics).toEqual(selected);
    });
  });

  describe('Settings changes stream', () => {
    it('emits when topics are updated so home can react', (done) => {
      const emitted: typeof ALL_TOPICS[] = [];
      service.settingsChanges$.subscribe((s) => {
        if (s?.selectedTopics) {
          emitted.push(s.selectedTopics);
        }
      });

      service.getSettings();
      const newTopics = [Topic.Technology] as typeof ALL_TOPICS;
      service.update({ selectedTopics: newTopics });

      expect(emitted.length).toBeGreaterThanOrEqual(2);
      const last = emitted[emitted.length - 1];
      expect(last).toEqual(newTopics);
      done();
    });

    it('emits updated settings when selectedTopics change', (done) => {
      let lastSettings: AppSettings | null = null;
      service.settingsChanges$.subscribe((s) => {
        lastSettings = s;
      });

      service.getSettings();
      expect((lastSettings as AppSettings | null)?.selectedTopics).toEqual(ALL_TOPICS);

      const newTopics = [Topic.Sports, Topic.FunFacts] as typeof ALL_TOPICS;
      service.update({ selectedTopics: newTopics });
      expect((lastSettings as AppSettings | null)?.selectedTopics).toEqual(newTopics);
      done();
    });
  });
});
