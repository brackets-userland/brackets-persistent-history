define(function (require, exports, module) {
  'use strict';
  var FileSystem                = brackets.getModule("filesystem/FileSystem");
  var PreferencesManager        = brackets.getModule("preferences/PreferencesManager");
  var ProjectManager            = brackets.getModule("project/ProjectManager");

  var ExtensionUtils            = brackets.getModule("utils/ExtensionUtils");
  var packageJSON               = require("text!../package.json");
  var COMMAND_ID                = JSON.parse(packageJSON).name;
  var prefs                     = PreferencesManager.getExtensionPrefs(COMMAND_ID);
  var cacheDirPath              = ExtensionUtils.getModulePath(module, "cache/");

  var crypto = require("node_modules/crypto/sha1");

  /*
   * @public
   * @method loadCopyFromCache
   * @description Load a copy from cache for diffing
   * @returns {Promise} dfd Deferred that resolves to null or file
   */
  function loadCopyFromCache(fileToLoadPath) {
    var dfd = new $.Deferred();
    var sha1 = crypto.hex_sha1(fileToLoadPath).substring(0, 10); // jshint ignore:line  
    var tmpFilePath = cacheDirPath + sha1 + ".tmp";

    FileSystem.resolve(tmpFilePath, function (err, file) {
      if (err) {
        return dfd.resolve(null);
      } else {
        return dfd.resolve(file);
      }
    });
    
    return dfd;
  } 
  
  /*
   * @public
   * @method saveCopyToCache
   * @description save copy to cache for diffing
   * @param {String} path Path to file
   */  
  function saveCopyToCache(fileToCopyPath) {
    var sha1 = crypto.hex_sha1(fileToCopyPath).substring(0, 10); // jshint ignore:line
    var destinationPath = cacheDirPath + sha1 + ".tmp";
    var dfd = new $.Deferred();

    brackets.fs.copyFile(fileToCopyPath, destinationPath, function (err) {
      if (err === brackets.fs.NO_ERROR) {
        dfd.resolve();
      } else {
        dfd.reject(err);
      }
    });

    return dfd;
  }

  /*
   * @public
   * @method _cleanCacheFolder
   * @description clean cache folder for files that are older than 14 days.
   */
  function cleanCacheFolder() {
    var tmpDir = FileSystem.getDirectoryForPath(cacheDirPath);
    tmpDir.getContents(function (err, contents, contentsStats) {
      if (err) {
        console.log(err); 
      }

      contents.forEach(function (file, index) {
        var mtime = Date.parse(contentsStats[index]._mtime);
        var timeNow = Date.now();
        var cacheTTL = prefs.get("cacheTimeToLiveInDays") || 14;
        var endTime = mtime + (cacheTTL * 24 * 60 * 60 * 1000);
        if (timeNow > endTime) {
          ProjectManager.deleteItem(file);
        }
      });
    });
  }

  exports.loadCopyFromCache = loadCopyFromCache;
  exports.saveCopyToCache   = saveCopyToCache;
  exports.cleanCacheFolder  = cleanCacheFolder;

});