import { Fragment } from "react/jsx-runtime"
import { Suspense } from "react"
import Image from "next/image"
import ProfileContributions from "@/components/ProfileContributions"
import { getProfileStats } from "@/lib/profile-stats"
import { formatProfileNumber } from "@/lib/profile-stats-data"
import { Mailbox } from "reicon-react";
import Link from "next/link"
import { SiX } from "@icons-pack/react-simple-icons";

const skills = [
  ["TypeScript", "#3178C6"],
  ["JavaScript", "#F7DF1E", "var(--color-neutral-800)"],
  ["React", "#61DAFB", "var(--color-neutral-800)"],
  ["Next.js", "#000000"],
  ["Tailwindcss", "#06B6D4"],
  ["Rust", "#000000"],
  ["Node.js", "#5FA04E"],
  [".NET", "#512BD4"],
  ["Github", "#000000"],
  ["GoDot Engine", "#478CBF"],
  ["Figma", "#F24E1E"],
]

export default async function Profile() {
  const stats = await getProfileStats()

  const info = [
    {
      value: formatProfileNumber(stats.articles),
      label: "Written Articles",
    },
    {
      value: formatProfileNumber(stats.words),
      label: "Written Words",
    },
    {
      value: formatProfileNumber(stats.projects),
      label: "Projects",
    },
    {
      value: stats.currentStreak === null ? "—" : `${stats.currentStreak} days`,
      label: "Current Streak",
    },
    {
      value: `${stats.longestStreak} days`,
      label: "Longest Streak",
    }
  ]

  const contacts = [
    {
      icon: <Mailbox />,
      href: "mailto:hi@overl0ad1ng.com",
    },
    {
      icon: <SiX size={20} />,
      href: "https://x.com/kyomu520",
    },
  ]

  return (
    <div className="w-full pt-12 font-sans space-y-6">
      <div className="w-full h-full flex-col flex items-center justify-center">
        <Image src="/avatar.png" alt="Izayoi Kyomu" width={96} height={96} loading="eager" className="rounded-full size-24" />
        <h1 className="pt-6 text-2xl font-medium">
          Izayoi Kyomu
        </h1>
        <span className="text-sm text-neutral-400 pt-1">
          @overl0ad1ng
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        {info.map((i, _i) => (
          <Fragment key={i.label}>
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-sm text-neutral-100">
                {i.value}
              </p>
              <p className="text-xs text-neutral-400">
                {i.label}
              </p>
            </div>
            {_i + 1 !== info.length && (
              <p className="h-8 w-px bg-neutral-800" />
            )}
          </Fragment>
        ))}
      </div>
      <Suspense fallback={<p role="status" className="w-full py-4 text-center text-sm text-neutral-400">Loading contributions…</p>}>
        <ProfileContributions />
      </Suspense>
      <div className="pt-6">
        <div className="flex w-full items-center justify-between">
          <p>
            Skills
          </p>
          <p className="text-xs text-neutral-400">
            Proficient in {skills.length} skills
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-4">
          {
            skills.map((s) => (
              <div
                key={s[0]}
                className="rounded-lg text-sm overflow-hidden px-2.5 py-1"
                style={{
                  backgroundColor: s[1],
                  color: s[2]
                }}
              >
                <span className="text-shadow-md">
                  {s[0]}
                </span>
              </div>
            ))
          }
        </div>
      </div>
      <div className="pt-2">
        <div className="flex w-full items-center justify-between">
          <p>
            Connection
          </p>
        </div>
        <div className="mt-4 bg-white/3 flex items-center gap-2 w-full p-2 rounded-2xl">
          {contacts.map((c) => (
            <Link key={c.href} className="size-14 bg-neutral-800 hover:bg-neutral-800/60 text-neutral-200 duration-200 ease-out rounded-xl flex items-center justify-center" href={c.href}>
              {c.icon}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
