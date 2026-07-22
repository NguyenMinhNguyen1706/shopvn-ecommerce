const warnedProviders = new Set();

const normalizeIp = value => String(value || '')
  .trim()
  .replace(/^::ffff:/, '');

function ipMatches(clientIp, allowedIps) {
  const normalizedClientIp = normalizeIp(clientIp);
  if (!normalizedClientIp || !allowedIps?.length) return false;
  return allowedIps.some(allowedIp => normalizeIp(allowedIp) === normalizedClientIp);
}

/**
 * Optional IP allowlisting for payment webhooks.
 * Provider signatures remain mandatory in each payment handler.
 */
function requireWebhookIP(provider) {
  return (req, res, next) => {
    const clientIp = normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
    const envVarName = `${provider.toUpperCase()}_ALLOWED_IPS`;
    const allowedIps = String(process.env[envVarName] || '')
      .split(',')
      .map(normalizeIp)
      .filter(Boolean);
    const strictMode = String(process.env.REQUIRE_WEBHOOK_IP_ALLOWLIST).toLowerCase() === 'true';

    if (allowedIps.length === 0) {
      if (strictMode) {
        console.error(`[WebhookSecurity] ${envVarName} is required in strict mode.`);
        return res.status(503).json({
          success: false,
          message: 'Webhook configuration error.'
        });
      }

      if (!warnedProviders.has(provider)) {
        warnedProviders.add(provider);
        console.warn(
          `[WebhookSecurity] ${envVarName} is empty; relying on ${provider} signature verification.`
        );
      }
      return next();
    }

    if (ipMatches(clientIp, allowedIps)) return next();

    console.warn(`[WebhookSecurity] Rejected ${provider} webhook from ${clientIp}.`);
    return res.status(403).json({
      success: false,
      message: 'Unauthorized source IP.'
    });
  };
}

module.exports = {
  ipMatches,
  normalizeIp,
  requireWebhookIP
};
