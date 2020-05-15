/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace Sails {

    type Callback<T, K> = (arg: T) => K


    export interface RouteControllerTarget {
        controller?: string;
        action: string;
    }

    export type RouteTarget = string | RouteControllerTarget | { view: string } | { response: string }

    export interface Config {
        appPath: string;
        paths: {
            models: string;
            controllers: string;
        };
        routes: Record<string, string | RouteTarget>;
        [key: string]: any;
    }


    export interface RouteAssociation {
        alias: string;
        collection: string;
        model: string;
    }

    export interface RouteOption {
        model?: string;
        action: string;
        _middlewareType: string;
        associations: RouteAssociation[];
        alias?: string;
    }

    export interface Route {
        path: string;
        target: Function;
        verb: string;
        options: RouteOption;
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
        regex: any;
        isIn: Array<string>;
    }

    export interface AttributeValue extends AttributeValidation {
        type?: AttributeType;
        required?: boolean;
        defaultTo?: string;
        allowNull?: boolean;
    }

    export interface Association {
      alias: string;
      type: 'model' | 'collection';
      model?: string;
      collection?: string;
      via?: string;
    }

    export interface Model {
        globalId: string;
        primaryKey: string;
        identity: string;
        attributes: Record<string, AttributeValue>;
        associations?: Association[];
    }

    export type Controller = Record<string, any>;

    export interface Sails {
        controllers: any;
        config: Config;
        on: (event: string, callback: Callback<Route, void>) => void;
        after: (event: string, callback: Function) => void;
        models: Record<string, Model>;
        log: {
            info: (value: string) => void;
            warn: (value: string) => void;
            error: (value: string, err: any) => void;
        };
    }

}
