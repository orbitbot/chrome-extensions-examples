/**
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 **/

// Checking for "chrome.app.runtime" availability allows this Chrome app code to
// be tested in a regular web page (like tests/manual.html). Checking for
// "chrome" and "chrome.app" availability further allows this code to be tested
// in non-Chrome browsers, which is useful for example to test touch support
// with a non-Chrome touch device.
if (typeof chrome !== 'undefined' && chrome.app && chrome.app.runtime) {
  var showCalculatorWindow = function () {
    chrome.app.window.create('calculator.html', {
      defaultWidth: 243, minWidth: 243, maxWidth: 243,
      defaultHeight: 380, minHeight: 380, maxHeight: 380,
      id: 'calculator'
    }, function(appWindow) {
      appWindow.contentWindow.onload = function() {
        new Controller(new Model(9), new View(appWindow.contentWindow));
      };

      chrome.storage.local.set({windowVisible: true});
      appWindow.onClosed.addListener(function() {
        chrome.storage.local.set({windowVisible: false});
      });
    });
  }

  chrome.app.runtime.onLaunched.addListener(showCalculatorWindow);
  chrome.app.runtime.onRestarted.addListener(function() {
    chrome.storage.local.get('windowVisible', function(data) {
      if (data.windowVisible)
        showCalculatorWindow();
    });
  });
}

function Controller(model, view) {
  this.inputs = this.defineInputs_();
  this.model = model;
  this.view = view;
  this.view.onButton = function(button) {
    this.handleInput_(this.inputs.byButton[button]);
  }.bind(this);
  this.view.onKey = function(key) {
    this.handleInput_(this.inputs.byKey[key]);
  }.bind(this);
}

/** @private */
Controller.prototype.defineInputs_ = function() {
  var inputs = {byButton: {}, byKey: {}};
  inputs.byButton['zero'] = inputs.byKey['48'] = '0';
  inputs.byButton['one'] = inputs.byKey['49'] = '1';
  inputs.byButton['two'] = inputs.byKey['50'] = '2';
  inputs.byButton['three'] = inputs.byKey['51'] = '3';
  inputs.byButton['four'] = inputs.byKey['52'] = '4';
  inputs.byButton['five'] = inputs.byKey['53'] = '5';
  inputs.byButton['six'] = inputs.byKey['54'] = '6';
  inputs.byButton['seven'] = inputs.byKey['55'] = '7';
  inputs.byButton['eight'] = inputs.byKey['56'] = '8';
  inputs.byButton['nine'] = inputs.byKey['57'] = '9';
  inputs.byButton['point'] = inputs.byKey['190'] = '.';
  inputs.byButton['add'] = inputs.byKey['^187'] = '+';
  inputs.byButton['subtract'] = inputs.byKey['189'] = '-';
  inputs.byButton['multiply'] = inputs.byKey['^56'] = '*';
  inputs.byButton['divide'] = inputs.byKey['191'] = '/';
  inputs.byButton['equals'] = inputs.byKey['187'] = inputs.byKey['13'] = '=';
  inputs.byButton['negate'] = inputs.byKey['32'] = '+ / -';
  inputs.byButton['clear'] = inputs.byKey['67'] = 'AC';
  inputs.byButton['back'] = inputs.byKey['8'] = 'back';
  return inputs;
};

/** @private */
Controller.prototype.handleInput_ = function(input) {
  var values, accumulator, operator, operand;
  if (input) {
    values = this.model.handle(input);
    accumulator = values.accumulator;
    operator = values.operator;
    operand = values.operand;
    if (input === 'AC') {
      this.view.clearDisplay({operand: '0'});
    } else if (input === '=') {
      this.view.addResults({accumulator: accumulator, operand: accumulator});
    } else if (input.match(/^[+*/-]$/)) {
      this.updateValues_({accumulator: accumulator});
      this.view.addValues({operator: values.operator});
    } else if (!this.updateValues_({operator: operator, operand: operand})) {
      this.view.addValues({operator: operator, operand: operand});
    }
  }
};

/** @private */
Controller.prototype.updateValues_ = function(values) {
  // Values which are "finalized" (which have an accumulator value) shouldn't
  // and won't be updated, and this method will return false for them.
  var before = this.view.getValues();
  var after = !before.accumulator ? values : {};
  this.view.setValues({
    accumulator: this.getUpdatedValue_(before, after, 'accumulator'),
    operator: this.getUpdatedValue_(before, after, 'operator'),
    operand: this.getUpdatedValue_(before, after, 'operand', !before.operator)
  });
  return !before.accumulator;
}

/** @private */
Controller.prototype.getUpdatedValue_ = function(before, after, key, zero) {
  var value = (typeof after[key] !== 'undefined') ? after[key] : before[key];
  return zero ? (value || '0') : value;
}
