import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavController, Platform } from '@ionic/angular';
import { LocalNotifications } from '@capacitor/local-notifications';
import { HeaderText } from './enums/header-text.enum';
import { SettingsService } from './services/settings.service';
import { TranslationService } from './services/translation.service';
import { Language } from './enums/language.enum';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  headerTitle = HeaderText.AppTitleHome;
  showBack = false;
  showSettingsButton = true;

  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    private router: Router,
    private settingsService: SettingsService,
    private translationService: TranslationService,
  ) {
    this.initNotificationListeners();
    this.initLanguage();
    this.initHeaderForRouting();
    this.initHeaderForLanguageChanges();
  }

  private async initNotificationListeners(): Promise<void> {
    await this.platform.ready();

    if (!this.platform.is('hybrid')) {
      return;
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
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects || event.url;
        this.updateHeaderForUrl(url);
      });
  }

  private initHeaderForLanguageChanges(): void {
    this.translationService.languageChanges$.subscribe(() => {
      const url = this.router.url;
      this.updateHeaderForUrl(url);
    });
  }

  private async updateHeaderForUrl(url: string): Promise<void> {
    await this.translationService.loadTranslations(this.translationService.getLanguage());
    if (url.startsWith('/settings')) {
      this.headerTitle = this.translationService.t(
        HeaderText.AppTitleSettings,
      ) as HeaderText;
      this.showBack = true;
      this.showSettingsButton = false;
    } else {
      this.headerTitle = this.translationService.t(
        HeaderText.AppTitleHome,
      ) as HeaderText;
      this.showBack = false;
      this.showSettingsButton = true;
    }
  }

  private async initLanguage(): Promise<void> {
    const settings = this.settingsService.getSettings();
    const lang = settings.language || Language.English;
    this.translationService.setLanguage(lang);
    await this.translationService.loadTranslations(lang);
    this.headerTitle = this.translationService.t(HeaderText.AppTitleHome) as HeaderText;
  }
}
