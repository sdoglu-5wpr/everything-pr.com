import { SITE_URL, SITE_NAME, TWITTER_HANDLE, DEFAULT_OG_IMAGE, ORG_JSONLD } from "./seo.constants";
import { htmlToPlainText } from "@/lib/text";
import { extractFaqPairs } from "@/lib/faq";
import type { ArticlePayload } from "./articles.functions";

type Meta = Array<Record<string, string>>;
type Link = Array<Record<string, string>>;
type ScriptTag = { type?: string; children?: string };
export type HeadOutput = { meta: Meta; links: Link; scripts: ScriptTag[] };

const RESEARCH_SLUGS = new Set([
  "pr-spend-transparency-study-2026",
  "ai-company-comms-study-2026",
  "the-ai-company-comms-study-2026",
  "the-foreign-influence-pr-study-2026",
  "nonprofit-pr-transparency-study-2026",
  "the-nonprofit-pr-transparency-study-2026",
  "municipal-state-pr-spend-study-2026",
  "the-municipal-state-pr-spend-study-2026",
]);

function resolvePlaceholders(
  s: string | null | undefined,
  ctx: { title: string; sitename: string; sitedesc?: string; excerpt?: string; category?: string },
): string | null {
  if (!s) return s ?? null;
  let out = s
    .replace(/%%title%%/gi, ctx.title)
    .replace(/%%sitename%%/gi, ctx.sitename)
    .replace(/%%sitedesc%%/gi, ctx.sitedesc || "")
    .replace(/%%sep%%/gi, "-")
    .replace(/%%page%%/gi, "")
    .replace(/%%pagenumber%%/gi, "")
    .replace(/%%pagetotal%%/gi, "")
    .replace(/%%excerpt(?:_only)?%%/gi, ctx.excerpt || "")
    .replace(/%%primary_category%%/gi, ctx.category || "")
    .replace(/%%category%%/gi, ctx.category || "")
    .replace(/%%[^%]+%%/g, ""); // strip any remaining unknown placeholders
  out = out.replace(/\s+-\s+-\s+/g, " - ").replace(/\s{2,}/g, " ").replace(/\s*-\s*$/g, "").trim();
  return out || null;
}

function truncate(s: string, n = 160): string {
  if (!s) return s;
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= n) return clean;
  return clean.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

function jsonLd(graph: unknown[]): ScriptTag {
  return {
    type: "application/ld+json",
    children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
  };
}

