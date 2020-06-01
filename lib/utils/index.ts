import { BluePrintAction } from '../interfaces';
import swaggerJSDoc from 'swagger-jsdoc';
import { OpenApi } from '../../types/openapi';
import { get } from 'lodash';
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
