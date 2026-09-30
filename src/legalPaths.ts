const basePath = import.meta.env.BASE_URL;

export function legalHref(path: '/' | '/terms' | '/privacy' | '/data-deletion') {
  if (basePath === '/') return path;
  return path === '/' ? basePath : `${basePath}${path.slice(1)}.html`;
}

export function legalRoutePath(pathname: string) {
  if (basePath === '/') return pathname;
  return pathname.startsWith(basePath) ? `/${pathname.slice(basePath.length)}` : pathname;
}
