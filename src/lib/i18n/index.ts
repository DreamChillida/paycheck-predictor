import { en } from './en';
import { es } from './es';
import { fr } from './fr';

export type Locale = 'en' | 'es' | 'fr';
export type Translations = typeof en;

const translations: Record<Locale, Translations> = { en, es, fr };

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || en;
}

export { en, es, fr };
