export interface Task {
  id: string;
  title: string;
  description: string;
  priority: number; // 1 = High, 2 = Medium, 3 = Low
  is_completed: boolean;
}

export interface AIClickableLink {
  title: string;
  url: string;
}

export interface AIHelpData {
  explanation: string;
  clickable_links: AIClickableLink[];
  next_steps: string[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
}
