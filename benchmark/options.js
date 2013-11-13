// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var max_sample = 0;

Array.max = function(array) {
  return Math.max.apply( Math, array );
}

Array.min = function(array) {
  return Math.min.apply( Math, array );
};

// Compute the average of an array, removing the min/max.
Array.avg = function(array) {
  var count = array.length;
  var sum = 0;
  var min = array[0];
  var max = array[0];
  for (var i = 0; i < count; i++) {
    sum += array[i];
    if (array[i] < min) {
      min = array[i];
    }
    if (array[i] > max) {
      max = array[i];
    }
  }
  if (count >= 3) {
    sum = sum - min - max;
    count -= 2;
  }
  return sum / count;
}

// Compute the sample standard deviation of an array
Array.stddev = function(array) {
  var count = array.length;
  var mean = 0;
  for (var i = 0; i < count; i++) {
    mean += array[i];
  }
  mean /= count;
  var variance = 0;
  for (var i = 0; i < count; i++) {
    var deviation = mean - array[i];
    variance = variance + deviation * deviation;
  }
  variance = variance / (count - 1);
  return Math.sqrt(variance);
}

function handleFileSelect(evt) {
  var files = evt.target.files;
  for (var i = 0, f; f = files[i]; i++) {
    var reader = new FileReader();
    reader.onload = function(evt) {
      document.getElementById("testurl").value = evt.target.result;
    }
    reader.readAsText(f);
  };
}

var THTAG = "th";
var TDTAG = "td";
var NONE_DISPLAY = "none";
var CELL_DISPLAY = "table-cell";
var BRIEF_VIEW = "Show More Details";
var FULL_VIEW = "Hide Details";

// Expand or shrink the result table.
// Called when clicking button "Show More Details/Hide Details".
function expand() {
  if (document.getElementById("expand").value == BRIEF_VIEW) {
    // From biref view to detailed view.
    var headers = document.getElementsByTagName(THTAG);
    var cells = document.getElementsByTagName(TDTAG);

    // Display the hidden metrics (both headers and data cells).
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].style.display == NONE_DISPLAY) {
        headers[i].style.display = CELL_DISPLAY;
      }
    }

    for (i = 0; i < cells.length; i++) {
      if (cells[i].style.display == NONE_DISPLAY) {
        cells[i].style.display = CELL_DISPLAY;
      }
    }

    document.getElementById("expand").value = FULL_VIEW;
  } else {
    // From detailed view to brief view.
    var headers = document.getElementsByTagName(THTAG);
    var cells = document.getElementsByTagName(TDTAG);

    // Hide some metrics.
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].style.display == CELL_DISPLAY) {
        headers[i].style.display = NONE_DISPLAY;
      }
    }

    for (i = 0; i < cells.length; i++) {
      if (cells[i].style.display == CELL_DISPLAY) {
        cells[i].style.display = NONE_DISPLAY;
      }
    }

    document.getElementById("expand").value = BRIEF_VIEW;
  }

  // Use cookie to store current expand/hide status.
  var lastValue = document.getElementById("expand").value;
  document.cookie = "lastValue=" + lastValue;
}

// Reloading the page causes table to shrink (default original status).
// Cookie remembers last status of table (in terms of expanded or shrunk).
function restoreTable() {
  if (document.cookie == "lastValue=Hide Details") {
    var headers = document.getElementsByTagName(THTAG);
    var cells = document.getElementsByTagName(TDTAG);

    for (var i = 0; i < headers.length; i++) {
      if (headers[i].style.display == NONE_DISPLAY) {
        headers[i].style.display = CELL_DISPLAY;
      }
    }
    for (i = 0; i < cells.length; i++) {
      if (cells[i].style.display == NONE_DISPLAY) {
        cells[i].style.display = CELL_DISPLAY;
      }
    }
    document.getElementById("expand").value = FULL_VIEW;
  }
}

