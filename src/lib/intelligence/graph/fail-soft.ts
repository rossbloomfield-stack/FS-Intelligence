export function recoverGraphFailure<T>(
  error: unknown,
  fallback: () => T,
  onError?: (error: Error) => void,
): T {
  const graphError=error instanceof Error?error:new Error(String(error));
  onError?.(graphError);
  return fallback();
}
