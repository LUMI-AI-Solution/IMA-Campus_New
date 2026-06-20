import type { V3Context } from "./context.js";
import type { Page } from "./page.js";
import type { BrowserClipboard, ClipboardOptions, ClipboardPasteOptions } from "../types/public/clipboard.js";
type ContextClipboardParams = {
    context: V3Context;
    resolvePage: (page?: Page) => Promise<Page>;
};
export declare class ContextClipboard implements BrowserClipboard {
    private readonly params;
    constructor(params: ContextClipboardParams);
    writeText(text: string, options?: ClipboardOptions): Promise<void>;
    private writeTextInternal;
    readText(options?: ClipboardOptions): Promise<string>;
    clear(options?: ClipboardOptions): Promise<void>;
    paste(options?: ClipboardPasteOptions): Promise<void>;
    copy(options?: ClipboardOptions): Promise<void>;
    cut(options?: ClipboardOptions): Promise<void>;
    private resolvePage;
    private grantClipboardPermissions;
    private ensurePageFocused;
    private originForPage;
    private throwIfEvaluationFailed;
}
export {};
