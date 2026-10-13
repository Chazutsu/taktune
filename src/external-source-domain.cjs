const { domainText } = require("./localization-domain.cjs");

function createExternalSourceDomain({ addDays, localDate, t }) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function googleCalendarEvents(events, calendarId, meta = {}) {
		return (events || [])
			.filter((event) => event.status !== "cancelled")
			.flatMap((event) => {
				const startValue = event.start?.dateTime || event.start?.date;
				const endValue = event.end?.dateTime || event.end?.date;
				if (!startValue || !endValue) return [];
				const allDay = !event.start?.dateTime;
				const startDate = new Date(startValue);
				const endDate = new Date(endValue);
				if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];
				const dates = [];
				if (allDay)
					for (let date = event.start.date; date < event.end.date; date = addDays(date, 1))
						dates.push(date);
				return [
					{
						eventId: event.id,
						title: event.summary || tx("calendar.event.untitled", "Untitled event"),
						meta: allDay
							? tx("calendar.event.allDay", "All day")
							: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}–${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
						url: event.htmlLink,
						icon: "calendar-clock",
						allDay,
						date: allDay ? event.start.date : localDate(startDate),
						dates,
						startMinutes: startDate.getHours() * 60 + startDate.getMinutes(),
						endMinutes: endDate.getHours() * 60 + endDate.getMinutes(),
						calendarId,
						calendarName: meta.name || (calendarId === "primary" ? "Google Calendar" : calendarId),
						calendarColor: meta.color || "#7693e8",
					},
				];
			});
	}

	function googleCalendarList(items) {
		return (items || []).map((item) => ({
			id: item.primary ? "primary" : item.id,
			name: item.summaryOverride || item.summary || item.id,
			color: item.backgroundColor || "#7693e8",
			primary: Boolean(item.primary),
			selectedInGoogle: Boolean(item.selected),
		}));
	}

	function linearIssues(issues) {
		return (issues || []).map((issue) => ({
			externalId: `linear:${issue.identifier}`,
			title: `${issue.identifier} ${issue.title}`,
			meta: [
				issue.state?.name,
				issue.dueDate ? tx("external.issue.due", "Due {date}", { date: issue.dueDate }) : "",
			]
				.filter(Boolean)
				.join(" · "),
			due: issue.dueDate || "",
			url: issue.url,
			icon: "square-kanban",
			labels: ["source:linear", issue.state?.name ? `status:${issue.state.name}` : ""].filter(
				Boolean,
			),
		}));
	}

	function jiraIssues(issues, baseUrl) {
		const base = baseUrl.replace(/\/$/u, "");
		return (issues || []).map((issue) => ({
			externalId: `jira:${issue.key}`,
			title: `${issue.key} ${issue.fields.summary}`,
			meta: [
				issue.fields.status?.name,
				issue.fields.duedate
					? tx("external.issue.due", "Due {date}", { date: issue.fields.duedate })
					: "",
			]
				.filter(Boolean)
				.join(" · "),
			due: issue.fields.duedate || "",
			url: `${base}/browse/${issue.key}`,
			icon: "panels-top-left",
			labels: [
				"source:jira",
				issue.fields.status?.name ? `status:${issue.fields.status.name}` : "",
				issue.fields.priority?.name ? `priority:${issue.fields.priority.name}` : "",
			].filter(Boolean),
		}));
	}

	function slackBookmarks(bookmarks, channelId) {
		return (bookmarks || []).map((bookmark) => ({
			externalId: `slack:${bookmark.channel_id || channelId}:${bookmark.id}`,
			title: bookmark.title || bookmark.link || tx("external.slack.bookmark", "Slack bookmark"),
			meta: `Slack · ${channelId}`,
			url: bookmark.link,
			icon: "bookmark",
			labels: ["source:slack", "type:bookmark", `channel:${channelId}`],
		}));
	}

	return { googleCalendarEvents, googleCalendarList, jiraIssues, linearIssues, slackBookmarks };
}

module.exports = { createExternalSourceDomain };
