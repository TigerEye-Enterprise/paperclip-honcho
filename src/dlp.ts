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

/**
 * Only the fields this client actually reads. The gateway also returns `action` and `policy_id`;
 * they are deliberately NOT declared, because declaring them implies we branch on them and we do
 * not -- `allowed` plus `redacted_content` fully determine what happens here.
 */
interface DlpGatewayResponse {
  allowed: boolean;
  reason: string;
  category?: string;
  redacted_content?: string;
}

export interface DlpGatewayConfig {
  /**
   * B4 gateway base, e.g. http://dlp-check-plugin-reach:8710 (mesh -- never 0.0.0.0).
   * An empty value disables the gate entirely; that check lives in the CALLER
   * (sync.ts filterMessagesThroughDlp), which is the only place that can also emit the
   * "writing to memory with no B4 gate" warning. Do not re-add it here -- a second copy
   * was unreachable dead code.
   */
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
  try {
    const res = await httpFetch(`${config.dlpGatewayUrl.replace(/\/$/, "")}/check/memory_write`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.dlpGatewayToken}`,
      },
      body: JSON.stringify({ content, guild }),
    });
    // ctx.http.fetch can resolve to a falsy value in this host's sandbox (honcho-client.ts's
    // requestJson guards the same way). Treat it as a failed check, not a TypeError caught below
    // — the catch would still fail closed, but with a misleading "cannot read .ok of null" reason.
    if (!res) {
      return { allowed: false, category: "gateway_error", reason: "B4 gateway returned no response -- fail-closed" };
    }
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
