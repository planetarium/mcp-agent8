export interface Theme {
  name: string;
  displayName: string;
  description: string;
  tags: string[];
  variables?: Record<string, unknown>;
  styleFeatures?: Record<string, unknown>;
  fontMappings?: Record<string, unknown>;
}

export interface ThemeList {
  themes: Theme[];
}
