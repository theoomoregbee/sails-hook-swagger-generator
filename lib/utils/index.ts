import { BluePrintAction } from '../interfaces';
import swaggerJSDoc from 'swagger-jsdoc';
import { OpenApi } from '../../types/openapi';
import { get, cloneDeep, defaultsDeep } from 'lodash';
import { Reference } from 'swagger-schema-official';

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
