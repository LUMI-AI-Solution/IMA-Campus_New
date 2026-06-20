import type { AgentEvidenceCallback } from "../../types/public/agentEvidenceEvents.js";
import type { LogLine } from "../../types/public/logs.js";
import type { V3 } from "../../v3.js";
interface CaptureProbeEvidenceOptions {
    v3: V3;
    url: string;
    logger: (message: LogLine) => void;
    warningMessage: string;
}
interface EmitPostStepProbeEvidenceOptions extends CaptureProbeEvidenceOptions {
    evidenceCallback?: AgentEvidenceCallback;
}
export declare function captureProbeEvidence({ v3, url, logger, warningMessage, }: CaptureProbeEvidenceOptions): Promise<{
    url: string;
    screenshot?: Buffer;
    ariaTree?: string;
}>;
export declare function emitPostStepProbeEvidence({ v3, url, evidenceCallback, logger, warningMessage, }: EmitPostStepProbeEvidenceOptions): Promise<void>;
export {};
