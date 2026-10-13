function createTaskMarkdownDomain({ describeTask, reminderPattern, taskPattern }) {
	function rewriteSubtaskRaw(raw, description, reminders) {
		const currentDescription = describeTask(raw);
		let next = currentDescription
			? raw.replace(currentDescription, description.trim())
			: description.trim();
		next = next
			.replace(reminderPattern, "")
			.replace(/\s{2,}/gu, " ")
			.trim();
		const doneMatch = next.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
		const done = doneMatch?.[0] || "";
		if (done) next = next.slice(0, -done.length).trimEnd();
		const reminderText = reminders.map((value) => ` 🔔 ${value.replace("T", " ")}`).join("");
		return `${next}${reminderText}${done}`;
	}

	function attachmentMarkdown(path, mimeType = "") {
		const image =
			mimeType.startsWith("image/") || /\.(?:avif|gif|jpe?g|png|svg|webp)$/iu.test(path);
		return `${image ? "!" : ""}[[${path}]]`;
	}

	function attachmentsOf(note) {
		const supported =
			/\.(?:avif|csv|docx?|gif|jpe?g|json|key|mov|mp3|mp4|numbers|pages|pdf|png|pptx?|svg|txt|wav|webp|xlsx?|zip)$/iu;
		return [...note.matchAll(/(!?\[\[([^\]|]+)(?:\|[^\]]+)?\]\])/gu)]
			.filter((match) => supported.test(match[2]))
			.map((match) => ({ token: match[1], path: match[2], embedded: match[1].startsWith("!") }));
	}

	function removeAttachmentToken(note, token) {
		return note
			.replace(token, "")
			.replace(/\n{3,}/gu, "\n\n")
			.trim();
	}

	function taskBlockRange(lines, line, indent) {
		let end = line + 1;
		while (end < lines.length) {
			const match = lines[end].match(taskPattern);
			if (match && match[1].match(/^\s*/u)[0].length <= indent) break;
			end += 1;
		}
		return { start: line, end };
	}

	function normalizeTaskBlock(block, indent) {
		if (!indent) return [...block];
		const prefix = new RegExp(`^ {0,${indent}}`, "u");
		return block.map((line) => line.replace(prefix, ""));
	}

	function nestTaskBlock(block, indent) {
		return normalizeTaskBlock(block, indent).map((line) => `  ${line}`);
	}

	function moveTaskBlock(lines, source, target, after = false) {
		if (source.line === target.line) return [...lines];
		const sourceRange = taskBlockRange(lines, source.line, source.indent);
		const targetRange = taskBlockRange(lines, target.line, target.indent);
		if (targetRange.start >= sourceRange.start && targetRange.start < sourceRange.end)
			return [...lines];
		const block = lines.slice(sourceRange.start, sourceRange.end);
		const next = [...lines];
		next.splice(sourceRange.start, sourceRange.end - sourceRange.start);
		const removedBeforeTarget =
			sourceRange.start < targetRange.start ? sourceRange.end - sourceRange.start : 0;
		const targetStart = targetRange.start - removedBeforeTarget;
		const targetEnd = targetRange.end - removedBeforeTarget;
		next.splice(after ? targetEnd : targetStart, 0, ...block);
		return next;
	}

	function reorderSubtaskBlocks(lines, parent, specs) {
		let parentEnd = parent.line + 1;
		while (parentEnd < lines.length) {
			const match = lines[parentEnd].match(taskPattern);
			if (match && match[1].match(/^\s*/u)[0].length <= parent.indent) break;
			parentEnd += 1;
		}
		const ordered = [...specs].toSorted((a, b) => a.line - b.line);
		if (!ordered.length) return lines;
		const blocks = new Map();
		ordered.forEach((spec, index) => {
			const end = index + 1 < ordered.length ? ordered[index + 1].line : parentEnd;
			const block = lines.slice(spec.line, end);
			const match = block[0]?.match(taskPattern);
			if (!match) return;
			block[0] = `${match[1]}${match[2]}${match[3]}${rewriteSubtaskRaw(match[4], spec.description, spec.reminders)}`;
			blocks.set(spec.line, block);
		});
		const firstLine = ordered[0].line;
		const reordered = specs.flatMap((spec) => blocks.get(spec.line) || []);
		lines.splice(firstLine, parentEnd - firstLine, ...reordered);
		return lines;
	}

	return {
		attachmentMarkdown,
		attachmentsOf,
		moveTaskBlock,
		nestTaskBlock,
		normalizeTaskBlock,
		removeAttachmentToken,
		reorderSubtaskBlocks,
		rewriteSubtaskRaw,
		taskBlockRange,
	};
}

module.exports = { createTaskMarkdownDomain };
