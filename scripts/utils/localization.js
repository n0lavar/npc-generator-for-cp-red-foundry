import { MODULE_ID } from "../constants.js";

export function localizeOrFallback(name, fallback) {
  const key = `${MODULE_ID}.${name}`;
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}
