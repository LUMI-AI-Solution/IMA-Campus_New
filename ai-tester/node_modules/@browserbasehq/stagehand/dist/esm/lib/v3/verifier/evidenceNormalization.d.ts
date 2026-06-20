import type { AgentStepFinishedEvent } from "../types/public/agentEvidenceEvents.js";
import type { AgentEvidence } from "./types.js";
export declare const REDACTED_INLINE_IMAGE = "[redacted inline image payload]";
export declare function collectInlineImagePayloads(value: unknown, actionName?: string, out?: string[]): string[];
export declare function redactInlineImagePayloads(value: unknown, actionName?: string): unknown;
export declare function mergeAgentEvidence(...parts: Array<AgentEvidence | undefined>): AgentEvidence;
export declare function buildAgentEvidenceFromStepFinished(event: AgentStepFinishedEvent): AgentEvidence;
