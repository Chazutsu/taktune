const EXTERNAL_SOURCE_TIMEOUT_MS = 15_000;
const EXTERNAL_PAGE_LIMIT = 100;

class ExternalSourceTimeoutError extends Error {
	constructor(label, timeoutMs, message = "") {
		super(message || `${label} timed out after ${Math.ceil(timeoutMs / 1000)}s`);
		this.name = "ExternalSourceTimeoutError";
		this.code = "EXTERNAL_SOURCE_TIMEOUT";
		this.timeoutMs = timeoutMs;
	}
}

function loadWithDeadline(
	load,
	{ label = "External source", timeoutMessage = "", timeoutMs = EXTERNAL_SOURCE_TIMEOUT_MS } = {},
) {
	const controller = typeof AbortController === "function" ? new AbortController() : null;
	let timer = null;
	const operation = Promise.resolve().then(() => load(controller?.signal));
	const deadline = new Promise((_, reject) => {
		timer = setTimeout(() => {
			controller?.abort();
			reject(new ExternalSourceTimeoutError(label, timeoutMs, timeoutMessage));
		}, timeoutMs);
	});
	return Promise.race([operation, deadline]).finally(() => clearTimeout(timer));
}

function createPageTokenGuard(limit = EXTERNAL_PAGE_LIMIT) {
	const seen = new Set();
	let pages = 0;
	return {
		accept(token) {
			pages += 1;
			if (pages > limit) throw new Error(`External pagination exceeded ${limit} pages`);
			if (!token) return;
			if (seen.has(token)) throw new Error("External pagination returned a repeated page token");
			seen.add(token);
		},
	};
}

function shouldApplyRefresh(request, current) {
	return request === current;
}

function combinedAbortSignal(...signals) {
	const active = signals.filter(Boolean);
	if (!active.length) return undefined;
	if (active.length === 1) return active[0];
	if (typeof globalThis.AbortSignal?.any === "function") return globalThis.AbortSignal.any(active);
	const controller = new globalThis.AbortController();
	const abort = () => controller.abort();
	for (const signal of active) {
		if (signal.aborted) {
			controller.abort();
			break;
		}
		signal.addEventListener("abort", abort, { once: true });
	}
	return controller.signal;
}

module.exports = {
	EXTERNAL_PAGE_LIMIT,
	EXTERNAL_SOURCE_TIMEOUT_MS,
	ExternalSourceTimeoutError,
	combinedAbortSignal,
	createPageTokenGuard,
	loadWithDeadline,
	shouldApplyRefresh,
};
