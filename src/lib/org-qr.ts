// Id de la organizacion que trae un QR de "unirse", o null si no es uno.
// Dos formatos: el link universal https://<dominio>/unirse/<id> (el actual: la
// camara del telefono abre la app o manda a descargarla) y el JSON
// {"type":"organization","id":N} de los QR impresos antes del 25/11/2026.
export function parseOrgQr(data: string): string | null {
  const link = data.match(/^(?:https?:\/\/[^/]+|puntosclub:\/)?\/unirse\/(\d+)\/?(?:[?#].*)?$/);
  if (link) return link[1];
  try {
    const json = JSON.parse(data);
    return json?.type === 'organization' && json.id ? String(json.id) : null;
  } catch {
    return null;
  }
}

// Link /unirse/<id> sin sesion: el orgId viaja por login y registro en la query
// para retomar el alta al entrar. Se lee al momento de navegar (no al render),
// asi un segundo link que llega mientras el login esta en curso gana.
export function linkOrgId(search: string = window.location.search): string | null {
  const orgId = new URLSearchParams(search).get('orgId');
  return orgId && /^\d+$/.test(orgId) ? orgId : null;
}

/** `path` con el orgId del link pendiente, si hay uno. */
export function withOrgId(path: string, search?: string): string {
  const orgId = linkOrgId(search);
  return orgId ? `${path}?orgId=${orgId}` : path;
}

/** Adonde ir despues de entrar: al alta pendiente o a la home. */
export function homeAfterSignIn(search?: string): string {
  const orgId = linkOrgId(search);
  return orgId ? `/scan-organization?orgId=${orgId}` : '/';
}