// A class to store the data to plot.
function PData() {
  this.xAxis = "Iteration(s)";
  this.yAxis = "";
  this.A = []; // Two data sets for comparison.
  this.B = [];
  this.avgA = [];  // Avg value is plotted as a line.
  this.avgB = [];
  this.maxA = 0;
  this.maxB = 0;
  this.countA = 0; // Size of the data sets.
  this.countB = 0;

  this.setYAxis = function(str) {
    this.yAxis = str;
  }

  this.setAvg = function(arr, cha) {
    if (cha == 'A') {
      var avgA = Array.avg(arr);
      for (var i = 1; i <= this.countA; i++) {
        this.avgA.push([i, avgA]);
      }
    } else if (cha == 'B') {
      var avgB = Array.avg(arr);
      for (var i = 1; i <= this.countB; i++) {
        this.avgB.push([i, avgB]);
      }
    }
  }

  this.setMax = function(arr, cha) {
    if (cha == 'A') {
      this.maxA = Array.max(arr);
    } else if (cha == 'B') {
      this.maxB = Array.max(arr);
    }
  }

  // Add an entry to the array.
  this.addArr = function(val, cha) {
    if (cha == 'A') {
      this.countA++;
      this.A.push([this.countA, val]);
    } else if (cha == 'B') {
      this.countB++;
      this.B.push([this.countB, val]);
    }
  }

  // Plot the graph at the specified place.
  this.plot = function(placeholder) {
    $.plot(placeholder,
      [// Line A
       {
         data: this.A,
         label: "A's " + this.yAxis + " in " + this.countA + " " + this.xAxis,
         points: {
           show: true
         },
         lines: {
           show: true
         }
       },

       // Line B
       {
         data: this.B,
         label: "B's " + this.yAxis + " in " + this.countB + " " + this.xAxis,
         points: {
           show: true
         },
         lines: {
           show: true
         }
       },

       // Line avgA
       {
         data: this.avgA,
         label: "A's avg " + this.yAxis,
         dashes: {
           show: true
         }
       },

       // Line avgB
       {
         data: this.avgB,
         label: "B's avg " + this.yAxis,
         dashes: {
           show: true
         }
       }],

       // Axis and legend setup.
       { xaxis: {
           max: this.countA > this.countB ? this.countA : this.countB,
           tickSize: 1,
           tickDecimals: 0
         },
         yaxis: {
           // Leave some space for legend.
           max: this.maxA > this.maxB ? this.maxA * 1.5 : this.maxB * 1.5
         },
         legend: {
           backgroundOpacity: 0
         }
       });
  }
}

// Compare the selected metric of the two selected data sets.
function compare() {
  var checkboxArr = document.getElementsByName("checkboxArr");
  var radioArr = document.getElementsByName("radioArr");

  if (checkAmount(checkboxArr) != 2) {
    alert("please select two rows to compare");
    return;
  }

  var rowIndexArr = getSelectedIndex(checkboxArr);
  var colIndexArr = getSelectedIndex(radioArr);
  // To this point, it is for sure that rowIndexArr has two elements
  // while colIndexArr has one.
  var selectedRowA = rowIndexArr[0];
  var selectedRowB = rowIndexArr[1];
  var selectedCol = colIndexArr[0];

  var extension = chrome.extension.getBackgroundPage();
  var data = extension.results.data;
  var selectedA = getSelectedResults(data,selectedRowA,selectedCol);
  var selectedB = getSelectedResults(data,selectedRowB,selectedCol);
  var yAxis = getMetricName(selectedCol);

  // Indicate A and B on selected rows.
  checkboxArr[selectedRowA].parentElement.firstChild.data = "A";
  checkboxArr[selectedRowB].parentElement.firstChild.data = "B";

  plot(selectedA, selectedB, yAxis);
}

// Show the comparison graph.
function plot(A, B, axis) {
  var plotData = new PData();

  plotData.setYAxis(axis);
  for (var i = 0; i < A.length; i++) {
    plotData.addArr(A[i],'A');
  }
  for (var i = 0; i < B.length; i++) {
    plotData.addArr(B[i],'B');
  }
  plotData.setAvg(A,'A');
  plotData.setAvg(B,'B');
  plotData.setMax(A,'A');
  plotData.setMax(B,'B');

  var placeholder = document.getElementById("placeholder");
  placeholder.style.display = "";
  plotData.plot(placeholder);
}

var METRIC = {"STARTLOAD": 0, "COMMITLOAD": 1, "DOCLOAD": 2, "PAINT": 3,
               "TOTAL": 4, "REQUESTS": 5, "CONNECTS": 6, "READKB": 7,
               "WRITEKB": 8, "READKBPS": 9, "WRITEKBPS": 10};

// Retrieve the metric name from index.
function getMetricName(index) {
  switch (index) {
    case METRIC.STARTLOAD:
      return "Start Load Time";
    case METRIC.COMMITLOAD:
      return "Commit Load Time";
    case METRIC.DOCLOAD:
      return "Doc Load Time";
    case METRIC.PAINT:
      return "Paint Time";
    case METRIC.TOTAL:
      return "Total Load Time";
    case METRIC.REQUESTS:
      return "# Requests";
    case METRIC.CONNECTS:
      return "# Connects";
    case METRIC.READKB:
      return "Read KB";
    case METRIC.WRITEKB:
      return "Write KB";
    case METRIC.READKBPS:
      return "Read KBps";
    case METRIC.WRITEKBPS:
      return "Write KBps";
    default:
      return "";
  }
}

