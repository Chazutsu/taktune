# Obsidian shell smoke

This local end-to-end smoke test exercises an installed Taktune plugin inside a real Obsidian desktop Electron window. It reads the active vault but does not modify tasks or settings.

## Run

```bash
/Applications/Obsidian.app/Contents/MacOS/Obsidian --remote-debugging-port=9222
pnpm test:obsidian-shell
```

Quit any existing Obsidian process before starting it with the debugging port. Set `OBSIDIAN_CDP_URL` when using a port other than `9222`.

## Coverage

The smoke test verifies that:

- the runtime exposes SecretStorage, introduced in the minimum supported Obsidian version `1.11.4`;
- Taktune is enabled;
- invoking the open command three times still leaves exactly one dashboard tab;
- Today, Unified Inbox, Schedule, Review, and Statistics can be visited in sequence;
- at a real window size of 390×844, primary actions and navigation controls expose interaction areas of at least 44px; and
- the dashboard does not overflow horizontally.

The macOS application metadata may describe the Electron updater shell rather than the loaded Obsidian API version. The test therefore checks required APIs directly instead of inferring compatibility from application metadata.

On failure, the test writes `test-results/obsidian-shell/failure.png`. It does not close the Obsidian process that provided the CDP connection, so the active window remains available for inspection.
