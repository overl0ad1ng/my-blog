import { ASIDE_CONFIG, type AsideConfig, type AsideItem } from "./config";

export interface NavigationItem {
  id: string;
  title: string;
  href?: string;
  showChildrenCount?: boolean;
  children: NavigationItem[];
}

export interface DocEntry {
  title: string;
  segments: string[];
  file: string;
}

interface NavigationParent {
  segments: string[];
  title: string;
  id: string;
  draft: boolean;
}

interface NavigationResolution {
  docs: DocEntry[];
  blocked: Set<string>;
}

export function isValidSegment(segment: string): boolean {
  return segment.length > 0 && segment !== "." && segment !== ".." &&
    !/[\\/:*?"<>|#%\u0000-\u001f]/u.test(segment);
}

export function getHref(segments: string[]): string {
  return `/${segments.map(encodeURIComponent).join("/")}`;
}

// Shared by the client navigation and the server content reader.
export function resolveAsideConfig(config: AsideConfig[] = ASIDE_CONFIG) {
  const resolution: NavigationResolution = { docs: [], blocked: new Set() };
  const navigation = config.map((group, index) => resolveGroup(group, index, resolution));
  return {
    navigation: filterBlocked(navigation, resolution.blocked),
    docs: resolution.docs.filter((doc) => !resolution.blocked.has(getHref(doc.segments))),
  };
}

export function containsActiveItem(item: NavigationItem, pathname: string): boolean {
  return item.href === pathname || item.children.some((child) => containsActiveItem(child, pathname));
}

function resolveGroup(group: AsideConfig, index: number, resolution: NavigationResolution): NavigationItem {
  const segments = appendSlug([], group.slug);
  const id = String(index);
  const children = visitItems(group.children ?? [], { segments, title: group.label, id, draft: false }, resolution);
  const onlyChild = group.children?.length === 1 ? group.children[0] : undefined;
  const directLink = onlyChild?.slug === "" && !onlyChild.draft;
  return {
    id,
    title: group.label,
    href: directLink ? getHref(segments) : undefined,
    showChildrenCount: group.showChildrenCount ?? true,
    children: directLink ? [] : children,
  };
}

function visitItems(items: AsideItem[], parent: NavigationParent, resolution: NavigationResolution): NavigationItem[] {
  return items.flatMap((item, index) => {
    const id = `${parent.id}-${index}`;
    const segments = appendSlug(parent.segments, item.slug);
    const draft = parent.draft || item.draft === true;
    const title = item.title || parent.title;
    const href = item.slug === undefined ? undefined : getHref(segments);
    if (href !== undefined) {
      registerDoc({ title, segments, file: [...segments, ...(item.slug === "" ? ["index"] : [])].join("/") + ".mdx" }, draft, resolution);
    }

    const children = visitItems(item.children ?? [], { segments, title, id, draft }, resolution);
    if (draft || item.title === "") return [];
    return [{ id, title, href, children }];
  });
}

function registerDoc(doc: DocEntry, draft: boolean, resolution: NavigationResolution) {
  if (draft) {
    resolution.blocked.add(getHref(doc.segments));
    return;
  }
  resolution.docs.push(doc);
}

function appendSlug(parent: string[], slug?: string): string[] {
  const segments = slug ? slug.split("/") : [];
  if (!segments.every(isValidSegment)) throw new Error(`Invalid AsideConfig slug: ${slug}`);
  return [...parent, ...segments];
}

function filterBlocked(items: NavigationItem[], blocked: Set<string>): NavigationItem[] {
  return items.flatMap((item) => {
    if (item.href !== undefined && blocked.has(item.href)) return [];
    return [{ ...item, children: filterBlocked(item.children, blocked) }];
  });
}