// Get the results with a specific row (data set) and column (metric).
function getSelectedResults(arr, rowIndex, colIndex) {
  switch (colIndex) {
    case METRIC.STARTLOAD:
      return arr[rowIndex].startLoadResults;
    case METRIC.COMMITLOAD:
      return arr[rowIndex].commitLoadResults;
    case METRIC.DOCLOAD:
      return arr[rowIndex].docLoadResults;
    case METRIC.PAINT:
      return arr[rowIndex].paintResults;
    case METRIC.TOTAL:
      return arr[rowIndex].totalResults;
    case METRIC.REQUESTS:
      return arr[rowIndex].requests;
    case METRIC.CONNECTS:
      return arr[rowIndex].connects;
    case METRIC.READKB:
      return arr[rowIndex].KbytesRead;
    case METRIC.WRITEKB:
      return arr[rowIndex].KbytesWritten;
    case METRIC.READKBPS:
      return arr[rowIndex].readbpsResults;
    case METRIC.WRITEKBPS:
      return arr[rowIndex].writebpsResults;
    default:
      return undefined;
  }
}

// Ensure only two data sets (rows) are selected.
function checkAmount(arr) {
  var amount = 0;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].checked) {
      amount++;
    }
  }
  return amount;
}

// Get the index of selected row or column.
function getSelectedIndex(arr) {
  var selectedArr = new Array();
  for (var i = 0; i < arr.length; i++) {
    if(arr[i].checked) {
      selectedArr.push(i);
    }
  }
  return selectedArr;
}

// Repaint or hide the chart.
function updateChart(caller) {
  var placeholder = document.getElementById("placeholder");
  if (caller.type == "radio") {
    // Other radio button is clicked.
    if (placeholder.style.display == "") {
      compare();
    }
  } else {
    // Other checkbox or clearing results is clicked.
    if (placeholder.style.display == "") {
      placeholder.style.display = "none";
    }
  }
}

// Clear indicators besides checkbox.
function clearIndicator() {
  var checkboxArr = document.getElementsByName("checkboxArr");
  for (var i = 0; i < checkboxArr.length; i++) {
    checkboxArr[i].parentElement.firstChild.data = "";
  }
}

// Enable/Disable buttons according to checkbox change.
function checkSelected() {
  var checkboxArr = document.getElementsByName("checkboxArr");
  if (checkAmount(checkboxArr) !=0) {
    document.getElementById("clearSelected").disabled = false;
    document.getElementById("compare").disabled = false;
  } else {
    document.getElementById("clearSelected").disabled = true;
    document.getElementById("compare").disabled = true;
  }
}

// Object to summarize everything
var totals = {};

// Compute the results for a data set.
function computeDisplayResults(data) {
  var count = data.data.length;
  for (var i = 0; i < count; i++) {
    var obj = data.data[i];
    obj.displayTime = setDisplayTime(obj.timestamp);
    var resultList = obj.totalResults;
    obj.mean = Array.avg(resultList);
    obj.stddev = Array.stddev(resultList);
    obj.stderr = obj.stddev / Math.sqrt(obj.iterations);
    var ci = 1.96 * obj.stderr;
    obj.cihigh = obj.mean + ci;
    obj.cilow = obj.mean - ci;
    obj.min = Array.min(resultList);
    obj.max = Array.max(resultList);
    obj.readbps = Array.avg(obj.readbpsResults);
    obj.writebps = Array.avg(obj.writebpsResults);
    obj.readKB = Array.avg(obj.KbytesRead);
    obj.writeKB = Array.avg(obj.KbytesWritten);
    obj.paintMean = Array.avg(obj.paintResults);
    obj.startLoadMean = Array.avg(obj.startLoadResults);
    obj.commitLoadMean = Array.avg(obj.commitLoadResults);
    obj.docLoadMean = Array.avg(obj.docLoadResults);

    obj.displayRequests = Array.avg(obj.requests);
    obj.displayConnects = Array.avg(obj.connects);
    obj.displaySpdySessions = Array.avg(obj.spdySessions);

    obj.displayDomNum = obj.domNum;
    obj.displayMaxDepth = obj.maxDepth;
    obj.displayMinDepth = obj.minDepth;
    obj.displayAvgDepth = obj.avgDepth;
    }
  return count;
}

