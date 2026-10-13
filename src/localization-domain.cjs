function domainText(translator, key, fallback, params = {}) {
	const interpolate = (value) =>
		Object.entries(params).reduce(
			(text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
			value,
		);
	if (typeof translator === "function") {
		const translated = translator(key, params, fallback);
		if (translated && translated !== key) return translated;
	}
	return interpolate(fallback);
}

module.exports = { domainText };
