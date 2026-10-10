import "server-only";

import { getContributionYearRange, getUTCDate, isContributionYear, mergeContributionDays, touchesDocumentation } from "./contribution-calendar";
import {
  GITHUB_PAGE_SIZE,
  GitHubContributionError,
  graphQL,
  readContributionTotals,
  requestGitHub,
  type DocumentationContributionConfig,
  type GitHubContributionConfig,
} from "./github-client";
import {
  commitFilesSchema,
  contributionCollectionSchema,
  contributionYearsSchema,
  documentationHistorySchema,
  documentationRepositorySchema,
  type ContributionCollection,
  type DocumentationHistoryResponse,
  type HistoryCommit,
  type RepositoryContributions,
} from "./github-schemas";

export { GitHubContributionError, type GitHubContributionConfig } from "./github-client";

interface DocumentationClient {
  config: DocumentationContributionConfig;
  fetcher: typeof fetch;
}

interface DocumentationRequest extends DocumentationClient {
  userId: string;
  year: number;
  today: string;
  collection: ContributionCollection;
}

type DatedCommit = { oid: string; date: string };
const MAX_REPOSITORIES = 100;
const MAX_CHANGED_FILES = 3000;
const COMMIT_REQUEST_CONCURRENCY = 4;
const COLLECTION_QUERY = `query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    id
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
      commitContributionsByRepository(maxRepositories: ${MAX_REPOSITORIES}) {
        repository { nameWithOwner }
        contributions(first: ${GITHUB_PAGE_SIZE}) {
          totalCount nodes { occurredAt commitCount } pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
}`;

export async function fetchContributionYears(
  config: GitHubContributionConfig,
  currentYear: number,
  fetcher: typeof fetch = fetch,
): Promise<number[]> {
  const result = await graphQL(config, {
    query: `query ContributionYears($login: String!) {
      user(login: $login) { contributionsCollection { contributionYears } }
    }`,
    variables: { login: config.username },
    schema: contributionYearsSchema,
  }, fetcher);

  return [...new Set([currentYear, ...result.user.contributionsCollection.contributionYears])]
    .filter((year) => isContributionYear(year, currentYear))
    .sort((first, second) => second - first);
}

export async function fetchContributions(
  config: GitHubContributionConfig,
  year: number,
  today: string,
  fetcher: typeof fetch = fetch,
) {
  const { from, to } = getContributionYearRange(year, today);
  const { id, contributionsCollection } = await fetchCollection(config, { from, to }, fetcher);
  const totals = readContributionTotals(contributionsCollection.contributionCalendar, year, today);
  const documentation = config.repository
    ? await tryDocumentationDays({
      config: { ...config, repository: config.repository },
      fetcher,
      userId: id,
      year,
      today,
      collection: contributionsCollection,
    })
    : null;

  return mergeContributionDays(year, today, totals, documentation);
}

async function fetchCollection(
  config: GitHubContributionConfig,
  range: { from: string; to: string },
  fetcher: typeof fetch,
) {
  const result = await graphQL(config, {
    query: COLLECTION_QUERY,
    variables: { login: config.username, ...range },
    schema: contributionCollectionSchema,
  }, fetcher);
  return result.user;
}

async function tryDocumentationDays(request: DocumentationRequest) {
  try {
    return await getDocumentationDays(request);
  } catch (error) {
    if (!(error instanceof GitHubContributionError)) throw error;
    // Classification failures still leave the verified GitHub calendar usable.
    return null;
  }
}

async function getDocumentationDays(request: DocumentationRequest) {
  const info = await getRepositoryInfo(request);
  const repositoryDays = await getRepositoryDays(request);
  if (!repositoryDays.size) return new Map<string, number>();
  if (info.isFork) throw new GitHubContributionError();

  const heads = [...new Set([info.defaultBranchRef?.target.oid, info.pages?.target.oid]
    .filter((head): head is string => head !== undefined))];
  if (!heads.length) throw new GitHubContributionError();

  const commits = await getUniqueYearCommits(request, heads);
  verifyRepositoryCounts(commits, repositoryDays);
  return countDocumentationCommits(request, commits);
}

async function getRepositoryInfo(client: DocumentationClient) {
  const [owner, name] = client.config.repository.split("/");
  const result = await graphQL(client.config, {
    query: `query DocumentationRepository($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        isFork
        defaultBranchRef { target { oid } }
        pages: ref(qualifiedName: "refs/heads/gh-pages") { target { oid } }
      }
    }`,
    variables: { owner, name },
    schema: documentationRepositorySchema,
  }, client.fetcher);
  return result.repository;
}

async function getRepositoryDays(request: DocumentationRequest) {
  const entry = findRepository(request.collection, request.config.repository);
  if (!entry) return new Map<string, number>();

  const nodes = entry.contributions.pageInfo.hasNextPage
    ? await getMonthlyRepositoryNodes(request)
    : entry.contributions.nodes;
  if (entry.contributions.totalCount !== nodes.length) throw new GitHubContributionError();

  const days = new Map<string, number>();
  for (const node of nodes) {
    const date = getUTCDate(new Date(node.occurredAt));
    if (days.has(date)) throw new GitHubContributionError();
    days.set(date, node.commitCount);
  }
  return days;
}

