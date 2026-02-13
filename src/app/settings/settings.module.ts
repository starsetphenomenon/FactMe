import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SettingsPageRoutingModule } from './settings-routing.module';
import { SettingsPage } from './settings.page';
import { TranslatePipe } from '../pipes/translate.pipe';
import { SettingsTopicsSectionComponent } from './settings-topics-section/settings-topics-section.component';
import { SettingsThemeLanguageSectionComponent } from './settings-theme-language-section/settings-theme-language-section.component';
import { SettingsNotificationsSectionComponent } from './settings-notifications-section/settings-notifications-section.component';
import { SettingsDataSectionComponent } from './settings-data-section/settings-data-section.component';
import { SettingsInfoSectionComponent } from './settings-info-section/settings-info-section.component';
import { SettingsSectionComponent } from './settings-section/settings-section.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SettingsPageRoutingModule, TranslatePipe],
  declarations: [
    SettingsPage,
    SettingsTopicsSectionComponent,
    SettingsThemeLanguageSectionComponent,
    SettingsNotificationsSectionComponent,
    SettingsDataSectionComponent,
    SettingsInfoSectionComponent,
    SettingsSectionComponent,
  ],
})
export class SettingsPageModule {}

