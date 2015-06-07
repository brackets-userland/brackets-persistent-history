require.config({
  paths: {
    "text" : "lib/text",
    "i18n" : "lib/i18n"
  },
  locale: brackets.getLocale()
});

define(function (require, exports, module) {
  "use strict";

  var AppInit                   = brackets.getModule("utils/AppInit"),
      CommandManager            = brackets.getModule("command/CommandManager"),
      DocumentManager           = brackets.getModule("document/DocumentManager"),
      EditorManager             = brackets.getModule("editor/EditorManager"),
      ProjectManager            = brackets.getModule("project/ProjectManager"),
      PreferencesManager        = brackets.getModule("preferences/PreferencesManager"),
      Strings                   = require("strings"),
      packageJSON               = require("text!package.json"),
      COMMAND_ID                = JSON.parse(packageJSON).name,
      prefs                     = PreferencesManager.getExtensionPrefs(COMMAND_ID);

  /* 
   * @private 
   * @method _loadDocumentHistory
   * Loads the documents history from state if it exists.
   */
  function _loadDocumentHistory() {
    // TODO: On file open, check if state contains history.
    // diff the file for changes, if no outside changes have been done
    // load the history through *CodeMirror document*.getHistory()
  }
  
  /* 
   * @private 
   * @method _saveDocumentHistory
   * Saves document history on EditorManager.activeEditorChange
   */
  function _saveDocumentHistory() {
    // TODO: Get all the projects in active editor and save their
    // histories through *CodeMirror document*.setHistory()
  }
  
  /*
   * @private
   * @method _deleteDocumentHistoryPath()
   * Deletes the document history pref key for the deleted file on
   * DocumentManager.pathDeleted
   * @param {Event} evt
   * @param {String} path
   */
  function _deleteDocumentHistoryPath(evt, path) {
    //todo: delete path from state 
  }
  
  /*
   * @private
   * @method _renameDocumentHistoryOnFileRename()
   * Renames the document history pref key for the changed file on
   * DocumentManager.fileNameChange
   * @param {Event} evt
   * @param {String} oldName
   * @param {String} newName
   */  
  function _renameDocumentHistoryPathOnFileRename(evt, oldName, newName) {
    //TODO: change the name
  }
  
  /* 
   * @private 
   * @method _saveDocumentHistories
   * Save all the document histories open in the working set
   */
  function _saveDocumentHistories() {
    // TODO: Get all the projects in active editor and save their
    // histories through *CodeMirror document*.setHistory()
  }

  EditorManager.on("activeEditorChange", function (evt, editorGainingFocus, editorLosingFocus) {
    //TODO:editor gaining focus: _loadDocumentHistory
    //TODO: editor losing focus: _saveDocumentHistory
  });
  DocumentManager.on("pathDeleted", _deleteDocumentHistoryPath);
  DocumentManager.on("fileNameChange", _renameDocumentHistoryPathOnFileRename);
  ProjectManager.on("beforeProjectClose", _saveDocumentHistories);

});
