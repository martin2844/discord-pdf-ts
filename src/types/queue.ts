export type Job = {
  id: number;
  type: number;
};

export enum JobType {
  HEALTH = 0,
  DETAILS = 1,
  RATINGS = 2,
  REVIEWS = 3,
  UPLOADER = 4,
}
