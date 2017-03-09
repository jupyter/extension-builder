// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  buildExtension
} from '../../lib';

let fs = (require as any)('fs');


describe('builder', () => {

  it('should build the assets', () => {
    return buildExtension({
        name: 'test',
        entry: './build/test.js',
        outputDir: 'build'
    }).then(function() {
        let path = './build/test.bundle.js.manifest';
        let manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
        expect(manifest.name).to.be('test');
        expect(manifest.files).to.eql(['test.bundle.js', 'test.css']);
    });
  });

});
