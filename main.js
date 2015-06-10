define(function (require) {
  "use strict";

  var AppInit                   = brackets.getModule("utils/AppInit");
  var DocumentManager           = brackets.getModule("document/DocumentManager");
  var EditorManager             = brackets.getModule("editor/EditorManager");
  var FileUtils                 = brackets.getModule("file/FileUtils");
  var MainViewManager           = brackets.getModule("view/MainViewManager");
  var PreferencesManager        = brackets.getModule("preferences/PreferencesManager");

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
        
        if (wasModified) {
          console.log("was modifed outside of Brackets, should invalidate redos and and do so that one CTRL+Z brings doc to cachedDoc-state");
        }
        
        codeMirrorDoc.setHistory(history);
      }
    } 
  }

  /* 
   * @private 
   * @method _loadDocumentHistory
   * @description Diff the current document against cached file, then load the history
   * @param {Editor} editor Editor that gains focus
   */
  function _loadOnActiveEditorChange(editor) {
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
  function _saveOnActiveEditorChange(editor) {
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
      _loadOnActiveEditorChange(editorGainingFocus);
      _saveOnActiveEditorChange(editorLosingFocus);
    });

    DocumentManager.on("pathDeleted.persistHistory", function (evt, path) {
      _detachDocumentHistory(path); 
    });

    DocumentManager.on("fileNameChange.persistHistory", _renameDocumentHistoryPathOnFileRename);
  }

  /*
   * @private
   * @method _unbindEventHandlers()
   * @description binds event handlers on prefs change event if prefs.persistHistory is disabled
   */ 
  function _unbindExtensionEventHandlers() {
    EditorManager.off("activeEditorChange.persistHistory");
    DocumentManager.off("pathDeleted.persistHistory fileNameChange.persistHistory");
  }

  /* Define preferences */
  prefs.definePreference("persistHistory", "boolean", prefs.get("persistHistory") || true).on("change", function () {
    if (prefs.get("persistHistory")) {
      _bindEventHandlers();
    } else {
      _unbindExtensionEventHandlers();
    }
  });

  prefs.definePreference("cacheTimeToLiveInDays", "number", 14);

  /* Init */
  AppInit.extensionsLoaded(CacheHandler.cleanCacheFolder);
});
