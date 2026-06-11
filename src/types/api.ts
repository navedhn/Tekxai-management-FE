export type ApiListPayload<T> = T[] | { records: T[] };

export type ApiResponse<T> = {
  payload?: T;
  message?: string;
  status?: number;
};

export type ApiError = {
  status: number;
  message: string;
  data?: unknown;
};
