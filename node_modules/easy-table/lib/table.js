module.exports = Table

Table.string = function (val) {
    if (val === undefined) return ''
    return String(val)
}

Table.Number = function (digits) {
    return function (val, width) {
        if (val === undefined) return ''
        if (typeof val != 'number')
            throw new Error(String(val) + ' is not a number')
        var s = digits == null ? String(val) : val.toFixed(digits).toString()
        return Table.padLeft(s, width)
    }
}

Table.RightPadder = function (char) {
    char = char || ' '
    return function (val, length) {
        var s = String(val)
        var l = s.length
        for (var i = 0; i < length - l; i++) {
            s += char
        }
        return s
    }
}

Table.LeftPadder = function (char) {
    char = char || ' '
    return function (val, length) {
        var ret = ''
        var s = String(val)
        for (var i = 0; i < length - s.length; i++) {
            ret += char
        }
        ret += s
        return ret
    }
}

Table.padLeft = Table.LeftPadder()

Table.printArray = function (arr, format, cb) {
    format = typeof format == 'function' ? format : Formatter(format)
    cb = cb || function (t) {
        return t.toString()
    }

    var t = new Table
    var cell = t.cell.bind(t)

    arr.forEach(function (obj) {
        format(obj, cell)
        t.newRow()
    })
    return cb(t)
}

Table.printObj = function (obj, format, cb) {
    format = typeof format == 'function' ? format : Formatter(format)
    cb = cb || function (t) {
        return t.printTransposed(' : ')
    }

    var t = new Table
    format(obj, t.cell.bind(t))
    t.newRow()
    return cb(t)
}

function Formatter (opts) {
    opts = opts || {}
    return function (obj, cell) {
        for (var key in obj) {
            var o = opts[key]
            cell(
                (o && o.name) || key,
                obj[key],
                o && o.printer,
                o && o.width
            )
        }
    }
}


Table.Row = Row
function Row () {
    Object.defineProperties(this, {
        __printers: {
            value: {},
            enumerable: false
        },
        __cell: {
            value: function (col, val, printer) {
                this[col] = val
                this.__printers[col] = printer
            },
            enumerable: false
        }
    })
}


Table.print = print
function print (rows, columns, shift) {
    var padSpaces = Table.RightPadder()
    var widths = {}

    function setWidth (col, width) {
        var isFixed = columns[col].width != null
        if (isFixed) {
            widths[col] = columns[col].width
        } else {
            if (widths[col] > width) return
            widths[col] = width
        }
    }

    function cellPrinter (row, col) {
        return (row.__printers && row.__printers[col]) || Table.string
    }

    function calcWidths () {
        rows.forEach(function (row) {
            for (var key in columns) {
                setWidth(key, cellPrinter(row, key).call(row, row[key]).length)
            }
        })
    }

    function printRow (cb) {
        var s = ''
        var firstColumn = true
        for (var key in columns) {
            if (!firstColumn) s += shift
            firstColumn = false
            var width = widths[key]
            s += printCell(cb(key, width), width)
        }
        s += '\n'
        return s
    }

    function printCell (s, width) {
        if (s.length <= width) return padSpaces(s, width)
        s = s.slice(0, width)
        if (width > 3) s = s.slice(0, -3).concat('...')
        return s
    }

    calcWidths()

    return rows.map(function (row) {
        return printRow(function (key, width) {
            return cellPrinter(row, key).call(row, row[key], width)
        })
    }).join('')

}


function Table () {
    this.columns = {} /* @api: public */
    this.rows = [] /* @api: public */
    this._row = new Row
}


Table.prototype.cell = function (col, val, printer, width) {
    this._row.__cell(col, val, printer)
    var c = this.columns[col] || (this.columns[col] = {})
    if (width != null) c.width = width
    return this
}

Table.prototype.newRow = Table.prototype.newLine = function () {
    this.rows.push(this._row)
    this._row = new Row
    return this
}

Table.prototype.sort = require('./sort')

Table.aggr = require('./aggregations')

Table.prototype.totals = null /* @api: public */

Table.prototype.total = function (col, fn, printer) {
    fn = fn || Table.aggr.sum
    printer = printer || fn.printer

    this.totals = this.totals || new Row

    var val
    var rows = this.rows

    this.totals.__cell(col, null, function (_, width) {
        if (width != null) return printer(val, width)
        val = rows.reduce(function (val, row, index) {
            return fn(val, row[col], index, rows.length)
        }, null)
        return printer(val)
    })
    return this
}

Table.prototype.shift = '  '

Table.prototype.print = function () {
    return print(this.rows, this.columns, this.shift)
}

Table.prototype.printTransposed = function (delimeter) {
    var t = new Table
    if (delimeter) t.shift = delimeter

    function Printer (row, key) {
        var p = row.__printers && row.__printers[key]
        if (p) return function (val) {
            return p(val)
        }
    }

    for (var key in this.columns) {
        t.cell('h', key)
        this.rows.forEach(function (row, index) {
            t.cell('f' + index, row[key], Printer(row, key))
        })
        t.newRow()
    }
    return t.print()
}

Table.prototype.toString = function () {
    var padWithDashs = Table.RightPadder('-')
    var delimeter = this.createRow(function () {
        return ['', padWithDashs]
    })
    var head = this.createRow(function (key) {
        return [key]
    })
    var rows = [head, delimeter].concat(this.rows)
    if (this.totals) {
        rows = rows.concat([delimeter, this.totals])
    }
    return print(rows, this.columns, this.shift)
}

Table.prototype.createRow = function (cb) {
    var row = new Row
    for (var key in this.columns) {
        var args = cb(key)
        row.__cell(key, args[0], args[1])
    }
    return row
}