const en = require("./locales/en.cjs");
const ja = require("./locales/ja.cjs");

const LOCALES = { en, ja };
const SUPPORTED_LOCALES = ["en", "ja"];

function normalizeLocale(value) {
	const locale = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/_/gu, "-");
	return locale === "ja" || locale.startsWith("ja-") ? "ja" : "en";
}

function resolveLocale(preference = "system", systemLocale = "") {
	if (preference === "en" || preference === "ja") return preference;
	return normalizeLocale(systemLocale || "en");
}

function displayLocale(locale) {
	return normalizeLocale(locale) === "ja" ? "ja-JP" : "en-US";
}

function formatDisplayDate(locale, value, options) {
	return new Intl.DateTimeFormat(displayLocale(locale), options).format(value);
}

function interpolate(message, values = {}) {
	return String(message).replace(/\{(\w+)\}/gu, (_, key) => String(values[key] ?? `{${key}}`));
}

function translate(locale, key, values) {
	const catalog = LOCALES[normalizeLocale(locale)] || en;
	return interpolate(catalog[key] ?? en[key] ?? key, values);
}

function createTranslator(locale) {
	const resolved = normalizeLocale(locale);
	return (key, values) => translate(resolved, key, values);
}

module.exports = {
	SUPPORTED_LOCALES,
	createTranslator,
	displayLocale,
	formatDisplayDate,
	normalizeLocale,
	resolveLocale,
	translate,
};
