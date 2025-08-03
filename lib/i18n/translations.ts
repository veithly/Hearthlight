import { TranslationFile } from './types';

// English translations
import enCommon from '../../locales/en/common.json';
import enNavigation from '../../locales/en/navigation.json';
import enDiary from '../../locales/en/diary.json';
import enTasks from '../../locales/en/tasks.json';
import enAi from '../../locales/en/ai.json';
import enSettings from '../../locales/en/settings.json';
import enFocus from '../../locales/en/focus.json';

// Chinese translations
import zhCommon from '../../locales/zh-CN/common.json';
import zhNavigation from '../../locales/zh-CN/navigation.json';
import zhDiary from '../../locales/zh-CN/diary.json';
import zhTasks from '../../locales/zh-CN/tasks.json';
import zhAi from '../../locales/zh-CN/ai.json';
import zhSettings from '../../locales/zh-CN/settings.json';
import zhFocus from '../../locales/zh-CN/focus.json';

export const translations: Record<string, TranslationFile> = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    diary: enDiary,
    tasks: enTasks,
    ai: enAi,
    settings: enSettings,
    focus: enFocus,
  },
  'zh-CN': {
    common: zhCommon,
    navigation: zhNavigation,
    diary: zhDiary,
    tasks: zhTasks,
    ai: zhAi,
    settings: zhSettings,
    focus: zhFocus,
  },
};

export function getNestedTranslation(
  obj: TranslationFile,
  path: string
): string | undefined {
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

export function interpolateParams(
  text: string,
  params?: Record<string, any>
): string {
  if (!params) return text;
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}