function findRepository(collection: ContributionCollection, repository: string) {
  const repositories = collection.commitContributionsByRepository;
  const repositoryName = repository.toLowerCase();
  const found = repositories.find((entry) => entry.repository.nameWithOwner.toLowerCase() === repositoryName);
  // This list has no cursor; absence at the API limit cannot prove zero activity.
  if (!found && repositories.length >= MAX_REPOSITORIES) throw new GitHubContributionError();
  return found;
}

async function getMonthlyRepositoryNodes(request: DocumentationRequest) {
  const nodes: RepositoryContributions["contributions"]["nodes"] = [];
  const lastTime = Date.parse(`${request.today}T23:59:59.999Z`);
  // A monthly bucket fits within one page without reusing aggregate cursors.
  for (let month = 0; month < 12; month++) {
    const from = new Date(Date.UTC(request.year, month, 1)).toISOString();
    if (from.slice(0, 10) > request.today) break;
    const to = new Date(Math.min(Date.UTC(request.year, month + 1, 1) - 1, lastTime)).toISOString();
    const monthly = await fetchCollection(request.config, { from, to }, request.fetcher);
    const bucket = findRepository(monthly.contributionsCollection, request.config.repository)?.contributions;
    if (!bucket) continue;
    if (bucket.pageInfo.hasNextPage || bucket.totalCount !== bucket.nodes.length) {
      throw new GitHubContributionError();
    }
    nodes.push(...bucket.nodes);
  }
  return nodes;
}

async function getUniqueYearCommits(request: DocumentationRequest, heads: string[]): Promise<DatedCommit[]> {
  const commits = new Map<string, DatedCommit>();
  for (const head of heads) {
    const history = await getAuthorHistory(request, { userId: request.userId, head });
    for (const commit of history) {
      const date = getUTCDate(new Date(commit.authoredDate));
      if (date.startsWith(`${request.year}-`) && date <= request.today) {
        commits.set(commit.oid, { oid: commit.oid, date });
      }
    }
  }
  return [...commits.values()];
}

async function getAuthorHistory(client: DocumentationClient, author: { userId: string; head: string }): Promise<HistoryCommit[]> {
  const [owner, name] = client.config.repository.split("/");
  const commits: HistoryCommit[] = [];
  let cursor: string | null = null;
  const cursors = new Set<string>();
  // Do not filter history by time: rebased commits may have a different committer year.
  while (true) {
    const result: DocumentationHistoryResponse = await graphQL(client.config, {
      query: `query DocumentationHistory($owner: String!, $name: String!, $head: String!, $author: ID!, $cursor: String) {
        repository(owner: $owner, name: $name) {
          object(expression: $head) { ... on Commit {
            history(first: ${GITHUB_PAGE_SIZE}, after: $cursor, author: { id: $author }) {
              nodes { oid authoredDate } pageInfo { hasNextPage endCursor }
            }
          } }
        }
      }`,
      variables: { owner, name, head: author.head, author: author.userId, cursor },
      schema: documentationHistorySchema,
    }, client.fetcher);
    const history = result.repository.object.history;
    commits.push(...history.nodes);
    if (!history.pageInfo.hasNextPage) return commits;

    cursor = history.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new GitHubContributionError();
    cursors.add(cursor);
  }
}

function verifyRepositoryCounts(commits: DatedCommit[], repositoryDays: Map<string, number>) {
  const authorCounts = new Map<string, number>();
  for (const commit of commits) incrementDay(authorCounts, commit.date);
  // Repository totals are authoritative; ambiguous credit must stay unclassified.
  const dates = new Set([...authorCounts.keys(), ...repositoryDays.keys()]);
  for (const date of dates) {
    if ((authorCounts.get(date) ?? 0) !== (repositoryDays.get(date) ?? 0)) {
      throw new GitHubContributionError();
    }
  }
}

async function countDocumentationCommits(client: DocumentationClient, commits: DatedCommit[]) {
  const documentation = new Map<string, number>();
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < commits.length) {
      const commit = commits[nextIndex++];
      if (await commitTouchesDocumentation(client, commit.oid)) incrementDay(documentation, commit.date);
    }
  }
  const workerCount = Math.min(COMMIT_REQUEST_CONCURRENCY, commits.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return documentation;
}

async function commitTouchesDocumentation(client: DocumentationClient, sha: string) {
  const repositoryPath = client.config.repository.split("/").map(encodeURIComponent).join("/");
  const base = `https://api.github.com/repos/${repositoryPath}/commits/${encodeURIComponent(sha)}`;
  for (let page = 1; ; page++) {
    const { data, headers } = await requestGitHub(client.config, {
      url: `${base}?per_page=${GITHUB_PAGE_SIZE}&page=${page}`,
      schema: commitFilesSchema,
    }, client.fetcher);
    if (touchesDocumentation(data.files)) return true;

    const hasNextPage = headers.get("link")?.includes('rel="next"') ?? false;
    const reachedLimit = page * GITHUB_PAGE_SIZE >= MAX_CHANGED_FILES;
    // A negative result at the changed-file cap is inconclusive.
    if (reachedLimit && (hasNextPage || data.files.length === GITHUB_PAGE_SIZE)) {
      throw new GitHubContributionError();
    }
    if (!hasNextPage) return false;
  }
}

function incrementDay(days: Map<string, number>, date: string) {
  days.set(date, (days.get(date) ?? 0) + 1);
}
