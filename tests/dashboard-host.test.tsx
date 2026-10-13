import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardErrorBoundary } from "../src/ui/dashboard-host";

afterEach(() => vi.restoreAllMocks());

describe("DashboardErrorBoundary", () => {
	it("描画失敗を画面内へ示し、再試行で復旧する", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		let shouldFail = true;
		const Broken = () => {
			if (shouldFail) throw new Error("画面モデルが壊れている");
			return <p>復旧した</p>;
		};
		render(
			<DashboardErrorBoundary
				onRetry={() => {
					shouldFail = false;
				}}
			>
				<Broken />
			</DashboardErrorBoundary>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("画面モデルが壊れている");
		expect(screen.getByRole("button", { name: "再試行" })).toHaveClass("max-[620px]:min-h-11");
		fireEvent.click(screen.getByRole("button", { name: "再試行" }));
		expect(screen.getByText("復旧した")).toBeInTheDocument();
	});
});
