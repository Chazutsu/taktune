import { createContext, useContext, type ReactElement, type ReactNode } from "react";

declare const require: (path: string) => unknown;
const { createTranslator } = require("../i18n.cjs") as {
	createTranslator: (locale: string) => (key: string, values?: Record<string, unknown>) => string;
};

export type TaktuneLocale = "en" | "ja";
export type Translate = (key: string, values?: Record<string, unknown>) => string;

export function translatorFor(locale: TaktuneLocale): Translate {
	return createTranslator(locale);
}

// Standalone consumers and fresh installs render the English source catalog.
// The plugin and tests may override this explicitly for their resolved locale.
let defaultTranslator = createTranslator("en");
const I18nContext = createContext<Translate>((key, values) => defaultTranslator(key, values));

export function setDefaultLocale(locale: TaktuneLocale): void {
	defaultTranslator = createTranslator(locale);
}

export function I18nProvider({
	children,
	locale,
}: {
	children: ReactNode;
	locale: TaktuneLocale;
}): ReactElement {
	return <I18nContext.Provider value={createTranslator(locale)}>{children}</I18nContext.Provider>;
}

export function useI18n(): Translate {
	return useContext(I18nContext);
}
