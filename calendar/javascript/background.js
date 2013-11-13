/**
 * Copyright (c) 2011 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * PHASES
 * 1) Load next event from server refresh every 30 minutes or every time
 *   you go to calendar or every time you logout drop in a data object.
 * 2) Display on screen periodically once per minute or on demand.
 */

// Message shown in badge title when no title is given to an event.
var MSG_NO_TITLE = chrome.i18n.getMessage('noTitle');

// Time between server polls = 30 minutes.
var POLL_INTERVAL = 30 * 60 * 1000;

// Redraw interval is 1 min.
var DRAW_INTERVAL = 60 * 1000;

// The time when we last polled.
var lastPollTime_ = 0;

// Object for BadgeAnimation
var badgeAnimation_;

//Object for CanvasAnimation
var canvasAnimation_;

// Object containing the event.
var nextEvent_ = null;

// Storing events.
var eventList = [];
var nextEvents = [];

// Storing calendars.
var calendars = [];

var pollUnderProgress = false;
var defaultAuthor = '';
var isMultiCalendar = false;

//URL for getting feed of individual calendar support.
var SINGLE_CALENDAR_SUPPORT_URL = 'https://www.google.com/calendar/feeds' +
    '/default/private/embed?toolbar=true&max-results=10';

//URL for getting feed of multiple calendar support.
var MULTIPLE_CALENDAR_SUPPORT_URL = 'https://www.google.com/calendar/feeds' +
    '/default/allcalendars/full';

//URL for opening Google Calendar in new tab.
var GOOGLE_CALENDAR_URL = 'http://www.google.com/calendar/render';

//URL for declining invitation of the event.
var DECLINED_URL = 'http://schemas.google.com/g/2005#event.declined';

//This is used to poll only once per second at most, and delay that if
//we keep hitting pages that would otherwise force a load.
var pendingLoadId_ = null;

/**
 * A "loading" animation displayed while we wait for the first response from
 * Calendar. This animates the badge text with a dot that cycles from left to
 * right.
 * @constructor
 */
function BadgeAnimation() {
  this.timerId_ = 0;
  this.maxCount_ = 8;  // Total number of states in animation
  this.current_ = 0;  // Current state
  this.maxDot_ = 4;  // Max number of dots in animation
};

/**
 * Paints the badge text area while loading the data.
 */
BadgeAnimation.prototype.paintFrame = function() {
  var text = '';
  for (var i = 0; i < this.maxDot_; i++) {
    text += (i == this.current_) ? '.' : ' ';
  }

  chrome.browserAction.setBadgeText({text: text});
  this.current_++;
  if (this.current_ == this.maxCount_) {
    this.current_ = 0;
  }
};

/**
 * Starts the animation process.
 */
BadgeAnimation.prototype.start = function() {
  if (this.timerId_) {
    return;
  }

  var self = this;
  this.timerId_ = window.setInterval(function() {
    self.paintFrame();
  }, 100);
};

/**
 * Stops the animation process.
 */
BadgeAnimation.prototype.stop = function() {
  if (!this.timerId_) {
    return;
  }

  window.clearInterval(this.timerId_);
  this.timerId_ = 0;
};

/**
 * Animates the canvas after loading the data from all the calendars. It
 * rotates the icon and defines the badge text and title.
 * @constructor
 */
function CanvasAnimation() {
  this.animationFrames_ = 36;  // The number of animation frames
  this.animationSpeed_ = 10;  // Time between each frame(in ms).
  this.canvas_ = $('canvas');  // The canvas width + height.
  this.canvasContext_ = this.canvas_.getContext('2d');  // Canvas context.
  this.loggedInImage_ = $('logged_in');
  this.rotation_ = 0;  //Keeps count of rotation angle of extension icon.
  this.w = this.canvas_.width;  // Setting canvas width.
  this.h = this.canvas_.height;  // Setting canvas height.
  this.RED = [208, 0, 24, 255];  //Badge color of extension icon in RGB format.
  this.BLUE = [0, 24, 208, 255];
  this.currentBadge_ = null;  // The text in the current badge.
};

