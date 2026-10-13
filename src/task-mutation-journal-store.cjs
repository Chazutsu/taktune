const { validateTaskMutationJournal } = require("./task-mutation-domain.cjs");

const STORE_VERSION = 2;
const MANIFEST = "manifest.json";
const mutationLocks = new Map();

function withMutationLock(backend, operation) {
	const key = backend.lockKey || backend;
	const previous = mutationLocks.get(key) || Promise.resolve();
	const current = previous.catch(() => {}).then(operation);
	mutationLocks.set(key, current);
	return current.finally(() => {
		if (mutationLocks.get(key) === current) mutationLocks.delete(key);
	});
}

function token() {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function validateManifest(value) {
	if (!value || value.storeVersion !== STORE_VERSION) return null;
	if (!Number.isSafeInteger(value.generation) || value.generation < 0) return null;
	if (typeof value.fenceToken !== "string" || !value.fenceToken) return null;
	const journal = value.journal === null ? null : validateTaskMutationJournal(value.journal);
	if (value.journal !== null && !journal) return null;
	const claim = value.claim;
	if (
		claim !== null &&
		(!claim ||
			typeof claim.claimId !== "string" ||
			!claim.claimId ||
			typeof claim.token !== "string")
	)
		return null;
	return {
		storeVersion: STORE_VERSION,
		generation: value.generation,
		fenceToken: value.fenceToken,
		journal,
		claim,
	};
}

async function readManifest(backend, { allowMissing = false } = {}) {
	try {
		const validates = (content) => {
			try {
				return Boolean(validateManifest(JSON.parse(content)));
			} catch {
				return false;
			}
		};
		const manifest = validateManifest(JSON.parse(await backend.readDirect(MANIFEST, validates)));
		if (!manifest) throw new Error("Invalid task mutation journal manifest");
		return manifest;
	} catch (error) {
		if (allowMissing && error?.code === "ENOENT") return null;
		throw new Error("Task mutation journal manifest unavailable", { cause: error });
	}
}

async function replaceManifest(backend, previous, next) {
	if (previous) {
		const current = await readManifest(backend);
		if (current.generation !== previous.generation || current.fenceToken !== previous.fenceToken)
			throw new Error("Task mutation journal fencing conflict");
	}
	await backend.replaceAtomic(MANIFEST, JSON.stringify(next));
	const stored = await readManifest(backend);
	if (stored.generation !== next.generation || stored.fenceToken !== next.fenceToken)
		throw new Error("Task mutation journal fencing conflict");
	return stored;
}

async function initializeTaskMutationJournalStoreUnlocked(backend) {
	const current = await readManifest(backend, { allowMissing: true });
	if (current) {
		await backend.establish();
		return current;
	}
	const created = await replaceManifest(backend, null, {
		storeVersion: STORE_VERSION,
		generation: 0,
		fenceToken: token(),
		journal: null,
		claim: null,
	});
	await backend.establish();
	return created;
}

function initializeTaskMutationJournalStore(backend) {
	return withMutationLock(backend, () => initializeTaskMutationJournalStoreUnlocked(backend));
}

async function loadTaskMutationJournalState(backend) {
	const manifest = await readManifest(backend, { allowMissing: true });
	if (!manifest && (await backend.isEstablished()))
		throw new Error("Task mutation journal manifest unavailable");
	return manifest;
}

async function loadTaskMutationJournal(backend) {
	return (await loadTaskMutationJournalState(backend))?.journal || null;
}

async function reconcileLegacyTaskMutationJournal(backend, legacyJournal) {
	let state = await loadTaskMutationJournalState(backend);
	const legacy = legacyJournal ? validateTaskMutationJournal(legacyJournal) : null;
	if (legacyJournal && !legacy) throw new Error("Invalid legacy task mutation journal");
	if (state?.journal && legacy && state.journal.id !== legacy.id)
		throw new Error("Legacy and dedicated task mutation journals conflict");
	if (!state) {
		await initializeTaskMutationJournalStore(backend);
		if (legacy) await createStoredTaskMutationJournal(backend, legacy);
		state = await loadTaskMutationJournalState(backend);
	}
	return state?.journal || null;
}

async function createStoredTaskMutationJournal(backend, journal) {
	return withMutationLock(backend, async () => {
		const valid = validateTaskMutationJournal(journal);
		if (!valid) throw new Error("Invalid task mutation journal");
		const current =
			(await loadTaskMutationJournalState(backend)) ||
			(await initializeTaskMutationJournalStoreUnlocked(backend));
		if (current.journal) throw new Error("Task mutation journal is busy");
		const next = await replaceManifest(backend, current, {
			...current,
			generation: current.generation + 1,
			fenceToken: token(),
			journal: valid,
			claim: null,
		});
		return next.journal;
	});
}

async function assertTaskMutationJournalOwner(backend, expectedId) {
	const current = await readManifest(backend);
	if (current.journal?.id !== expectedId) throw new Error("Task mutation journal ownership lost");
	return current.journal;
}

async function updateStoredTaskMutationJournal(backend, expectedId, journal, claimId, claimToken) {
	return withMutationLock(backend, async () => {
		const valid = validateTaskMutationJournal(journal);
		if (!valid || valid.id !== expectedId) throw new Error("Invalid task mutation journal update");
		const current = await readManifest(backend);
		if (current.journal?.id !== expectedId) throw new Error("Task mutation journal ownership lost");
		if (current.claim && (current.claim.claimId !== claimId || current.claim.token !== claimToken))
			throw new Error("Task mutation journal claim lost");
		await replaceManifest(backend, current, {
			...current,
			generation: current.generation + 1,
			fenceToken: token(),
			journal: valid,
		});
		return valid;
	});
}

async function claimTaskMutationJournal(backend, journalId, claimId) {
	return withMutationLock(backend, async () => {
		if (!/^[a-zA-Z0-9-]+$/u.test(claimId)) throw new Error("Invalid task mutation claim id");
		const current = await readManifest(backend);
		if (current.journal?.id !== journalId) throw new Error("Task mutation journal ownership lost");
		if (current.claim && current.claim.claimId !== claimId)
			throw new Error("Task mutation journal requires explicit stale-claim recovery");
		if (current.claim?.claimId === claimId) return current.claim.token;
		const claimToken = token();
		await replaceManifest(backend, current, {
			...current,
			generation: current.generation + 1,
			fenceToken: token(),
			claim: { claimId, token: claimToken },
		});
		return claimToken;
	});
}

async function assertTaskMutationJournalClaim(backend, journalId, claimId, claimToken) {
	const current = await readManifest(backend);
	if (
		current.journal?.id !== journalId ||
		current.claim?.claimId !== claimId ||
		current.claim?.token !== claimToken
	)
		throw new Error("Task mutation journal claim lost");
	return current.fenceToken;
}

async function releaseTaskMutationJournalClaim(backend, journalId, claimId, claimToken) {
	return withMutationLock(backend, async () => {
		const current = await readManifest(backend);
		if (current.journal?.id !== journalId) return;
		if (current.claim?.claimId !== claimId || current.claim?.token !== claimToken)
			throw new Error("Task mutation journal claim lost");
		await replaceManifest(backend, current, {
			...current,
			generation: current.generation + 1,
			fenceToken: token(),
			claim: null,
		});
	});
}

async function recoverStaleTaskMutationClaim(backend, journalId) {
	return withMutationLock(backend, async () => {
		const current = await readManifest(backend);
		if (current.journal?.id !== journalId) throw new Error("Task mutation journal ownership lost");
		if (!current.claim) return false;
		await replaceManifest(backend, current, {
			...current,
			generation: current.generation + 1,
			fenceToken: token(),
			claim: null,
		});
		return true;
	});
}

async function clearStoredTaskMutationJournal(backend, expectedId, claimId, claimToken) {
	return withMutationLock(backend, async () => {
		const current = await readManifest(backend);
		if (
			current.journal?.id !== expectedId ||
			current.claim?.claimId !== claimId ||
			current.claim?.token !== claimToken
		)
			throw new Error("Task mutation journal ownership lost");
		await replaceManifest(backend, current, {
			...current,
			generation: current.generation + 1,
			fenceToken: token(),
			journal: null,
			claim: null,
		});
	});
}

module.exports = {
	assertTaskMutationJournalClaim,
	assertTaskMutationJournalOwner,
	claimTaskMutationJournal,
	clearStoredTaskMutationJournal,
	createStoredTaskMutationJournal,
	initializeTaskMutationJournalStore,
	loadTaskMutationJournal,
	loadTaskMutationJournalState,
	reconcileLegacyTaskMutationJournal,
	recoverStaleTaskMutationClaim,
	releaseTaskMutationJournalClaim,
	updateStoredTaskMutationJournal,
};
