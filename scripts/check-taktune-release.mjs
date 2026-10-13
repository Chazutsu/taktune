import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { isAllowedInitialReleaseVersion, releaseMetadataMismatches, validateReleaseArtifactContents } from "./taktune-release-utils.mjs";

const pluginDir = resolve(import.meta.dirname, "..");

const [manifest, packageJson, versions] = await Promise.all([
  readFile(resolve(pluginDir, "manifest.json"), "utf8").then(JSON.parse),
  readFile(resolve(pluginDir, "package.json"), "utf8").then(JSON.parse),
  readFile(resolve(pluginDir, "versions.json"), "utf8").then(JSON.parse),
]);
const requestedVersion = process.argv[2] ?? packageJson.version;

if (!isAllowedInitialReleaseVersion(requestedVersion)) {
  throw new Error(`unsupported release version: ${requestedVersion}; expected 0.1.x with a numeric patch`);
}

const mismatches = releaseMetadataMismatches({ manifest, packageJson, versions, requestedVersion });
if (mismatches.length > 0) {
  throw new Error(`release version mismatch: requested=${requestedVersion}, ${mismatches.join(", ")}`);
}

const artifacts = await Promise.all(["main.js", "manifest.json", "styles.css"].map(async (name) => {
  const path = resolve(pluginDir, name);
  const [info, content] = await Promise.all([stat(path), readFile(path)]);
  if (!info.isFile() || content.length === 0) throw new Error(`release artifact is empty or invalid: ${name}`);
  return { name, content, digest: createHash("sha256").update(content).digest("hex") };
}));
validateReleaseArtifactContents(artifacts);

console.log(`Taktune ${requestedVersion} release artifacts are consistent`);
for (const artifact of artifacts) console.log(`${artifact.name} sha256:${artifact.digest.slice(0, 12)} bytes:${artifact.content.length}`);
console.log("Support development: https://github.com/sponsors/ryo-ebata");
console.log("Report issues: https://github.com/Chazutsu/taktune/issues");
