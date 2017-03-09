
var buildExtension = require('../lib/builder').buildExtension;
var fs = require('fs');
var expect = require('expect.js');


buildExtension({
    name: 'test',
    entry: './test.js',
    outputDir: 'build'
}).then(function() {
    var path = './build/test.bundle.js.manifest';
    var manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
    expect(manifest.name).to.be('test');
    expect(manifest.files).to.eql(['test.bundle.js']);
});


