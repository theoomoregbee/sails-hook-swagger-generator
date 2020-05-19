
/**
 * Only what we need from `npm install include-all`.
 * @see https://www.npmjs.com/package/include-all
 */

declare namespace IncludeAll {

  export interface Options {
    dirname: string;
    force?: boolean;
    optional?: boolean;
    ignoreRequireFailures?: boolean;
    excludeDirs?: RegExp;
    depth?: number;
    filter?: RegExp;
    pathFilter?: RegExp;
    dontLoad?: boolean;
    flatten?: boolean;
    keepDirectoryPath?: boolean;
    identity?: boolean;
    useGlobalIdForKeyName?: boolean;
    replaceExpr?: RegExp;
    replaceVal?: string;
    aggregate?: boolean;
  }

  export interface FilesDictionary {
    [fileIdentity: string]: File;
  }

  export interface File {
    identity: string;
    globalId: string;
    [n: string]: Function | unknown;
  }

  export type Callback = (err: Error | string, files: FilesDictionary) => void;

}

declare module 'include-all' {

  export function optional(options: IncludeAll.Options, cb: IncludeAll.Callback): void;

}
