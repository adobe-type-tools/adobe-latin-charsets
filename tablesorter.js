try {
// Copyright (c) 2005, 2012 Bob Swift and other contributors.  All rights reserved.
/*
 * Copyright (c) 2005, 2012 Bob Swift and other contributors
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *     * Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *              notice, this list of conditions and the following disclaimer in the
 *            documentation and/or other materials provided with the distribution.
 *     * The names of contributors may not be used to endorse or promote products
 *           derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * Modified and extended Dec 2005, then replaced and enhanced Dec 2006 by Bob Swift.
 * - original code written by Danny Chen
 *
 * This script is compacted before being released to reduce size and improve performance.
 * This makes it possible to comment the code without worrying about size
 * - make sure all statements end with a semi-colon, especially inline function definitions.
 *
 * Compacted source copyright should be the first line of this source:
 *  // Copyright (c) 2005, 2010 Bob Swift and other contributors.  All rights reserved.
 *
 * WARNING:  Do NOT use a greater than sign in this script!  This is a work around for CONF-6490.
 *
 */

function org_swift_TableSorter() {
}

String.prototype.Trim=new Function("return this.replace(/^\\s+|\\s+$/g,'')");

org_swift_TableSorter.prototype.getElementInnerText = function(element) {
    var str = "";
    if ((element != undefined) && (element != null)) {
        for (var i=0; i<element.childNodes.length; i++) {
            switch (element.childNodes.item(i).nodeType) {
                case 1: //ELEMENT_NODE
                    str += this.getElementInnerText(element.childNodes.item(i));
                    break;
                case 3: //TEXT_NODE
                    str += element.childNodes.item(i).nodeValue;
                    break;
            }
        }
    }
    return str;
}

// Trim function that is save to use for null or undefined strings.
org_swift_TableSorter.prototype.trimSafe = function(v) {
    return ((v == undefined) || (v == null)) ? "" : v.Trim();
}

// Simple number compare
// - NaN values are always larger
// - if both NaN, compare equal to preserve original ordering in bubble sort
org_swift_TableSorter.prototype.compareNumber = function(v1, v2, scope) {
    if (isNaN(v2)) {
        if (isNaN(v1)) return 0;
        return -1; // NaN is bigger than all
    }
    if (v1 < v2) return -1;
    if (v1 == v2) return 0;
    return 1;
}

// Separated number compare - a separated number is represented as an int array for this function
// - v1 < v2 if each number in v1 is <= each number in v2 and if still equal, then if v1 runs out first
org_swift_TableSorter.prototype.compareSeparatedNumber = function(v1, v2, scope) {
    for (i = 0; (i < v1.length) && (i < v2.length); i++) {
        var result = scope.compareNumber(parseInt(v1[i]), parseInt(v2[i]), scope);
        if (result != 0) return result;
    }
    if (v1.length < v2.length) return -1;
    if (v2.length < v1.length) return 1;
    return 0;
}

// sort table columns by the cell provided, only table columns from firstDataRowIndex on
// - use the column type parameter to determine:
//   - how to get values from the cell (valueParser)
//   - how to compare values (compareFunction)
// - this uses a bubble sort on an array of indexes used to reference values (so values only evaluated once)
// - optimized for reverse ordering
org_swift_TableSorter.prototype.sortByCell = function(sortCell, firstDataRowIndex, footingCount, scope) {
    var compareFunction;
    var valueParser;
    compareFunction = scope.compareNumber;
    if (sortCell.columnType == "I")    {
        valueParser = function(value) {
            return parseInt(scope.getElementInnerText(value));
        };
    } else if (sortCell.columnType == "F") {
        valueParser = function(value) {
            return parseFloat(scope.getElementInnerText(value).replace(/\,/g, '')); // remove comma as number separator
        };
    } else if (sortCell.columnType == "FC") { // comma is decimal point
        valueParser = function(value) {
            return parseFloat(scope.getElementInnerText(value).replace(/\./g, '')); // remove decimal as number separator
        };
    } else if (sortCell.columnType == "C") {
        valueParser = function(value) {
            // remove comma as number separator
            // remove all leading and trailing characters from the first thing that looks like a number
            return parseFloat(scope.getElementInnerText(value).replace(/\,/g, '').replace(/[^\d\.\,\-]*([\d\.\,\- *]*).*/, '$1'));
        };
    } else if (sortCell.columnType == "CC") { // comma is decimal point
        valueParser = function(value) {
            // remove decimal as number separator
            // remove all leading and trailing characters from the first thing that looks like a number
            return parseFloat(scope.getElementInnerText(value).replace(/\./g, '').replace(/[^\d\.\,\-]*([\d\.\,\- *]*).*/, '$1'));
        };
    } else if (sortCell.columnType.charAt(0) == 'D') {
        if (Date.parseString) { //date.js available
            valueParser = function(value) {
                var date = Date.parseString(scope.trimSafe(scope.getElementInnerText(value)), sortCell.columnType.substring(1));
                return ((date == null) ? NaN : date.getTime()); // unix epoch seconds
            };
        } else {
            valueParser = function(value) {
                return Date.parse(scope.getElementInnerText(value));
            };
        };
    } else if (sortCell.columnType.charAt(0) == 'M') {
        valueParser = function(value) {
            var regex = /M(?:\((.*)\)){0,1}(.*)/; // M(lang)format
            var lang = sortCell.columnType.replace(regex, "$1");
            var format = sortCell.columnType.replace(regex, "$2");
            var innerValue = scope.trimSafe(scope.getElementInnerText(value));
            var date;
            try {
                date = moment(scope.trimSafe(scope.getElementInnerText(value)), format, lang);
            } catch(err) {
                //var errStuff = err; // debugging
                date = NaN;
            }
            var result = date.valueOf();
            return ((date == null) ? NaN : date.valueOf());  // unix epoch seconds
        };
    } else if (   (sortCell.columnType == "/") || (sortCell.columnType == ".")
               || (sortCell.columnType == "-") || (sortCell.columnType == ":")) {
        compareFunction = scope.compareSeparatedNumber;
        valueParser = function(value) {
            return scope.getElementInnerText(value).split(sortCell.columnType);
        };
    } else if (sortCell.columnType == "A") { // already sorted
        valueParser = function(value) {
            return 0;
        };
    } else if (sortCell.columnType == "E") { // HTML more complex like emotions that do not contain text nodes - TBLSORT-1
        compareFunction = function(v1, v2, scope) {
            if (v1 < v2) return -1;
            if (v1 == v2) return 0;
            return 1;
        };
        valueParser = function(value) {
            return scope.trimSafe(value.innerHTML).toUpperCase();
        };
    } else {  // otherwise default to string
        compareFunction = function(v1, v2, scope) {
            if (v1 < v2) return -1;
            if (v1 == v2) return 0;
            return 1;
        };
        valueParser = function(value) {
            return scope.trimSafe(scope.getElementInnerText(value)).toUpperCase();
        };
    };

    //var table = sortCell.sortTable.tHead[0].concat(sortCell.sortTable.tBodies[0]).concat(sortCell.sortTable.tFoot[0]);

    var headRowCount = (sortCell.sortTable.tHead == null) ? 0 : sortCell.sortTable.tHead.rows.length;
    firstDataRowIndex = firstDataRowIndex - headRowCount;  // adjust for tHead rows

    var table = sortCell.sortTable.tBodies[0];
    var rowCount = table.rows.length - firstDataRowIndex - footingCount;  // all data rows that are not footer rows
    var map = Array(rowCount);            // maps sorted position to column index
    var values = Array(rowCount);         // evaluated cell values
    var compareTest = (sortCell.sortDescending ? -1 : 1 );  // so we can switch between ascending or descending
    sortCell.sortDescending = !sortCell.sortDescending;  // tracks direction of last sort for this column

    var firstCell = ( ((sortCell.sortTable.tHead == null) || (sortCell.sortTable.tHead.rows.length == 0)) ? table.rows[0].cells[sortCell.columnIndex] : sortCell.sortTable.tHead.rows[0].cells[sortCell.columnIndex]);

    if ((firstCell != null) && (firstCell.sortTable != null) && (firstCell.sortTable != undefined) && (firstCell.sortTable.sortImage != null) && (firstCell.sortTable.sortImage != undefined)) { // reverse sort arrow
        firstCell.sortTable.sortImage.setAttribute("src", firstCell.sortDescending ? firstCell.sortTable.sortAttributeDescending : firstCell.sortTable.sortAttributeAscending);
        firstCell.appendChild(firstCell.sortTable.sortImage);   // append or move the sort icon image to this cell
    }

    var i;
    for (i=0; i < rowCount; i++) {
        map[i] = sortCell.sortFirstTime ? i : (rowCount - 1 - i); // favor reverse order after the first time
        var row = table.rows[i + firstDataRowIndex];
        var cellValue = row.cells[sortCell.columnIndex];
        values[i] = valueParser(cellValue);   // parse and save the values only once
    }
    sortCell.sortFirstTime = false;

    var didSwap;  // bubble sort, track whether a order swap occurred
    do {
        didSwap = false;
        for (i=0; i < rowCount - 1; i++) {
            if (compareFunction(values[map[i]], values[map[i+1]], scope) == compareTest) {
               saveIndex = map[i];
               map[i] = map[i+1];
               map[i+1] = saveIndex;
               didSwap = true;
            }
        }
    } while (didSwap);

    var tableRows = new Array();
    for (i = 0; i < rowCount + footingCount; i++) {  // save all data and footing rows
        tableRows.push(table.rows[i + firstDataRowIndex]);
    }
    for (i = 0; i < rowCount + footingCount; i++) { // remove all data and footing rows
        table.removeChild(tableRows[i]);
    }
    for (i = 0; i < rowCount; i++) {        // re-populate all data rows in sorter order
        var row = tableRows[map[i]];
        table.appendChild(row);
        if (row.autoNumber) {               // if this row contains an auto number column represents sorted row number
            row.cells[0].innerHTML = i + 1; // update to current row number
        }
    }
    for (i = 0; i < footingCount; i++) {   // re-populate all footer rows
        table.appendChild(tableRows[i + rowCount]);
    }
}

// Enable this column to be sortable
// - note, unless this is an excluded columnType, enable header columns to be clicked
org_swift_TableSorter.prototype.enableSortOnCell = function(cell, columnIndex, table, columnTypes, customize, scope) {
    cell.style.cursor = "pointer";
    cell.sortTable = table;
    cell.sortFirstTime = true;
    cell.sortDescending = false;
    cell.columnIndex = (customize.autoNumber ? (columnIndex + 1) : columnIndex);
    if (columnIndex == -1) {
        cell.columnType = "I";
    } else {
        cell.columnType = (columnTypes && columnTypes[columnIndex]) ? columnTypes[columnIndex] : "S";
    }
    if (cell.columnType != "X") {  // not a column excluded from sorting
        cell.onmouseover = function() {
            this.saveTitle = this.getAttribute('title');
            if ((this.saveTitle == null) || (this.saveTitle == undefined) || (this.saveTitle == 'null') || (this.saveTitle.indexOf(customize.sortTip) == 0)) { // no title
                this.setAttribute('title', customize.sortTip);
            } else { // valid title and not the sort tip already
                this.setAttribute('title', customize.sortTip + " " + this.saveTitle);
            }
        };
        cell.onmouseout = function() {
            if ((this.saveTitle == null) || (this.saveTitle == undefined) || (this.saveTitle == 'null')) {
                this.setAttribute('title', null)
            } else {
                this.setAttribute('title', this.saveTitle);
            }
        };
        cell.onclick = function() {
            scope.sortByCell(this, customize.firstDataRowIndex, customize.footingCount, scope);
        };
    } else {  // covers case of auto sort of excluded column
        cell.columnType = cell.columnType.substring(1);
    }
}

// Sum I, F, and C column types. Deal with numeric separators in the values
org_swift_TableSorter.prototype.sumColumn = function(table, index, firstDataRowIndex, columnType) {
    var total = 0;
    var maxDecimalDigits = 0;
    for (var i = firstDataRowIndex; i < table.rows.length; i++) {
        var cell = table.rows[i].cells[index];
        var value;
        if (cell) {
            if (columnType == 'F') {
                value = parseFloat(this.getElementInnerText(cell).replace(/\,/g, ''))
            } else if (columnType == 'FC') {
                value = parseFloat(this.getElementInnerText(cell).replace(/\./g, '').replace(/\,/g, '\.'))
            } else if (columnType == 'C') {
                value = parseFloat(this.getElementInnerText(cell).replace(/\,/g, '').replace(/[^\d\.\,\-]*([\d\.\,\- *]*).*/, '$1'))
            } else if (columnType == 'CC') {
                value = parseFloat(this.getElementInnerText(cell).replace(/\./g, '').replace(/[^\d\.\,\-]*([\d\.\,\- *]*).*/, '$1').replace(/\,/g, '\.'))
            } else {
                value = parseFloat(this.getElementInnerText(cell));
            }
            if (!isNaN(value)) {
                if (columnType != 'I') {
                    var valueArray = value.toString().split(".");
                    if (valueArray.length > 1) {
                        var decimalDigits = valueArray[1].length;
                        if (decimalDigits > maxDecimalDigits) {
                            maxDecimalDigits = decimalDigits;
                        }
                    }
                }
                total = total + value;
            }
        }
    }
    if (maxDecimalDigits > 0) {
        total = total.toFixed(maxDecimalDigits);
    }
    if ((columnType == "FC") || (columnType == "CC")) { // format it with comma as separator again
        return total.toString().replace(/\./g, '\,')
    }
    return total;
}

// Append a automatic total row
org_swift_TableSorter.prototype.appendTotalRow = function(table, columnTypes, firstDataRowIndex) {
    var row = document.createElement('tr');
    var table = table.tBodies[0];
    var columnCount = (0 < table.rows.length) ? table.rows[table.rows.length - 1].cells.length : 0; // number in last row

    for (var columnIndex = 0; columnIndex < columnCount; columnIndex++) {
           var column = document.createElement('th');
           column.className = 'confluenceTh';
           column.innerHTML =    (columnIndex < columnTypes.length
                              && ((columnTypes[columnIndex] != null) && (columnTypes[columnIndex].length > 0) &&
                                 (   (columnTypes[columnIndex] == 'I')
                                  || (columnTypes[columnIndex].charAt(0) == 'F')
                                  || (columnTypes[columnIndex].charAt(0) == 'C'))))
                            ? this.sumColumn(table, columnIndex, firstDataRowIndex, columnTypes[columnIndex]) : '';
           row.appendChild(column);
    }
    table.appendChild(row); // add row after so it is not part of calculation
}

// Called for each table row to add all the appropriate attributes
org_swift_TableSorter.prototype.handleRow = function(table, row, rowIndex, customize) {
    var columnCount = row.cells.length;
    for (var i=0; i < columnCount; i++) { // each column index i
        if (customize.enableSorting && (rowIndex <= customize.lastClickableRow)) { // heading row(s)
             this.enableSortOnCell(row.cells[i], i, table, customize.columnTypes, customize, this);
        }
        // Look for any request for auto sorting
        if (   (rowIndex == 0)     // just look through first row
            && (customize.sortColumn != '')  // request for sorting is given
            && (customize.sortCell == null)  // not already found
            && (   ((i+1).toString() == customize.sortColumn)
                || (this.trimSafe(this.getElementInnerText(row.cells[i])) == customize.sortColumn)
                || (this.trimSafe(row.cells[i].getAttribute('title')) == customize.sortColumn) )) {
            customize.sortCell = row.cells[i];
        }
        // Apply some default alignment for numeric column types
        if (customize.firstDataRowIndex <= rowIndex) {
            if ((customize.columnTypes[i] != null) && (customize.columnTypes[i].length > 0)) {
                if ((customize.columnTypes[i] == "I") || (customize.columnTypes[i].charAt(0) == "F") || (customize.columnTypes[i].charAt(0) == "C")) {
                    row.cells[i].style.textAlign = "right";
                }
            }
        }
        if (customize.columnTypes[i] == "H") {
            row.cells[i].style.display = "none";
        }
        // Apply column attributes
        // - either on all data rows or all rows if requested
        if (customize.enableHeadingAttributes || (customize.firstDataRowIndex <= rowIndex)) {
            if (i < customize.attrList.length) {                            // column is still in list of attributes specified by user
                for (var j=0; j < customize.attrList[i].length; j++) {     // loop through each attribute given
                    var attr = customize.attrList[i][j].Trim().split("="); // "attribute = value", so split on =
                    if (1 < attr.length) {
                        var aName  = attr[0].Trim();
                        var aValue = attr[1].Trim();
                        if ((aName.toLowerCase() == "style") && (2 < aValue.length)) {
                            if ((aValue.charAt(0) == '"')) {  // strip double quotes
                                aValue = aValue.substring(1, aValue.length - 1);
                            }
                            row.cells[i].style.cssText = aValue;
                        } else {
                            row.cells[i].setAttribute(aName, aValue);
                        }
                    }
                }
            }
        }
    }
    // if autoNumber is requested, add a new column with incremental numbers on all data rows
    if (customize.autoNumber) {
        var column = document.createElement(!customize.autoNumberSort || (rowIndex < customize.firstDataRowIndex) ? 'th' : 'td');
        column.className = (!customize.autoNumberSort || (rowIndex < customize.firstDataRowIndex) ? 'confluenceTh' : 'confluenceTd');
        column.innerHTML = ((rowIndex < customize.firstDataRowIndex) || (customize.totalRowCount - customize.firstDataRowIndex - customize.footingCount < rowIndex) ? '' : customize.dataRowCount++);
        column.setAttribute('align', 'right');
        row.autoNumber = !customize.autoNumberSort;
        row.insertBefore(column, row.cells[0]);
        if (customize.enableSorting && customize.autoNumberSort && (rowIndex <= customize.lastClickableRow)) {
            this.enableSortOnCell(column, -1, table, null, customize, this);
        }
    }
    // enable row highlighting if requested
    if ((customize.highlightColor != "") && (customize.firstDataRowIndex <= rowIndex)) {
        row.onmouseover = function() {
            this.tableHighLightRowColor = this.style.backgroundColor;
            this.style.backgroundColor = customize.highlightColor;
        };
        row.onmouseout = function() {
            this.style.backgroundColor = this.tableHighLightRowColor;
            this.tableHighLightRowColor = null;
        };
    }
}

// Setup this table for custom behavior including sorting, highlighting, etc...
org_swift_TableSorter.prototype.customizeMacroTable = function(
                             tableId, columnTypes, columnAttributes,
                             firstDataRowIndex, highlightColor, enableSorting,
                             sortTip, sortColumn, sortDescending,
                             autoNumber, autoNumberSort, enableHeadingAttributes,
                             footingCount, autoTotal, iconLocation
                            ) {
    var customize = new Object;
    //customize.columnTypes = columnTypes.split(","); // comma separated list to array
    customize.columnTypes = columnTypes;
    customize.firstDataRowIndex = firstDataRowIndex;
    customize.highlightColor = highlightColor;
    customize.enableSorting = enableSorting;
    customize.sortTip = sortTip;
    customize.sortColumn = sortColumn;
    customize.sortDescending = sortDescending;
    customize.autoNumber = autoNumber;
    customize.autoNumberSort = autoNumberSort;
    customize.enableHeadingAttributes = enableHeadingAttributes;
    customize.footingCount = footingCount;
    customize.autoTotal = autoTotal;
    customize.iconLocation = iconLocation;

    var table = (typeof(tableId) == "string") ? document.getElementById(tableId) : null;

    if (table) {
        if (customize.autoTotal) {
            this.appendTotalRow(table, customize.columnTypes, customize.firstDataRowIndex);
            customize.footingCount++;  // to cover added row
        }
        if (customize.iconLocation != "") { // setup for showing sort icon
            table.sortAttributeAscending = contextPath + customize.iconLocation + "down.gif";
            table.sortAttributeDescending = contextPath + customize.iconLocation + "up.gif";
            table.sortImage = document.createElement("IMG");
        }
        customize.lastClickableRow = customize.firstDataRowIndex - 1;
        if (customize.lastClickableRow < 0) {
            customize.lastClickableRow = 0;  // ensure at least the first row is clickable
        }
        customize.sortCell = null; // updated in handle row if sorting requested
        customize.dataRowCount = 1;
        var colAttrs = columnAttributes.split(",");
        customize.attrList = Array(colAttrs.length);

        for (var i = 0; i < colAttrs.length; i++) {
            customize.attrList[i] = colAttrs[i].Trim().split(";;");
        }

        var rowIndex = 0;

        var headRowCount = (table.tHead == null) ? 0 : table.tHead.rows.length;
        var footRowCount = (table.tFoot == null) ? 0 : table.tFoot.rows.length;
        var bodyRowCount = table.tBodies[0].rows.length;
        customize.totalRowCount = headRowCount + footRowCount + bodyRowCount;

        for (var i = 0; i < headRowCount; i++) { // each row in thead
            var row = table.tHead.rows[i];
            this.handleRow(table, row, rowIndex, customize);
            rowIndex++;
        }

        for (var i = 0; i < bodyRowCount; i++) { // each row in tbodies[0]
            var row = table.tBodies[0].rows[i];
            this.handleRow(table, row, rowIndex, customize);
            rowIndex++;
        }

        for (var i = 0; i < footRowCount; i++) { // each row in tfoot
            var row = table.tFoot.rows[i];
            this.handleRow(table, row, rowIndex, customize);
            rowIndex++;
        }

        // If user has requested auto sorting of a column before initial display
        if (customize.sortCell != null) {  // auto sort
            customize.sortCell.sortDescending = customize.sortDescending;
            this.sortByCell(customize.sortCell, customize.firstDataRowIndex, customize.footingCount, this);
        }
    }
    return table;
}
} catch (err) {
    if (console && console.log && console.error) {
        console.log("Error running batched script.");
        console.error(err);
    }
}


