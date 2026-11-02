import "server-only";

/**
 * Asks GitHub to rebuild the static copy of the site right after the admin
 * publishes. Needs GITHUB_PAGES_TOKEN (fine-grained token for the repository
 * with "Contents: read and write"). Without it the copy still catches up on
 * its own: the workflow checks for new content every 10 minutes.
 */
export async function requestPagesRebuild(): Promise<boolean | null> {
  const token = process.env.GITHUB_PAGES_TOKEN;
  if (!token) return null;
  const repo = process.env.GITHUB_PAGES_REPO || "MisterHarryX/icg";
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ event_type: "content-published" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) console.error("[pages] rebuild request failed", response.status, await response.text());
    return response.ok;
  } catch (error) {
    console.error("[pages] rebuild request failed", error);
    return false;
  }
}
