// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Obtain the count of sandwiches from the page URL.
var count = window.location.hash.substring(1);
if (count) {
  // Replace the placeholder text with the actual count.
  var domcount = document.querySelector('#count');
  domcount.innerText = count;
}