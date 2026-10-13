function markdownTaskLineMask(content) {
	const lines = String(content).split("\n");
	const taskLines = Array.from({ length: lines.length }, () => true);
	let inFrontmatter = /^\uFEFF?---\s*$/u.test(lines[0] || "");
	let fence = null;
	let listContainers = [];

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		if (inFrontmatter) {
			taskLines[index] = false;
			if (index > 0 && /^(?:---|\.\.\.)\s*$/u.test(line)) inFrontmatter = false;
			continue;
		}

		const indentation = line.match(/^ */u)?.[0].length || 0;
		if (line.trim()) {
			listContainers = listContainers.filter((containerIndent) => indentation >= containerIndent);
		}
		let containerIndent = listContainers.filter((candidate) => indentation >= candidate).at(-1);
		let relativeLine = containerIndent === undefined ? line : line.slice(containerIndent);

		if (fence) {
			taskLines[index] = false;
			const fenceRelative = line.slice(Math.min(fence.containerIndent, indentation));
			const closing = fenceRelative.match(/^ {0,3}(`+|~+)\s*$/u)?.[1];
			if (closing && closing[0] === fence.character && closing.length >= fence.length) fence = null;
			continue;
		}

		if (containerIndent === undefined && indentation >= 4) {
			taskLines[index] = false;
			continue;
		}

		const listItem = line.match(/^( *)(?:[-*+]|\d+[.)])( {1,4})(.*)$/u);
		if (listItem) {
			const nextIndent =
				listItem[1].length + line.slice(listItem[1].length).length - listItem[3].length;
			listContainers = listContainers.filter((candidate) => candidate <= listItem[1].length);
			listContainers.push(nextIndent);
			containerIndent = nextIndent;
			relativeLine = listItem[3];
		}

		const opening = relativeLine.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
		if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
			taskLines[index] = false;
			fence = {
				character: opening[1][0],
				length: opening[1].length,
				containerIndent: containerIndent || 0,
			};
		}
	}

	return { lines, taskLines };
}

function transformMarkdownTaskLines(content, transform) {
	const { lines, taskLines } = markdownTaskLineMask(content);
	return lines.map((line, index) => (taskLines[index] ? transform(line, index) : line)).join("\n");
}

module.exports = { markdownTaskLineMask, transformMarkdownTaskLines };
