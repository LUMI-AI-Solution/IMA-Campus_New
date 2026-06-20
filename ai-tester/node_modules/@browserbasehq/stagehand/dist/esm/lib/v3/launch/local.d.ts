import { LaunchedChrome } from "chrome-launcher";
import type { LocalBrowserLaunchOptions } from "../types/public/index.js";
interface LaunchLocalOptions extends LocalBrowserLaunchOptions {
    handleSIGINT?: boolean;
}
export declare function launchLocalChrome(opts: LaunchLocalOptions): Promise<{
    ws: string;
    chrome: LaunchedChrome;
}>;
export {};
