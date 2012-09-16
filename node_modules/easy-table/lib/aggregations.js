var padLeft = require('./table').padLeft

var Printer = exports.Printer = function (name, format) {
    return function (val, width) {
        var s = name + ' ' + format(val)
        return width == null
            ? s
            : padLeft(s, width)
    }
}


exports.sum = function (sum, val) {
    sum = sum || 0
    return sum += val
}

exports.sum.printer = Printer('\u2211', String)


exports.avg = function (sum, val, index, length) {
    sum = sum || 0
    sum += val
    return index + 1 == length
        ? sum / length
        : sum
}

exports.avg.printer = Printer('Avg:', String)