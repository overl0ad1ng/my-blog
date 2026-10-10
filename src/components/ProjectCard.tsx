import Link from "next/link";
import EmptyImage from "./EmptyImage";

interface ProjectCard {
  logo: string;
  screenshot: string;
  title: string;
  href: string;
  date: string;
  tags: string[];
}

export default function ProjectCard({ logo, screenshot, title, tags, href, date }: ProjectCard) {
  return (
    <Link href={href} className="p-3 border border-neutral-800 rounded-2xl overflow-hidden relative hover:bg-white/2 duration-200 ease-out">
      <div className="h-42">
        <div className="bg-neutral-800 rounded-xl w-fit">
          {/* eslint-disable-next-line */}
          <img src={logo} className="size-12" />
        </div>

        <span className="absolute right-3 text-xs text-neutral-500 font-mono top-3">{date}</span>

        <div className="mt-2 space-y-2">
          <h2 className="text-xl font-medium">
            {title}
          </h2>
          <div className="flex gap-2 flex-wrap w-[38%]">
            {tags.map((t) => (
              <span key={t} className="text-xs px-1.5 py-0.5 rounded-md border border-neutral-700 text-neutral-300">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="w-64 absolute -right-12 -bottom-18">
          {
            screenshot === "NONE" ? (
              <EmptyImage className="aspect-[4/3]" />
            ) : (
              <>
                {/* eslint-disable-next-line */}
                <img src={screenshot} />
              </>
            )
          }
        </div>
      </div>
    </Link>
  )
}
