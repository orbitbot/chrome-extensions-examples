// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var regex = /sandwich/gi;
matches = document.body.innerText.match(regex);
if (matches) {
  var payload = {
    count: matches.length    // Pass the number of matches back.
  };
  chrome.extension.sendRequest(payload, function(response) {});
}
