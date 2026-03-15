export type ContentItem = {
  _id: string;
  type: string;
  title?: string;
  content?: string;
  link?: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  userId:
    | string
    | {
        _id: string;
        username: string;
      };
};

export type PublicBrainResponse = {
  username?: string;
  content: ContentItem[];
};
