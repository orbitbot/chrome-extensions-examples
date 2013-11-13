// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var maps_key = "ABQIAAAATfHumDbW3OmRByfquHd3SRTRERdeAiwZ9EeJWta3L_JZVS0bOBRQeZgr4K0xyVKzUdnnuFl8X9PX0w";

function gclient_geocode(address) {
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' +
            encodeURIComponent(address) + '&sensor=false';
  var request = new XMLHttpRequest();

  request.open('GET', url, true);
  console.log(url);
  request.onreadystatechange = function (e) {
    console.log(request, e);
    if (request.readyState == 4) {
      if (request.status == 200) {
        var json = JSON.parse(request.responseText);
        var latlng = json.results[0].geometry.location;
        latlng = latlng.lat + ',' + latlng.lng;

        var src = "https://maps.google.com/staticmap?center=" + latlng +
                  "&markers=" + latlng + "&zoom=14" +
                  "&size=512x512&sensor=false&key=" + maps_key;
        var map = document.getElementById("map");

        map.src = src;
        map.addEventListener('click', function () {
          window.close();
        });
      } else {
        console.log('Unable to resolve address into lat/lng');
      }
    }
  };
  request.send(null);
}

function map() {
  var address = chrome.extension.getBackgroundPage().selectedAddress;
  if (address)
    gclient_geocode(address);
}

window.onload = map;
