export interface CommentLike {
  user?: {
    login?: string
  } | null
  body?: string | null
}

/**
 * Extracts the bounty amount from an issue's Algora bot comments or issue body.
 * Supports:
 * - Algora bot comment headers: "## 💎 $50 bounty"
 * - Algora bot formatted links: "bounty $50"
 * - Maintainer /bounty commands: "/bounty $50" or "/bounty 50"
 */
export function extractBounty(
  comments: CommentLike[] = [],
  issueBody?: string | null,
): string | null {
  // 1. Check comments from algora-pbc or containing bounty patterns
  for (const comment of comments) {
    const body = comment.body || ""
    if (!body) continue

    // Pattern A: Algora bot header "## 💎 $50 bounty" or "💎 $50 bounty"
    const algoraHeaderMatch = body.match(/💎\s*\$?(\d+(?:\.\d+)?)\s*bounty/i)
    if (algoraHeaderMatch) {
      return `$${algoraHeaderMatch[1]}`
    }

    // Pattern B: Slash bounty command "/bounty $50" or "/bounty 50"
    const slashMatch = body.match(/\/bounty\s+\$?(\d+(?:\.\d+)?)/i)
    if (slashMatch) {
      return `$${slashMatch[1]}`
    }

    // Pattern C: Algora link text "$50 bounty"
    const generalMatch = body.match(/\$(\d+(?:\.\d+)?)\s+bounty/i)
    if (generalMatch) {
      return `$${generalMatch[1]}`
    }
  }

  // 2. Check issue body as fallback
  if (issueBody) {
    const bodySlashMatch = issueBody.match(/\/bounty\s+\$?(\d+(?:\.\d+)?)/i)
    if (bodySlashMatch) {
      return `$${bodySlashMatch[1]}`
    }
    const bodyGeneralMatch = issueBody.match(/\$(\d+(?:\.\d+)?)\s+bounty/i)
    if (bodyGeneralMatch) {
      return `$${bodyGeneralMatch[1]}`
    }
  }

  return null
}
