#!/usr/bin/env bun

/**
 * Manual deploy script for vlist.io
 * Triggers the GitHub Actions deploy workflow and monitors until complete.
 *
 * Usage:
 *   bun run deploy            # deploy production (main)
 *   bun run deploy staging    # deploy staging
 */

const REPO = "floor/vlist.io"

const target = process.argv[2] as "staging" | undefined
const workflow = target === "staging" ? "deploy-staging.yml" : "deploy.yml"
const label = target === "staging" ? "staging.vlist.io" : "vlist.io"

async function run(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })
  const out = await new Response(proc.stdout).text()
  const err = await new Response(proc.stderr).text()
  const code = await proc.exited
  if (code !== 0) throw new Error(`Command failed: ${cmd.join(" ")}\n${err}`)
  return out.trim()
}

async function main(): Promise<void> {
  console.log(`\nDeploying ${label}...\n`)

  // Trigger workflow
  const url = await run(["gh", "workflow", "run", workflow, "--repo", REPO])
  if (url) console.log(url)

  // Wait a moment for the run to register
  await Bun.sleep(2000)

  // Find the run ID
  const list = await run([
    "gh", "run", "list",
    "--workflow", workflow,
    "--repo", REPO,
    "--limit", "1",
    "--json", "databaseId,status,conclusion",
  ])
  const [latest] = JSON.parse(list) as { databaseId: number; status: string; conclusion: string }[]
  if (!latest) {
    console.error("Could not find workflow run")
    process.exit(1)
  }

  const runId = latest.databaseId
  console.log(`Run #${runId} — watching...\n`)

  // Poll until complete
  const start = Date.now()
  const timeout = 5 * 60 * 1000 // 5 minutes

  while (Date.now() - start < timeout) {
    const json = await run([
      "gh", "run", "view", String(runId),
      "--repo", REPO,
      "--json", "status,conclusion",
    ])
    const { status, conclusion } = JSON.parse(json) as { status: string; conclusion: string }

    if (status === "completed") {
      if (conclusion === "success") {
        console.log(`Deployed ${label} successfully.\n`)
        return
      }
      console.error(`Deploy failed (${conclusion}).`)
      console.error(`https://github.com/${REPO}/actions/runs/${runId}`)
      process.exit(1)
    }

    await Bun.sleep(3000)
  }

  console.error("Timed out waiting for deploy.")
  process.exit(1)
}

main()
