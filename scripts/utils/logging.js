export function redactGenerationSecrets(options) {
  return {
    ...options,
    ...(Object.hasOwn(options, "model_api_key")
      ? { model_api_key: options.model_api_key ? "[REDACTED]" : options.model_api_key }
      : {})
  };
}
