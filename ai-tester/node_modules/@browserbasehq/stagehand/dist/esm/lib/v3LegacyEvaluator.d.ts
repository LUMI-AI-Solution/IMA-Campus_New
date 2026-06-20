/**
 * Legacy V3 evaluator implementation.
 *
 * This is the behavior-preserving implementation that backs V3Evaluator when
 * STAGEHAND_EVALUATOR_BACKEND=legacy.
 */
import type { AvailableModel, ClientOptions } from "./v3/types/public/model.js";
import type { EvaluateOptions, BatchAskOptions, EvaluationResult } from "./v3/types/private/evaluator.js";
import { V3 } from "./v3/v3.js";
export declare class LegacyV3Evaluator {
    private v3;
    private modelName;
    private modelClientOptions;
    private silentLogger;
    constructor(v3: V3, modelName?: AvailableModel, modelClientOptions?: ClientOptions);
    private getClient;
    ask(options: EvaluateOptions): Promise<EvaluationResult>;
    batchAsk(options: BatchAskOptions): Promise<EvaluationResult[]>;
    private _evaluateWithMultipleScreenshots;
}
