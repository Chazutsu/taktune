const { domainText } = require("./localization-domain.cjs");

function createEnvironmentDiagnostics({ cacheAgeOf, inboxPath, settingsSchemaVersion, t }) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	return function environmentDiagnostics({
		googleCalendarCache = null,
		googleCalendarEnabled = false,
		inboxPresent,
		isMobile,
		nodeSupport,
		notificationPermission,
		performanceSnapshot,
		secretStorage,
		settingsVersion,
		statusCount,
	}) {
		const items = [
			settingsVersion === settingsSchemaVersion
				? {
						id: "settings",
						level: "ok",
						title: tx("diagnostics.settings.title", "Settings data"),
						detail: tx("diagnostics.settings.ok", "Schema v{version} is valid", {
							version: settingsVersion,
						}),
						repair: "",
					}
				: {
						id: "settings",
						level: "error",
						title: tx("diagnostics.settings.title", "Settings data"),
						detail: tx("diagnostics.settings.version", "Schema v{version}", {
							version: settingsVersion || tx("common.unknown", "unknown"),
						}),
						repair: tx(
							"diagnostics.settings.repair",
							"Reload the plugin to run the automatic migration",
						),
					},
			inboxPresent
				? {
						id: "inbox",
						level: "ok",
						title: tx("diagnostics.inbox.title", "Task storage"),
						detail: inboxPath,
						repair: "",
					}
				: {
						id: "inbox",
						level: "info",
						title: tx("diagnostics.inbox.title", "Task storage"),
						detail: tx("diagnostics.inbox.missing", "The inbox has not been created yet"),
						repair: tx(
							"diagnostics.inbox.repair",
							"It will be created when the first task is added",
						),
					},
			secretStorage
				? {
						id: "secrets",
						level: "ok",
						title: tx("diagnostics.secrets.title", "Secrets"),
						detail: tx("diagnostics.secrets.ok", "Local SecretStorage is available"),
						repair: "",
					}
				: {
						id: "secrets",
						level: "error",
						title: tx("diagnostics.secrets.title", "Secrets"),
						detail: tx("diagnostics.secrets.unavailable", "SecretStorage is unavailable"),
						repair: tx(
							"diagnostics.secrets.repair",
							"Update Obsidian and configure each integration again on this device",
						),
					},
			statusCount > 0
				? {
						id: "statuses",
						level: "ok",
						title: tx("diagnostics.statuses.title", "Statuses"),
						detail: tx("diagnostics.statuses.loaded", "{count} loaded", { count: statusCount }),
						repair: "",
					}
				: {
						id: "statuses",
						level: "error",
						title: tx("diagnostics.statuses.title", "Statuses"),
						detail: tx("diagnostics.statuses.empty", "No statuses are available"),
						repair: tx("diagnostics.statuses.repair", "Create at least one status in Settings"),
					},
		];
		if (isMobile)
			items.push({
				id: "node",
				level: "info",
				title: "Google Calendar",
				detail: tx("diagnostics.node.mobile", "Mobile uses the event cache saved by desktop"),
				repair: googleCalendarEnabled
					? ""
					: tx(
							"diagnostics.node.mobileRepair",
							"Configure Google integration or subscribe to a public ICS URL",
						),
			});
		else if (nodeSupport)
			items.push({
				id: "node",
				level: "ok",
				title: tx("diagnostics.node.title", "Desktop integration"),
				detail: tx("diagnostics.node.ok", "The gws command is available"),
				repair: "",
			});
		else
			items.push({
				id: "node",
				level: "error",
				title: tx("diagnostics.node.title", "Desktop integration"),
				detail: tx("diagnostics.node.unavailable", "The Node.js process API is unavailable"),
				repair: tx(
					"diagnostics.node.repair",
					"Disable restricted mode or subscribe to the calendar through ICS",
				),
			});
		if (googleCalendarEnabled) {
			const cacheAge = cacheAgeOf(googleCalendarCache);
			items.push(
				!cacheAge.available
					? {
							id: "calendar-cache",
							level: isMobile ? "error" : "info",
							title: tx("diagnostics.cache.title", "Mobile event cache"),
							detail: tx("diagnostics.cache.empty", "No Google events have been synced"),
							repair: tx(
								"diagnostics.cache.emptyRepair",
								"Open the calendar on desktop, wait for events to load, then wait for iCloud sync",
							),
						}
					: {
							id: "calendar-cache",
							level: cacheAge.stale ? "info" : "ok",
							title: tx("diagnostics.cache.title", "Mobile event cache"),
							detail: tx("diagnostics.cache.age", "{count} events · updated {hours} hours ago", {
								count: googleCalendarCache.items.length,
								hours: cacheAge.hours,
							}),
							repair: cacheAge.stale
								? tx(
										"diagnostics.cache.refresh",
										"Open the calendar on desktop to refresh the event cache",
									)
								: "",
						},
			);
		}
		items.push(
			notificationPermission === "granted"
				? {
						id: "notifications",
						level: "ok",
						title: tx("diagnostics.notifications.title", "Notifications"),
						detail: tx("diagnostics.notifications.ok", "System notifications are allowed"),
						repair: "",
					}
				: notificationPermission === "denied"
					? {
							id: "notifications",
							level: "error",
							title: tx("diagnostics.notifications.title", "Notifications"),
							detail: tx("diagnostics.notifications.denied", "Blocked by the OS or browser"),
							repair: tx(
								"diagnostics.notifications.deniedRepair",
								"Allow Obsidian notifications in device settings",
							),
						}
					: {
							id: "notifications",
							level: "info",
							title: tx("diagnostics.notifications.title", "Notifications"),
							detail: tx(
								"diagnostics.notifications.pending",
								"System notifications are not allowed yet",
							),
							repair: tx(
								"diagnostics.notifications.pendingRepair",
								"Run the Enable system notifications command",
							),
						},
		);
		if (performanceSnapshot) {
			const totalMs = Math.max(0, performanceSnapshot.totalMs || 0);
			const level = totalMs > 1_000 ? "error" : totalMs > 300 ? "info" : "ok";
			items.push({
				id: "performance",
				level,
				title: tx("diagnostics.performance.title", "Display performance"),
				detail: tx(
					"diagnostics.performance.detail",
					"{tasks} tasks · {notes} notes · scan {scan}ms · render {render}ms",
					{
						tasks: performanceSnapshot.taskCount,
						notes: performanceSnapshot.noteCount,
						scan: Math.round(performanceSnapshot.scanMs),
						render: Math.round(totalMs),
					},
				),
				repair:
					level === "error"
						? tx(
								"diagnostics.performance.errorRepair",
								"Move old notes under archive and disable integrations one at a time before diagnosing again",
							)
						: level === "info"
							? tx(
									"diagnostics.performance.infoRepair",
									"Disable unused integrations and exclude archive from aggregation",
								)
							: "",
			});
		}
		return items;
	};
}

function gwsExecutableCandidates(configured = "", home = "", resolved = "") {
	return [
		...new Set(
			[
				resolved,
				configured.trim(),
				home ? `${home}/.volta/bin/gws` : "",
				home ? `${home}/.local/bin/gws` : "",
				"/opt/homebrew/bin/gws",
				"/usr/local/bin/gws",
				"gws",
			].filter(Boolean),
		),
	];
}

function settledCalendarGroups(sources, groups, t) {
	const items = [];
	const errors = [];
	groups.forEach((group, index) => {
		if (group.status === "fulfilled") items.push(...group.value);
		else
			errors.push(
				`${sources[index]?.label || domainText(t, "calendar.name", "Calendar")}: ${group.reason?.message || String(group.reason)}`,
			);
	});
	return { items, errors };
}

module.exports = { createEnvironmentDiagnostics, gwsExecutableCandidates, settledCalendarGroups };
