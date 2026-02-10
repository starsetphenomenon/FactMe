import { Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  constructor(private translation: TranslationService) {}

  transform(key: string | null | undefined): string {
    if (!key) {
      return '';
    }
    return this.translation.translate(key);
  }
}

