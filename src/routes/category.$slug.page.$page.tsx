import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/category/$slug/page/$page")({
  loader: ({ params }) => {
    const page = parseInt(params.page, 10);
    const target = Number.isFinite(page) && page > 1
      ? `/${params.slug}?page=${page}`
      : `/${params.slug}`;
    throw redirect({ href: target, statusCode: 301 });
  },
  component: () => null,
});
