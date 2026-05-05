import { createServerFn } from "@tanstack/react-start";

export const getIndexingState = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveIndexingState } = await import("./indexing.server");
  return resolveIndexingState();
});
