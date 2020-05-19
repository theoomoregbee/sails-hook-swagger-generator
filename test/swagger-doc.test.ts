import swaggerJson from './fixtures/generatedSwagger.json';
import * as fs from 'fs';
import { expect } from 'chai';

// kinda integration test that covers generatePath to
// an extent before we break the function and test each unit
// imported in bootstrap.test.ts
export default () => {
    describe('generate correct Swagger / OpenAPI 3 output (integration test)', () => {
        it('should generate expected JSON', done => {
            const generated = JSON.parse(fs.readFileSync('./swagger/swagger.json', 'utf8'));
            expect(generated).to.deep.equal(swaggerJson);
            done();
        })
    })
}
