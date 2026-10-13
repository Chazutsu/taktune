const JOURNAL_VERSION = 1;
const MUTATION_TYPES = new Set([
	"delete-status",
	"rename-taxonomy",
	"remove-taxonomy",
	"rename-section",
	"remove-section",
]);
const TAXONOMY_KINDS = new Set(["list", "tag"]);
const TASK_RE = /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/u;
const LIST_RE = /📋\s*(.+?)(?=\s+(?:🗂️?|📅|✅|⏰|🔁|🔔|📊|🍅|⏳|🚦|⏫|🔼|🔽|#)|$)/u;
const SECTION_RE = /🗂️?\s*(.+?)(?=\s+(?:📋|📅|✅|⏰|🔁|🔔|📊|🍅|⏳|🚦|⏫|🔼|🔽|#)|$)/u;
const { transformMarkdownTaskLines } = require("./markdown-task-scanner.cjs");

function isPlainObject(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
	return typeof value === "string" && value.length > 0;
}

function escapeRegex(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function validateOperation(operation) {
	if (!isPlainObject(operation) || !MUTATION_TYPES.has(operation.type)) return null;
	if (operation.type === "delete-status") {
		if (!nonEmptyString(operation.statusId) || !nonEmptyString(operation.fallbackId)) return null;
		return {
			type: operation.type,
			statusId: operation.statusId,
			fallbackId: operation.fallbackId,
			removeMarker: operation.removeMarker === true,
		};
	}
	if (operation.type === "rename-section" || operation.type === "remove-section") {
		if (!nonEmptyString(operation.list) || !nonEmptyString(operation.value)) return null;
		if (operation.type === "rename-section" && !nonEmptyString(operation.next)) return null;
		return {
			type: operation.type,
			list: operation.list,
			value: operation.value,
			...(operation.type === "rename-section" ? { next: operation.next } : {}),
		};
	}
	if (!TAXONOMY_KINDS.has(operation.kind) || !nonEmptyString(operation.value)) return null;
	if (operation.type === "remove-taxonomy") {
		return { type: operation.type, kind: operation.kind, value: operation.value };
	}
	if (!nonEmptyString(operation.next)) return null;
	return {
		type: operation.type,
		kind: operation.kind,
		value: operation.value,
		next: operation.next,
		...(typeof operation.color === "string" ? { color: operation.color } : {}),
	};
}

function validateTaskMutationJournal(value) {
	if (!isPlainObject(value) || value.version !== JOURNAL_VERSION) return null;
	if (!nonEmptyString(value.id) || !nonEmptyString(value.createdAt)) return null;
	if (!Array.isArray(value.targetPaths) || value.targetPaths.some((path) => !nonEmptyString(path)))
		return null;
	const operation = validateOperation(value.operation);
	if (!operation) return null;
	const resolvedDeletedPaths = Array.isArray(value.resolvedDeletedPaths)
		? [...new Set(value.resolvedDeletedPaths.filter(nonEmptyString))]
		: [];
	return {
		version: JOURNAL_VERSION,
		id: value.id,
		createdAt: value.createdAt,
		targetPaths: [...new Set(value.targetPaths)],
		...(resolvedDeletedPaths.length ? { resolvedDeletedPaths } : {}),
		operation,
	};
}

function createTaskMutationJournal(operation, targetPaths, now = new Date()) {
	const journal = validateTaskMutationJournal({
		version: JOURNAL_VERSION,
		id: `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
		createdAt: now.toISOString(),
		targetPaths,
		operation,
	});
	if (!journal) throw new Error("Invalid task mutation intent");
	return journal;
}

function updateTaskMutationJournalForVaultEvent(journal, event) {
	const valid = validateTaskMutationJournal(journal);
	if (!valid) return null;
	const path = nonEmptyString(event?.path) ? event.path : "";
	const oldPath = nonEmptyString(event?.oldPath) ? event.oldPath : "";
	const isMarkdown = event?.isMarkdown === true || path.endsWith(".md");
	let targetPaths = [...valid.targetPaths];
	let resolvedDeletedPaths = [...(valid.resolvedDeletedPaths || [])];
	if (event?.type === "rename" && oldPath && path) {
		const remap = (candidate) =>
			candidate === oldPath || candidate.startsWith(`${oldPath}/`)
				? `${path}${candidate.slice(oldPath.length)}`
				: candidate;
		targetPaths = targetPaths.map(remap);
		resolvedDeletedPaths = resolvedDeletedPaths.map(remap);
	}
	if ((event?.type === "create" || event?.type === "modify") && isMarkdown && path) {
		targetPaths.push(path);
		resolvedDeletedPaths = resolvedDeletedPaths.filter((candidate) => candidate !== path);
	}
	if (event?.type === "delete" && path) {
		for (const candidate of targetPaths) {
			if (candidate === path || candidate.startsWith(`${path}/`))
				resolvedDeletedPaths.push(candidate);
		}
	}
	return {
		...valid,
		targetPaths: [...new Set(targetPaths)],
		resolvedDeletedPaths: [...new Set(resolvedDeletedPaths)],
	};
}

function unresolvedTaskMutationPaths(journal, existingPaths) {
	const valid = validateTaskMutationJournal(journal);
	if (!valid) throw new Error("Invalid task mutation journal");
	const existing = new Set(existingPaths);
	const deleted = new Set(valid.resolvedDeletedPaths || []);
	return valid.targetPaths.filter((path) => !existing.has(path) && !deleted.has(path));
}

function transformTaskMutationContent(content, operation) {
	const valid = validateOperation(operation);
	if (!valid) throw new Error("Invalid task mutation operation");
	if (valid.type === "delete-status") {
		const pattern = new RegExp(`🚦\\s*${escapeRegex(valid.statusId)}(?=\\s|$)`, "gu");
		return transformMarkdownTaskLines(content, (line) =>
			TASK_RE.test(line)
				? line.replace(pattern, valid.removeMarker ? "" : `🚦 ${valid.fallbackId}`)
				: line,
		);
	}
	if (valid.type === "rename-section" || valid.type === "remove-section") {
		return transformMarkdownTaskLines(content, (line) => {
			const match = line.match(TASK_RE);
			if (!match) return line;
			const raw = match[4];
			const taskList = raw.match(LIST_RE)?.[1]?.trim() || "";
			const section = raw.match(SECTION_RE)?.[1]?.trim() || "";
			const expectedList = valid.list === "__inbox__" ? "" : valid.list;
			if (taskList !== expectedList || section !== valid.value) return line;
			const replacement = valid.type === "rename-section" ? `🗂 ${valid.next}` : "";
			const updated = raw.replace(SECTION_RE, replacement).trim();
			return `${match[1]}${match[2]}${match[3]}${updated}`;
		});
	}
	if (valid.type === "rename-taxonomy") {
		const pattern =
			valid.kind === "list"
				? new RegExp(
						`📋\\s*${escapeRegex(valid.value)}(?=\\s+(?:🗂️?|📅|✅|⏰|🔁|🔔|📊|🍅|⏳|🚦|⏫|🔼|🔽|#)|$)`,
						"gu",
					)
				: new RegExp(`(^|\\s)#${escapeRegex(valid.value)}(?=\\s|$)`, "gu");
		return transformMarkdownTaskLines(content, (line) =>
			TASK_RE.test(line)
				? line.replace(pattern, valid.kind === "list" ? `📋 ${valid.next}` : `$1#${valid.next}`)
				: line,
		);
	}
	const pattern =
		valid.kind === "list"
			? new RegExp(
					`\\s*📋\\s*${escapeRegex(valid.value)}(?=\\s+(?:🗂️?|📅|✅|⏰|🔁|🔔|📊|🍅|⏳|🚦|⏫|🔼|🔽|#)|$)`,
					"gu",
				)
			: new RegExp(`\\s*#${escapeRegex(valid.value)}(?=\\s|$)`, "gu");
	return transformMarkdownTaskLines(content, (line) =>
		TASK_RE.test(line) ? line.replace(pattern, "") : line,
	);
}

function unique(values) {
	return [...new Set(values)];
}

function finalizeTaskMutationSettings(settings, operation) {
	const valid = validateOperation(operation);
	if (!valid) throw new Error("Invalid task mutation operation");
	const next = { ...settings };
	if (valid.type === "delete-status") {
		next.statuses = (settings.statuses || []).filter((status) => status.id !== valid.statusId);
		return next;
	}
	if (valid.type === "rename-section" || valid.type === "remove-section") {
		const sections = settings.sections || {};
		const current = sections[valid.list] || [];
		next.sections = {
			...sections,
			[valid.list]:
				valid.type === "rename-section"
					? unique(current.map((name) => (name === valid.value ? valid.next : name)))
					: current.filter((name) => name !== valid.value),
		};
		return next;
	}
	const key = valid.kind === "list" ? "lists" : "tags";
	if (valid.type === "rename-taxonomy") {
		next[key] = unique(
			(settings[key] || []).map((value) => (value === valid.value ? valid.next : value)),
		);
		const taxonomyMeta = settings.taxonomyMeta || { list: {}, tag: {} };
		const currentMeta = taxonomyMeta[valid.kind] || {};
		const { [valid.value]: movedMeta, ...remainingMeta } = currentMeta;
		const mergedMeta = {
			...movedMeta,
			...remainingMeta[valid.next],
			...(typeof valid.color === "string" ? { color: valid.color } : {}),
		};
		next.taxonomyMeta = {
			...taxonomyMeta,
			[valid.kind]: {
				...remainingMeta,
				...(Object.keys(mergedMeta).length ? { [valid.next]: mergedMeta } : {}),
			},
		};
		if (valid.kind === "list" && settings.sections?.[valid.value]) {
			const { [valid.value]: moved, ...rest } = settings.sections;
			next.sections = { ...rest, [valid.next]: unique([...(rest[valid.next] || []), ...moved]) };
		}
		return next;
	}
	next[key] = (settings[key] || []).filter((value) => value !== valid.value);
	const taxonomyMeta = settings.taxonomyMeta || { list: {}, tag: {} };
	const { [valid.value]: _removedMeta, ...remainingMeta } = taxonomyMeta[valid.kind] || {};
	next.taxonomyMeta = { ...taxonomyMeta, [valid.kind]: remainingMeta };
	if (valid.kind === "list" && settings.sections?.[valid.value]) {
		const { [valid.value]: _removedSections, ...remainingSections } = settings.sections;
		next.sections = remainingSections;
	}
	return next;
}

async function executeTaskMutationJournal(journal, handlers) {
	const valid = validateTaskMutationJournal(journal);
	if (!valid) throw new Error("Invalid task mutation journal");
	for (const [index, path] of valid.targetPaths.entries()) {
		if (valid.resolvedDeletedPaths?.includes(path)) continue;
		await handlers.processPath(path, (content) =>
			transformTaskMutationContent(content, valid.operation),
		);
		handlers.onProgress?.(index + 1, valid.targetPaths.length);
	}
	await handlers.persistFinal(valid.operation);
}

module.exports = {
	JOURNAL_VERSION,
	createTaskMutationJournal,
	executeTaskMutationJournal,
	finalizeTaskMutationSettings,
	transformTaskMutationContent,
	unresolvedTaskMutationPaths,
	updateTaskMutationJournalForVaultEvent,
	validateTaskMutationJournal,
};
