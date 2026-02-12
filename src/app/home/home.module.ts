import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { HomePageRoutingModule } from './home-routing.module';
import { TranslatePipe } from '../pipes/translate.pipe';
import { HomeFactCardComponent } from './home-fact-card/home-fact-card.component';
import { HomeDateHeaderComponent } from './home-date-header/home-date-header.component';
import { HomeFactListComponent } from './home-fact-list/home-fact-list.component';
import { HomeNextFactButtonComponent } from './home-next-fact-button/home-next-fact-button.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, HomePageRoutingModule, TranslatePipe],
  declarations: [
    HomePage,
    HomeFactCardComponent,
    HomeDateHeaderComponent,
    HomeFactListComponent,
    HomeNextFactButtonComponent,
  ],
})
export class HomePageModule {}
