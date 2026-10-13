import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	copyTextToClipboard,
	DiagnosticsDialog,
	diagnosticsReport,
} from "../src/ui/diagnostics-dialog";

const model = {
	version: "0.1.0",
	platform: "desktop",
	vault: "blog",
	integrations: ["Google Calendar", "Linear"],
	items: [
		{ id: "schema", level: "ok" as const, title: "設定", detail: "schema v3" },
		{
			id: "cache",
			level: "info" as const,
			title: "予定キャッシュ",
			detail: "48時間前",
			repair: "デスクトップで再同期する",
		},
		{
			id: "secret",
			level: "error" as const,
			title: "認証情報",
			detail: "保存できない",
			repair: "再認証する",
		},
	],
	onCopy: vi.fn(),
	onTestIntegrations: vi.fn().mockResolvedValue([]),
};

describe("DiagnosticsDialog", () => {
	it("重要度別件数と環境を表示する", () => {
		render(<DiagnosticsDialog model={model} />);
		const summary = screen.getByLabelText("診断結果の概要");
		expect(within(summary).getByText("正常").previousSibling).toHaveTextContent("1");
		expect(within(summary).getByText("要確認").previousSibling).toHaveTextContent("1");
		expect(within(summary).getByText("問題").previousSibling).toHaveTextContent("1");
		expect(screen.getByText("v0.1.0 · desktop · Vault: blog")).toBeInTheDocument();
	});

	it("詳細・対処・外部連携を表示する", () => {
		render(<DiagnosticsDialog model={model} />);
		expect(screen.getByText("予定キャッシュ")).toBeInTheDocument();
		expect(screen.getByText(/デスクトップで再同期する/u)).toBeInTheDocument();
		expect(screen.getByText(/Google Calendar · Linear/u)).toBeInTheDocument();
	});

	it("連携がなければ明示する", () => {
		render(<DiagnosticsDialog model={{ ...model, integrations: [] }} />);
		expect(screen.getByText("なし").closest("p")).toHaveTextContent("外部連携: なし");
	});

	it("診断結果をコピーし、モバイルでも操作領域を保つ", async () => {
		const onCopy = vi.fn().mockResolvedValue(undefined);
		render(<DiagnosticsDialog model={{ ...model, onCopy }} />);
		const copy = screen.getByRole("button", { name: "診断結果をコピー" });
		expect(copy).toHaveClass("max-[620px]:min-h-11", "max-[620px]:w-full");
		fireEvent.click(copy);
		await waitFor(() => expect(onCopy).toHaveBeenCalledWith([]));
		expect(screen.getByRole("status")).toHaveTextContent("診断結果をコピーした");
	});

	it("接続結果を画面に保持し、コピーへ含める", async () => {
		const onCopy = vi.fn().mockResolvedValue(undefined);
		const onTestIntegrations = vi
			.fn()
			.mockResolvedValue(["Google Calendar: 接続成功（8件）", "Linear: 失敗 — 権限不足"]);
		render(<DiagnosticsDialog model={{ ...model, onCopy, onTestIntegrations }} />);
		const testButton = screen.getByRole("button", { name: "接続を確認" });
		expect(testButton).toHaveClass("max-[620px]:min-h-11", "max-[620px]:w-full");
		fireEvent.click(testButton);
		expect(screen.getByRole("button", { name: "確認中…" })).toBeDisabled();
		const results = await screen.findByLabelText("接続確認結果");
		expect(results).toHaveTextContent("Google Calendar: 接続成功（8件）");
		expect(results).toHaveTextContent("Linear: 失敗 — 権限不足");
		fireEvent.click(screen.getByRole("button", { name: "診断結果をコピー" }));
		await waitFor(() =>
			expect(onCopy).toHaveBeenCalledWith([
				"Google Calendar: 接続成功（8件）",
				"Linear: 失敗 — 権限不足",
			]),
		);
	});

	it("共有レポートへVaultと判定だけを含める", () => {
		const report = diagnosticsReport({ ...model, connectionResults: ["Linear: 失敗 — 権限不足"] });
		expect(report).toContain("Taktune v0.1.0");
		expect(report).toContain("Vault: blog");
		expect(report).toContain("[ERROR] 認証情報: 保存できない");
		expect(report).toContain("接続確認:\nLinear: 失敗 — 権限不足");
		expect(report).not.toContain("token");
	});

	it("Clipboard APIで診断結果をコピーする", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		await copyTextToClipboard("診断結果", { writeText });
		expect(writeText).toHaveBeenCalledWith("診断結果");
		expect(document.querySelector("textarea")).toBeNull();
	});

	it("Clipboard APIが拒否されたらiOS WebView向け選択コピーへ戻す", async () => {
		const execCommand = vi.fn().mockReturnValue(true);
		Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
		await copyTextToClipboard("診断結果", {
			writeText: vi.fn().mockRejectedValue(new Error("denied")),
		});
		expect(execCommand).toHaveBeenCalledWith("copy");
		expect(document.querySelector("textarea")).toBeNull();
	});
});
