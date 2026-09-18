import { chmodSync, mkdtempSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { YtDlpExtractor } from "./extractor";

test("uses the Android YouTube client when downloading YouTube Music tracks", async () => {
  const dir = mkdtempSync(join(tmpdir(), "extractor-ytm-"));
  const binary = join(dir, "fake-yt-dlp");
  const argsFile = join(dir, "args");
  await writeFile(
    binary,
    `#!/usr/bin/env bun
const args = Bun.argv.slice(2);
await Bun.write(${JSON.stringify(argsFile)}, args.join("\\n"));
const outputIndex = args.indexOf("-o") + 1;
const output = args[outputIndex];
await Bun.write(output, "fake audio");
console.log(output);
`,
  );
  chmodSync(binary, 0o755);

  await new YtDlpExtractor({ binary }).extract("ytm:abc", dir);

  const args = await readFile(argsFile, "utf8");
  expect(args).toContain("--extractor-args\nyoutube:player_client=android\n");
});
