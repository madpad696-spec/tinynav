export type Group = {
  id: string;
  name: string;
  order: number;
  enabled?: boolean;
};

export type Section = {
  id: string;
  groupId: string;
  name: string;
  order: number;
};

export type SiteSettings = {
  siteTitle: string;
  siteSubtitle: string;
  homeTagline: string;
  siteIconDataUrl: string;
  faviconDataUrl: string;
  siteIconFit: "contain" | "cover";
};

export type LinkItem = {
  id: string;
  groupId: string;
  sectionId?: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  order: number;
};

export type CloudNavData = {
  settings?: SiteSettings;
  groups: Group[];
  sections?: Section[];
  links: LinkItem[];
};
