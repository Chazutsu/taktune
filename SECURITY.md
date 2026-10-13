# Security Policy

## Supported versions

Only the latest released version receives security fixes.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's **Report a vulnerability** form in the
Security tab of this repository. Include reproduction steps, affected versions,
impact, and a minimal proof of concept when possible.

Please allow up to 7 days for an initial response. We prioritize fixes by impact
and exploitability and coordinate disclosure before publication.

## Security model

Taktune stores integration credentials in Obsidian SecretStorage and does not
intentionally synchronize them through the vault. Linear, Jira, Slack, Google
Calendar, and ICS integrations are read-only. Sanitized settings backups exclude
plaintext secrets.

Never include real API keys, tokens, vault contents, or personal data. Revoke any
credential that may have been exposed.
