"use client";

import { Button } from "@/components/ui/button";
import { LANGUAGES, type Language } from "@/types/language";

type LanguageSelectorProps = {
  value: Language;
  onChange: (language: Language) => void;
};

const languageOrder: Language[] = ["python", "java", "cpp"];

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div
      className="inline-flex flex-wrap gap-2"
      role="group"
      aria-label="Select programming language"
    >
      {languageOrder.map((language) => {
        const active = language === value;

        return (
          <Button
            key={language}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(language)}
          >
            {LANGUAGES[language].label}
          </Button>
        );
      })}
    </div>
  );
}
