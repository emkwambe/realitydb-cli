import type { SeededRandom } from '@databox/shared';
import { createSeededRandom } from '@databox/shared';
import type { SimulationEvent } from '../eventStream.js';
import { randomHex } from '../eventStream.js';

export type GitHubEventType =
  | 'push'
  | 'pull_request.opened'
  | 'pull_request.merged'
  | 'pull_request.closed'
  | 'issues.opened'
  | 'issues.closed'
  | 'release.published';

const GITHUB_EVENT_WEIGHTS: Record<GitHubEventType, number> = {
  'push': 35,
  'pull_request.opened': 15,
  'pull_request.merged': 12,
  'pull_request.closed': 5,
  'issues.opened': 15,
  'issues.closed': 10,
  'release.published': 3,
};

const REPO_NAMES = ['acme/api', 'acme/web', 'acme/mobile', 'acme/infra', 'acme/docs'];
const BRANCH_NAMES = ['main', 'develop', 'feature/auth', 'feature/dashboard', 'fix/memory-leak', 'chore/deps'];
const USER_NAMES = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank'];

export function generateGitHubWebhooks(
  count: number,
  seed: number = 42,
  startTime?: string,
): SimulationEvent[] {
  const rng = createSeededRandom(seed);
  const start = startTime ? new Date(startTime).getTime() : Date.now() - 86_400_000;
  const events: SimulationEvent[] = [];
  const entries = Object.entries(GITHUB_EVENT_WEIGHTS) as [GitHubEventType, number][];
  const totalWeight = entries.reduce((s, [, w]) => s + w, 0);

  for (let i = 0; i < count; i++) {
    const timestamp = start + Math.floor(rng.next() * 86_400_000);

    let roll = rng.next() * totalWeight;
    let eventType: GitHubEventType = 'push';
    for (const [type, weight] of entries) {
      roll -= weight;
      if (roll <= 0) {
        eventType = type;
        break;
      }
    }

    const repo = rng.pick(REPO_NAMES);
    const user = rng.pick(USER_NAMES);

    const event: SimulationEvent = {
      id: `evt_${randomHex(rng, 12)}`,
      timestamp: new Date(timestamp).toISOString(),
      source: 'github',
      type: eventType,
      correlationId: `cor_${randomHex(rng, 8)}`,
      actor: { id: user, type: 'user' },
      payload: buildGitHubPayload(eventType, repo, user, rng),
      metadata: {
        delivery: randomHex(rng, 16),
        hook_id: Math.floor(rng.next() * 900000) + 100000,
      },
    };

    events.push(event);
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events;
}

function buildGitHubPayload(
  type: GitHubEventType,
  repo: string,
  user: string,
  rng: SeededRandom,
): Record<string, unknown> {
  const branch = rng.pick(BRANCH_NAMES);
  const prNumber = Math.floor(rng.next() * 500) + 1;
  const issueNumber = Math.floor(rng.next() * 300) + 1;

  switch (type) {
    case 'push':
      return {
        ref: `refs/heads/${branch}`,
        repository: { full_name: repo },
        pusher: { name: user },
        commits: Array.from({ length: Math.floor(rng.next() * 5) + 1 }, () => ({
          id: randomHex(rng, 20),
          message: rng.pick(COMMIT_MESSAGES),
          author: { name: user },
        })),
        head_commit: { id: randomHex(rng, 20), message: rng.pick(COMMIT_MESSAGES) },
      };
    case 'pull_request.opened':
      return {
        action: 'opened',
        number: prNumber,
        pull_request: {
          title: `feat: ${rng.pick(FEATURES)}`,
          state: 'open',
          user: { login: user },
          head: { ref: branch },
          base: { ref: 'main' },
          additions: Math.floor(rng.next() * 500),
          deletions: Math.floor(rng.next() * 200),
          changed_files: Math.floor(rng.next() * 20) + 1,
        },
        repository: { full_name: repo },
      };
    case 'pull_request.merged':
      return {
        action: 'closed',
        number: prNumber,
        pull_request: {
          title: `feat: ${rng.pick(FEATURES)}`,
          state: 'closed',
          merged: true,
          user: { login: user },
          merge_commit_sha: randomHex(rng, 20),
        },
        repository: { full_name: repo },
      };
    case 'pull_request.closed':
      return {
        action: 'closed',
        number: prNumber,
        pull_request: {
          title: `chore: ${rng.pick(FEATURES)}`,
          state: 'closed',
          merged: false,
          user: { login: user },
        },
        repository: { full_name: repo },
      };
    case 'issues.opened':
      return {
        action: 'opened',
        issue: {
          number: issueNumber,
          title: `Bug: ${rng.pick(BUGS)}`,
          state: 'open',
          user: { login: user },
          labels: [rng.pick(LABELS)],
        },
        repository: { full_name: repo },
      };
    case 'issues.closed':
      return {
        action: 'closed',
        issue: {
          number: issueNumber,
          title: `Fix: ${rng.pick(BUGS)}`,
          state: 'closed',
          user: { login: user },
          closed_at: new Date().toISOString(),
        },
        repository: { full_name: repo },
      };
    case 'release.published':
      return {
        action: 'published',
        release: {
          tag_name: `v${Math.floor(rng.next() * 5) + 1}.${Math.floor(rng.next() * 20)}.${Math.floor(rng.next() * 10)}`,
          name: `Release ${rng.pick(FEATURES)}`,
          prerelease: rng.next() > 0.8,
          author: { login: user },
        },
        repository: { full_name: repo },
      };
    default:
      return { repository: { full_name: repo } };
  }
}

const COMMIT_MESSAGES = [
  'fix: resolve null pointer in auth flow', 'feat: add user dashboard widgets',
  'chore: update dependencies', 'refactor: extract validation logic',
  'docs: update API documentation', 'fix: handle edge case in payment processing',
  'feat: implement search filtering', 'test: add integration tests for export',
  'perf: optimize database queries', 'fix: correct timezone handling',
];
const FEATURES = [
  'add dark mode toggle', 'implement notification system', 'update user profile page',
  'add CSV export', 'implement rate limiting', 'add webhook retry logic',
  'update billing flow', 'add team management',
];
const BUGS = [
  'login fails on mobile Safari', 'duplicate entries in search results',
  'incorrect date formatting in reports', 'memory leak in WebSocket handler',
  'pagination broken on last page', 'email notifications not sent',
];
const LABELS = ['bug', 'enhancement', 'documentation', 'good first issue', 'priority: high', 'needs-review'];
