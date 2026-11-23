import { Session } from "./session";
import { isValidCode } from "../shared/protocol";

export { Session };

const SESSION_TITLE = "Sing Christmas carols with me";
const SESSION_DESCRIPTION =
  "Join my singing session: we\u2019ll all see the same song, and which verse we\u2019re on.";

/**
 * Session links are shared a lot, so give their link previews their own title.
 * The page itself is the app's index.html; the client routes it.
 */
async function sessionPage(request: Request, env: Env): Promise<Response> {
  const res = await env.ASSETS.fetch(new Request(new URL("/", request.url), request));
  const content = (value: string) => ({
    element(el: Element) {
      el.setAttribute("content", value);
    },
  });
  return new HTMLRewriter()
    .on("title", {
      element(el) {
        el.setInnerContent(`${SESSION_TITLE} \u2013 Christmas Carols`);
      },
    })
    .on('meta[name="description"]', content(SESSION_DESCRIPTION))
    .on('meta[property="og:title"]', content(SESSION_TITLE))
    .on('meta[property="og:description"]', content(SESSION_DESCRIPTION))
    .on('meta[property="og:url"]', content(request.url))
    .on('link[rel="canonical"]', {
      element(el) {
        el.remove();
      },
    })
    .on("head", {
      element(el) {
        el.append('<meta name="robots" content="noindex" />', { html: true });
      },
    })
    .transform(res);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }
    const m = /^\/api\/sessions\/([^/]+)\/ws$/.exec(url.pathname);
    if (m) {
      const code = m[1].toLowerCase();
      if (!isValidCode(code)) {
        return new Response("Bad session code", { status: 400 });
      }
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected a WebSocket upgrade", { status: 426 });
      }
      return env.SESSIONS.getByName(code).fetch(request);
    }
    if (url.pathname.startsWith("/s/")) {
      return sessionPage(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
