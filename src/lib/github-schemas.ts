import { z } from "zod";

const countSchema = z.int().nonnegative();
const timestampSchema = z.iso.datetime({ offset: true });
const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().min(1).nullable(),
});

export const contributionCalendarSchema = z.object({
  weeks: z.array(z.object({
    contributionDays: z.array(z.object({
      date: z.iso.date(),
      contributionCount: countSchema,
    })),
  })),
});

export const dailyContributionsSchema = z.object({
  user: z.object({
    contributionsCollection: z.object({ contributionCalendar: contributionCalendarSchema }),
  }),
});

export const contributionYearsSchema = z.object({
  user: z.object({
    contributionsCollection: z.object({ contributionYears: z.array(z.int()) }),
  }),
});

export const contributionCollectionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    contributionsCollection: z.object({
      contributionCalendar: contributionCalendarSchema,
      commitContributionsByRepository: z.array(z.object({
        repository: z.object({ nameWithOwner: z.string().min(1) }),
        contributions: z.object({
          nodes: z.array(z.object({ occurredAt: timestampSchema, commitCount: countSchema })),
          totalCount: countSchema,
          pageInfo: pageInfoSchema,
        }),
      })),
    }),
  }),
});

const branchSchema = z.object({ target: z.object({ oid: z.string().min(1) }) }).nullable();

export const documentationRepositorySchema = z.object({
  repository: z.object({
    isFork: z.boolean(),
    defaultBranchRef: branchSchema,
    pages: branchSchema,
  }),
});

export const documentationHistorySchema = z.object({
  repository: z.object({
    object: z.object({
      history: z.object({
        nodes: z.array(z.object({ oid: z.string().min(1), authoredDate: timestampSchema })),
        pageInfo: pageInfoSchema,
      }),
    }),
  }),
});

export const commitFilesSchema = z.object({
  files: z.array(z.object({
    filename: z.string(),
    previous_filename: z.string().optional(),
  })),
});

export type ContributionCalendar = z.infer<typeof contributionCalendarSchema>;
export type ContributionCollection = z.infer<typeof contributionCollectionSchema>["user"]["contributionsCollection"];
export type RepositoryContributions = ContributionCollection["commitContributionsByRepository"][number];
export type DocumentationHistoryResponse = z.infer<typeof documentationHistorySchema>;
export type HistoryCommit = DocumentationHistoryResponse["repository"]["object"]["history"]["nodes"][number];
