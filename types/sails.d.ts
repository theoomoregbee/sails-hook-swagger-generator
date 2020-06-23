/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace Sails {

    type Callback<T, K> = (arg: T) => K


    /**
     * Definition of a Sails route target.
     *
     * @see https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-target
     */
    export interface RouteTargetObject {
      controller?: string;
      action?: string;
      view?: string;
      policy?: string;
      fn?: Function;
      [n: string]: any;
    }

    export type RouteTarget = string | Function | RouteTargetObject;

    export interface Config {
        appPath: string;
        paths: {
            models: string;
            controllers: string;
        };
        routes: Record<string, string | RouteTarget>;
        [key: string]: any;
    }

    /**
     * Options object contained within bound routes.
     */
    export interface RouteOption {
        model?: string;
        action: string;
        _middlewareType?: string;
        associations?: Association[];
        alias?: string;
        [n: string]: any;
    }

    /**
     * Sails bound routes as per 'router:bind' events.
     *
     * @see https://github.com/balderdashy/sails/blob/master/lib/EVENTS.md#routerbind
     * @see https://sailsjs.com/documentation/reference/request-req/req-options
     * @see https://sailsjs.com/documentation/concepts/extending-sails/hooks/hook-specification/routes
     */
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

     /**
     * Sails ORM model attribute validation rules definition.
     *
     * @see https://sailsjs.com/documentation/concepts/models-and-orm/validations
     * @see https://github.com/sailshq/anchor/blob/master/lib/rules.js
     */
    export interface AttributeValidation {
      isAfter?: Date;
      isBefore?: Date;
      isBoolean?: boolean;
      isCreditCard?: boolean;
      isEmail?: boolean;
      isHexColor?: boolean;
      isIn?: Array<string>;
      isInteger?: boolean;
      isIP?: boolean;
      isNotEmptyString?: boolean;
      isNotIn?: Array<string>;
      isNumber?: boolean;
      isString?: boolean;
      isURL?: boolean;
      isUUID?: boolean;
      max?: number;
      min?: number;
      maxLength?: number;
      minLength?: number;
      regex?: RegExp;
      custom?: (value: any) => boolean;
    }

    /**
     * Details/hints for underlying Sails database adapters.
     *
     * @see https://sailsjs.com/documentation/concepts/models-and-orm/attributes#?automigrations
     */
    export interface AttributeAutoMigrations {
      columnType?: string;
      autoIncrement?: boolean;
      unique?: boolean;
    }

    /**
     * Sails ORM model attribute definition.
     *
     * @see https://sailsjs.com/documentation/concepts/models-and-orm/attributes
     * @see https://github.com/balderdashy/waterline-schema/blob/master/accessible/valid-attribute-properties.js
     * @see https://github.com/balderdashy/sails-docs/pull/1308
     */
    export interface AttributeDefinition {

      // basic semantics
      type?: AttributeType;
      required?: boolean;
      defaultsTo?: any;
      allowNull?: boolean;
      autoUpdatedAt?: boolean;
      autoCreatedAt?: boolean;

      /*
       * Sails 'autoMigrations'; note that Sails configuration defines these at top-level
       * but the ORM moves to `autoMigrations` field at runtime (where our code is using them).
       */
      autoMigrations?: AttributeAutoMigrations;

      /*
       * Sails 'validations'; note that Sails configuration defines these at top-level
       * but the ORM moves to `autoMigrations` field at runtime (where our code is using them).
       */
      validations?: AttributeValidation;

      // associations
      model?: string;
      collection?: string;
      via?: string;
      through?: string;
      dominant?: boolean;

      // adapter
      columnName?: string;
      meta?: Record<string, any>;

      encrypt?: boolean;

      // documentation related
      description?: string;
      extendedDescription?: string;
      moreInfoUrl?: string;
      example?: any;

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
        attributes: Record<string, AttributeDefinition>;
        associations?: Association[];
    }

     /**
      * Sails 'actions2' inputs.
      */
    export interface Actions2Input extends AttributeValidation {
      // basic semantics
      type: AttributeType;
      required?: boolean;
      defaultsTo?: any;
      allowNull?: boolean;

      // documentation related
      description?: string;
      extendedDescription?: string;
      moreInfoUrl?: string;
      example?: any;
    }

    /**
     * Sails 'actions2' exits.
     *
     * @see https://github.com/sailshq/machine-as-action
     */
    export interface Actions2Exit {
      description?: string;
      responseType?: '' | 'view' | 'redirect' | 'error'; // XXX TODO Or res.{responseType}()
      statusCode?: string;
      viewTemplatePath?: string;
      outputExample?: any;
    }

    /**
     * Sails 'actions2' actions.
     *
     * @see https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2
     * @see https://sailsjs.com/documentation/concepts/helpers
     */
    export interface Actions2Machine {
      friendlyName?: string;
      description?: string;
      inputs?: {
        [name: string]: Actions2Input;
      };
      exits?: {
        [name: string]: Actions2Exit;
      };
      fn: Function;
    }

    export interface Action {
      fn: Function;
    }

    export type Controller = Record<string, any>;

    export interface Sails {
        config: Config;
        on: (event: string, callback: Callback<Route, void>) => void;
        after: (event: string, callback: Function) => void;
        models: Record<string, Model>;
        log: {
            silly: (value: string) => void;
            verbose: (value: string) => void;
            info: (value: string) => void;
            warn: (value: string) => void;
            error: (value: string, err?: any) => void;
        };
    }

}
