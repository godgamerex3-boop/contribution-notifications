import { Octokit } from "@octokit/rest"
import { type MessageCreateOptions, WebhookClient } from "discord.js"
import { extractBounty } from "../lib/extractBounty"
import { getRepos } from "../lib/getRepos"

export function getOctokit(): Octokit {
  return new Octokit({ auth: process.env.GITHUB_TOKEN })
}

export function getDiscordWebhook(): WebhookClient | null {
  const url = process.env.ISSUES_DISCORD_WEBHOOK_URL
  if (!url) return null
  try {
    return new WebhookClient({ url })
  } catch {
    return null
  }
}

export interface Issue {
  number: number
  title: string
  html_url: string
  user: {
    login: string
  }
  created_at: string
  body?: string | null
  bounty?: string | null
}

export function formatIssueLine(issue: Issue): string {
  const bountyTag = issue.bounty ? ` [💎 ${issue.bounty}]` : ""
  return `• #${issue.number} ${issue.title}${bountyTag} by ${issue.user.login} - <${issue.html_url}>`
}

export function formatIssueMessage(issues: Issue[], repo: string): string {
  return `New issues in ${repo}:\n${issues.map(formatIssueLine).join("\n")}`
}

export async function getIssueBounty(
  owner: string,
  repoName: string,
  issueNumber: number,
  issueBody?: string | null,
  octokitInstance?: Octokit,
): Promise<string | null> {
  if (issueBody) {
    const fromBody = extractBounty([], issueBody)
    if (fromBody) return fromBody
  }
  try {
    const octokit = octokitInstance || getOctokit()
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      per_page: 20,
    })
    return extractBounty(comments, issueBody)
  } catch {
    return null
  }
}

export async function getRecentIssues(
  repo: string,
  octokitInstance?: Octokit,
): Promise<Issue[]> {
  const [owner, repoName] = repo.split("/")
  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const octokit = octokitInstance || getOctokit()

  const { data } = await octokit.issues.listForRepo({
    owner,
    repo: repoName,
    state: "open",
    since: sixtyMinutesAgo,
    sort: "created",
    direction: "desc",
  })

  const rawIssues = data.filter(
    (issue) =>
      !issue.pull_request &&
      new Date(issue.created_at) >= new Date(sixtyMinutesAgo),
  )

  const issues: Issue[] = await Promise.all(
    rawIssues.map(async (item) => {
      const bounty = await getIssueBounty(
        owner,
        repoName,
        item.number,
        item.body,
        octokit,
      )
      return {
        number: item.number,
        title: item.title,
        html_url: item.html_url,
        user: {
          login: item.user?.login || "unknown",
        },
        created_at: item.created_at,
        body: item.body,
        bounty,
      }
    }),
  )

  return issues
}

export async function notifyDiscord(issues: Issue[], repo: string) {
  if (issues.length === 0) return

  const webhook = getDiscordWebhook()
  if (!webhook) {
    console.warn(
      "ISSUES_DISCORD_WEBHOOK_URL is not set. Discord notification skipped.",
    )
    return
  }

  const messageContent = formatIssueMessage(issues, repo)

  const messageOptions: MessageCreateOptions = {
    content: messageContent,
    allowedMentions: { parse: [] },
  }

  await webhook.send(messageOptions)
}

async function main() {
  const repos = await getRepos()
  const allIssues: { [repo: string]: Issue[] } = {}

  for (const repo of repos) {
    console.log(`Checking issues for ${repo}`)
    try {
      const recentIssues = await getRecentIssues(repo)
      if (recentIssues.length > 0) {
        allIssues[repo] = recentIssues
      }
    } catch (err) {
      console.error(`Failed to fetch issues for ${repo}:`, err)
    }
  }

  for (const [repo, issues] of Object.entries(allIssues)) {
    try {
      await notifyDiscord(issues, repo)
    } catch (err) {
      console.error(`Failed to notify Discord for ${repo}:`, err)
    }
  }
}

if (process.env.NODE_ENV !== "test" && typeof Bun === "undefined") {
  main().catch(console.error)
}
