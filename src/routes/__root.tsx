import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { getIndexingState } from "@/serverFns/indexing.functions";
import { NOINDEX_HEADER } from "@/serverFns/indexing.constants";
import { Toaster } from "@/components/ui/sonner";


import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  // Run on every route so X-Robots-Tag is set globally and indexing flag
  // is available to head().
  loader: () => getIndexingState(),
  head: ({ loaderData }) => {
    const indexing = loaderData as { enabled: boolean } | undefined;
    const robotsContent = indexing?.enabled === false ? NOINDEX_HEADER : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "robots", content: robotsContent },
        { title: "everything-pr.com" },
        { name: "description", content: "Everything-PR — news and analysis." },
        { property: "og:title", content: "everything-pr.com" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "shortcut icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/favicon.png" },
        { rel: "stylesheet", href: appCss },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    import("@/lib/server-fn-auth-install").then((m) => m.installServerFnAuth());
  }, []);
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
