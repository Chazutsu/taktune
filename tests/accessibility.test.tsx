import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { DashboardMain } from "../src/ui/dashboard-main";
import { expectNoSeriousA11yViolations } from "./a11y";

describe("accessibility regression", () => {
	it("代表的なタスク画面にcritical・serious違反がない", async () => {
		const { container } = render(
			<DashboardMain
				model={{
					activeId: "inbox",
					primary: [
						{ id: "today", icon: "sun", label: "今日", count: 3 },
						{ id: "inbox", icon: "inbox", label: "受信箱", count: 5 },
					],
					sidebarOpen: false,
					screen: {
						title: "受信箱",
						subtitle: "5件",
						query: "",
						selectionMode: false,
						showSync: true,
						sortMode: "smart",
						groupMode: "auto",
						onQueryChange: vi.fn(),
						onToggleSelection: vi.fn(),
						onRefresh: vi.fn(async () => undefined),
						onSortChange: vi.fn(async () => undefined),
						onGroupChange: vi.fn(async () => undefined),
					},
					onSelect: vi.fn(),
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
				}}
				content={document.createElement("div")}
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
			/>,
		);

		await expectNoSeriousA11yViolations(container);
	});
});
