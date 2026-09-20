/**
 * B4 memory-write DLP gate (SO-CONTEXT-SANITIZATION-BOUNDARY-001 boundary B4 / TE-4ywqwk).
 *
 * Calls services/dlp-fabric/check-gateway's POST /check/memory_write (Presidio NER + OPA
 * memory_write_allowed) -- the same shared gateway the paperclip-qdrant plugin calls (same endpoint
 * contract, same fail-closed posture: "one shared DLP-B4 service", not two divergent
 * implementations, even though the two plugins live in separate repos and each carries its own thin
 * HTTP client for it).
 *
 * Fail-closed per SO-CONTEXT-SANITIZATION-BOUNDARY-001: gateway unreachable, non-2xx, or a malformed
 * response body are all a BLOCK, never a silent pass-through. An unconfigured/wrong bearer isn't a
 * bypass either -- the gateway's own auth check is mandatory with no open-mode escape.
 *
 * Scope (per the over-engineering assessment on TE-kn3yd, 2026-09-19): this gates the SYNC/WRITE
 * path only -- issue comments and document revisions at the point they're about to be appended to a
 * Honcho session. It does not scan every agent tool call; that would be excessive for this data shape.
 */

export interface DlpCheckResult {
  allowed: boolean;
  reason: string;
  category?: string;
  redactedContent?: string;
}

export interface DlpGatewayResponse {
  allowed: boolean;
  reason: string;
  category?: string;
  action?: string;
  policy_id?: string;
  redacted_content?: string;
}

export interface DlpGatewayConfig {
  /** B4 gateway base, e.g. http://dlp-check-plugin-reach:8710 (mesh -- never 0.0.0.0). Empty disables the gate (see checkMemoryWrite). */
  dlpGatewayUrl: string;
  /** Bearer for the B4 gateway. */
  dlpGatewayToken: string;
}

/**
 * Checks one piece of content against the B4 gateway before it is written to a Honcho session.
 * `httpFetch` is the plugin's sandboxed fetch (ctx.http.fetch) so this call is subject to the same
 * network policy as every other outbound request the plugin makes.
 */
export async function checkMemoryWrite(
  httpFetch: (url: string, init: RequestInit) => Promise<Response>,
  config: DlpGatewayConfig,
  content: string,
  guild: string,
): Promise<DlpCheckResult> {
  if (!config.dlpGatewayUrl) {
    // Gate not configured for this deployment -- explicit opt-out, not a silent gap: the operator
    // must set dlpGatewayUrl for the gate to run at all. Logged by the caller.
    return { allowed: true, reason: "B4 gateway not configured -- gate skipped" };
  }
  try {
    const res = await httpFetch(`${config.dlpGatewayUrl.replace(/\/$/, "")}/check/memory_write`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.dlpGatewayToken}`,
      },
      body: JSON.stringify({ content, guild }),
    });
    if (!res.ok) {
      return { allowed: false, category: "gateway_error", reason: `B4 gateway HTTP ${res.status} -- fail-closed` };
    }
    const body = (await res.json()) as Partial<DlpGatewayResponse>;
    if (typeof body?.allowed !== "boolean") {
      return { allowed: false, category: "gateway_error", reason: "B4 gateway returned a malformed response -- fail-closed" };
    }
    if (!body.allowed) {
      return { allowed: false, category: body.category ?? "blocked", reason: body.reason ?? "blocked by B4 gateway" };
    }
    return {
      allowed: true,
      redactedContent: typeof body.redacted_content === "string" ? body.redacted_content : content,
      reason: body.reason ?? "clean",
    };
  } catch (error) {
    return {
      allowed: false,
      category: "gateway_unreachable",
      reason: `B4 gateway unreachable (${error instanceof Error ? error.message : String(error)}) -- fail-closed`,
    };
  }
}
