module.exports = sort

function sort (comparator) {
    if (typeof comparator != 'function') {
        var sortKeys = Array.isArray(comparator)
            ? comparator
            : Object.keys(this.columns)
        comparator = KeysComparator(sortKeys)
    }
    this.rows.sort(comparator)
    return this
}

function KeysComparator (keys) {
    var comparators = keys.map(function (key) {
        var sortFn = 'asc'

        var m = /(.*)\|\s*(asc|des)\s*$/.exec(key)
        if (m) {
            key = m[1]
            sortFn = m[2]
        }

        return function (a, b) {
            var ret = compare(a[key], b[key])
            return sortFn == 'asc' ? ret : -1 * ret
        }
    })

    return function (a, b) {
        for (var i = 0; i < comparators.length; i++) {
            var res = comparators[i](a, b)
            if (res != 0) return res
        }
        return 0
    }
}

function compare (a, b) {
    if (a === b) return 0
    if (a === undefined) return 1
    if (b === undefined) return -1
    if (a === null) return 1
    if (b === null) return -1
    if (a > b) return 1
    if (a < b) return -1
    return compare(String(a), String(b))
}