/**
 * Webhook Security Middleware
 * Concepts: Webhook Hardening, IP Whitelisting, WAF
 * Validates incoming webhook requests by verifying source IP address
 */

/**
 * Helper to match an IP address against a whitelist
 */
function ipMatches(clientIp, allowedIps) {
  if (!clientIp || !allowedIps || allowedIps.length === 0) return false;
  return allowedIps.includes(clientIp.trim());
}

/**
 * Require Webhook IP Whitelisting
 * @param {string} provider - 'vnpay', 'zalopay', 'momo', or 'payos'
 */
function requireWebhookIP(provider) {
  return (req, res, next) => {
    // Get IP address, respecting reverse proxies/gateways
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : String(forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

    // Map provider to specific env variables
    const envVarName = `${provider.toUpperCase()}_ALLOWED_IPS`;
    const allowedIpsStr = process.env[envVarName] || '';
    const allowedIps = allowedIpsStr.split(',').map(ip => ip.trim()).filter(Boolean);

    // Development fallback: allow if no whitelist is configured in non-production
    if (allowedIps.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        console.error(`[WebhookSecurity] Access Denied: Production requires whitelisted IPs for ${provider}. Env ${envVarName} is empty.`);
        return res.status(503).json({
          success: false,
          message: 'Webhook configuration error.'
        });
      }
      console.warn(`[WebhookSecurity] ${provider} webhook received from ${clientIp}. No IP whitelist configured in non-production; allowing request.`);
      return next();
    }

    if (ipMatches(clientIp, allowedIps)) {
      console.log(`[WebhookSecurity] Access Allowed: Authorized ${provider} webhook from ${clientIp}`);
      return next();
    }

    console.warn(`[WebhookSecurity] Access Denied: Unauthorized ${provider} webhook from ${clientIp}`);
    return res.status(403).json({
      success: false,
      message: 'Unauthorized source IP.'
    });
  };
}

module.exports = {
  requireWebhookIP
};