function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function buildArticleHead(article: ArticlePayload["article"]): HeadOutput {
  const a = article as any;
  const slug = article.slug;
  const isResearch = RESEARCH_SLUGS.has(slug);
  const url = `${SITE_URL}/${slug}/`;
  const plainExcerpt = htmlToPlainText(article.excerpt) || "";
  const placeholderCtx = {
    title: article.title,
    sitename: SITE_NAME,
    excerpt: plainExcerpt,
    category: article.categories?.[0]?.name || "",
  };
  const seoTitle = resolvePlaceholders(article.seo?.title, placeholderCtx);
  const seoDesc = resolvePlaceholders(article.seo?.description, placeholderCtx);
  const seoOgTitle = resolvePlaceholders(article.seo?.og_title, placeholderCtx);
  const seoOgDesc = resolvePlaceholders(article.seo?.og_description, placeholderCtx);
  const seoTwTitle = resolvePlaceholders(a.seo?.twitter_title, placeholderCtx);
  const seoTwDesc = resolvePlaceholders(a.seo?.twitter_description, placeholderCtx);

  const title = seoTitle || `${article.title} - PR News`;
  const plain = htmlToPlainText(article.content_html || "");
  const description = truncate(
    seoDesc ||
      plainExcerpt ||
      plain ||
      `${article.title} — read the full story on ${SITE_NAME}.`,
  );
  const image = article.seo?.og_image || article.featured_image?.url || DEFAULT_OG_IMAGE;
  const canonical = article.seo?.canonical_url || url;
  const primaryCategory = article.categories?.[0] ?? null;
  const tags: { name: string; slug: string }[] = a.tags ?? [];
  const author = article.author;
  const published = article.published_at ?? undefined;
  const modified = article.modified_at ?? published;
  const wordCount = plain.split(/\s+/).filter(Boolean).length;
  const minutes = readingTime(plain);

  const meta: Meta = [
    { title },
    { name: "description", content: description },
    { name: "author", content: author?.display_name || `${SITE_NAME} Editorial Team` },
    { property: "og:locale", content: "en_US" },
    { property: "og:type", content: "article" },
    { property: "og:title", content: seoOgTitle || article.title },
    { property: "og:description", content: seoOgDesc || description },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: `${SITE_NAME} News` },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: article.featured_image?.alt || article.title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:creator", content: TWITTER_HANDLE },
    { name: "twitter:title", content: seoTwTitle || article.title },
    { name: "twitter:description", content: seoTwDesc || description },
    { name: "twitter:image", content: a.seo?.twitter_image || image },
    { name: "twitter:label1", content: "Written by" },
    { name: "twitter:data1", content: author?.display_name || `${SITE_NAME} Editorial Team` },
    { name: "twitter:label2", content: "Reading time" },
    { name: "twitter:data2", content: `${minutes} min read` },
  ];
  if (published) meta.push({ property: "article:published_time", content: new Date(published).toISOString() });
  if (modified) meta.push({ property: "article:modified_time", content: new Date(modified).toISOString() });
  if (author?.slug) meta.push({ property: "article:author", content: `${SITE_URL}/author/${author.slug}/` });
  if (primaryCategory?.name) meta.push({ property: "article:section", content: primaryCategory.name });
  for (const t of tags) meta.push({ property: "article:tag", content: t.name });
  if (article.seo?.robots) meta.push({ name: "robots", content: article.seo.robots });

  const links: Link = [{ rel: "canonical", href: canonical }];

  const articleId = `${url}#article`;
  const webPageId = url;
  const imageId = `${url}#primaryimage`;
  const breadcrumbId = `${url}#breadcrumb`;
  const personId = author?.slug
    ? `${SITE_URL}/author/${author.slug}/#person`
    : `${SITE_URL}/#/schema/person/editorial`;

  const articleType = isResearch ? "Report" : "NewsArticle";
  const articleNode: Record<string, unknown> = {
    "@type": articleType,
    "@id": articleId,
    isPartOf: { "@id": webPageId },
    author: [{ "@id": personId }],
    headline: article.title,
    datePublished: published,
    dateModified: modified,
    mainEntityOfPage: { "@id": webPageId },
    wordCount,
    publisher: { "@id": `${SITE_URL}/#organization` },
    image: { "@id": imageId },
    thumbnailUrl: image,
    keywords: tags.map((t) => t.name),
    articleSection: (article.categories ?? []).map((c) => c.name),
    inLanguage: "en-US",
    description,
  };

  const webPageNode = {
    "@type": isResearch ? "ItemPage" : "WebPage",
    "@id": webPageId,
    url: canonical,
    name: title,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    primaryImageOfPage: { "@id": imageId },
    image: { "@id": imageId },
    thumbnailUrl: image,
    datePublished: published,
    dateModified: modified,
    description,
    breadcrumb: { "@id": breadcrumbId },
    inLanguage: "en-US",
    potentialAction: [{ "@type": "ReadAction", target: [canonical] }],
  };

  const imageNode = {
    "@type": "ImageObject",
    inLanguage: "en-US",
    "@id": imageId,
    url: image,
    contentUrl: image,
    caption: article.featured_image?.alt || article.title,
  };

  const breadcrumbItems: any[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
  ];
  if (primaryCategory) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: primaryCategory.name,
      item: `${SITE_URL}/category/${primaryCategory.slug}/`,
    });
    breadcrumbItems.push({ "@type": "ListItem", position: 3, name: article.title });
  } else {
    breadcrumbItems.push({ "@type": "ListItem", position: 2, name: article.title });
  }
  const breadcrumbNode = {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId,
    itemListElement: breadcrumbItems,
  };

  const websiteNode = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: `${SITE_NAME} News`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: [
      {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?s={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    ],
    inLanguage: "en-US",
  };

  const personNode = {
    "@type": "Person",
    "@id": personId,
    name: author?.display_name || `${SITE_NAME} Editorial Team`,
    url: author?.slug ? `${SITE_URL}/author/${author.slug}/` : `${SITE_URL}/`,
    image: author?.avatar_url
      ? { "@type": "ImageObject", inLanguage: "en-US", url: author.avatar_url, caption: author.display_name }
      : undefined,
    description: author?.bio || undefined,
    jobTitle: "Contributor at Everything-PR",
    worksFor: { "@id": `${SITE_URL}/#organization` },
  };

  // FAQPage detection: post body contains <h2> ending in "?"
  const faqPairs = extractFaqPairs(article.content_html || "");
  const faqNode =
    faqPairs.length >= 2
      ? {
          "@type": "FAQPage",
          mainEntity: faqPairs.map((p) => ({
            "@type": "Question",
            name: p.q,
            acceptedAnswer: { "@type": "Answer", text: p.a },
          })),
        }
      : null;

  const graph: unknown[] = [
    articleNode,
    webPageNode,
    imageNode,
    breadcrumbNode,
    websiteNode,
    ORG_JSONLD,
    personNode,
  ];
  if (faqNode) graph.push(faqNode);

  return { meta, links, scripts: [jsonLd(graph)] };
}
