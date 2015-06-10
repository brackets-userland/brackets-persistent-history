define(function (require) {
  "use strict";

  var AppInit                   = brackets.getModule("utils/AppInit");
  var DocumentManager           = brackets.getModule("document/DocumentManager");
  var EditorManager             = brackets.getModule("editor/EditorManager");
  var FileUtils                 = brackets.getModule("file/FileUtils");
  var MainViewManager           = brackets.getModule("view/MainViewManager");
  var PreferencesManager        = brackets.getModule("preferences/PreferencesManager");
  var ProjectManager            = brackets.getModule("project/ProjectManager");

  var packageJSON               = require("text!package.json");
  var COMMAND_ID                = JSON.parse(packageJSON).name;
  var prefs                     = PreferencesManager.getExtensionPrefs(COMMAND_ID);
  var stateManager              = PreferencesManager.stateManager.getPrefixedSystem(COMMAND_ID);

  var CacheHandler              = require("modules/CacheHandler");
  var DiffHandler               = require("modules/DiffHandler");

  /* 
   * @private 
   * @method _loadDocumentHistory
   * @description Loads the documents history from state if it exists.
   * @params {CodeMirrorDocument} codeMirrorDoc Code Mirror document to set the history to
   */
  function _loadDocumentHistory(codeMirrorDoc, wasModified, cachedDoc) {
    var path = MainViewManager.getCurrentlyViewedPath();      
    var documentHistoriesInState = stateManager.get("documentHistories");

    if (documentHistoriesInState) {
      var history = documentHistoriesInState[path];

      if (history) {        
        history = JSON.parse(history);
        
        // Set editor value to cachedDoc before setting history and then set the value back to the modified file
        // so that the history applies to the modified document too.
        if (wasModified) {
          
          var currentDoc = codeMirrorDoc.getValue();
          codeMirrorDoc.setValue(cachedDoc);
          codeMirrorDoc.setHistory(history);
          codeMirrorDoc.setValue(currentDoc);
          
        } else {
          codeMirrorDoc.setHistory(history);          
        }
        
      }
    } 
  }

  /* 
   * @private 
   * @method _onGainingEditorFocus
   * @description Diff the current document against cached file, then load the history
   * @param {Editor} editor Editor that gains focus
   */
  function _onGainingEditorFocus(editor) {
    if (!editor) {
      return; 
    }

    CacheHandler.loadCopyFromCache(editor.document.file._path).then(function (tmpCopy) {
      var codeMirrorDoc = editor._codeMirror.doc;
      
      if (tmpCopy) {
        $.when(
          FileUtils.readAsText(editor.document.file),
          FileUtils.readAsText(tmpCopy)      
        ).done(function (currentDoc, cachedDoc) {
          
          DiffHandler.diffCharsAsync(currentDoc[0], cachedDoc[0]).then(
            function (wasModified) {
              _loadDocumentHistory(codeMirrorDoc, wasModified, cachedDoc[0]);
            },
            function (err) {
              throw new Error(err);
            }
          );
          
        });     
      } else {
        _loadDocumentHistory(codeMirrorDoc, false);
      }
    });
  }

  /*
   * @private
   * @method _saveDocumentHistory
   * @param {History} Code Mirror history object
   * @path {string} path
   */
  function _saveDocumentHistory(history, path) {    
    var histories = stateManager.get("documentHistories") || {};
    histories[path] = JSON.stringify(history);
    stateManager.set("documentHistories", histories);
  }

  /* 
   * @private
   * @method _saveOnActiveEditorChange
   * @description Calls _saveDocumentHistory relative to the editor that is currently losing focus
   */
  function _onLosingEditorFocus(editor) {
    if (!editor) {
      return;
    }

    var codeMirrorDoc = editor._codeMirror.doc;
    var currentPath = editor.document.file._path;
    var documentHistory = codeMirrorDoc.getHistory();
    var docHistorySizes = codeMirrorDoc.historySize();

    if (documentHistory && (docHistorySizes.undo || docHistorySizes.redo)) {
      _saveDocumentHistory(documentHistory, currentPath);
      CacheHandler.saveCopyToCache(currentPath);
    }
  }

  /*
   * @private
   * @method _detachDocumentHistory()
   * @description Detaches (deletes) and returns the document history for the deleted file on DocumentManager pathDeleted or fileNameChange
   * @param {String} path
   * @returns {String} history JSON.stringified history object, might be null
   */
  function _detachDocumentHistory(path) {
    var documentHistories = stateManager.get("documentHistories");
    var history = documentHistories[path];

    if (history) {
      delete documentHistories[path];
      CacheHandler.deleteCacheFile(path);
      stateManager.set("documentHistories", documentHistories);
    }

    return history;
  }

  /*
   * @private
   * @method _renameDocumentHistoryOnFileRename()
   * @description Renames the document history pref key for the changed file on DocumentManager.fileNameChange
   * @param {Event} evt
   * @param {String} oldName
   * @param {String} newName
   */  
  function _renameDocumentHistoryPathOnFileRename(evt, oldPath, newPath) {
    var detectedHistory = _detachDocumentHistory(null, oldPath);

    if (detectedHistory) {
      _saveDocumentHistory(detectedHistory, newPath);
    }
  }

  /* 
   * @private
   * @method _bindEventHandlers()
   * @description Binds event handlers on load and on prefs change event if prefs.persistHistory is enabled
   */
  function _bindEventHandlers() {

    EditorManager.on("activeEditorChange.persistHistory", function (evt, editorGainingFocus, editorLosingFocus) {
      _onGainingEditorFocus(editorGainingFocus);
      _onLosingEditorFocus(editorLosingFocus);
    });

    DocumentManager.on("pathDeleted.persistHistory", function (evt, path) {
      if (path.indexOf("petetnt.brackets-persistent-history/modules/cache/") === -1) {
        _detachDocumentHistory(path); 
      }
    });

    DocumentManager.on("fileNameChange.persistHistory", _renameDocumentHistoryPathOnFileRename);
    
    ProjectManager.on("beforeProjectClose.persistHistory", function () {
      var editor = EditorManager.getActiveEditor();
      _onLosingEditorFocus(editor);
    });
  }

  /*
   * @private
   * @method _unbindEventHandlers()
   * @description binds event handlers on prefs change event if prefs.persistHistory is disabled
   */ 
  function _unbindExtensionEventHandlers() {
    EditorManager.off("activeEditorChange.persistHistory");
    DocumentManager.off("pathDeleted.persistHistory fileNameChange.persistHistory");
    ProjectManager.off("beforeProjectClose.persistHistory");
  }

  /* Define preferences */
  prefs.definePreference("persistHistory", "boolean", prefs.get("persistHistory") || true).on("change", function () {
    if (prefs.get("persistHistory")) {
      _bindEventHandlers();
    } else {
      _unbindExtensionEventHandlers();
    }
  });

  prefs.definePreference("cacheTimeToLiveInDays", "number", prefs.get("cacheTimeToLiveInDays") || 14);

  /* Init cache after extensions loaded */
  AppInit.extensionsLoaded(function () {
    CacheHandler.unwatchCacheFolder();
    CacheHandler.cleanCacheFolder();
  });
});
