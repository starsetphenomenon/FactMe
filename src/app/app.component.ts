import { Component, OnDestroy } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { FactMeNotification } from './plugins/fact-me-notification.plugin';
import { NotificationService } from './services/notification.service';
import { SettingsService } from './services/settings.service';
import { TranslationService } from './services/translation.service';
import { Language } from './enums/language.enum';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnDestroy {
  settingsModalOpen = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private settingsService: SettingsService,
    private translationService: TranslationService,
    private notificationService: NotificationService,
  ) {
    this.initNotificationListeners();
    this.initLanguage();

    const initialSettings = this.settingsService.getSettings();
    this.applyTheme(initialSettings.theme);
    this.settingsService.settingsChanges$
      .pipe(
        takeUntil(this.destroy$),
        tap((s) => {
          if (s) {
            this.applyTheme(s.theme);
          }
        }),
      )
      .subscribe();
  }

  get showBack(): boolean {
    return this.settingsModalOpen;
  }

  get showSettingsButton(): boolean {
    return !this.settingsModalOpen;
  }

  openSettingsModal(): void {
    this.settingsModalOpen = true;
  }

  closeSettingsModal(): void {
    this.settingsModalOpen = false;
  }

  onSettingsModalDismiss(): void {
    this.settingsModalOpen = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initNotificationListeners(): void {
    this.platform.ready().then(() => {
      if (!this.platform.is('hybrid')) {
        return;
      }

      if (Capacitor.getPlatform() === 'android') {
        const dailyIds = [1, 2, 3, 4, 5, 6, 7];
        LocalNotifications.cancel({
          notifications: dailyIds.map((id) => ({ id })),
        }).then(() => {
          FactMeNotification.clearDisplayedNotifications().then(() => {
            const settings = this.settingsService.getSettings();
            if (settings.notificationsEnabled && (settings.notificationWeekdays?.length ?? 0) > 0) {
              this.notificationService.rescheduleDailyNotification$(settings)
                .pipe(takeUntil(this.destroy$))
                .subscribe();
            }
          });
        });
      }

      LocalNotifications.addListener(
        'localNotificationActionPerformed',
        () => {
          this.navCtrl.navigateRoot('/home');
        },
      );
    });
  }

  private initLanguage(): void {
    const settings = this.settingsService.getSettings();
    const lang = settings.language ?? Language.English;
    this.translationService.setLanguage(lang);
    this.translationService.loadTranslations$(lang).pipe(takeUntil(this.destroy$)).subscribe();
  }

  private applyTheme(theme: 'dark' | 'light'): void {
    if (typeof document === 'undefined') {
      return;
    }
    const body = document.body;
    body.classList.remove('dark-theme', 'light-theme');
    body.classList.add(theme === 'light' ? 'light-theme' : 'dark-theme');
  }
}
