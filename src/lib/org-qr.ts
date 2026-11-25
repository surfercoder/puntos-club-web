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
