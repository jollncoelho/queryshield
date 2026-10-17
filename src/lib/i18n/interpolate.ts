/**
 * Remplacement des fragments variables dans un texte traduit.
 *
 * Les dictionnaires notent les valeurs dynamiques `{ainsi}`. Un parametre
 * absent laisse le gabarit intact plutot que d'afficher « undefined » : en cas
 * d'oubli, le probleme est visible a l'ecran et non deguise.
 */
export type MessageParams = Record<string, string | number>;

const PLACEHOLDER_RE = /\{(\w+)\}/g;

export function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER_RE, (match, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) return match;
    return String(value);
  });
}
