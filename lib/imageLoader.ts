/**
 * Image loader for the GitHub Pages build (there is no server to resize images
 * on request). Every bundled photo gets ready-made WebP copies, one per width,
 * next to it: photo.abc123.jpg → photo.abc123.jpg.640.webp. They are made by
 * scripts/build-pages.mjs right after `next build`.
 */
export default function pagesImageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (!/^\/_next\/static\/media\/[^/]+\.(jpe?g|png|webp)$/i.test(src)) return src;
  return `${src}.${width}.webp`;
}
