export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | {
      success: false;
      data: null;
      error: { code: string; message: string; details: unknown };
    };
