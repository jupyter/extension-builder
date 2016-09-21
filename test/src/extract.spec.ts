// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  extractPlugins
} from '../../lib/extract';


describe('extract', () => {

  describe('extractPlugins()', () => {

    it('should pass for a valid plugin array', () => {
      extractPlugins([{
        id: 'foo',
        activate: () => { /* no-op */ }
      }, {
        id: 'bar',
        activate: () => { /* no-op */ }
      }]);
    });

    it('should pass for a valid plugin', () => {
      extractPlugins({
        id: 'foo',
        activate: () => { /* no-op */ }
      });
    });

    it('should pass for an ES6 default', () => {
      extractPlugins({
        __esModule: true,
        default: {
          id: 'foo',
          activate: () => { /* no-op */ }
        }
      });
    });

    it('should fail if it is an empty array', () => {
      expect(() => { extractPlugins([]); }).to.throwError();
    });

    it('should fail if a plugin is missing an id', () => {
      let activate: () => { /* no-op */ };
      expect(() => { extractPlugins({ activate }); }).to.throwError();
    });

    it('should fail if a plugin is missing an activate function', () => {
      expect(() => { extractPlugins({ id: 'foo' }); }).to.throwError();
    });

  });

});
