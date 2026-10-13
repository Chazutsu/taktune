export function isAllowedInitialReleaseVersion(version) {
  return /^0\.1\.(0|[1-9]\d*)$/u.test(version);
}

export function releaseMetadataMismatches({ manifest, packageJson, versions, requestedVersion }) {
  const mismatches = [];
  if (manifest.id !== "ticktick-dashboard") mismatches.push(`manifest.json.id=${manifest.id || "missing"}`);
  if (manifest.isDesktopOnly !== false) mismatches.push(`manifest.json.isDesktopOnly=${String(manifest.isDesktopOnly)}`);
  if (manifest.version !== requestedVersion) mismatches.push(`manifest.json=${manifest.version}`);
  if (packageJson.version !== requestedVersion) mismatches.push(`package.json=${packageJson.version}`);
  if (versions[requestedVersion] !== manifest.minAppVersion) mismatches.push(`versions.json[${requestedVersion}]=${versions[requestedVersion] ?? "missing"}`);
  return mismatches;
}

export function validateReleaseArtifactContents(artifacts) {
  const byName = new Map(artifacts.map((artifact) => [artifact.name, artifact.content]));
  for (const name of ["main.js", "manifest.json", "styles.css"]) {
    const content = byName.get(name);
    if (!content?.length) throw new Error(`release artifact is empty or invalid: ${name}`);
  }
  const main = byName.get("main.js").toString("utf8");
  const styles = byName.get("styles.css").toString("utf8");
  if (main.length < 10_000) throw new Error("main.js is unexpectedly small; production bundle may be incomplete");
  if (styles.length < 1_000) throw new Error("styles.css is unexpectedly small; Tailwind output may be incomplete");
  if (main.includes("/Users/") || styles.includes("/Users/")) throw new Error("release artifacts contain a user-specific absolute path");
  if (main.includes("sourceMappingURL=data:") || styles.includes("sourceMappingURL=data:")) throw new Error("production artifacts contain an inline source map");
}
