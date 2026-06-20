/**
 * captureAriaTreeProbe — capture a truncated accessibility tree of the active
 * page for use as tier-2 evidence in the trajectory recorder.
 *
 * Shared by v3AgentHandler and v3CuaAgentHandler. Listener-gated by the
 * callers so ordinary agent runs (no TrajectoryRecorder attached) don't pay
 * the cost.
 *
 * The a11y tree is the same payload the agent's `ariaTree` tool sees, but
 * captured by the harness (not the agent) so the verifier has independent
 * textual ground truth for grounding non-visual claims — prices, names,
 * dates, list contents — without OCR'ing screenshots.
 *
 * Budget: defaults to ~8000 tokens (32k chars). Per-step a11y captures
 * across a ~30-step trajectory at that cap sum to ~240k tokens total,
 * which the verifier handles via per-criterion top-K selection. The cap
 * is configurable via VERIFIER_ARIATREE_TOKEN_BUDGET so consumers can
 * trade RAM/disk for fidelity. Truncated content is marked explicitly so
 * the verifier knows it was clipped.
 */
import type { V3 } from "../../v3.js";
interface CaptureAriaTreeOptions {
    /** Soft cap on token count (chars/4 approximation). Default 8000. */
    tokenBudget?: number;
    /** Hard timeout on the capture. Default 5s. */
    timeoutMs?: number;
}
/**
 * Returns the truncated a11y tree as a plain string, or undefined when
 * capture fails. Never throws — a11y capture is best-effort tier-2 evidence,
 * not a hard requirement, so failures are silently absorbed (the verifier
 * surfaces this via evidence_insufficient).
 */
export declare function captureAriaTreeProbe(v3: V3, opts?: CaptureAriaTreeOptions): Promise<string | undefined>;
export {};
