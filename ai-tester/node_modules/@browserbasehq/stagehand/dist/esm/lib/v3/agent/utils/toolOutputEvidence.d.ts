import type { AgentStepFinishedEvent } from "../../types/public/agentEvidenceEvents.js";
export declare function inferToolOutput(toolResult: unknown): AgentStepFinishedEvent["toolOutput"];
