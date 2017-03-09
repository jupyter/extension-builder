
var buildExtension = require('../lib/builder').buildExtension;

buildExtension({
    name: 'test',
    entry: './test.js',
    outputDir: 'build'
})
