import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { QuizPageRoutingModule } from './quiz-routing.module';
import { QuizPage } from './quiz.page';
import { TranslatePipe } from '../pipes/translate.pipe';
import { QuizLoadingComponent } from './components/quiz-loading/quiz-loading.component';
import { QuizUnavailableComponent } from './components/quiz-unavailable/quiz-unavailable.component';
import { QuizQuestionCardComponent } from './components/quiz-question-card/quiz-question-card.component';
import { QuizResultViewComponent } from './components/quiz-result-view/quiz-result-view.component';
import { QuizConfettiComponent } from './components/quiz-confetti/quiz-confetti.component';
import { QuizRankCardComponent } from './components/quiz-rank-card/quiz-rank-card.component';
import { QuizStatsCardComponent } from './components/quiz-stats-card/quiz-stats-card.component';
import { QuizResultHeroComponent } from './components/quiz-result-hero/quiz-result-hero.component';
import { QuizResultVisualComponent } from './components/quiz-result-visual/quiz-result-visual.component';
import { QuizResultRewardsComponent } from './components/quiz-result-rewards/quiz-result-rewards.component';
import { QuizRankUpCelebrationComponent } from './components/quiz-rank-up-celebration/quiz-rank-up-celebration.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    QuizPageRoutingModule,
    TranslatePipe,
  ],
  declarations: [
    QuizPage,
    QuizLoadingComponent,
    QuizUnavailableComponent,
    QuizQuestionCardComponent,
    QuizResultViewComponent,
    QuizConfettiComponent,
    QuizRankCardComponent,
    QuizStatsCardComponent,
    QuizResultHeroComponent,
    QuizResultVisualComponent,
    QuizResultRewardsComponent,
    QuizRankUpCelebrationComponent,
  ],
})
export class QuizPageModule {}
