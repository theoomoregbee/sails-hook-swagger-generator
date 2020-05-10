import { SwaggerAttribute, SwaggerAction, SwaggerSailsRouteControllerTarget, MiddlewareType, BluePrintAction, SwaggerSailsController, SwaggerRouteInfo, NameKeyMap, SwaggerSailsModel } from '../interfaces';
import swaggerJSDoc from 'swagger-jsdoc';
import cloneDeep from 'lodash/cloneDeep';
import { OpenApi } from '../../types/openapi';
import uniqByLodash from 'lodash/uniqBy';
import mapKeys from 'lodash/mapKeys';
import get from 'lodash/get';
import uniq from 'lodash/uniq';
import defaults from 'lodash/defaults';
import forEach from 'lodash/forEach';
import { Tag } from 'swagger-schema-official';

const uniqBy = uniqByLodash as unknown as <T>(array: Array<T>, prop: string) => Array<T>



const componentReference: Array<keyof OpenApi.Components> = [
    "schemas",
    "parameters",
    "securitySchemes",
    "requestBodies",
    "responses",
    "headers",
    "examples",
    "links",
    "callbacks"
]

export const bluerprintActions: Array<BluePrintAction> = ['findone', 'find', 'create', 'update', 'destroy', 'populate', 'add', 'remove', 'replace'];

export const mergeSwaggerSpec = (destination: SwaggerAttribute, source: SwaggerAttribute): SwaggerAttribute => {
    const dest: SwaggerAttribute = cloneDeep(destination)
    dest.tags = uniqBy([
        ...(get(source, 'tags', [])),
        ...(get(dest, 'tags', [])),
    ], 'name');

    dest.components = componentReference.reduce((mergedComponents, ref) => {
        const type = get(source, `components.${ref}`);
        if (type) {
            mergedComponents[ref] = {
                ...(get(dest.components, ref, {})),
                ...type
            }
        }
        return mergedComponents
    }, dest.components || {})
    return dest
}

