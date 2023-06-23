export type Uploader = {
  uploader_id: string;
  name: string;
  avatar?: string;
  source: "discord" | "github";
};

export type PartialUploader = {
  uploader_id: string;
} & Partial<Uploader>;

export type GithubUserName = string;
