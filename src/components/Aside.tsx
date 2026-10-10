"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { containsActiveItem, resolveAsideConfig, type NavigationItem } from "@/lib/navigation";
import { cn } from "cn";

const { navigation } = resolveAsideConfig();

function AsideItem({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const [expanded, setExpanded] = useState(() => containsActiveItem(item, pathname));
  const childrenId = useId();
  const hasChildren = item.children.length > 0;
  const active = item.href === pathname;

  const rowClassName = `flex min-w-0 flex-1 items-center gap-2 rounded text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 ${active ? "text-white" : "text-neutral-400 hover:text-white"}`;

  const label = (
    <>
      <span className="truncate">{item.title}</span>
      {item.showChildrenCount && <span className="ml-auto text-xs text-neutral-500">{item.children.length}</span>}
    </>
  );

  return (
    <li>
      <div className="flex items-center gap-1">
        {item.href !== undefined ? (
          <Link href={item.href} aria-current={active ? "page" : undefined} className={rowClassName}>{label}</Link>
        ) : (
          <button
            type="button"
            aria-label={item.title}
            className={cn(rowClassName, "cursor-pointer")}
            disabled={!hasChildren}
            aria-expanded={hasChildren ? expanded : undefined}
            aria-controls={hasChildren ? childrenId : undefined}
            onClick={() => setExpanded((value) => !value)}
          >
            {label}
          </button>
        )}
        {hasChildren && item.href !== undefined && (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${item.title}`}
            aria-expanded={expanded}
            aria-controls={childrenId}
            className="shrink-0 rounded p-1 text-neutral-500 hover:text-white focus-visible:outline-2 focus-visible:outline-neutral-400"
            onClick={() => setExpanded((value) => !value)}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={`size-3 transition-transform ${expanded ? "rotate-90" : ""}`}>
              <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        )}
      </div>
      {hasChildren && (
        <ul id={childrenId} hidden={!expanded} className="ml-3 mt-2 space-y-1 pl-2">
          {item.children.map((child) => <AsideItem key={`${child.id}:${pathname}`} item={child} pathname={pathname} />)}
        </ul>
      )}
    </li>
  );
}

export default function Aside() {
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  return (
    <aside className="w-64 shrink-0 px-4 py-6">
      <nav aria-label="Content navigation">
        <ul className="space-y-2">
          {navigation.map((item) => <AsideItem key={`${item.id}:${pathname}`} item={item} pathname={pathname} />)}
        </ul>
      </nav>
    </aside>
  );
}