export const mergeSwaggerPaths = (dest: SwaggerAction | undefined, sourcePaths: SwaggerAction): SwaggerAction => {
    // strip off leading '/' from both source and destination swagger action, swagger-doc returns paths with leading /path-name: {}
    const swaggerActions = mapKeys(cloneDeep(dest || {}), (_, key) => key.replace(/^\//, ''));
    const paths = mapKeys(cloneDeep(sourcePaths), (_, key) => key.replace(/^\//, ''));
    // unique action keys
    const actions = uniq(Object.keys(swaggerActions).concat(Object.keys(paths)))
    return actions.reduce((merged, key) => {
        const destination = swaggerActions[key];
        const source = paths[key];
        merged[key] = {
            ...(destination || {}),
            ...(source || {})
        }
        return merged
    }, {} as SwaggerAction)
}

export const loadSwaggerDocComments = (filePath: string): Promise<OpenApi.OpenApi> => {
    return new Promise((resolve, reject) => {
        try {
            const opts = {
                definition: {
                    openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
                    info: { title: 'dummy', version: '0.0.0' },
                },
                apis: [filePath],
            };
            const specification = swaggerJSDoc(opts);
            resolve(specification as OpenApi.OpenApi)
        } catch (err) {
            reject(err)
        }
    });
}

export const removeViewRoutes = (routes: Record<string, Sails.RouteTarget>): Record<string, Sails.RouteTarget> => {
    return Object.keys(routes).reduce((cleanedRoutes, routeAddress) => {
        const target = routes[routeAddress];
        const isView = !!get(target, 'view');
        if (!isView) {
            cleanedRoutes[routeAddress] = target
        }
        return cleanedRoutes
    }, {} as Record<string, Sails.RouteTarget>)
}

export const getBlueprintAllowedMiddlewareRoutes = (routes: Array<Sails.Route>): Array<Sails.Route> => {
    return routes.filter(route => {
        const middlewareType = get(route, 'options._middlewareType', '') as string;
        const [type] = middlewareType.split(':')
        return type === MiddlewareType.BLUEPRINT
    })
}

export const normalizeRouteControllerName = (name?: string): string | undefined => {
    if (name && !name.endsWith('Controller')) {
        return `${name.charAt(0).toUpperCase()}${name.substring(1)}Controller`
    }
    return name
}

// see: https://sailsjs.com/documentation/concepts/routes/custom-routes#?controller-action-target-syntax
export const normalizeRouteControllerTarget = (target: string | SwaggerSailsRouteControllerTarget): SwaggerSailsRouteControllerTarget => {
    if (typeof target === 'string') {
        // for foo.myGoAction and FooController.myGoAction
        const dotParams = target.split('.');
        if (dotParams.length > 1) {
            const controller = normalizeRouteControllerName(dotParams[0])
            const action = dotParams[1]
            return { controller, action }
        }

        // foo/go-action
        const slashParams = target.split('/');
        if (slashParams.length > 1) {
            return { action: target }
        }
    } else {
        return {
            controller: normalizeRouteControllerName(target.controller),
            action: target.action,
            swagger: target.swagger
        }
    }

    throw new TypeError(`Unable to normalize route: ${target}, see: https://sailsjs.com/documentation/concepts/routes/custom-routes for allowed routes pattern`)
}

export const getSwaggerAction = (object: SwaggerSailsModel | SwaggerSailsController, action: string): OpenApi.Operation | undefined => {
    return get(object, `swagger.actions.${action}`)
}

export const getAction2Paths = (routes: SwaggerRouteInfo[], controllers: NameKeyMap<SwaggerSailsController>): string[] => {
    return routes
        .filter(route => {
            const controller = controllers[route.controller!]
            const swagger = getSwaggerAction(controller, route.action);
            return !swagger
        })
        .map(route => {
            return route.action
        })
}

export const getUniqueTagsFromPath = (paths: OpenApi.Paths) => {
    const referencedTags = new Set();

    for (const path in paths) {
        const pathDefinition = paths[path];
        for (const verb in pathDefinition) {
            const verbDefinition = pathDefinition[verb as keyof OpenApi.Path] as OpenApi.Operation;
            if (verbDefinition.tags) {
                verbDefinition.tags.forEach(tag => referencedTags.add(tag))
            }
        }
    }
    return referencedTags
}

export const mergeComponents = (existingComponents: OpenApi.Components, models: NameKeyMap<SwaggerSailsModel>, controllers: NameKeyMap<SwaggerSailsController>, action2s: NameKeyMap<SwaggerSailsController>) => {
    const components = cloneDeep(existingComponents);
    const merge = (toMerge: OpenApi.Components) => {
        for (const key in toMerge) {
            const componentName = key as keyof OpenApi.Components
            if (!components[componentName]) {
                components[componentName] = toMerge[componentName];
            }
            defaults(components[componentName], toMerge[componentName]);
        }
    }

    forEach(models, model => {
        merge(get(model, 'swagger.components', {}))
    });
    forEach(controllers, controller => {
        merge(get(controller, 'swagger.components', {}))
    });
    forEach(action2s, action2 => {
        merge(get(action2, 'swagger.components', {}))
    });
    return components
}

export const mergeTags = (existingTags: Tag[], models: NameKeyMap<SwaggerSailsModel>, controllers: NameKeyMap<SwaggerSailsController>, action2s: NameKeyMap<SwaggerSailsController>) => {
    const tags = cloneDeep(existingTags);

    const addTags = (toAdd: Array<Tag>) => {
        const newTags = toAdd.filter(newTag => !tags.find(tag => newTag.name === tag.name));
        tags.push(...newTags)
    }

    forEach(models, model => {
        addTags(get(model, 'swagger.tags', []))
    });
    forEach(controllers, controller => {
        addTags(get(controller, 'swagger.tags', []))
    });
    forEach(action2s, action2 => {
        addTags(get(action2, 'swagger.tags', []))
    });

    return tags
}