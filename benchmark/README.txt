Benchmark Extension
-------------------
This extension provides basic page-level benchmarking into the browser.

With the extension installed you can test web pages and then compare
results in a subwindow.

Between each page load you can optionally clear idle http connections and
clear the cache so that page loads are more like the user experience
when first connecting to a site.

To use this benchmark, you'll need to run chrome with the the
"--enable-benchmarking" flag.  This flag enables a v8-extension so that
the benchmark can clear idle connections and the cache.

The code found in the jst/ subdirectory is JSTemplate code from
http://code.google.com/p/google-jstemplate/.

In jquery/, jquery-1.4.2.min.js is from http://jquery.com/. jquery.flot.min.js
is a plotting library and from http://code.google.com/p/flot/.
jquery.flot.dashes.js is an enhancement of Flot for dashed lines and from 
http://code.google.com/p/flot/issues/detail?id=61.

In util/, sortable.js serves for sorting table content and is from
http://www.kryogenix.org/code/browser/sorttable/. table2CSV.js is for exporting
table data to .csv and from http://www.kunalbabre.com/projects/table2CSV.php.

