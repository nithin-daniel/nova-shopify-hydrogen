import { useRouteLoaderData } from "react-router";
import type { loader } from "~/root";

export type RootLoaderData = Awaited<ReturnType<typeof loader>>;

export function useRootData() {
  return useRouteLoaderData("root") as RootLoaderData | undefined;
}
