import type { AgentEvidenceCallback } from "../../types/public/agentEvidenceEvents.js";
import type { LogLine } from "../../types/public/logs.js";
export declare function wrapEvidenceCallback(callback: AgentEvidenceCallback | undefined, logger: (message: LogLine) => void): AgentEvidenceCallback | undefined;