/**
 * Flips the icon around and draws it.
 */
CanvasAnimation.prototype.animate = function() {
  this.rotation_ += (1 / this.animationFrames_);
  this.drawIconAtRotation();
  var self = this;
  if (this.rotation_ <= 1) {
    setTimeout(function() {
      self.animate();
    }, self.animationSpeed_);
  } else {
    this.drawFinal();
  }
};

/**
 * Renders the icon.
 */
CanvasAnimation.prototype.drawIconAtRotation = function() {
  this.canvasContext_.save();
  this.canvasContext_.clearRect(0, 0, this.w, this.h);
  this.canvasContext_.translate(Math.ceil(this.w / 2), Math.ceil(this.h / 2));
  this.canvasContext_.rotate(2 * Math.PI * this.getSector(this.rotation_));
  this.canvasContext_.drawImage(this.loggedInImage_, -Math.ceil(this.w / 2),
    -Math.ceil(this.h / 2));
  this.canvasContext_.restore();
  chrome.browserAction.setIcon(
      {imageData: this.canvasContext_.getImageData(0, 0, this.w, this.h)});
};

/**
 * Calculates the sector which has to be traversed in a single call of animate
 * function(360/animationFrames_ = 360/36 = 10 radians).
 * @param {integer} sector angle to be rotated(in radians).
 * @return {integer} value in radian of the sector which it has to cover.
 */
CanvasAnimation.prototype.getSector = function(sector) {
  return (1 - Math.sin(Math.PI / 2 + sector * Math.PI)) / 2;
};

/**
 * Draws the event icon and determines the badge title and icon title.
 */
CanvasAnimation.prototype.drawFinal = function() {
  badgeAnimation_.stop();

  if (!nextEvent_) {
    this.showLoggedOut();
  } else {
    this.drawIconAtRotation();
    this.rotation_ = 0;

    var ms = nextEvent_.startTime.getTime() - getCurrentTime();
    var nextEventMin = ms / (1000 * 60);
    var bgColor = (nextEventMin < 60) ? this.RED : this.BLUE;

    chrome.browserAction.setBadgeBackgroundColor({color: bgColor});
    currentBadge_ = this.getBadgeText(nextEvent_);
    chrome.browserAction.setBadgeText({text: currentBadge_});

    if (nextEvents.length > 0) {
      var text = '';
      for (var i = 0, event; event = nextEvents[i]; i++) {
        text += event.title;
        if (event.author || event.location) {
          text += '\n';
        }
        if (event.location) {
          text += event.location + ' ';
        }
        if (event.author) {
          text += event.author;
        }
        if (i < (nextEvents.length - 1)) {
          text += '\n----------\n';
        }
      }
      text = filterSpecialChar(text);
      chrome.browserAction.setTitle({'title' : text});
    }
  }
  pollUnderProgress = false;

  chrome.extension.sendRequest({
    message: 'enableSave'
  }, function() {
  });

  return;
};

/**
 * Shows the user logged out.
 */
CanvasAnimation.prototype.showLoggedOut = function() {
  currentBadge_ = '?';
  chrome.browserAction.setIcon({path: '../images/icon-16_bw.gif'});
  chrome.browserAction.setBadgeBackgroundColor({color: [190, 190, 190, 230]});
  chrome.browserAction.setBadgeText({text: '?'});
  chrome.browserAction.setTitle({ 'title' : ''});
};

/**
 * Gets the badge text.
 * @param {Object} nextEvent_ next event in the calendar.
 * @return {String} text Badge text to be shown in extension icon.
 */
