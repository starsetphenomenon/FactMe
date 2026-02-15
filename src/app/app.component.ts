import { Component, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { NavController, Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
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
  showBack = false;
  showSettingsButton = true;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private router: Router,
    private settingsService: SettingsService,
    private translationService: TranslationService,
    private notificationService: NotificationService,
  ) {
    this.initNotificationListeners();
    this.initLanguage();
    this.initHeaderForRouting();

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initNotificationListeners(): Promise<void> {
    await this.platform.ready();

    if (!this.platform.is('hybrid')) {
      return;
    }

    if (Capacitor.getPlatform() === 'android') {
      const dailyIds = [1, 2, 3, 4, 5, 6, 7];
      await LocalNotifications.cancel({
        notifications: dailyIds.map((id) => ({ id })),
      });
      await FactMeNotification.clearDisplayedNotifications();
      const settings = this.settingsService.getSettings();
      if (settings.notificationsEnabled && (settings.notificationWeekdays?.length ?? 0) > 0) {
        await this.notificationService.rescheduleDailyNotification(settings);
      }
    }

    LocalNotifications.addListener(
      'localNotificationActionPerformed',
      () => {
        this.navCtrl.navigateRoot('/home');
      },
    );
  }

  private initHeaderForRouting(): void {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
        tap((event) => {
          const url = event.urlAfterRedirects || event.url;
          this.updateHeaderForUrl(url);
        }),
      )
      .subscribe();
  }

  private updateHeaderForUrl(url: string): void {
    if (url.startsWith('/settings')) {
      this.showBack = true;
      this.showSettingsButton = false;
    } else {
      this.showBack = false;
      this.showSettingsButton = true;
    }
  }

  private async initLanguage(): Promise<void> {
    const settings = this.settingsService.getSettings();
    const lang = settings.language ?? Language.English;
    this.translationService.setLanguage(lang);
    await this.translationService.loadTranslations(lang);
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
