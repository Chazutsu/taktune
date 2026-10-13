import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardSidebar, type SidebarModel } from "../src/ui/dashboard-sidebar";
import { I18nProvider } from "../src/ui/i18n";
import { QuickAdd, type QuickAddModel } from "../src/ui/quick-add";
import { Review, type ReviewModel } from "../src/ui/review";
import { Stats, type StatsModel } from "../src/ui/stats";
import { TaskList, type TaskListModel } from "../src/ui/task-list";

function sidebarModel(): SidebarModel {
	return {
		activeId: "today",
		open: true,
		incompleteCount: 1,
		primary: [{ id: "today", icon: "sun", label: "Today", count: 1 }],
		statuses: [],
		planning: [],
		tools: [],
		savedFilters: [],
		lists: [],
		tags: [],
		expandedSections: {
			statuses: false,
			planning: false,
			tools: false,
			filters: false,
			lists: false,
			tags: false,
		},
		onClose: vi.fn(),
		onSelect: vi.fn(),
		onAddSavedFilter: vi.fn(),
		onEditSavedFilter: vi.fn(),
		onAddTaxonomy: vi.fn(),
		onEditTaxonomy: vi.fn(),
		onReorderTaxonomy: vi.fn(),
		onToggleSection: vi.fn(),
	};
}

function taskListModel(): TaskListModel {
	return {
		empty: { icon: "check-check", title: "No tasks", description: "Add a task to get started." },
		groups: [],
	};
}

function quickAddModel(): QuickAddModel {
	return { templates: [], onPreview: () => [], onSubmit: vi.fn().mockResolvedValue(true) };
}

function statsModel(): StatsModel {
	return {
		summary: [],
		completionDays: [],
		priorities: [],
		lists: [],
		openCount: 0,
		overdueCount: 0,
		onOpenReview: vi.fn(),
	};
}

function reviewModel(): ReviewModel {
	return {
		previousFocus: null,
		history: [],
		summary: [],
		achievements: [],
		focus: [],
		carryovers: [],
		carryoverOverflowCount: 0,
		draft: { wins: "", friction: "", lessons: "", next: "" },
		onPlanPreviousFocus: vi.fn(),
		onReasonChange: vi.fn(),
		onFocusSourceChange: vi.fn(),
		onDraftChange: vi.fn(),
		onPersistDraft: vi.fn(),
		onOpenRemainingCarryovers: vi.fn(),
		onSave: vi.fn(),
	};
}

describe("English locale render smoke", () => {
	it("renders the primary navigation, task list, quick add, stats, and review in English", () => {
		render(
			<I18nProvider locale="en">
				<DashboardSidebar model={sidebarModel()} />
				<TaskList model={taskListModel()} />
				<QuickAdd model={quickAddModel()} />
				<Stats model={statsModel()} />
				<Review model={reviewModel()} />
			</I18nProvider>,
		);

		expect(screen.getByRole("complementary", { name: "Task navigation" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "No tasks" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
		expect(screen.getByLabelText("Results for the last 7 days")).toBeInTheDocument();
		expect(screen.getByRole("navigation", { name: "Review steps" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save and return to Today" })).toBeInTheDocument();
	});
});
