import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public support links", () => {
	const donate = "https://github.com/sponsors/ryo-ebata";
	const issues = "https://github.com/Chazutsu/taktune/issues";

	it.each(["README.md", "src/plugin.cjs", "scripts/check-taktune-release.mjs"])(
		"keeps Donate and Issues destinations in %s",
		(path) => {
			const source = read(path);
			expect(source).toContain(donate);
			expect(source).toContain(issues);
		},
	);

	it("uses GitHub Sponsors repository metadata", () => {
		expect(read(".github/FUNDING.yml").trim()).toBe("github: ryo-ebata");
	});
});
