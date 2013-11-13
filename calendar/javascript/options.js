/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

//Contains true if multiple calendar option is checked, false otherwise.
var isMultiCalendar;

//adding listener when body is loaded to call init function.
window.addEventListener('load', init, false);

/**
 * Sets the value of multiple calendar checkbox based on value from
 * local storage, and sets up the `save` event handler.
 */
function init() {
  isMultiCalendar = JSON.parse(localStorage.multiCalendar || false);
  $('multiCalendar').checked = isMultiCalendar;
  $('multiCalendarText').innerHTML =
      chrome.i18n.getMessage('multiCalendarText');
  $('optionsTitle').innerHTML = chrome.i18n.getMessage('optionsTitle');
  $('imageTooltip').title = chrome.i18n.getMessage('imageTooltip');
  $('imageTooltip').alt = chrome.i18n.getMessage('imageTooltip');
  $('multiCalendarText').title = chrome.i18n.getMessage('multiCalendarToolTip');
  $('multiCalendar').title = chrome.i18n.getMessage('multiCalendarToolTip');
  $('extensionName').innerHTML = chrome.i18n.getMessage('extensionName');
  if (chrome.i18n.getMessage('direction') == 'rtl') {
    document.querySelector('body').style.direction = 'rtl';
  }
  document.querySelector('#multiCalendar').addEventListener('click', save);
};

/**
 * Saves the value of the checkbox into local storage.
 */
function save() {
  var multiCalendarId = $('multiCalendar');
  localStorage.multiCalendar = multiCalendarId.checked;
  if (multiCalendarId) {
    multiCalendar.disabled = true;
  }
  $('status').innerHTML = chrome.i18n.getMessage('status_saving');
  $('status').style.display = 'block';
  chrome.extension.getBackgroundPage().onSettingsChange();
};

/**
 * Fired when a request is sent from either an extension process or a content
 * script. Add Listener to enable the save checkbox button on server response.
 * @param {String} request Request sent by the calling script.
 * @param {Object} sender Information about the script that sent a message or
 *     request.
 * @param {Function} sendResponse Function to call when there is a response.
 *     The argument should be any JSON-ifiable object, or undefined if there
 *     is no response.
 */
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (!request.message)
    return;
  switch (request.message) {
    case 'enableSave':
      if ($('multiCalendar')) {
        if ($('multiCalendar').disabled) {
          $('status').innerHTML = chrome.i18n.getMessage('status_saved');
          $('status').style.display = 'block';
          setTimeout("$('status').style.display = 'none'", 1500);
        }
        $('multiCalendar').disabled = false;
      }
      sendResponse();
      break;
  }
});
