// /proof/<link> serves the client gallery page; assets/proof.js reads the link from the address bar.
export async function onRequestGet({ request, env }) {
  const page = await env.ASSETS.fetch(new URL('/proof/', request.url));
  const res = new Response(page.body, page);
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
