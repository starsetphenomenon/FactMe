import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { QuizPageRoutingModule } from './quiz-routing.module';
import { QuizPage } from './quiz.page';
import { TranslatePipe } from '../pipes/translate.pipe';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    QuizPageRoutingModule,
    TranslatePipe,
  ],
  declarations: [QuizPage],
})
export class QuizPageModule {}
