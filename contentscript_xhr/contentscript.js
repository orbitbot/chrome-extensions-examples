/*
* Copyright (c) 2011 The Chromium Authors. All rights reserved.
* Use of this source code is governed by a BSD-style license that can be
* found in the LICENSE file.
*/

/**
 * Performs an XMLHttpRequest to Twitter's API to get trending topics.
 *
 * @param callback Function If the response from fetching url has a
 *     HTTP status of 200, this function is called with a JSON decoded
 *     response.  Otherwise, this function is called with null.
 */
function fetchTwitterFeed(callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(data) {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        var data = JSON.parse(xhr.responseText);
        callback(data);
      } else {
        callback(null);
      }
    }
  }
  // Note that any URL fetched here must be matched by a permission in
  // the manifest.json file!
  var url = 'https://api.twitter.com/1/trends/daily.json?exclude=hashtags';
  xhr.open('GET', url, true);
  xhr.send();
};

/**
 * Parses text from Twitter's API and generates a bar with trending topics at
 * the top of the current page
 *
 * @param data Object JSON decoded response.  Null if the request failed.
 */
function onText(data) {
  // Only render the bar if the data is parsed into a format we recognize.
  if (data.trends) {
    // Create the overlay at the top of the page and fill it with data.
    var trends_dom = document.createElement('div');
    var title_dom = document.createElement('strong');
    title_dom.innerText = 'Topics currently trending on Twitter:';
    trends_dom.appendChild(title_dom);
    for (var key in data.trends) {
      for (var i=0,trend; trend = data.trends[key][i]; i++) {
        var link_dom = document.createElement('a');
        link_dom.setAttribute('href', trend.url)
        link_dom.innerText = trend.name;
        link_dom.style.color = '#000';
        trends_dom.appendChild(document.createTextNode(' '));
        trends_dom.appendChild(link_dom);
      }
      break;
    }
    trends_dom.style.cssText = [
      'background-color: #ffd700;',
      'background-image: -webkit-repeating-linear-gradient(' +
          '45deg, transparent, transparent 35px,' +
          'rgba(0,0,0,.1) 35px, rgba(0,0,0,.1) 70px);',
      'color: #000;',
      'padding: 10px;',
      'font: 14px Arial;'
    ].join(' ');
    document.body.style.cssText = 'position: relative';
    document.body.parentElement.insertBefore(trends_dom, document.body);
  }
};

fetchTwitterFeed(onText);
