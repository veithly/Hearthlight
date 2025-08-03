import { SUPPORTED_LOCALES } from './types';

export function formatDate(date: Date, locale: string): string {
  const localeConfig = SUPPORTED_LOCALES.find(l => l.code === locale);
  
  if (!localeConfig) {
    return date.toLocaleDateString('en-US');
  }

  // Map our locale codes to standard locale identifiers
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh-CN': 'zh-CN',
  };

  const standardLocale = localeMap[locale] || 'en-US';
  
  try {
    return date.toLocaleDateString(standardLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.warn(`Failed to format date for locale ${locale}:`, error);
    return date.toLocaleDateString('en-US');
  }
}

export function formatTime(date: Date, locale: string): string {
  const localeConfig = SUPPORTED_LOCALES.find(l => l.code === locale);
  
  if (!localeConfig) {
    return date.toLocaleTimeString('en-US');
  }

  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh-CN': 'zh-CN',
  };

  const standardLocale = localeMap[locale] || 'en-US';
  const use24Hour = localeConfig.timeFormat === '24h';
  
  try {
    return date.toLocaleTimeString(standardLocale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24Hour,
    });
  } catch (error) {
    console.warn(`Failed to format time for locale ${locale}:`, error);
    return date.toLocaleTimeString('en-US');
  }
}

export function formatDateTime(date: Date, locale: string): string {
  return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}

export function formatRelativeTime(date: Date, locale: string): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Define time units in seconds
  const units = [
    { name: 'year', seconds: 31536000 },
    { name: 'month', seconds: 2592000 },
    { name: 'week', seconds: 604800 },
    { name: 'day', seconds: 86400 },
    { name: 'hour', seconds: 3600 },
    { name: 'minute', seconds: 60 },
    { name: 'second', seconds: 1 },
  ];

  // Find the appropriate unit
  for (const unit of units) {
    const interval = Math.floor(diffInSeconds / unit.seconds);
    if (interval >= 1) {
      try {
        const localeMap: Record<string, string> = {
          'en': 'en-US',
          'zh-CN': 'zh-CN',
        };
        
        const standardLocale = localeMap[locale] || 'en-US';
        const rtf = new Intl.RelativeTimeFormat(standardLocale, { numeric: 'auto' });
        return rtf.format(-interval, unit.name as Intl.RelativeTimeFormatUnit);
      } catch (error) {
        console.warn(`Failed to format relative time for locale ${locale}:`, error);
        // Fallback to English
        const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
        return rtf.format(-interval, unit.name as Intl.RelativeTimeFormatUnit);
      }
    }
  }
  
  // If less than a second ago
  try {
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'zh-CN': 'zh-CN',
    };
    
    const standardLocale = localeMap[locale] || 'en-US';
    const rtf = new Intl.RelativeTimeFormat(standardLocale, { numeric: 'auto' });
    return rtf.format(0, 'second');
  } catch (error) {
    return 'just now';
  }
}