declare namespace Sails {

    type Callback<T, K> = (arg: T) => K


    export interface Config {
        appPath: string;
    }

    export interface Route {
        path: string;
        target: Function;
        verb: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: Record<string, any>;
    }

    export interface Hook<T> {
        defaults: {
            disabled: boolean;
            __configKey__: T;
        };
        initialize: (next: Function) => void;
    }

    export interface Sails {
        config: Config;
        on: (event: string, callback: Callback<Route, void>) => void;
        after: (event: string, callback: Function) => void;
    }
   
}