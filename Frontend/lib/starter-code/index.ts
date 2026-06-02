import { type Language } from "@/types/language";

import { cppStarterCode } from "@/lib/starter-code/cpp";
import { javaStarterCode } from "@/lib/starter-code/java";
import { pythonStarterCode } from "@/lib/starter-code/python";

const starterCodeMap: Record<Language, string> = {
  python: pythonStarterCode,
  java: javaStarterCode,
  cpp: cppStarterCode,
};

export function getStarterCode(language: Language) {
  return starterCodeMap[language];
}