CanvasAnimation.prototype.getBadgeText = function(nextEvent_) {
  if (!nextEvent_) {
    return '';
  }

  var ms = nextEvent_.startTime.getTime() - getCurrentTime();
  var nextEventMin = Math.ceil(ms / (1000 * 60));

  var text = '';
  if (nextEventMin < 60) {
    text = chrome.i18n.getMessage('minutes', nextEventMin.toString());
  } else if (nextEventMin < 1440) {
    text = chrome.i18n.getMessage('hours',
               Math.round(nextEventMin / 60).toString());
  } else if (nextEventMin < (1440 * 10)) {
    text = chrome.i18n.getMessage('days',
               Math.round(nextEventMin / 60 / 24).toString());
  }
  return text;
};

/**
 * Provides all the calendar related utils.
 */
CalendarManager = {};

/**
 * Extracts event from the each entry of the calendar.
 * @param {Object} elem The XML node to extract the event from.
 * @param {Object} mailId email of the owner of calendar in multiple calendar
 *     support.
 * @return {Object} out An object containing the event properties.
 */
CalendarManager.extractEvent = function(elem, mailId) {
  var out = {};

  for (var node = elem.firstChild; node != null; node = node.nextSibling) {
    if (node.nodeName == 'title') {
        out.title = node.firstChild ? node.firstChild.nodeValue : MSG_NO_TITLE;
    } else if (node.nodeName == 'link' &&
               node.getAttribute('rel') == 'alternate') {
      out.url = node.getAttribute('href');
    } else if (node.nodeName == 'gd:where') {
      out.location = node.getAttribute('valueString');
    } else if (node.nodeName == 'gd:who') {
      if (node.firstChild) {
        if ((!isMultiCalendar) || (isMultiCalendar && mailId &&
            node.getAttribute('email') == mailId)) {
          out.attendeeStatus = node.firstChild.getAttribute('value');
        }
      }
    } else if (node.nodeName == 'gd:eventStatus') {
      out.status = node.getAttribute('value');
    } else if (node.nodeName == 'gd:when') {
      var startTimeStr = node.getAttribute('startTime');
      var endTimeStr = node.getAttribute('endTime');

      startTime = rfc3339StringToDate(startTimeStr);
      endTime = rfc3339StringToDate(endTimeStr);

      if (startTime == null || endTime == null) {
        continue;
      }

      out.isAllDay = (startTimeStr.length <= 11);
      out.startTime = startTime;
      out.endTime = endTime;
    }
  }
  return out;
};

/**
 * Polls the server to get the feed of the user.
 */
CalendarManager.pollServer = function() {
  if (! pollUnderProgress) {
    eventList = [];
    pollUnderProgress = true;
    pendingLoadId_ = null;
    calendars = [];
    lastPollTime_ = getCurrentTime();
    var url;
    var xhr = new XMLHttpRequest();
    try {
      xhr.onreadystatechange = CalendarManager.genResponseChangeFunc(xhr);
      xhr.onerror = function(error) {
        console.log('error: ' + error);
        nextEvent_ = null;
        canvasAnimation_.drawFinal();
      };
      if (isMultiCalendar) {
        url = MULTIPLE_CALENDAR_SUPPORT_URL;
      } else {
        url = SINGLE_CALENDAR_SUPPORT_URL;
      }

      xhr.open('GET', url);
      xhr.send(null);
    } catch (e) {
      console.log('ex: ' + e);
      nextEvent_ = null;
      canvasAnimation_.drawFinal();
    }
  }
};

/**
 * Gathers the list of all calendars of a specific user for multiple calendar
 * support and event entries in single calendar.
 * @param {xmlHttpRequest} xhr xmlHttpRequest object containing server response.
 * @return {Object} anonymous function which returns to onReadyStateChange.
 */
