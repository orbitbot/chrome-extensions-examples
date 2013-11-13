/*
This is a small JQuery utility to export HTML table as CSV file.

The author is Kunal Babre and the original script can be found in
http://www.kunalbabre.com/projects/table2CSV.php. Permissions are
granted by the author to make changes and redistribute.

Changes made by jning: To avoid exporting the textbox, radio buttons and etc.
in the table, the parameters rowNum and index in $().find().each() or
$().filter().find.each() help to ignore non-data cells.
*/

jQuery.fn.table2CSV = function(rowNum, options) {
    var options = jQuery.extend({
        separator: ',',
        header: [],
        delivery: 'popup' // popup, value
    },
    options);

    var csvData = [];
    var headerArr = [];
    var el = this;

    //header
    var numCols = options.header.length;
    var tmpRow = []; // construct header avalible array

    if (numCols > 0) {
        for (var i = 0; i < numCols; i++) {
            tmpRow[tmpRow.length] = formatData(options.header[i]);
        }
    } else {
        $(el).filter(':visible').find('th').each(function(index) {
            if (index > 0 && $(this).css('display') != 'none')
                tmpRow[tmpRow.length] = formatData($(this).html());
        });
    }

    row2CSV(tmpRow);

    // actual data
    $(el).find('tr').each(function(index) {
        if (index < rowNum + 1) {
            var tmpRow = [];
            $(this).filter(':visible').find('td').each(function(index) {
                if (index > 0 && $(this).css('display') != 'none')
                    tmpRow[tmpRow.length] = formatData($(this).html());
            });
            row2CSV(tmpRow);
        }
    });
    if (options.delivery == 'popup') {
        var mydata = csvData.join('\n');
        return popup(mydata);
    } else {
        var mydata = csvData.join('\n');
        return mydata;
    }

    function row2CSV(tmpRow) {
        var tmp = tmpRow.join('') // to remove any blank rows
        // alert(tmp);
        if (tmpRow.length > 0 && tmp != '') {
            var mystr = tmpRow.join(options.separator);
            csvData[csvData.length] = mystr;
        }
    }
    function formatData(input) {
        // replace " with “
        var regexp = new RegExp(/["]/g);
        var output = input.replace(regexp, "“");
        //HTML
        var regexp = new RegExp(/\<[^\<]+\>/g);
        var output = output.replace(regexp, "");
        if (output == "") return '';
        return '"' + output + '"';
    }
    function popup(data) {
        var generator = window.open('', 'csv', 'height=400,width=600');
        generator.document.write('<html><head><title>CSV</title>');
        generator.document.write('</head><body >');
        generator.document.write('<textArea cols=70 rows=15 wrap="off" >');
        generator.document.write(data);
        generator.document.write('</textArea>');
        generator.document.write('</body></html>');
        generator.document.close();
        return true;
    }
};