// Convert timestamp to readable string.
function setDisplayTime(ts) {
  var year = ts.getFullYear();
  var mon = ts.getMonth()+1;
  var date = ts.getDate();
  var hrs = ts.getHours();
  var mins = ts.getMinutes();
  var secs = ts.getSeconds();

  mon = ( mon < 10 ? "0" : "" ) + mon;
  date = ( date < 10 ? "0" : "" ) + date;
  mins = ( mins < 10 ? "0" : "" ) + mins;
  secs = ( secs < 10 ? "0" : "" ) + secs;

  return (year + "/" + mon + "/" + date + " " + hrs + ":" + mins + ":" + secs);
}

// Subtract the results from two data sets.
// This function could be smarter about what it subtracts,
// for now it just subtracts everything.
// Returns true if it was able to compare the two data sets.
function subtractData(data, baseline) {
  var count = data.data.length;
  if (baseline.data.length != count) {
    return false;
  }
  for (var i = 0; i < count; i++) {
    var obj = data.data[i];
    var obj2 = baseline.data[i];

    // The data sets are different.
    if (obj.url != obj2.url ||
        obj.iterations != obj2.iterations) {
      return false;
    }

    obj.mean -= obj2.mean;
    obj.stddev -= obj2.stddev;
    obj.min -= obj2.min;
    obj.max -= obj2.max;
    obj.readbps -= obj2.readbps;
    obj.writebps -= obj2.writebps;
    obj.readKB -= obj2.readKB;
    obj.writeKB -= obj2.writeKB;
    obj.paintMean -= obj2.paintMean;
    obj.startLoadMean -= obj2.startLoadMean;
    obj.commitLoadMean -= obj2.commitLoadMean;
    obj.docLoadMean -= obj2.docLoadMean;

    obj.displayRequests -= obj2.displayRequests;
    obj.displayConnects -= obj2.displayConnects;
    obj.displaySpdySessions -= obj2.displaySpdySessions;
  }
  return true;
}

// Compute totals based on a data set.
function computeTotals(data) {
  var count = data.data.length;
  for (var i = 0; i < count; i++) {
    var obj = data.data[i];
    totals.mean += obj.mean;
    totals.paintMean += obj.paintMean;
    totals.startLoadMean += obj.startLoadMean;
    totals.commitLoadMean += obj.commitLoadMean;
    totals.docLoadMean += obj.docLoadMean;
  }
}

// Compute results for the data with an optional baseline.
// If |baseline| is undefined, will compute the results of this
// run.  Otherwise, computes the diff between this data and the baseline.
function computeResults(data, baseline) {
  totals = {};
  totals.mean = 0;
  totals.paintMean = 0;
  totals.startLoadMean = 0;
  totals.commitLoadMean = 0;
  totals.docLoadMean = 0;

  var count = computeDisplayResults(data);

  if (baseline) {
    computeDisplayResults(baseline);
    if (!subtractData(data, baseline)) {
      alert("These data sets are different");
      document.getElementById("baseline").value = "";
      return;
    }
  }

  computeTotals(data);
  totals.url = "(" + count + " urls)";
  if (count > 0) {
    totals.mean /= count;
    totals.paintMean /= count;
    totals.startLoadMean /= count;
    totals.commitLoadMean /= count;
    totals.docLoadMean /= count;
  }

  // Find the biggest average for our bar graph.
  max_sample = 0;
  for (var i = 0; i < data.data.length; i++) {
    if (data.data[i].max > max_sample) {
      max_sample = data.data[i].mean;
    }
  }
}

function jsinit() {
  var extension = chrome.extension.getBackgroundPage();

  // Run the template to show results
  var data = extension.results;

  // Get the baseline results
  var elt = document.getElementById("baseline");
  var baseline_json = document.getElementById("baseline").value;
  var baseline;
  if (baseline_json) {
    try {
      baseline = JSON.parse(baseline_json);
    } catch (e) {
      alert("JSON parse error: " + e);
    }
  }

  // Compute
  computeResults(data, baseline);

  var context = new JsEvalContext(data);
  context.setVariable('$width', 0);
  context.setVariable('$samples', 0);
  var template = document.getElementById("t");
  jstProcess(context, template);

  // Set the options
  document.getElementById("iterations").value = extension.iterations;
  document.getElementById("clearconns").checked = extension.clearConnections;
  document.getElementById("clearcache").checked = extension.clearCache;
  document.getElementById("enablespdy").checked = extension.enableSpdy;
  setUrl(extension.testUrl);

  if (!baseline) {
    var json_data = JSON.stringify(data);
    document.getElementById("json").value = json_data;
  }

  // Activate loading Urls from local file.
  document.getElementById('files').addEventListener('change',
                                                    handleFileSelect, false);
}

