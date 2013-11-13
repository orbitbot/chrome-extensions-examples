// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Round a number to the 1's place.
function formatNumber(str) {
  str += '';
  if (str == '0') {
    return 'N/A ';
  }
  var x = str.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var regex = /(\d+)(\d{3})/;
  while (regex.test(x1)) {
    x1 = x1.replace(regex, '$1' + ',' + '$2');
  }
  return x1;
}

// Configuration and results are stored globally.
window.iterations = 10;
window.interval = 200;
window.clearConnections = true;
window.clearCache = true;
window.enableSpdy = false;
window.results = {};
window.results.data = new Array();
window.testUrl = "http://www.google.com/";
window.windowId = 0;

// Constant StatCounter Names
var kTCPReadBytes = "tcp.read_bytes";
var kTCPWriteBytes = "tcp.write_bytes";
var kRequestCount = "HttpNetworkTransaction.Count";
var kConnectCount = "tcp.connect";
var kSpdySessionCount = "spdy.sessions";

// The list of currently running benchmarks
var benchmarks = new Array();
var benchmarkIndex = 0;
var benchmarkWindow = 0;

function addBenchmark(benchmark) {
  benchmarks.push(benchmark);
  benchmarkIndex = 0;  // Reset the counter when adding benchmarks.
}

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

function removeBenchmark(benchmark) {
  var index;
  for (var index = 0; index < benchmarks.length; ++index) {
    if (benchmarks[index] == benchmark) {
      break;
    }
  }
  benchmarks.remove(index);

  // Preserve index ordering when removing from the list.
  if (index <= benchmarkIndex) {
    benchmarkIndex--;  // Note:  it is okay to drop to -1 here.
  }
}

function benchmarkStillRunning() {
  for (var index = 0; index < benchmarks.length; ++index) {
    if (benchmarks[index].isRunning()) {
      return true;
    }
  }
  return false;
}

function findBenchmark(url) {
  for (var index = 0; index < benchmarks.length; ++index) {
    // One common redirection case: if the url ends without a slash and refers
    // to a directory, it actually would be redirected to the correct one
    // (with a slash). In this case, the url returned by the JS and the one
    // stored locally do not match.
    if ((benchmarks[index].url() == url) ||
        (benchmarks[index].url() + '/' == url)) {
      return benchmarks[index];
    }
  }
  return undefined;
}

function nextBenchmark() {
  benchmarkIndex = (benchmarkIndex + 1) % benchmarks.length;
  return benchmarks[benchmarkIndex];
}

function show_options(tabs) {
  var tab = tabs[0];
  if (window.testUrl == "") {
    window.testUrl = tab.url;
  }
  var tabs = chrome.extension.getViews({"type": "tab"});
  if (tabs && tabs.length) {
    // To avoid "Uncaught TypeError: Object Window has no method
    // 'setUrl' ". Sometimes tabs are not the desired extension tabs.
    if (tabs[0].$suburl != undefined) {
      tabs[0].setUrl(testUrl);
    }
    var optionsUrl = chrome.extension.getURL("options.html");
    chrome.tabs.getAllInWindow(null, function(all) {
      for (var i = 0; i < all.length; i++) {
        if (all[i].url == optionsUrl) {
          chrome.tabs.update(all[i].id, {selected: true});
          return;
        }
      }
    });
  } else {
    chrome.tabs.create({"url":"options.html"});
  }
}

chrome.browserAction.onClicked.addListener(show_options);

