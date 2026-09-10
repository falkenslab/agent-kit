import pc from "picocolors";

/** Color palette for a consistent console look across whatever CLI is built on this kit. */
export const agent = (s: string): string => pc.cyanBright(s);
export const user = (s: string): string => pc.white(s);
export const action = (s: string): string => pc.magenta(s);
export const heading = (s: string): string => pc.bold(s);
export const success = (s: string): string => pc.green(s);
export const warn = (s: string): string => pc.yellow(s);
export const error = (s: string): string => pc.red(s);
export const dim = (s: string): string => pc.dim(s);
