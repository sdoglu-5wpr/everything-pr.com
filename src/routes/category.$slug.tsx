import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    throw redirect({ href: `/${params.slug}`, statusCode: 301 });
  },
  component: () => null,
});
