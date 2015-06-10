define(function (require, exports) {
  'use strict';
  var JsDiff = require("node_modules/diff/diff");

  /*
   * @method
   * @description Diff two documents by characters asyncronously
   * @param {Text} currentDoc Current document as UTF-8 text
   * @param {Text} cachedDoc Cached document as UTF-8 text
   * @returns {Deferred} dfd Resolves to changed parts
   */  
  function diffCharsAsync(currentDoc, cachedDoc) {
    var dfd = new $.Deferred();
    JsDiff.diffChars(cachedDoc, currentDoc, function (err, parts) {
      if (err) {
        dfd.reject(err); 
      }
      dfd.resolve(parts.length > 1);
    });
    
    return dfd;
  }
  
  exports.diffCharsAsync = diffCharsAsync;
});