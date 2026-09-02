#!/usr/bin/env node

/**
 * Pushing for the release scripts.
 *
 * `git push` on its own resolves credentials through the repo's helper, which on
 * Windows means whichever account Credential Manager happens to hold — not
 * necessarily one with write access. The GitHub API half of a release, meanwhile,
 * authenticates with `GH_TOKEN`. When those two identities differ the release
 * publishes an installer while `origin/main` silently stays behind, and the
 * desktop app (which loads the deployed site, not its own bundle) keeps serving
 * the previous UI.
 *
 * Pushing over an explicit token URL puts both halves of a release on one
 * credential.
 */

const { execSync } = require('child_process')

/** Strips `user:secret@` userinfo so git's output is safe to log. */
function redact(text) {
  return String(text ?? '').replace(/https:\/\/[^@\s/]+@/g, 'https://***@')
}

/**
 * Pushes `HEAD` to `branch`. Uses `token` when present, otherwise falls back to
 * `origin` and whatever the credential helper provides.
 *
 * @param {object} opts
 * @param {string} opts.cwd Repository root.
 * @param {string} opts.owner GitHub owner, e.g. `coffee4433`.
 * @param {string} opts.repo Repository name.
 * @param {string} [opts.token] Token with push access; `GH_TOKEN` by default.
 * @param {string} [opts.branch] Target branch, `main` by default.
 * @throws {Error} With a redacted `message`, so callers can log it verbatim.
 */
function pushToGitHub({ cwd, owner, repo, token = process.env.GH_TOKEN, branch = 'main' }) {
  const remote = token
    ? `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
    : 'origin'

  try {
    execSync(`git push ${remote} HEAD:${branch}`, { cwd, stdio: 'pipe' })
  } catch (err) {
    const detail = redact(err.stderr?.toString() || err.message).trim()
    throw new Error(detail || 'git push failed')
  }

  // Pushing to an explicit URL leaves `refs/remotes/origin/*` untouched, so the
  // repo would still report the branch as unpushed. Sync it, best-effort: the
  // push already succeeded and a stale tracking ref is not worth failing over.
  if (token) {
    try {
      execSync(`git fetch origin ${branch}`, { cwd, stdio: 'pipe' })
    } catch {
      // Tracking ref stays stale; `git fetch` will catch up later.
    }
  }
}

module.exports = { pushToGitHub, redact }