function getWidth(mean, obj) {
  var kMinWidth = 200;
  var max_width = obj.offsetWidth;
  if (max_width < kMinWidth) {
    max_width = kMinWidth;
  }
  return Math.floor(max_width * (mean / max_sample));
}

// Apply configuration back to our extension
function config() {
  var extension = chrome.extension.getBackgroundPage();
  var iterations = parseInt(document.getElementById("iterations").value);
  var clearConnections = document.getElementById("clearconns").checked;
  var clearCache = document.getElementById("clearcache").checked;
  var enableSpdy = document.getElementById("enablespdy").checked;
  if (iterations > 0) {
    extension.iterations = iterations;
    extension.clearConnections = clearConnections;
    extension.clearCache = clearCache;
    extension.enableSpdy = enableSpdy;
  }
}

// Set the url in the benchmark url box.
function setUrl(url) {
  document.getElementById("testurl").value = url;
}

// Start the benchmark.
function run() {
  if (!chrome.benchmarking) {
    alert("Warning:  Looks like you forgot to run chrome with " +
          " --enable-benchmarking set.");
    return;
  }
  var extension = chrome.extension.getBackgroundPage();
  var testUrl = document.getElementById("testurl").value;
  extension.testUrl = testUrl;
  extension.run();
}

function showConfirm() {
  var r = confirm("Are you sure to clear results?");
  if (r) {
    // Find out the event source element.
    var evtSrc = window.event.srcElement;
    if (evtSrc.value == "Clear Selected") {
      clearSelected();
    } else if (evtSrc.value == "Clear All") {
      clearResults();
    }
  }
}

// Clear the selected results
function clearSelected() {
  var extension = chrome.extension.getBackgroundPage();
  var checkboxArr = document.getElementsByName("checkboxArr");
  var rowIndexArr = getSelectedIndex(checkboxArr);
  var currIndex;
  for (var i = 0; i < rowIndexArr.length; i++) {
    currIndex = rowIndexArr[i];
    // Update the index of the original row in the modified array.
    currIndex -= i;
    extension.results.data.splice(currIndex, 1);
    document.location.reload(true);
    updateChart(this);
    jsinit();
  }
}

// Clear all the results
function clearResults() {
  var extension = chrome.extension.getBackgroundPage();
  extension.results = {};
  extension.results.data = new Array();
  document.getElementById("json").value = "";
  document.getElementById("baseline").value = "";
  updateChart(this);
  jsinit();
}

// Export html table into CSV format.
function exportHtml() {
  var checkboxArr = document.getElementsByName("checkboxArr");
  var rowNum = checkboxArr.length + 1; // # of data rows plus total-stats row.
  $('#t').table2CSV(rowNum);
}

// Toggle display of an element
function toggle(id) {
  var elt = document.getElementById(id);
  if (elt.style.display == "none") {
    elt.style.display = "block";
  } else {
    elt.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", function() {
  jsinit();
  restoreTable();

  document.querySelector('form').addEventListener('click', function() {
    config();
    run();
  });
  $('#expand')[0].addEventListener('click', function() { expand(); });
  $('#clearSelected')[0].addEventListener('click',
                                          function() { showConfirm(); });
  $('#clearAll')[0].addEventListener('click', function() { showConfirm(); });
  $('#exportCsv')[0].addEventListener('click', function() { exportHtml(); });
  var checkboxArrs = document.getElementsByName('checkboxArr');
  for (var i = 0; i < checkboxArrs.length; ++i) {
    checkboxArrs[i].addEventListener('click', function() {
      updateChart(this);
      clearIndicator();
      checkSelected();
    });
  }
  var radioArrs = document.getElementsByName('radioArr');
  for (i = 0; i < radioArrs.length; ++i) {
    radioArrs[i].addEventListener('click', function() { updateChart(this); });
  }
  $('#compare')[0].addEventListener('click', function() { compare(); });
  $('#toggle-json')[0].addEventListener('click',
                                        function() { toggle('json'); });
  $('#toggle-baseline')[0].addEventListener('click',
                                            function() { toggle('baseline'); });
  $('#baseline')[0].addEventListener('change', function() { jsinit(); });
});
