// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// The port for communicating back to the extension.
var benchmarkExtensionPort = chrome.runtime.connect();

// The url is what this page is known to the benchmark as.
// The benchmark uses this id to differentiate the benchmark's
// results from random pages being browsed.

// TODO(mbelshe): If the page redirects, the location changed and the
// benchmark stalls.
var benchmarkExtensionUrl = window.location.toString();

// Compute max/min/avg dom tree depth.
function computeDepth(dom) {
  var maxDepth = 0;
  var minDepth = 1024; // A random large number, the depth of a
                       // DOM tree mostly is less than that.
  var avgDepth = 0;
  var tempNode = 0;
  var tempDepth = 0;

  for (var i = 0; i < dom.length; i++) {
    tempNode = dom[i];
    tempDepth = 0;

    while (tempNode.parentNode) {
      tempNode = tempNode.parentNode;
      tempDepth++;
    }

    if (maxDepth < tempDepth) {
      maxDepth = tempDepth;
    } else if (minDepth > tempDepth) {
      minDepth = tempDepth;
    }

    avgDepth += tempDepth;
  }
  //The avg is the depth of each node divided by the num of nodes.
  avgDepth = avgDepth / dom.length;

  depths = new Array(3);
  depths[0] = maxDepth;
  depths[1] = minDepth;
  depths[2] = avgDepth;

  return depths;
}

function sendTimesToExtension() {
  if (window.parent != window) {
    return;
  }
  var load_times = window.chrome.loadTimes();
  var dom = window.document.getElementsByTagName('*');

  var depths = new Array(3);

  depths = computeDepth(dom);

  // If the load is not finished yet, schedule a timer to check again in a
  // little bit.
  if (load_times.finishLoadTime != 0) {
    benchmarkExtensionPort.postMessage({message: 'load',
                                        url: benchmarkExtensionUrl,
                                        values: load_times,
                                        domNum: dom.length,
                                        domDepths: depths });
  } else {
    window.setTimeout(sendTimesToExtension, 100);
  }
}

// We can't use the onload event because this script runs at document idle,
// which may run after the onload has completed.
sendTimesToExtension();
