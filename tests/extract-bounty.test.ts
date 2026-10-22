import { describe, expect, test } from "bun:test"
import { extractBounty } from "../lib/extractBounty"
import {
  type Issue,
  formatIssueLine,
  formatIssueMessage,
} from "../scripts/issue-notifications"

describe("extractBounty", () => {
  test("extracts bounty from Algora bot header markdown", () => {
    const comments = [
      {
        user: { login: "algora-pbc[bot]" },
        body: "## 💎 $50 bounty [⚡ tscircuit](https://console.algora.io/org/tscircuit)\n\n### Steps to solve...",
      },
    ]
    expect(extractBounty(comments)).toBe("$50")
  })

  test("extracts bounty from maintainer slash command comment", () => {
    const comments = [
      {
        user: { login: "seveibar" },
        body: "Let's put a bounty on this.\n\n/bounty $75",
      },
    ]
    expect(extractBounty(comments)).toBe("$75")
  })

  test("extracts bounty from slash command without leading dollar sign", () => {
    const comments = [
      {
        user: { login: "seveibar" },
        body: "/bounty 100",
      },
    ]
    expect(extractBounty(comments)).toBe("$100")
  })

  test("extracts bounty from Algora link style text", () => {
    const comments = [
      {
        user: { login: "algora-pbc[bot]" },
        body: "A $25 bounty has been placed on this issue.",
      },
    ]
    expect(extractBounty(comments)).toBe("$25")
  })

  test("extracts bounty from issue body when comments have none", () => {
    const issueBody = "We need this tutorial completed.\n\n/bounty $60"
    expect(extractBounty([], issueBody)).toBe("$60")
  })

  test("returns null when no bounty is present in comments or body", () => {
    const comments = [
      {
        user: { login: "contributor1" },
        body: "I am taking a look at this bug now.",
      },
    ]
    const issueBody = "Fix component margin alignment."
    expect(extractBounty(comments, issueBody)).toBeNull()
  })
})

describe("formatIssueLine & formatIssueMessage", () => {
  test("formats issue with bounty tag", () => {
    const issue: Issue = {
      number: 44,
      title: "ESP32 PCB Layout",
      html_url: "https://github.com/tscircuit/docs/issues/44",
      user: { login: "seveibar" },
      created_at: "2026-10-22T20:00:00Z",
      bounty: "$60",
    }
    expect(formatIssueLine(issue)).toBe(
      "• #44 ESP32 PCB Layout [💎 $60] by seveibar - <https://github.com/tscircuit/docs/issues/44>",
    )
  })

  test("formats issue without bounty cleanly", () => {
    const issue: Issue = {
      number: 12,
      title: "Bug in schematic viewer",
      html_url: "https://github.com/tscircuit/viewer/issues/12",
      user: { login: "alice" },
      created_at: "2026-10-22T20:00:00Z",
      bounty: null,
    }
    expect(formatIssueLine(issue)).toBe(
      "• #12 Bug in schematic viewer by alice - <https://github.com/tscircuit/viewer/issues/12>",
    )
  })

  test("formats whole message header and joined issue lines", () => {
    const issues: Issue[] = [
      {
        number: 1,
        title: "First issue",
        html_url: "https://github.com/tscircuit/core/issues/1",
        user: { login: "bob" },
        created_at: "2026-10-22T20:00:00Z",
        bounty: "$50",
      },
      {
        number: 2,
        title: "Second issue",
        html_url: "https://github.com/tscircuit/core/issues/2",
        user: { login: "carol" },
        created_at: "2026-10-22T20:01:00Z",
        bounty: null,
      },
    ]
    const msg = formatIssueMessage(issues, "tscircuit/core")
    expect(msg).toBe(
      "New issues in tscircuit/core:\n" +
        "• #1 First issue [💎 $50] by bob - <https://github.com/tscircuit/core/issues/1>\n" +
        "• #2 Second issue by carol - <https://github.com/tscircuit/core/issues/2>",
    )
  })
})
