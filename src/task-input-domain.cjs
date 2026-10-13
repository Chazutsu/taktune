const { domainText } = require("./localization-domain.cjs");

function createTaskInputDomain({
	addDays,
	localDate,
	repeatValuePattern,
	t,
	weekdayNames,
	weekdaySource,
}) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function tagsOf(raw) {
		return [...raw.matchAll(/(?:^|\s)#([\p{L}\p{N}_/-]+)/gu)]
			.map((match) => match[1])
			.filter((tag) => tag !== "重要" && tag !== "緊急");
	}

	function nextRepeatDate(date, repeat) {
		const next = new Date(`${date || localDate()}T00:00:00`);
		if (repeat === "every weekday") {
			next.setDate(next.getDate() + 1);
			while ([0, 6].includes(next.getDay())) next.setDate(next.getDate() + 1);
			return localDate(next);
		}
		const weekdays = repeat.match(
			new RegExp(`^every\\s+((?:${weekdaySource})(?:,(?:${weekdaySource}))*)$`, "u"),
		);
		if (weekdays) {
			const allowed = new Set(weekdays[1].split(",").map((name) => weekdayNames.indexOf(name)));
			do next.setDate(next.getDate() + 1);
			while (!allowed.has(next.getDay()));
			return localDate(next);
		}
		const monthly = repeat.match(
			new RegExp(
				`^every(?:\\s+(\\d+))?\\s+months?\\s+on\\s+(day\\s+\\d{1,2}|last\\s+day|(?:first|second|third|fourth|last)\\s+(?:${weekdaySource}))$`,
				"u",
			),
		);
		if (monthly) {
			const amount = Math.max(1, Number(monthly[1] || 1));
			next.setDate(1);
			next.setMonth(next.getMonth() + amount);
			const rule = monthly[2];
			const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
			if (rule === "last day") next.setDate(lastDay);
			else if (rule.startsWith("day ")) next.setDate(Math.min(Number(rule.slice(4)), lastDay));
			else {
				const [position, weekdayName] = rule.split(" ");
				const weekday = weekdayNames.indexOf(weekdayName);
				if (position === "last") {
					next.setDate(lastDay);
					next.setDate(lastDay - ((next.getDay() - weekday + 7) % 7));
				} else {
					const occurrence = { first: 1, second: 2, third: 3, fourth: 4 }[position];
					next.setDate(1 + ((weekday - next.getDay() + 7) % 7) + (occurrence - 1) * 7);
				}
			}
			return localDate(next);
		}
		const match = repeat.match(
			/^every(?:\s+(\d+))?\s+(day|days|week|weeks|month|months|year|years)$/u,
		);
		if (!match) return localDate(next);
		const amount = Math.max(1, Number(match[1] || 1));
		const unit = match[2].replace(/s$/u, "");
		if (unit === "day") next.setDate(next.getDate() + amount);
		if (unit === "week") next.setDate(next.getDate() + amount * 7);
		if (unit === "month") {
			const day = next.getDate();
			next.setDate(1);
			next.setMonth(next.getMonth() + amount);
			const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
			next.setDate(Math.min(day, lastDay));
		}
		if (unit === "year") {
			const month = next.getMonth();
			next.setFullYear(next.getFullYear() + amount);
			if (next.getMonth() !== month) next.setDate(0);
		}
		return localDate(next);
	}

	function isValidRepeat(value) {
		if (!repeatValuePattern.test(value)) return false;
		const day = value.match(/\bon\s+day\s+(\d{1,2})$/u);
		return !day || (Number(day[1]) >= 1 && Number(day[1]) <= 31);
	}

	function expandRecurringTasks(tasks, startDate, days, enabled = true) {
		if (!enabled) return [...tasks];
		const endDate = addDays(startDate, days - 1);
		const expanded = [...tasks];
		for (const task of tasks) {
			const anchor = task.timeBlock?.date || task.due;
			if (!task.repeat || !anchor || task.done || task.wontDo) continue;
			let occurrence = nextRepeatDate(anchor, task.repeat);
			let guard = 0;
			while (occurrence <= endDate && guard < 400) {
				if (occurrence >= startDate) {
					const durationDays = task.timeBlock?.endDate
						? Math.max(
								0,
								Math.round(
									(new Date(`${task.timeBlock.endDate}T00:00:00`) -
										new Date(`${task.timeBlock.date}T00:00:00`)) /
										86_400_000,
								),
							)
						: 0;
					expanded.push({
						...task,
						key: `${task.key}@${occurrence}`,
						due: task.due ? occurrence : "",
						timeBlock: task.timeBlock
							? { ...task.timeBlock, date: occurrence, endDate: addDays(occurrence, durationDays) }
							: null,
						isVirtualOccurrence: true,
						occurrenceDate: occurrence,
					});
				}
				const following = nextRepeatDate(occurrence, task.repeat);
				if (following <= occurrence) break;
				occurrence = following;
				guard += 1;
			}
		}
		return expanded;
	}

	function priorityOf(raw) {
		if (raw.includes("⏫")) return 3;
		if (raw.includes("🔼")) return 2;
		if (raw.includes("🔽")) return 0;
		return 1;
	}

	function parseQuickTask(value) {
		let description = value.trim().replace(/(今日|明日)(?=\d{1,2}時)/gu, "$1 ");
		let due = "";
		let priority = 1;
		let list = "";
		let repeat = "";
		let reminderTime = "";
		let reminderOffsetMinutes = 0;
		const tags = [];
		const consume = (pattern, handler) => {
			description = description.replace(pattern, (...args) => {
				handler(...args);
				return " ";
			});
		};
		consume(/(?:^|\s)(今日|明日)(?=\s|$)/gu, (match, token) => {
			due = token === "今日" ? localDate() : addDays(localDate(), 1);
		});
		consume(/(?:^|\s)(\d{4}-\d{2}-\d{2})(?=\s|$)/gu, (match, date) => {
			due = date;
		});
		consume(/(?:^|\s)(\d{1,2})(?::|時)(\d{2})?(?:分)?(?=\s|$)/gu, (match, hour, minute) => {
			reminderTime = `${String(Math.min(23, Number(hour))).padStart(2, "0")}:${String(Math.min(59, Number(minute || 0))).padStart(2, "0")}`;
		});
		consume(/(?:^|\s)(\d+)\s*(分|時間|日)前(?=\s|$)/gu, (match, amount, unit) => {
			reminderOffsetMinutes = Number(amount) * { 分: 1, 時間: 60, 日: 1440 }[unit];
		});
		consume(/(?:^|\s)!(高|中|低)(?=\s|$)/gu, (match, level) => {
			priority = { 高: 3, 中: 2, 低: 0 }[level];
		});
		consume(/(?:^|\s)~([^\s#]+)(?=\s|$)/gu, (match, name) => {
			list = name;
		});
		consume(/(?:^|\s)#([\p{L}\p{N}_/-]+)(?=\s|$)/gu, (match, tag) => {
			if (!["重要", "緊急"].includes(tag)) tags.push(tag);
		});
		consume(/(?:^|\s)(毎日|平日|毎週|毎月|毎年)(?=\s|$)/gu, (match, token) => {
			repeat = {
				毎日: "every day",
				平日: "every weekday",
				毎週: "every week",
				毎月: "every month",
				毎年: "every year",
			}[token];
		});
		return {
			description: description.replace(/\s{2,}/gu, " ").trim(),
			due,
			priority,
			list,
			tags: [...new Set(tags)],
			repeat,
			reminderTime,
			reminderOffsetMinutes,
		};
	}

	function offsetReminder(date, time, offsetMinutes = 0) {
		if (!date || !time) return null;
		const value = new Date(`${date}T${time}:00`);
		if (Number.isNaN(value.getTime())) return null;
		value.setMinutes(value.getMinutes() - Math.max(0, offsetMinutes));
		return {
			date: localDate(value),
			time: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`,
		};
	}

	function quickTaskPreview(parsed, dueOverride = "") {
		const values = [];
		if (parsed.description) values.push(parsed.description);
		const due = dueOverride || parsed.due;
		if (due) values.push(tx("quickAdd.preview.due", "Due {date}", { date: due }));
		if (parsed.reminderTime)
			values.push(
				tx("quickAdd.preview.reminder", "Reminder {time}{offset}", {
					time: parsed.reminderTime,
					offset: parsed.reminderOffsetMinutes
						? tx("quickAdd.preview.before", " · {minutes} min before", {
								minutes: parsed.reminderOffsetMinutes,
							})
						: "",
				}),
			);
		else if (parsed.reminderOffsetMinutes)
			values.push(
				tx("quickAdd.preview.reminderNeedsTime", "Reminder {minutes} min before (time required)", {
					minutes: parsed.reminderOffsetMinutes,
				}),
			);
		if (parsed.list) values.push(tx("quickAdd.preview.list", "List {list}", { list: parsed.list }));
		if (parsed.priority !== 1)
			values.push(
				tx("quickAdd.preview.priority", "Priority {priority}", {
					priority: {
						3: tx("priority.high", "High"),
						2: tx("priority.medium", "Medium"),
						0: tx("priority.low", "Low"),
					}[parsed.priority],
				}),
			);
		if (parsed.tags.length) values.push(parsed.tags.map((tag) => `#${tag}`).join(" "));
		if (parsed.repeat)
			values.push(tx("quickAdd.preview.repeat", "Repeat {repeat}", { repeat: parsed.repeat }));
		return values;
	}

	return {
		expandRecurringTasks,
		isValidRepeat,
		nextRepeatDate,
		offsetReminder,
		parseQuickTask,
		priorityOf,
		quickTaskPreview,
		tagsOf,
	};
}

module.exports = { createTaskInputDomain };
