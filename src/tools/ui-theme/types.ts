export interface Theme {
  name: string;
  displayName: string;
  description: string;
  tags: string[];
  ":root"?: Record<string, string>;
  styleFeatures?: Record<string, string>;
  fonts?: {
    body?: string;
    headings?: string;
    accent?: string;
    buttons?: string;
    resources?: {
      googleFonts?: string[];
      imports?: string[];
    };
  };
}

export interface ThemeList {
  themes: Theme[];
}
