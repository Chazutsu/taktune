# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository and include:

- the affected Taktune version;
- reproduction steps;
- expected and actual behavior;
- the potential impact;
- any known workaround.

Do not include real API keys, Slack tokens, Jira tokens, vault contents, or personal data in the report. Revoke any credential that may have been exposed.

## Security model

Taktune stores integration credentials in Obsidian SecretStorage and does not intentionally synchronize them through the vault. Linear, Jira, Slack, Google Calendar, and ICS integrations are read-only. Sanitized settings backups exclude plaintext secrets.

Security fixes are prioritized by impact and exploitability. A disclosure timeline is coordinated privately before publication.