CalendarManager.genResponseChangeFunc = function(xhr) {
  return function() {
    if (xhr.readyState != 4) {
      return;
    }
    if (!xhr.responseXML) {
      console.log('No responseXML');
      nextEvent_ = null;
      canvasAnimation_.drawFinal();
      return;
    }
    if (isMultiCalendar) {
      var entry_ = xhr.responseXML.getElementsByTagName('entry');
      if (entry_ && entry_.length > 0) {
        calendars = [];
        for (var i = 0, entry; entry = entry_[i]; ++i) {
          if (!i) {
            defaultAuthor = entry.querySelector('title').textContent;
          }
          // Include only those calendars which are not hidden and selected
          var isHidden = entry.querySelector('hidden');
          var isSelected = entry.querySelector('selected');
          if (isHidden && isHidden.getAttribute('value') == 'false') {
            if (isSelected && isSelected.getAttribute('value') == 'true') {
              var calendar_content = entry.querySelector('content');
              var cal_src = calendar_content.getAttribute('src');
              cal_src += '?toolbar=true&max-results=10';
              calendars.push(cal_src);
            }
          }
        }
        CalendarManager.getCalendarFeed(0);
        return;
      }
    } else {
      calendars = [];
      calendars.push(SINGLE_CALENDAR_SUPPORT_URL);
      CalendarManager.parseCalendarEntry(xhr.responseXML, 0);
      return;
    }

    console.error('Error: feed retrieved, but no event found');
    nextEvent_ = null;
    canvasAnimation_.drawFinal();
  };
};

/**
 * Retrieves feed for a calendar
 * @param {integer} calendarId Id of the calendar in array of calendars.
 */
CalendarManager.getCalendarFeed = function(calendarId) {
  var xmlhttp = new XMLHttpRequest();
  try {
    xmlhttp.onreadystatechange = CalendarManager.onCalendarResponse(xmlhttp,
                                     calendarId);
    xmlhttp.onerror = function(error) {
      console.log('error: ' + error);
      nextEvent_ = null;
      canvasAnimation_.drawFinal();
    };

    xmlhttp.open('GET', calendars[calendarId]);
    xmlhttp.send(null);
  }
  catch (e) {
    console.log('ex: ' + e);
    nextEvent_ = null;
    canvasAnimation_.drawFinal();
  }
};

/**
 * Gets the event entries of every calendar subscribed in default user calendar.
 * @param {xmlHttpRequest} xmlhttp xmlHttpRequest containing server response
 *     for the feed of a specific calendar.
 * @param {integer} calendarId Variable for storing the no of calendars
 *     processed.
 * @return {Object} anonymous function which returns to onReadyStateChange.
 */
CalendarManager.onCalendarResponse = function(xmlhttp, calendarId) {
  return function() {
    if (xmlhttp.readyState != 4) {
      return;
    }
    if (!xmlhttp.responseXML) {
      console.log('No responseXML');
      nextEvent_ = null;
      canvasAnimation_.drawFinal();
      return;
    }
    CalendarManager.parseCalendarEntry(xmlhttp.responseXML, calendarId);
  };
};

/**
 * Parses events from calendar response XML
 * @param {string} responseXML Response XML for calendar.
 * @param {integer} calendarId  Id of the calendar in array of calendars.
 */
CalendarManager.parseCalendarEntry = function(responseXML, calendarId) {
  var entry_ = responseXML.getElementsByTagName('entry');
  var mailId = null;
  var author = null;

  if (responseXML.querySelector('author name')) {
    author = responseXML.querySelector('author name').textContent;
  }
  if (responseXML.querySelector('author email')) {
    mailId = responseXML.querySelector('author email').textContent;
  }

  if (entry_ && entry_.length > 0) {
    for (var i = 0, entry; entry = entry_[i]; ++i) {
     var event_ = CalendarManager.extractEvent(entry, mailId);

      // Get the time from then to now
      if (event_.startTime) {
        var t = event_.startTime.getTime() - getCurrentTime();
        if (t >= 0 && (event_.attendeeStatus != DECLINED_URL)) {
            if (isMultiCalendar && author) {
              event_.author = author;
            }
            eventList.push(event_);
        }
      }
    }
  }

  calendarId++;
  //get the next calendar
  if (calendarId < calendars.length) {
    CalendarManager.getCalendarFeed(calendarId);
  } else {
    CalendarManager.populateLatestEvent(eventList);
  }
};

