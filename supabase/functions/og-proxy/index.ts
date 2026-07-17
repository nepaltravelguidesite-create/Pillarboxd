import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SPA_URL = Deno.env.get("SPA_URL") || "http://localhost:5173";

// Known crawler user-agents (partial matches, case-insensitive)
const CRAWLER_PATTERNS = [
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "telegrambot",
  "whatsapp",
  "discord",
  "applebot",
  "googlebot",
  "bingbot",
  "bytespider",
  "skypeuripreview",
  "vkshare",
  "pinterest",
  "facebot",
  "ia_archiver",
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some((p) => ua.includes(p));
}

function buildMetaHtml(title: string, description: string, imageUrl: string, url: string): string {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${imageUrl}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function handleShowPage(showId: string, url: string): Promise<Response> {
  const tmdbKey = Deno.env.get("TMDB_API_KEY") || "";
  if (!tmdbKey) {
    return proxyToSpa(url);
  }
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${showId}?api_key=${tmdbKey}&append_to_response=images`
    );
    if (!res.ok) return proxyToSpa(url);
    const data = await res.json();
    const title = `${data.name} - Aftershow`;
    const desc = data.overview?.slice(0, 200) || "Track, rate, and review TV shows on Aftershow.";
    const img = data.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
      : data.poster_path
      ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
      : `${SPA_URL}/og-default.webp`;
    return new Response(buildMetaHtml(title, desc, img, url), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  } catch {
    return proxyToSpa(url);
  }
}

async function handleProfilePage(username: string, url: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return proxyToSpa(url);
  }
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=display_name,bio,avatar_url`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    if (!res.ok) return proxyToSpa(url);
    const rows = await res.json();
    if (!rows || rows.length === 0) return proxyToSpa(url);
    const profile = rows[0];
    const title = `${profile.display_name || username} - Aftershow`;
    const desc = profile.bio?.slice(0, 200) || `See ${profile.display_name || username}'s TV show ratings, reviews, and lists on Aftershow.`;
    const img = profile.avatar_url || `${SPA_URL}/og-default.webp`;
    return new Response(buildMetaHtml(title, desc, img, url), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  } catch {
    return proxyToSpa(url);
  }
}

async function handleListPage(listId: string, url: string): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return proxyToSpa(url);
  }
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/lists?id=eq.${encodeURIComponent(listId)}&select=title,description,like_count,item_count`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );
    if (!res.ok) return proxyToSpa(url);
    const rows = await res.json();
    if (!rows || rows.length === 0) return proxyToSpa(url);
    const list = rows[0];
    const title = `${list.title} - Aftershow`;
    const desc = list.description?.slice(0, 200) || `A curated list of ${list.item_count} TV shows on Aftershow.`;
    const img = `${SPA_URL}/og-default.webp`;
    return new Response(buildMetaHtml(title, desc, img, url), {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  } catch {
    return proxyToSpa(url);
  }
}

async function proxyToSpa(url: string): Promise<Response> {
  try {
    const res = await fetch(`${SPA_URL}${new URL(url).pathname}`);
    const html = await res.text();
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
    });
  } catch {
    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "";
  const path = url.pathname;

  // Non-crawler requests get the normal SPA
  if (!isCrawler(userAgent)) {
    return proxyToSpa(req.url);
  }

  // Crawler requests get pre-rendered meta HTML
  // Match routes: /show/:id, /profile/:username, /lists/:id
  const showMatch = path.match(/^\/show\/(\d+)/);
  if (showMatch) {
    return handleShowPage(showMatch[1], req.url);
  }

  const profileMatch = path.match(/^\/profile\/([^/]+)$/);
  if (profileMatch) {
    return handleProfilePage(profileMatch[1], req.url);
  }

  const listMatch = path.match(/^\/lists\/([a-f0-9-]+)/);
  if (listMatch) {
    return handleListPage(listMatch[1], req.url);
  }

  // Default: proxy to SPA for any other path
  return proxyToSpa(req.url);
});
