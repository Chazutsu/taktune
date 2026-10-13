function manifestGeneration(content) {
	try {
		const value = JSON.parse(content);
		return value?.storeVersion === 2 &&
			Number.isSafeInteger(value.generation) &&
			value.generation >= 0
			? value.generation
			: null;
	} catch {
		return null;
	}
}

function createAtomicManifestBackend({
	adapter,
	root,
	ensureDirectory,
	lockKey,
	isEstablished,
	establish,
}) {
	const pathFor = (name) => `${root}/${name}`;
	const pathsFor = (name) => ({
		head: pathFor(name),
		next: pathFor(`${name}.next`),
		backup: pathFor(`${name}.backup`),
	});
	const readIfPresent = async (path) => ((await adapter.exists(path)) ? adapter.read(path) : null);
	const removeIfPresent = async (path) => {
		if (await adapter.exists(path)) await adapter.remove(path);
	};

	async function recover(name, validateContent = () => true) {
		const { head, next, backup } = pathsFor(name);
		const [headContent, nextContent, backupContent] = await Promise.all([
			readIfPresent(head),
			readIfPresent(next),
			readIfPresent(backup),
		]);
		const headGeneration =
			headContent === null || !validateContent(headContent)
				? null
				: manifestGeneration(headContent);
		const nextGeneration =
			nextContent === null || !validateContent(nextContent)
				? null
				: manifestGeneration(nextContent);
		const backupGeneration =
			backupContent === null || !validateContent(backupContent)
				? null
				: manifestGeneration(backupContent);

		if (headContent !== null) {
			if (headGeneration === null) throw new Error("Invalid task mutation journal head");
			if (backupContent !== null && backupGeneration === null)
				throw new Error("Invalid task mutation journal backup");
			if (nextContent !== null && nextGeneration === null)
				throw new Error("Invalid task mutation journal next manifest");
			if (backupContent !== null && nextContent !== null)
				throw new Error("Ambiguous task mutation journal recovery files");
			if (backupGeneration !== null && headGeneration !== backupGeneration + 1)
				throw new Error("Ambiguous task mutation journal backup");
			if (nextGeneration !== null && nextGeneration !== headGeneration + 1)
				throw new Error("Ambiguous task mutation journal next manifest");
			await removeIfPresent(backup);
			await removeIfPresent(next);
			return headContent;
		}

		if (backupContent !== null && backupGeneration === null)
			throw new Error("Invalid task mutation journal backup");
		if (nextContent !== null && nextGeneration === null)
			throw new Error("Invalid task mutation journal next manifest");
		if (backupContent !== null && nextContent !== null) {
			if (nextGeneration !== backupGeneration + 1)
				throw new Error("Ambiguous task mutation journal recovery");
			await adapter.rename(next, head);
			await removeIfPresent(backup);
			return nextContent;
		}
		if (backupContent !== null) {
			await adapter.rename(backup, head);
			return backupContent;
		}
		if (nextContent !== null) {
			if (await isEstablished()) throw new Error("Ambiguous task mutation journal next manifest");
			await adapter.rename(next, head);
			return nextContent;
		}
		const error = new Error(`Missing task mutation journal file: ${head}`);
		error.code = "ENOENT";
		throw error;
	}

	return {
		lockKey,
		isEstablished,
		establish,
		readDirect: recover,
		async replaceAtomic(name, content) {
			await ensureDirectory();
			const { head, next, backup } = pathsFor(name);
			try {
				await recover(name);
			} catch (error) {
				if (error?.code !== "ENOENT") throw error;
			}
			await adapter.write(next, content);
			if (await adapter.exists(head)) await adapter.rename(head, backup);
			await adapter.rename(next, head);
			await removeIfPresent(backup);
		},
	};
}

module.exports = { createAtomicManifestBackend, manifestGeneration };
