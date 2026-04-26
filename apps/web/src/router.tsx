import { createRouter } from "@tanstack/react-router";
import { Route as RootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";
import { Route as ProjectRoute } from "./routes/project";

const routeTree = RootRoute.addChildren([IndexRoute, ProjectRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