function Benchmark() {
  var runCount_ = 0;
  var count_;
  var totalTime_;
  var me_ = this;
  var current_;
  var initialRequestCount_;
  var initialReadBytes_;
  var initialWriteBytes_;

  // Start a test run
  this.start = function(url) {
    // Check if a run is already in progress.
    if (me_.isRunning()) {
      return;
    }

    console.log("Benchmark testing url: " + url);

    // Add this benchmark to the list of benchmarks running.
    addBenchmark(this);

    runCount_ = window.iterations;
    count_ = 0;
    totalTime_ = 0;

    current_ = {};
    current_.url = url;
    current_.timestamp = new Date();
    current_.viaSpdy = false;
    current_.startLoadResults = new Array();  // times to start
    current_.commitLoadResults = new Array();  // times to commit
    current_.docLoadResults = new Array();  // times to docload
    current_.paintResults = new Array();    // times to paint
    current_.totalResults = new Array();    // times to complete load
    current_.KbytesRead = new Array();
    current_.KbytesWritten = new Array();
    current_.readbpsResults = new Array();
    current_.writebpsResults = new Array();
    current_.totalTime = 0;
    current_.iterations = 0;
    current_.requests = new Array();
    current_.connects = new Array();
    current_.spdySessions = new Array();
    current_.domNum = 0;
    current_.maxDepth = 0;
    current_.minDepth = 0;
    current_.avgDepth = 0;
  };

  // Is the benchmark currently in progress.
  this.isRunning = function() {
    return runCount_ > 0;
  };

  // The url which this benchmark is running.
  this.url = function() { return current_.url; }

  // Called when the test run completes.
  this.finish = function() {
    removeBenchmark(this);

    // If we're the last benchmark, close the window.
    if (benchmarks.length == 0) {
      chrome.tabs.remove(benchmarkWindow.id);
      benchmarkWindow = 0;
      chrome.tabs.query({active: true, currentWindow: true}, show_options);
    }
  };

  // Update the UI after a test run.
  this.displayResults = function() {
    var score = 0;
    if (count_ > 0) {
      score = totalTime_ / count_;
      var text = score.toFixed(1) + "ms avg";
      chrome.browserAction.setTitle({"title": text});
    }
    if (runCount_) {
      chrome.browserAction.setBadgeText({"text": "" + runCount_});
      chrome.browserAction.setBadgeBackgroundColor({"color": [255, 0, 0, 255]});
    } else {
      chrome.browserAction.setBadgeText({"text": "" + score.toFixed()});
      chrome.browserAction.setBadgeBackgroundColor({"color": [0, 255, 0, 255]});
    }

    // Reload the page after each run to show immediate results.
    var tabs = chrome.extension.getViews({"type": "tab"});
    if (tabs && tabs.length) {
      tabs[0].location.reload(true);
    }
  };

  // Called before starting a page load.
  this.pageStart = function() {
    initialReadBytes_ = chrome.benchmarking.counter(kTCPReadBytes);
    initialWriteBytes_ = chrome.benchmarking.counter(kTCPWriteBytes);
    initialRequestCount_ = chrome.benchmarking.counter(kRequestCount);
    initialConnectCount_ = chrome.benchmarking.counter(kConnectCount);
    initialSpdySessionCount_ = chrome.benchmarking.counter(kSpdySessionCount);
  };

  this.openNextPage = function() {
    var benchmark = nextBenchmark();
    benchmark.pageStart();
    chrome.tabs.create({"url": benchmark.url(),"selected": true},
                       function(tab) {
                         benchmarkWindow = tab;
                         // script.js only executes on tested pages
                         // not the ones opened by the user.
                         chrome.tabs.executeScript(tab.id, {file: "script.js"});
                        });
  };

  this.prepareToOpenPage = function() {
    // After the previous page is closed, this function will apply
    // any settings needed to prepare for opening a new page.
    // Note: the previous page must be closed, otherwie, the cache
    // clearing and connection clearing may not be thorough.

    if (window.clearCache) {
      chrome.benchmarking.clearCache();
    }

    if (window.clearConnections) {
      chrome.benchmarking.closeConnections();
    }

    if (window.enableSpdy) {
      chrome.benchmarking.enableSpdy(true);
    } else {
      chrome.benchmarking.enableSpdy(false);
    }

    // Go back to the browser so that tasks can run.
    setTimeout(me_.openNextPage, window.interval);
  };

  this.closePage = function() {
    chrome.tabs.remove(benchmarkWindow.id, function() {
      me_.prepareToOpenPage();
    });
  };

  // Run a single page in the benchmark
  this.runPage = function() {
    if (benchmarkWindow) {
      // To avoid the error "Error during tabs.remove: No tab with id xx"
      // while debugging, due to user manually closing the benchmark tab.
      chrome.tabs.getAllInWindow(null, function(all) {
        for (var i = 0; i < all.length; i++) {
          if (all[i].id == benchmarkWindow.id) {
            me_.closePage();
             return;
          };
        };
        me_.prepareToOpenPage();
      });
    } else {
      me_.prepareToOpenPage();
    }
  };

  // Called when a page finishes loading.
  this.pageFinished = function(load_times, domNum, depths) {

     // Make sure the content can be fetched via spdy if it is enabled.
    if (window.enableSpdy && !load_times.wasFetchedViaSpdy) {
      alert("Can not fetch current url via spdy.\n" +
            "Ending current test.");
      me_.finish();
      // Move on to next benchmarked pages.
      if (benchmarks.length > 0) {
        if (window.clearConnections) {
          chrome.benchmarking.closeConnections();
        }
        setTimeout(me_.runPage, 100);
      }
      return;
    }

    // If last fetch was via spdy, current fetch should use spdy too. Same
    // for vise versa.
    if (current_.iterations > 0 &&
        current_.viaSpdy != load_times.wasFetchedViaSpdy) {
      alert("Error: viaSpdy for current fetch is different from last fetch!\n" +
            "Ending current test.");
      // Current data set is invalid: remove from the result array.
      var currIndex;
      currIndex = window.results.data.indexOf(current_, 0);
      window.results.data.splice(currIndex, 1);
      me_.displayResults();
      me_.finish();
      if (benchmarks.length > 0) {
        if (window.clearConnections) {
          chrome.benchmarking.closeConnections();
        }
        setTimeout(me_.runPage, 100);
      }
      return;
    }

    var requested = load_times.requestTime;
    var started = load_times.startLoadTime;
    var startLoadTime =
        Math.round((load_times.startLoadTime - requested) * 1000.0);
    var commitLoadTime =
        Math.round((load_times.commitLoadTime - started) * 1000.0);
    var docLoadTime =
        Math.round((load_times.finishDocumentLoadTime - started) * 1000.0);
    var paintTime =
        Math.round((load_times.firstPaintTime - started) * 1000.0);
    var totalTime =
        Math.round((load_times.finishLoadTime - started) * 1000.0);
    var firstPaintAfterLoadTime =
        Math.round((load_times.firstPaintAfterLoadTime - started) * 1000.0);

    if (paintTime < 0) {
      // If the user navigates away from the test while it is running,
      // paint may not occur.  Also, some lightweight pages, such as the
      // google home page, never trigger a paint measurement via the chrome
      // page load timer.
      // In this case, the time-to-first paint is effectively the same as the
      // time to onLoad().
      paintTime = totalTime;
    }

    // For our toolbar counters
    totalTime_ += totalTime;
    count_++;

    // Get the index of current benchmarked page in the result array.
    var currIndex;
    currIndex = window.results.data.indexOf(current_, 0);

    // Record the result
    current_.viaSpdy = load_times.wasFetchedViaSpdy;
    current_.iterations++;
    current_.startLoadResults.push(startLoadTime);
    current_.commitLoadResults.push(commitLoadTime);
    current_.docLoadResults.push(docLoadTime);
    current_.paintResults.push(paintTime);
    current_.totalResults.push(totalTime);
    var bytesRead = chrome.benchmarking.counter(kTCPReadBytes) -
                                              initialReadBytes_;
    var bytesWrite = chrome.benchmarking.counter(kTCPWriteBytes) -
                                               initialWriteBytes_;
    current_.KbytesRead.push(bytesRead / 1024);
    current_.KbytesWritten.push(bytesWrite / 1024);
    current_.readbpsResults.push(bytesRead * 8 / totalTime);
    current_.writebpsResults.push(bytesWrite * 8 / totalTime);
    current_.requests.push(chrome.benchmarking.counter(kRequestCount) -
                         initialRequestCount_);
    current_.connects.push(chrome.benchmarking.counter(kConnectCount) -
                         initialConnectCount_);
    current_.spdySessions.push(chrome.benchmarking.counter(kSpdySessionCount) -
                         initialSpdySessionCount_);
    current_.totalTime += totalTime;
    current_.domNum = domNum;
    current_.maxDepth = depths[0];
    current_.minDepth = depths[1];
    current_.avgDepth = depths[2];

    // Insert or update the result data after each run.
    if (currIndex == -1) {
      window.results.data.push(current_);
    } else {
      window.results.data[currIndex] = current_;
    }

    if (--runCount_ == 0) {
      me_.finish();
    }

    // If there are more tests, schedule them
    if (runCount_ > 0 || benchmarks.length > 0) {
      if (window.clearConnections) {
        chrome.benchmarking.closeConnections();
      }
      setTimeout(me_.runPage, 100);
    }

    // Update the UI
    me_.displayResults();
  };
}

chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(data) {
    if (data.message == "load") {
      var benchmark = findBenchmark(data.url);
      if (benchmark == undefined && benchmarkStillRunning()) {
        alert("Error: Loaded url(" + data.url + ") is not the same as what " +
              "you set in url box. This could happen if the request is " +
              "redirected. Please use the redirected url for testing.");
        // Stop the test here.
        benchmarks = [];
      }
      if (benchmark != undefined && benchmark.isRunning()) {
        benchmark.pageFinished(data.values, data.domNum, data.domDepths);
      }
    }
  });
});

function run() {
  if (window.clearCache) {
    // Show a warning if we will try to clear the cache between runs
    // but will also be reusing the same WebKit instance (i.e. Chrome
    // is in single-process mode) because the WebKit cache might not get
    // completely cleared between runs.
    if (chrome.benchmarking.isSingleProcess()) {
      alert("Warning: the WebKit cache may not be cleared correctly " +
            "between runs because Chrome is running in single-process mode.");
    }
  }
  benchmarks = [];
  var urls = testUrl.split(",");
  for (var i = 0; i < urls.length; i++) {

    // Remove extra space at the beginning or end of a url.
    urls[i] = removeSpace(urls[i]);

    // Alert about and ignore blank page which does not get loaded.
    if (urls[i] == "about:blank") {
      alert("blank page loaded!");
    } else if (!checkScheme(urls[i])) {
      // Alert about url that is not in scheme http:// or https://.
      alert(urls[i] + " does not start with http:// or https://.");
    } else {
      var benchmark = new Benchmark();
      benchmark.start(urls[i]);  // XXXMB - move to constructor
    }
  }
  benchmarks[0].runPage();
}

// Remove extra whitespace in the beginning or end of a url string.
function removeSpace(url) {
  var tempUrl = url;
  while (tempUrl.charAt(tempUrl.length-1) == " ") {
    tempUrl = tempUrl.substring(0, tempUrl.length-1);
  };
  while (tempUrl.charAt(0) == " ") {
    tempUrl = tempUrl.substring(1, tempUrl.length);
  };
  return tempUrl;
}

// Check whether a Url starts with http:// or https://.
function checkScheme(url) {
  var httpStr = "http://";
  var httpsStr = "https://";
  var urlSubStr1 = url.substring(0, httpStr.length);
  var urlSubStr2 = url.substring(0, httpsStr.length);

  if ( (urlSubStr1 == httpStr) || (urlSubStr2 == httpsStr) ) {
    return true;
  }
  return false;
}

// Run at startup
chrome.windows.getCurrent(function(currentWindow) {
  window.windowId = currentWindow.id;
});