/**
 * Fills the event list with the events acquired from the calendar(s).
 * Parses entire event list and prepares an array of upcoming events.
 * @param {Array} eventList List of all events.
 */
CalendarManager.populateLatestEvent = function(eventList) {
  nextEvents = [];
  if (isMultiCalendar) {
    eventList.sort(sortByDate);
  }

  //populating next events array.
  if (eventList.length > 0) {
    nextEvent_ = eventList[0];
    nextEvents.push(nextEvent_);
    var startTime = nextEvent_.startTime.setSeconds(0, 0);
    for (var i = 1, event; event = eventList[i]; i++) {
      var time = event.startTime.setSeconds(0, 0);
      if (time == startTime) {
        nextEvents.push(event);
      } else {
        break;
      }
    }
    if (nextEvents.length > 1 && isMultiCalendar) {
      nextEvents.sort(sortByAuthor);
    }
    canvasAnimation_.animate();
    return;
  } else {
    console.error('Error: feed retrieved, but no event found');
    nextEvent_ = null;
    canvasAnimation_.drawFinal();
  }
};

var DATE_TIME_REGEX =
  /^(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.\d+(\+|-)(\d\d):(\d\d)$/;
var DATE_TIME_REGEX_Z = /^(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.\d+Z$/;
var DATE_REGEX = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;

/**
* Convert the incoming date into a javascript date.
* @param {String} rfc3339 The rfc date in string format as following
*     2006-04-28T09:00:00.000-07:00
*     2006-04-28T09:00:00.000Z
*     2006-04-19.
* @return {Date} The javascript date format of the incoming date.
*/
function rfc3339StringToDate(rfc3339) {
  var parts = DATE_TIME_REGEX.exec(rfc3339);

  // Try out the Z version
  if (!parts) {
    parts = DATE_TIME_REGEX_Z.exec(rfc3339);
  }

  if (parts && parts.length > 0) {
    var d = new Date();
    d.setUTCFullYear(parts[1], parseInt(parts[2], 10) - 1, parts[3]);
    d.setUTCHours(parts[4]);
    d.setUTCMinutes(parts[5]);
    d.setUTCSeconds(parts[6]);

    var tzOffsetFeedMin = 0;
    if (parts.length > 7) {
      tzOffsetFeedMin = parseInt(parts[8], 10) * 60 + parseInt(parts[9], 10);
      if (parts[7] != '-') { // This is supposed to be backwards.
        tzOffsetFeedMin = -tzOffsetFeedMin;
      }
    }
    return new Date(d.getTime() + tzOffsetFeedMin * 60 * 1000);
  }

  parts = DATE_REGEX.exec(rfc3339);
  if (parts && parts.length > 0) {
    return new Date(parts[1], parseInt(parts[2], 10) - 1, parts[3]);
  }
  return null;
};

/**
 * Sorts all the events by date and time.
 * @param {object} event_1 Event object.
 * @param {object} event_2 Event object.
 * @return {integer} timeDiff Difference in time.
 */
function sortByDate(event_1, event_2) {
  return (event_1.startTime.getTime() - event_2.startTime.getTime());
};

/**
 * Sorts all the events by author name.
 * @param {object} event_1 Event object.
 * @param {object} event_2 Event object.
 * @return {integer} nameDiff Difference in default author and others.
 */
function sortByAuthor(event_1, event_2) {
  var nameDiff;
  if (event_1.author && event_2.author && event_2.author == defaultAuthor) {
    nameDiff = 1;
  } else {
    return 0;
  }
  return nameDiff;
};

/**
 * Fires once per minute to redraw extension icon.
 */
function redraw() {
  // If the next event just passed, re-poll.
  if (nextEvent_) {
    var t = nextEvent_.startTime.getTime() - getCurrentTime();
    if (t <= 0) {
      CalendarManager.pollServer();
      return;
    }
  }
  canvasAnimation_.animate();

  // if 30 minutes have passed re-poll
  if (getCurrentTime() - lastPollTime_ >= POLL_INTERVAL) {
    CalendarManager.pollServer();
  }
};

/**
 * Returns the current time in milliseconds.
 * @return {Number} Current time in milliseconds.
 */
function getCurrentTime() {
  return (new Date()).getTime();
};

/**
* Replaces ASCII characters from the title.
* @param {String} data String containing ASCII code for special characters.
* @return {String} data ASCII characters replaced with actual characters.
*/
function filterSpecialChar(data) {
  if (data) {
    data = data.replace(/&lt;/g, '<');
    data = data.replace(/&gt;/g, '>');
    data = data.replace(/&amp;/g, '&');
    data = data.replace(/%7B/g, '{');
    data = data.replace(/%7D/g, '}');
    data = data.replace(/&quot;/g, '"');
    data = data.replace(/&#39;/g, '\'');
  }
  return data;
};

/**
 * Called from options.js page on saving the settings
 */
function onSettingsChange() {
  isMultiCalendar = JSON.parse(localStorage.multiCalendar);
  badgeAnimation_.start();
  CalendarManager.pollServer();
};

/**
 * Function runs on updating a tab having url of google applications.
 * @param {integer} tabId Id of the tab which is updated.
 * @param {String} changeInfo Gives the information of change in url.
 * @param {String} tab Gives the url of the tab updated.
 */
function onTabUpdated(tabId, changeInfo, tab) {
  var url = tab.url;
  if (!url) {
    return;
  }

  if ((url.indexOf('www.google.com/calendar/') != -1) ||
      ((url.indexOf('www.google.com/a/') != -1) &&
      (url.lastIndexOf('/acs') == url.length - 4)) ||
      (url.indexOf('www.google.com/accounts/') != -1)) {

    // The login screen isn't helpful
    if (url.indexOf('https://www.google.com/accounts/ServiceLogin?') == 0) {
      return;
    }

    if (pendingLoadId_) {
      clearTimeout(pendingLoadId_);
      pendingLoadId_ = null;
    }

    // try to poll in 2 second [which makes the redirects settle down]
    pendingLoadId_ = setTimeout(CalendarManager.pollServer, 2000);
  }
};

/**
 * Called when the user clicks on extension icon and opens calendar page.
 */
function onClickAction() {
  chrome.tabs.getAllInWindow(null, function(tabs) {
    for (var i = 0, tab; tab = tabs[i]; i++) {
      if (tab.url && isCalendarUrl(tab.url)) {
        chrome.tabs.update(tab.id, {selected: true});
        CalendarManager.pollServer();
        return;
      }
    }
    chrome.tabs.create({url: GOOGLE_CALENDAR_URL});
    CalendarManager.pollServer();
  });
};

/**
 * Checks whether an instance of Google calendar is already open.
 * @param {String} url Url of the tab visited.
 * @return {boolean} true if the url is a Google calendar relative url, false
 *     otherwise.
 */
function isCalendarUrl(url) {
  return url.indexOf('www.google.com/calendar') != -1 ? true : false;
};

/**
 * Initializes everything.
 */
function init() {
  badgeAnimation_ = new BadgeAnimation();
  canvasAnimation_ = new CanvasAnimation();

  isMultiCalendar = JSON.parse(localStorage.multiCalendar || false);

  chrome.browserAction.setIcon({path: '../images/icon-16.gif'});
  badgeAnimation_.start();
  CalendarManager.pollServer();
  window.setInterval(redraw, DRAW_INTERVAL);

  chrome.tabs.onUpdated.addListener(onTabUpdated);

  chrome.browserAction.onClicked.addListener(function(tab) {
    onClickAction();
  });
};

//Adding listener when body is loaded to call init function.
window.addEventListener('load', init, false);
