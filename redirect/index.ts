// Permanently redirects the app's old home (xmasapp.ianbicking.org) to xmascarols.app.
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    return Response.redirect(`https://xmascarols.app${url.pathname}${url.search}`, 301);
  },
};
