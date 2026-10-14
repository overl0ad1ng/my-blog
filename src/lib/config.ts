export interface AsideItem {
  title: string;
  slug?: string;
  draft?: boolean;
  children?: AsideItem[];
}

export interface AsideConfig {
  label: string;
  slug: string;
  showChildrenCount?: boolean;
  children?: AsideItem[];
}

export const ASIDE_CONFIG: AsideConfig[] = [
  {
    label: "Profile",
    slug: "",
    showChildrenCount: false,
    children: [
      {
        title: "",
        slug: ""
      }
    ]
  },
  {
    label: "Projects",
    slug: "projects",
    children: [
      {
        title: "My Projects",
        slug: ""
      },
      {
        title: "Code Altas",
        slug: "code-altas"
      },
      {
        title: "Rêverie",
        slug: "reverie"
      },
      {
        title: "Rêverie Pixel",
        slug: "reverie-pixel"
      }
    ]
  },
  {
    label: "Blog",
    slug: "blog",
    children: [
    {
        title: "AOCI",
        slug: "aoci"
      },
      {
        title: "教 Ai 如何写代码",
        slug: "teach-ai-how-to-coding"
      },
    ]
  },
  {
    label: "Learn",
    slug: "learn",
  },
  {
    label: "Portfolio",
    slug: "portfolio",
  },
]
