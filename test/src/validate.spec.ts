// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  validateEntry
} from '../../lib/validate';


describe('validate', () => {

  describe('validateEntry()', () => {

    it('should pass for a valid plugin array', () => {
      validateEntry([{
        id: 'foo',
        activate: () => { /* no-op */ }
      }, {
        id: 'bar',
        activate: () => { /* no-op */ }
      }]);
    });

    it('should pass for a valid plugin', () => {
      validateEntry({
        id: 'foo',
        activate: () => { /* no-op */ }
      });
    });

    it('should pass for an ES6 default', () => {
      validateEntry({
        __esModule: true,
        default: {
          id: 'foo',
          activate: () => { /* no-op */ }
        }
      });
    });

    it('should fail if it is an empty array', () => {
      expect(() => { validateEntry([]); }).to.throwError();
    });

    it('should fail if a plugin is missing an id', () => {
      let activate: () => { /* no-op */ };
      expect(() => { validateEntry({ activate }); }).to.throwError();
    });

    it('should fail if a plugin is missing an activate function', () => {
      expect(() => { validateEntry({ id: 'foo' }); }).to.throwError();
    });

  });

});
