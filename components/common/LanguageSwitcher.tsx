'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { changeLocale } from '@/components/providers/I18nProvider';
import { getStoredLocale, type Locale } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const t = useTranslations('language');
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>('en');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLocale(getStoredLocale());

    // Listen for locale changes
    const handleLocaleChange = (e: CustomEvent<Locale>) => {
      setCurrentLocale(e.detail);
    };

    window.addEventListener('localeChange', handleLocaleChange as EventListener);
    return () => {
      window.removeEventListener('localeChange', handleLocaleChange as EventListener);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = (locale: Locale) => {
    changeLocale(locale);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{currentLocale === 'ko' ? '한국어' : 'EN'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-28 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50">
          <button
            onClick={() => handleLocaleChange('en')}
            className={`w-full px-3 py-2 text-left text-xs hover:bg-[#F8FAFC] transition-colors ${
              currentLocale === 'en' ? 'text-[#0F172A] bg-[#F1F5F9] font-medium' : 'text-[#64748B]'
            }`}
          >
            {t('en')}
          </button>
          <button
            onClick={() => handleLocaleChange('ko')}
            className={`w-full px-3 py-2 text-left text-xs hover:bg-[#F8FAFC] transition-colors ${
              currentLocale === 'ko' ? 'text-[#0F172A] bg-[#F1F5F9] font-medium' : 'text-[#64748B]'
            }`}
          >
            {t('ko')}
          </button>
        </div>
      )}
    </div>
  );
}
