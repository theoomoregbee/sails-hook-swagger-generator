import { BluePrintAction, NameKeyMap } from '../interfaces';
import swaggerJSDoc from 'swagger-jsdoc';
import { OpenApi } from '../../types/openapi';
import { get, cloneDeep, defaultsDeep, isEqual, map } from 'lodash';
import { Reference } from 'swagger-schema-official';
import { swaggerTypes } from '../type-formatter';

export const blueprintActions: Array<BluePrintAction> = ['findone', 'find', 'create', 'update', 'destroy', 'populate', 'add', 'remove', 'replace'];

export const attributeValidations: string[] = [
  'isAfter',
  'isBefore',
  'isBoolean',
  'isCreditCard',
  'isEmail',
  'isHexColor',
  'isIn',
  'isInteger',
  'isIP',
  'isNotEmptyString',
  'isNotIn',
  'isNumber',
  'isString',
  'isURL',
  'isUUID',
  'max',
  'min',
  'maxLength',
  'minLength',
  'regex',
  'custom',
];

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

export const resolveRef = (specification: OpenApi.OpenApi, obj: (Reference | unknown)): unknown => {

  const path = (obj as Reference).$ref;
  if(typeof(path) === 'string' && path.startsWith('#/')) {
    const pathElements = path.substring(2).split('/');
    return get(specification, pathElements);
  }
  return obj;

}

/**
 * Provides limited dereferencing, or unrolling, of schemas.
 *
 * Background: The generator `generateSchemas()` produces two variants:
 * 1. The `without-required-constraint` variant containing the properties but without
 *    the specifying required fields (used for update blueprint).
 * 2. A primary variant containing an `allOf` union of the variant above
 *    and the `required` constraint (used for the create blueprint).
 *
 * This method handles this simple case, resolving references and unrolling
 * into a simple cloned schema with directly contained properties.
 *
 * Otherwise, schema returned as clone but unmodified.
 *
 * @param specification
 * @param schema
 */
export const unrollSchema = (specification: OpenApi.OpenApi, schema: OpenApi.UpdatedSchema | Reference): OpenApi.UpdatedSchema => {

  const ret: OpenApi.UpdatedSchema = cloneDeep(resolveRef(specification, schema) as OpenApi.UpdatedSchema);

  if(ret.allOf) {
    const allOf = ret.allOf;
    delete ret.allOf;
    allOf.map(s => defaultsDeep(ret, resolveRef(specification, s)));
  }

  return ret;
}

/**
 * Derive Swagger/OpenAPI schema from example value.
 *
 * Two specific use cases:
 * 1. The Sails model attribute type 'json' may be best represented in
 *    Swagger/OpenAPI as the type 'object' or an array of elements.
 *    Let's attempt to determine this from the attribute property 'example'.
 * 2. Actions2 outputs may include `outputExample` but do not specify a
 *    type - use this method to derive a schema definition.
 *
 * @param {any} example
 */
export const deriveSwaggerTypeFromExample = (example: unknown, recurseToDepth = 4): OpenApi.UpdatedSchema => {

  const deriveSimpleSwaggerType = (v: unknown): OpenApi.UpdatedSchema => {
    // undefined,boolean,number,bigint,string,symbol,function,object
    const t = typeof (v);
    if (t === 'string' || t === 'symbol') {
      return swaggerTypes.string;
    } else if (t === 'number') {
      return Number.isInteger(v as number) ? swaggerTypes.long : swaggerTypes.double;
    } else if (t === 'bigint') {
      return swaggerTypes.bigint;
    } else if (t === 'boolean') {
      return swaggerTypes.boolean;
    } else if (t === 'object' || t === 'function') {
      return swaggerTypes.any; // recursive evaluation of properties done outside
    } else {
      return swaggerTypes.any;
    }
  }

  if (Array.isArray(example)) {

    const types: OpenApi.UpdatedSchema[] = [];
    example.map(v => {
      const t = recurseToDepth > 1 ? deriveSwaggerTypeFromExample(v, recurseToDepth - 1) : deriveSimpleSwaggerType(v);
      const existing = types.find(_t => isEqual(_t, t));
      if (!existing) types.push(t);
    });

    if (types.length < 1) {
      types.push(swaggerTypes.any);
    }

    if (types.length === 1) {
      return {
        type: 'array',
        items: Array.from(types)[0],
      };
    } else {
      return {
        type: 'array',
        items: {
          anyOf: Array.from(types),
        },
      };
    }

  } else {

    const t = typeof (example);
    if (t === 'object' || t === 'function') {
      if (recurseToDepth <= 1) {
        return deriveSimpleSwaggerType(example);
      }
      const properties = {} as NameKeyMap<OpenApi.UpdatedSchema>;
      map(example as object, (v, k) => {
        properties[k] = {
          example: v,
          ...deriveSwaggerTypeFromExample(v, recurseToDepth - 1),
        };
      });
      return {
        type: 'object',
        properties: properties,
      };
    } else {
      return deriveSimpleSwaggerType(example);
    }

  }
}
