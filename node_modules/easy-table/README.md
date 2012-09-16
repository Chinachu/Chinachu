# Easy table

Simple and nice utility for rendering text tables with javascript.

## Usage

``` javascript
var Table = require('easy-table');

var data = [
    { id: 123123, desc: 'Something awesome', price: 1000.00 },
    { id: 245452, desc: 'Very interesting book', price: 11.45},
    { id: 232323, desc: 'Yet another product', price: 555.55 }
]

var t = new Table;

data.forEach(function (product) {
    t.cell('Product Id', product.id);
    t.cell('Description', product.desc);
    t.cell('Price, USD', product.price, Table.Number(2));
    t.newRow();
});

console.log(t.toString());
```

The script above will render:

```
Product Id  Description            Price, USD
----------  ---------------------  ----------
123123      Something awesome         1000.00
245452      Very interesting book       11.45
232323      Yet another product        555.55

```

`t.printTransposed()` yields

```
Product Id  : 245452                : 232323              : 123123
Description : Very interesting book : Yet another product : Something awesome
Price, USD  : 11.45                 : 555.55              : 1000.00

```

Finally `t.print()` shows just the rows you pushed and nothing more

```
245452  Very interesting book    11.45
232323  Yet another product     555.55
123123  Something awesome      1000.00

```

### How it works

The full signature of `.cell()` method is:

``` javascript
t.cell(column, value, printer, width)
```

By default column's width is ajusted to fit the longest value, but if specified
explicitly it is fixed and any non-fitting cell is truncated.

Cell's value rendering occures in two phases. At the first phase `printer`
function is called to get minimal width required to fit cell correctly, at the
second phase `printer` function is called to get actual string to render with
additional `width` parameter supplied.

``` javascript
// Example: Coloring too big numbers in red

function markTooBigs (val, width) {
    if (width == null) return Table.string(val)
    return val > 100
        ? '\033[31m' + String(val) + '\033[39m'
        : Table.string(val)
}
...
t.cell('foo', 300, markTooBigs)
```

### Table.printArray(), Table.printObject()

Often you just want to print an array or a simple key-value map.
`Table.printArray()` and `Table.printObject()` help to instantiate and fill a table for such use cases.

``` javascript
var array = [
    {foo: 'foo1', bar: 'bar1'},
    {foo: 'foo2', bar: 'bar2'}
]

console.log(Table.printArray(array))
```

yields

```
foo   bar
----  ----
foo1  bar1
foo2  bar2

```

we can pass options to override defaut behaviour

``` javascript
Table.printArray(array, {
    bar: {
        name: 'Long field name',
        printer: Table.padLeft
    }
})
```

```
foo   Long field name
----  ---------------
foo1             bar1
foo2             bar2

```

or have a full control over rendering

``` javascript
Table.printArray(array, function (obj, cell) {
    cell('foo', obj.foo)
    cell('field', obj.bar)
}, function (table) {
    return table.print()
})
```

`Table.printObj()` works in the same manner

``` javascript
var obj = {
    foo: 'foo',
    bar: 'bar'
}

Table.printObj(obj)
```

yields

```
foo : foo
bar : bar
```

### Sorting

You can sort a table by calling `.sort()`, and optionally passing in a list of
column names to sort on (by default uses all columns), or a custom comparator
function. It is also possible to specify the sort order. For example:

``` javascript
t.sort(['Price, USD|des']) // will sort in descending order
t.sort(['Price, USD|asc']) // will sort in ascending order
t.sort(['Price, USD']) // sorts in ascending order by default
```

### Totaling

Easy table can help you to calculate and render totals:

``` javascript
t.total('Price, USD', function accumulator (sum, val, index, length) {
    sum = sum || 0
    sum += val
    return index + 1 == length
        ? sum / length
        : sum
}, function print (val, width) {
    var s = 'Avg: ' + Table.Number(2)
    return width == null
        ? s
        : Table.padLeft(s, width)
})
```

yields

```
Product Id  Description            Price, USD
----------  ---------------------  -----------
245452      Very interesting book        11.45
232323      Yet another product         555.55
123123      Something awesome          1000.00
----------  ---------------------  -----------
                                   Avg: 522.33
```

`total()` function also accepts printer via `printer` property of
accumulator, so it is possible to create reusable aggregations like:

``` javascript
var priceAvg = // some accumulator
priceAvg.printer = // some printer
...
t.total('Price', 300.50, priceAvg)
```

## Installation

Just install from the npm repository with:

```
$ npm install easy-table
```

## Misc

Easy table now has kind of stable api and exposes many of it's internals.
But in any case it's better to specify strict version numbers in your modules
especially if you use methods or properties not covered by this readme.


## License

(The MIT License)

Copyright (c) 2012 Eldar Gabdullin <eldargab@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
