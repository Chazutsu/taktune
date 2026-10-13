import { defineConfig } from "rolldown";

export default defineConfig({
	input: "tests/visual/app.tsx",
	output: { file: "tests/visual/dist/app.js", format: "esm", codeSplitting: false },
	plugins: [
		{
			name: "visual-obsidian-mock",
			resolveId(id) {
				return id === "obsidian" ? "\0visual-obsidian" : null;
			},
			load(id) {
				if (id !== "\0visual-obsidian") return null;
				return `
const icons = {
	'archive-restore': '↩',
	'arrow-up-right': '↗',
	'book-open-check': '▣',
	'bookmark': '◆',
	'calendar-check': '▣',
	'calendar-days': '▦',
	'calendar-plus': '＋',
	'check': '✓',
	'check-check': '✓✓',
	'chevron-left': '‹',
	'chevron-right': '›',
	'chevron-down': '⌄',
	'chevron-up': '⌃',
	'circle': '○',
	'circle-check': '◉',
	'circle-check-big': '●',
	'ellipsis': '•••',
	'external-link': '↗',
	'flame': '♨',
	'folder': '▰',
	'grip-vertical': '⠿',
	'hourglass': '⌛',
	'list-checks': '☷',
	'list-filter': '≡',
	'minus': '−',
	'notebook-pen': '▤',
	'panel-left-close': '◧',
	'panel-left-open': '◨',
	'panels-top-left': '▦',
	'plus': '+',
	'refresh-cw': '↻',
	'repeat-2': '↻',
	'rss': '◔',
	'search': '⌕',
	'settings-2': '⚙',
	'sliders-horizontal': '☷',
	'square-kanban': '▥',
	'sun': '☀',
	'triangle-alert': '△',
	'timer': '◷',
	'x': '×',
};
export function setIcon(element, name) {
	element.dataset.iconName = name;
	const icon = icons[name];
	if (!icon) {
		element.dataset.missingIcon = name;
		element.textContent = '□';
		return;
	}
	delete element.dataset.missingIcon;
	element.textContent = icon;
}`;
			},
		},
	],
});
