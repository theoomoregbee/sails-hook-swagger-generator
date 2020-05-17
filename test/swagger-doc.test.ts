import swaggerJson from './fixtures/generatedSwagger.json';
import * as fs from 'fs';
import { expect } from 'chai';

// kinda integration test that covers generatePath to 
// an extent before we break the function and test each unit
// imported in bootstrap.test.ts
export default () => {
    describe('generate swagger json specification integration', () => {
        it('should generate expected json', done => {
            const generated = JSON.parse(fs.readFileSync('./swagger/swagger.json', 'utf8'));
            expect(JSON.stringify(generated)).to.be.equal(JSON.stringify(swaggerJson));
            done();
        })
    })
}