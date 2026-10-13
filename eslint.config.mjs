import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

const securityRules = new Set([
  "no-eval",
  "no-implied-eval",
  "no-unsanitized/method",
  "no-unsanitized/property",
  "obsidianmd/regex-lookbehind",
  "obsidianmd/no-forbidden-elements",
]);

function scannerSeverity(config) {
  if (!config.rules) return config;

  return {
    ...config,
    rules: Object.fromEntries(
      Object.entries(config.rules).map(([rule, setting]) => {
        if (securityRules.has(rule)) return [rule, "error"];
        const severity = Array.isArray(setting) ? setting[0] : setting;
        if (severity === "off" || severity === 0) return [rule, setting];

        const options = Array.isArray(setting) ? setting.slice(1) : [];
        return [rule, ["warn", ...options]];
      }),
    ),
  };
}

export default defineConfig([
  ...obsidianmd.configs.recommended.map(scannerSeverity),
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*", "manifest.json"],
        },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".json"],
      },
    },
  },
  {
    files: ["**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}"],
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/no-forbidden-elements": "error",
      "no-undef": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "import/no-unresolved": "off",
      "obsidianmd/validate-manifest": "off",
      "obsidianmd/validate-license": "off",
      "obsidianmd/commands/no-command-in-command-id": "off",
      "obsidianmd/commands/no-plugin-id-in-command-id": "off",
    },
  },
  globalIgnores([
    "node_modules",
    "dist",
    "build",
    "pkg",
    "test-vault",
    ".obsidian",
    "**/.obsidian/**",
    "**/*.test.*",
    "**/*.tests.*",
    "**/*.spec.*",
    "**/*.specs.*",
    "**/test/**",
    "**/tests/**",
    "**/__tests__/**",
    "**/mocks/**",
    "**/__mocks__/**",
    "**/*.cjs",
    "**/*.mjs",
    "**/*.cts",
    "**/*.mts",
    "**/vite*",
    "**/scripts/**",
    "**/docs/**",
    "**/i18n/**",
    "**/i18next/**",
    "**/locale/**",
    "**/locales/**",
    "**/translations/**",
    "**/l10n/**",
    ".pnpm-store",
    "**/testUtils**",
    "automation/**",
    "e2e-tests/**",
  ]),
]);
