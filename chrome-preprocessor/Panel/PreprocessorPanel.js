// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function() {

// This function is converted to a string and becomes the preprocessor
function preprocessor(source, url, listenerName) {
  url = url ? url : '(eval)';
  url += listenerName ? '_' + listenerName : '';
  var prefix = 'window.__preprocessed = window.__preprocessed || [];\n';
  prefix += 'window.__preprocessed.push(\'' + url +'\');\n';
  var postfix = '\n//# sourceURL=' + url + '.js\n';
  return prefix + source + postfix;
}

function extractPreprocessedFiles(onExtracted) {
  var expr = 'window.__preprocessed';
  function onEval(files, isException) {
    if (isException)
      throw new Error('Eval failed for ' + expr, isException.value);
    onExtracted(files);
  }
  chrome.devtools.inspectedWindow.eval(expr, onEval);
}

function reloadWithPreprocessor(injectedScript) {
  var options = {
    ignoreCache: true,
    userAgent: undefined,
    injectedScript: '(' + injectedScript  + ')()',
    preprocessingScript: '(' + preprocessor + ')'
  };
  chrome.devtools.inspectedWindow.reload(options);
}

function demoPreprocessor() {
  function onLoaded() {
    extractPreprocessedFiles(updateUI);
  }
  var loadMonitor = new InspectedWindow.LoadMonitor(onLoaded);
  reloadWithPreprocessor(loadMonitor.injectedScript);
}

function listen() {
  var reloadButton = document.querySelector('.reload-button');
  reloadButton.addEventListener('click', demoPreprocessor);
}

window.addEventListener('load', listen);

function createRow(url) {
  var li = document.createElement('li');
  li.textContent = url;
  return li;
}

function updateUI(preprocessedFiles) {
  var rowContainer = document.querySelector('.js-preprocessed-urls');
  rowContainer.innerHTML = '';
  preprocessedFiles.forEach(function(url) {
    rowContainer.appendChild(createRow(url));
  });
}

})();


