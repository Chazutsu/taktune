function minutesOf(time) {
	const [hour, minute] = time.split(":").map(Number);
	return hour * 60 + minute;
}

function timeOf(minutes) {
	const safe = Math.max(0, Math.min(24 * 60 - 1, minutes));
	return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function createTimeBlockDomain({ addDays, multiPattern, singlePattern }) {
	function timeBlockOf(raw) {
		const multi = raw.match(multiPattern);
		if (multi)
			return {
				date: multi[1],
				start: multi[2],
				endDate: multi[3],
				end: multi[4],
				startMinutes: minutesOf(multi[2]),
				endMinutes: minutesOf(multi[4]),
				multiDay: multi[1] !== multi[3],
			};
		const single = raw.match(singlePattern);
		if (!single) return null;
		return {
			date: single[1],
			start: single[2],
			endDate: single[1],
			end: single[3],
			startMinutes: minutesOf(single[2]),
			endMinutes: minutesOf(single[3]),
			multiDay: false,
		};
	}

	function shiftTimeBlockToDate(raw, nextDate) {
		const block = timeBlockOf(raw);
		if (!block) return raw;
		if (!block.multiDay)
			return raw.replace(singlePattern, `⏰ ${nextDate} ${block.start}-${block.end}`);
		const durationDays = Math.max(
			0,
			Math.round(
				(new Date(`${block.endDate}T00:00:00`) - new Date(`${block.date}T00:00:00`)) / 86_400_000,
			),
		);
		return raw.replace(
			multiPattern,
			`⏰ ${nextDate} ${block.start}→${addDays(nextDate, durationDays)} ${block.end}`,
		);
	}

	return { shiftTimeBlockToDate, timeBlockOf };
}

function taskOccursOnDate(task, date) {
	if (!task.timeBlock) return task.due === date;
	return date >= task.timeBlock.date && date <= (task.timeBlock.endDate || task.timeBlock.date);
}

function taskTimeSegment(task, date) {
	if (!task.timeBlock || !taskOccursOnDate(task, date)) return null;
	const first = date === task.timeBlock.date;
	const last = date === (task.timeBlock.endDate || task.timeBlock.date);
	return {
		startMinutes: first ? task.timeBlock.startMinutes : 0,
		endMinutes: last ? task.timeBlock.endMinutes : 24 * 60 - 1,
		start: first ? task.timeBlock.start : "00:00",
		end: last ? task.timeBlock.end : "23:59",
	};
}

function moveTimeBlockToDate(timeBlock, date) {
	return {
		date,
		startMinutes: timeBlock.startMinutes,
		durationMinutes: timeBlock.endMinutes - timeBlock.startMinutes,
	};
}

function timelineMinutesFromOffset(offset, height, startHour = 6, endHour = 24) {
	const range = (endHour - startHour) * 60;
	const raw = startHour * 60 + (Math.max(0, Math.min(height, offset)) / height) * range;
	return Math.max(startHour * 60, Math.min(endHour * 60 - 15, Math.round(raw / 15) * 15));
}

function calendarDropSchedule(timeBlock, date, requestedStartMinutes) {
	const durationMinutes = timeBlock
		? Math.max(15, timeBlock.endMinutes - timeBlock.startMinutes)
		: 60;
	const latestStart = Math.max(0, 24 * 60 - durationMinutes);
	const startMinutes = Math.max(0, Math.min(latestStart, requestedStartMinutes));
	return { date, startMinutes, durationMinutes };
}

function batchScheduleSlots(count, date, startMinutes, durationMinutes, addDate) {
	const slots = [];
	let cursorDate = date;
	let cursor = startMinutes;
	for (let index = 0; index < count; index += 1) {
		if (cursor + durationMinutes > 24 * 60) {
			cursorDate = addDate(cursorDate, 1);
			cursor = 6 * 60;
		}
		slots.push({ date: cursorDate, startMinutes: cursor, durationMinutes });
		cursor += durationMinutes;
	}
	return slots;
}

function availableScheduleSlots(
	count,
	date,
	startMinutes,
	durationMinutes,
	busyIntervals,
	dayEndMinutes = 24 * 60,
) {
	if (
		!Number.isInteger(count) ||
		count < 1 ||
		!date ||
		!Number.isFinite(startMinutes) ||
		!Number.isFinite(durationMinutes) ||
		durationMinutes < 15
	)
		return [];
	const busy = (busyIntervals || [])
		.filter(
			(interval) =>
				Number.isFinite(interval?.startMinutes) &&
				Number.isFinite(interval?.endMinutes) &&
				interval.endMinutes > interval.startMinutes,
		)
		.map((interval) => ({
			startMinutes: Math.max(0, interval.startMinutes),
			endMinutes: Math.min(dayEndMinutes, interval.endMinutes),
		}))
		.filter((interval) => interval.endMinutes > interval.startMinutes)
		.toSorted((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
	const slots = [];
	let cursor = Math.max(0, Math.ceil(startMinutes / 15) * 15);
	while (slots.length < count) {
		const conflict = busy.find(
			(interval) =>
				cursor < interval.endMinutes && cursor + durationMinutes > interval.startMinutes,
		);
		if (conflict) {
			cursor = Math.ceil(conflict.endMinutes / 15) * 15;
			continue;
		}
		if (cursor + durationMinutes > dayEndMinutes) return [];
		slots.push({ date, startMinutes: cursor, durationMinutes });
		busy.push({ startMinutes: cursor, endMinutes: cursor + durationMinutes });
		busy.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
		cursor += durationMinutes;
	}
	return slots;
}

module.exports = {
	availableScheduleSlots,
	batchScheduleSlots,
	calendarDropSchedule,
	createTimeBlockDomain,
	minutesOf,
	moveTimeBlockToDate,
	taskOccursOnDate,
	taskTimeSegment,
	timelineMinutesFromOffset,
	timeOf,
};
