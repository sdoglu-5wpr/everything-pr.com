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
        { title: "Everything PR News | Public Relations, Marketing & Social Me" },
        { name: "description", content: "Everything-PR is the leading PR industry news publication covering public relations, marketing, social media, crisis communications, and agency news." },
        { property: "og:title", content: "Everything PR News | Public Relations, Marketing & Social Me" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: "Everything PR News | Public Relations, Marketing & Social Me" },
        { property: "og:description", content: "Everything-PR is the leading PR industry news publication covering public relations, marketing, social media, crisis communications, and agency news." },
        { name: "twitter:description", content: "Everything-PR is the leading PR industry news publication covering public relations, marketing, social media, crisis communications, and agency news." },
        { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d2c369e7-117a-4c91-bb9a-716480229dd3/id-preview-3101261f--26a01a69-d9fa-41da-8ffc-c4df18505710.lovable.app-1778084540921.png" },
        { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d2c369e7-117a-4c91-bb9a-716480229dd3/id-preview-3101261f--26a01a69-d9fa-41da-8ffc-c4df18505710.lovable.app-1778084540921.png" },
      ],
      scripts: [
        { src: "https://www.googletagmanager.com/gtag/js?id=G-J4JVYHGJXG", async: true },
        {
          children:
            "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-J4JVYHGJXG');",
        },
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
