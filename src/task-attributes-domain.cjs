function createTaskAttributesDomain({ reminderPattern, repeatValueSource }) {
	function isReminderDue(value, lastCheck, now) {
		const dueAt = Date.parse(value);
		return Number.isFinite(dueAt) && dueAt > lastCheck && dueAt <= now;
	}

	function progressFor(task, tasks) {
		const children = tasks.filter((candidate) => candidate.parentKey === task.key);
		if (children.length)
			return Math.round((children.filter((child) => child.done).length / children.length) * 100);
		if (task.done) return 100;
		return Math.max(0, Math.min(100, Number(task.progress || 0)));
	}

	function remindersOf(raw) {
		return [...raw.matchAll(reminderPattern)].map((match) => ({ date: match[1], time: match[2] }));
	}

	function cleanDescription(raw) {
		return raw
			.replace(/\s*<!--\s*ttd:[a-z0-9-]+\s*-->/gu, "")
			.replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/gu, "")
			.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "")
			.replace(/\s*⏰\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}-\d{2}:\d{2}/gu, "")
			.replace(/\s*⏰\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}→\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/gu, "")
			.replace(/\s*📋\s*.+?(?=\s+(?:🗂️?|📅|✅|⏰|🔁|🔔|📊|🚦|⏫|🔼|🔽|#)|$)/gu, "")
			.replace(/\s*🗂️?\s*.+?(?=\s+(?:📋|📅|✅|⏰|🔁|🔔|📊|🚦|⏫|🔼|🔽|#)|$)/gu, "")
			.replace(new RegExp(`\\s*🔁\\s*${repeatValueSource}`, "gu"), "")
			.replace(/\s*🔔\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/gu, "")
			.replace(/\s*📊\s*(?:100|\d{1,2})%/gu, "")
			.replace(/\s*🚦\s*[\p{L}\p{N}_-]+/gu, "")
			.replace(/\s*🍅\s*\d{1,3}/gu, "")
			.replace(/\s*⏳\s*\d{1,4}m/gu, "")
			.replace(/\s*🚫(?=\s|$)/gu, "")
			.replace(/\s*[⏫🔼🔽]/gu, "")
			.replace(/(?:^|\s)#[\p{L}\p{N}_/-]+/gu, "")
			.trim();
	}

	function plainDescription(raw) {
		return cleanDescription(raw)
			.replace(/!\[([^\]]*)\]\([^)]*\)/gu, "$1")
			.replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
			.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/gu, "$2")
			.replace(/\[\[([^\]]+)\]\]/gu, "$1")
			.replace(/`([^`]+)`/gu, "$1")
			.replace(/(\*\*|__|~~)(.+?)\1/gu, "$2")
			.trim();
	}

	return { cleanDescription, isReminderDue, plainDescription, progressFor, remindersOf };
}

module.exports = { createTaskAttributesDomain };
