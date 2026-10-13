import type { EditableSubtask, TaskEditValue } from "./task-edit-dialog";

interface ReminderValue {
	date: string;
	time: string;
}

interface SubtaskValue {
	line: number;
	raw: string;
	reminders?: ReminderValue[];
}

export interface EditableTaskSource {
	raw: string;
	due?: string;
	timeBlock?: { date: string; start: string; end: string; endDate?: string } | null;
	status?: string;
	priority?: number;
	important?: boolean;
	urgent?: boolean;
	list?: string;
	section?: string;
	tags?: string[];
	repeat?: string;
	reminder?: ReminderValue | null;
	reminders?: ReminderValue[];
	progress?: number;
	autoProgress?: number | null;
	estimatedPomos?: number;
	estimatedMinutes?: number;
	note?: string;
	subtasks?: SubtaskValue[];
}

function reminderDateTime(value: ReminderValue): string {
	return `${value.date}T${value.time}`;
}

export function taskEditInitialValue(
	task: EditableTaskSource,
	statuses: { id: string }[],
	cleanDescription: (raw: string) => string,
): TaskEditValue {
	const reminders = task.reminders?.length ? task.reminders : task.reminder ? [task.reminder] : [];
	const existingSubtasks: EditableSubtask[] = (task.subtasks || []).map((subtask) => ({
		line: subtask.line,
		description: cleanDescription(subtask.raw),
		reminders: (subtask.reminders || []).map(reminderDateTime),
	}));

	return {
		description: cleanDescription(task.raw),
		due: task.due || "",
		startAt: task.timeBlock ? `${task.timeBlock.date}T${task.timeBlock.start}` : "",
		endAt: task.timeBlock
			? `${task.timeBlock.endDate || task.timeBlock.date}T${task.timeBlock.end}`
			: "",
		status: task.status || statuses[0]?.id || "todo",
		priority: Number(task.priority ?? 1),
		important: Boolean(task.important),
		urgent: Boolean(task.urgent),
		list: task.list || "",
		section: task.section || "",
		tags: [...(task.tags || [])],
		repeat: task.repeat || "",
		reminders: reminders.map(reminderDateTime),
		progress: Number(task.autoProgress ?? task.progress ?? 0),
		progressAuto: task.autoProgress !== null && task.autoProgress !== undefined,
		estimatedPomos: Number(task.estimatedPomos || 0),
		estimatedMinutes: Number(task.estimatedMinutes || 0),
		note: task.note || "",
		newComment: "",
		attachments: [],
		existingSubtasks,
		newSubtasks: [],
	};
}
