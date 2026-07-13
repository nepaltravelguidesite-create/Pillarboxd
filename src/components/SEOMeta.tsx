import { useEffect } from "react";

// ---------------------------------------------------------------------------
// SEOMeta — manages document head meta tags for the Vite SPA.
//
// Two-tier SEO approach:
//   1. Client-side (this component): updates document.title and og/twitter
//      meta tags at runtime for browser tab titles and in-app navigation.
//      Works for human users with JavaScript enabled.
//   2. Server-side (og-proxy edge function): the Supabase Edge Function at
//      supabase/functions/og-proxy serves pre-rendered HTML with correct
//      Open Graph meta tags when it detects a social/crawler user-agent
//      (Discord, WhatsApp, iMessage, X/Twitter, Slack, etc.). Crawlers don't
//      execute JavaScript, so they can't see these client-side tags — the
//      edge function handles that case by fetching data from TMDB/Supabase
//      and returning static <meta> tags instead of the SPA shell.
//
// Since there's no SSR, we imperatively set document.title and create/update
// meta tags in a useEffect. On unmount we reset the title to the app default.
// ---------------------------------------------------------------------------

export interface SEOMetaProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
}

const DEFAULT_TITLE = "Pillarboxd — Track, rate & log your TV shows";
const BRAND_SUFFIX = "— Pillarboxd";

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    // Apply the selector's attribute first so the element can be found later.
    const [attr, val] = Object.entries(attributes)[0];
    el.setAttribute(attr, val);
    document.head.appendChild(el);
  }
  // Set/overwrite the remaining attributes.
  for (const [attr, val] of Object.entries(attributes)) {
    el.setAttribute(attr, val);
  }
}

export function SEOMeta({
  title,
  description,
  ogImage,
  ogType = "website",
}: SEOMetaProps) {
  useEffect(() => {
    const fullTitle = title.includes("Pillarboxd") ? title : `${title} ${BRAND_SUFFIX}`;
    document.title = fullTitle;

    if (description) {
      upsertMeta('meta[name="description"]', {
        name: "description",
        content: description,
      });
    }

    // Open Graph
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: fullTitle,
    });
    if (description) {
      upsertMeta('meta[property="og:description"]', {
        property: "og:description",
        content: description,
      });
    }
    if (ogImage) {
      upsertMeta('meta[property="og:image"]', {
        property: "og:image",
        content: ogImage,
      });
    }
    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: ogType,
    });

    // Twitter card
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: fullTitle,
    });
    if (description) {
      upsertMeta('meta[name="twitter:description"]', {
        name: "twitter:description",
        content: description,
      });
    }
    if (ogImage) {
      upsertMeta('meta[name="twitter:image"]', {
        name: "twitter:image",
        content: ogImage,
      });
    }

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, ogImage, ogType]);

  return null;
}
