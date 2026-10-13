import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHost } from "../src/ui/dashboard-host";
import type { MainShellModel } from "../src/ui/dashboard-main";
import type { NavigationItem, SidebarModel } from "../src/ui/dashboard-sidebar";

const navigation: NavigationItem[] = [
	{ id: "today", icon: "sun", label: "今日", count: 1 },
	{ id: "inbox", icon: "inbox", label: "受信箱", count: 5 },
	{ id: "calendar", icon: "calendar-clock", label: "時間割", count: 8 },
	{ id: "review", icon: "book-open-check", label: "振り返り", count: 1 },
];

const titles: Record<string, string> = {
	today: "今日",
	inbox: "受信箱",
	calendar: "時間割",
	review: "振り返り",
	stats: "実績",
};

function FlowHarness() {
	const [activeId, setActiveId] = useState("today");
	const content = useMemo(() => document.createElement("div"), []);
	const sidebar: SidebarModel = {
		activeId,
		open: true,
		incompleteCount: 6,
		primary: navigation,
		statuses: [],
		planning: [],
		tools: [{ id: "stats", icon: "trophy", label: "実績", count: 1 }],
		savedFilters: [],
		lists: [],
		tags: [],
		onClose: vi.fn(),
		onSelect: setActiveId,
		onAddSavedFilter: vi.fn(),
		onEditSavedFilter: vi.fn(),
		onAddTaxonomy: vi.fn(),
		onEditTaxonomy: vi.fn(),
		onReorderTaxonomy: vi.fn(),
	};
	const main: MainShellModel = {
		activeId,
		primary: navigation.slice(0, 3),
		sidebarOpen: true,
		screen: { title: titles[activeId], subtitle: "テスト" },
		onSelect: setActiveId,
		onToggleSidebar: vi.fn(),
		onOpenSidebar: vi.fn(),
		planningGuide: {
			available: true,
			inboxRemaining: 0,
			overdueRemaining: 0,
			unplannedRemaining: 0,
			selectedCount: 0,
			focusCount: 3,
			onNavigate: vi.fn(),
		},
	};
	return (
		<DashboardHost
			sidebar={sidebar}
			main={main}
			content={content}
			inbox={null}
			quickAdd={null}
			taskList={null}
			batchActions={null}
			calendarBatchActions={null}
			calendarControls={null}
			planTray={null}
			calendarTimeBlocks={[]}
			calendarDayChrome={[]}
			calendarMonths={[]}
			calendarAgenda={null}
			calendarYear={null}
			review={null}
			reviewReminder={null}
			stats={null}
			focus={null}
			habits={null}
			countdowns={null}
			matrix={null}
			board={null}
			externalIssues={null}
			notes={null}
			collectionStatus={null}
			onRetry={vi.fn()}
		/>
	);
}

describe("Dashboard主要導線", () => {
	it("今日からInbox、時間割、振り返り、実績へ同じホスト内で遷移する", () => {
		const { container } = render(<FlowHarness />);
		expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "受信箱、5件" }));
		expect(screen.getByRole("heading", { name: "受信箱" })).toBeInTheDocument();
		expect(container.querySelector("[data-layout='focused']")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "時間割、8件" }));
		expect(screen.getByRole("heading", { name: "時間割" })).toBeInTheDocument();
		expect(container.querySelector("[data-layout='canvas']")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "振り返り、1件" }));
		expect(screen.getByRole("heading", { name: "振り返り" })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "実績、1件" }));
		expect(screen.getByRole("heading", { name: "実績" })).toBeInTheDocument();
		expect(container.querySelector("[data-layout='focused']")).toBeInTheDocument();
	});
});
