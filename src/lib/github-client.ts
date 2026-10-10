import { z } from "zod";
import { getContributionYearRange, makeCalendarDays } from "./contribution-calendar";
import { dailyContributionsSchema, type ContributionCalendar } from "./github-schemas";

// Shared with the standalone stats script; this module cannot import server-only.
export interface GitHubContributionConfig {
  username: string;
  token: string;
  repository?: string;
}

export type DocumentationContributionConfig = GitHubContributionConfig & { repository: string };

interface GitHubRequest<T> {
  url: string;
  schema: z.ZodType<T>;
  method?: "GET" | "POST";
  body?: string;
}

interface GraphQLRequest<T> {
  query: string;
  variables: object;
  schema: z.ZodType<T>;
}

export const GITHUB_PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 20_000;
const graphQLEnvelopeSchema = z.object({
  data: z.unknown(),
  errors: z.array(z.unknown()).optional(),
});

export class GitHubContributionError extends Error {
  constructor(options?: ErrorOptions) {
    super("GitHub contribution data is temporarily unavailable.", options);
  }
}

export function getGitHubConfig(): GitHubContributionConfig | null {
  const username = process.env.GITHUB_USERNAME?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!username || !token || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    return null;
  }

  const repository = process.env.GITHUB_DOCUMENTATION_REPO?.trim();
  return {
    username,
    token,
    repository: repository && /^[a-z\d-]+\/[a-z\d_.-]+$/i.test(repository) ? repository : undefined,
  };
}

export async function graphQL<T>(
  config: GitHubContributionConfig,
  request: GraphQLRequest<T>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const { data: envelope } = await requestGitHub(config, {
    url: "https://api.github.com/graphql",
    method: "POST",
    body: JSON.stringify({ query: request.query, variables: request.variables }),
    schema: graphQLEnvelopeSchema,
  }, fetcher);

  if (!envelope.data || envelope.errors?.length) throw new GitHubContributionError();
  return parseGitHubResponse(request.schema, envelope.data);
}

export async function requestGitHub<T>(
  config: GitHubContributionConfig,
  request: GitHubRequest<T>,
  fetcher: typeof fetch = fetch,
): Promise<{ data: T; headers: Headers }> {
  let response: Response;
  let body: unknown;

  try {
    response = await fetcher(request.url, {
      method: request.method ?? "GET",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: request.body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new GitHubContributionError();
    body = await response.json();
  } catch (error) {
    if (error instanceof GitHubContributionError) throw error;
    throw new GitHubContributionError({ cause: error });
  }

  return { data: parseGitHubResponse(request.schema, body), headers: response.headers };
}

export async function fetchDailyContributionTotals(
  config: GitHubContributionConfig,
  year: number,
  today: string,
  fetcher: typeof fetch = fetch,
) {
  const { from, to } = getContributionYearRange(year, today);
  const result = await graphQL(config, {
    query: `query DailyContributionTotals($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar { weeks { contributionDays { date contributionCount } } }
        }
      }
    }`,
    variables: { login: config.username, from, to },
    schema: dailyContributionsSchema,
  }, fetcher);

  return readContributionTotals(result.user.contributionsCollection.contributionCalendar, year, today);
}

export function readContributionTotals(calendar: ContributionCalendar, year: number, today: string) {
  const totals = new Map<string, number>();
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      if (totals.has(day.date)) throw new GitHubContributionError();
      totals.set(day.date, day.contributionCount);
    }
  }
  // Missing days must never become zero activity or truncate a streak.
  if (makeCalendarDays(year, today).some((date) => !totals.has(date))) {
    throw new GitHubContributionError();
  }

  return totals;
}

function parseGitHubResponse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new GitHubContributionError({ cause: result.error });
  return result.data;
}
