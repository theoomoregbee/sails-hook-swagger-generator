declare namespace Sails {

    type Callback<T, K> = (arg: T) => K


    export interface Config {
        appPath: string;
        paths: {
            models: string;
        };
    }

    export interface Route {
        path: string;
        target: Function;
        verb: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: Record<string, any>;
    }

    export interface Hook<T> {
        configKey?: string;
        defaults: {
            disabled: boolean;
            __configKey__: T;
        };
        initialize: (next: Function) => void;
    }

    type AttributeType = 'string' | 'number' | 'boolean' | 'json' | 'ref'

    export interface AttributeValidation {
        max?: number;
        min?: number;
        maxLength?: number;
        minLength?: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        regex: any;
        isIn: Array<string>;
    }

    export interface AttributeValue extends AttributeValidation {
        type?: AttributeType;
        required?: boolean;
        defaultTo?: string;
        allowNull?: boolean;
    }

    export interface Model {
        globalId: string;
        primaryKey: string;
        identity: string;
        attributes: Record<string, AttributeValue>;
    }

    export interface Sails {
        config: Config;
        on: (event: string, callback: Callback<Route, void>) => void;
        after: (event: string, callback: Function) => void;
        models: Array<Model>;
    }
   
}