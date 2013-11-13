// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var category = chrome.experimental.devtools.audits.addCategory(
    "Broken links", 1);
category.onAuditStarted.addListener(function callback(auditResults) {
  chrome.extension.sendRequest({ tabId: webInspector.inspectedWindow.tabId },
      function(results) {
    if (!results.badlinks.length) {
      auditResults.addResult("No broken links",
                             "There are no broken links on the page!",
                             auditResults.Severity.Info);
    }
    else {
      var details = auditResults.createResult(results.badlinks.length +
          " links out of " + results.total + " are broken");
      for (var i = 0; i < results.badlinks.length; ++i) {
        details.addChild(auditResults.createURL(results.badlinks[i].href,
                                                results.badlinks[i].text));
      }
      auditResults.addResult("Broken links found (" +
                                 results.badlinks.length +
                                 ")", "",
                             auditResults.Severity.Severe,
                             details);
    }
    auditResults.done();
  });
});
