// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Force all downloads to overwrite any existing files instead of inserting
// ' (1)', ' (2)', etc.

chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
  suggest({filename: item.filename,
           conflict_action: 'overwrite',
           conflictAction: 'overwrite'});
  // conflict_action was renamed to conflictAction in
  // http://src.chromium.org/viewvc/chrome?view=rev&revision=214133
  // which was first picked up in branch 1580.
});
