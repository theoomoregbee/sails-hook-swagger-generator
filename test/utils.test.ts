import path from 'path';
import { expect } from 'chai';
import { loadSwaggerDocComments } from '../lib/utils';
import { OpenApi } from '../types/openapi';

const sailsConfig = {
    paths: {
        models: '../../api/models'
    }
}

describe('Utils', () => {

    describe('loadSwaggerDocComments', () => {
        const fixturePath = require.resolve(path.join(sailsConfig.paths.models, 'User'))
        let doc: OpenApi.OpenApi;
        before(async () => {
          doc = await loadSwaggerDocComments(fixturePath);
        });
        it('should generate openapi v3.0.0 spec doc from swagger-doc comment', done => {
            expect(doc.openapi).equal('3.0.0');
            done()
        });
    })

})
