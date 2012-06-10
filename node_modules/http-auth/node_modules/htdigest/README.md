# htdigest
[Node.js](http://nodejs.org/) package for HTTP Digest Authentication password file utility.

## Installation

Via git (or downloaded tarball):

```bash
$ git clone git://github.com/gevorg/htdigest.git
```
Via [npm](http://npmjs.org/):

```bash
$ npm install -g htdigest
```	
## Usage

```bash
$ htdigest [-c] passwordfile realm username
```	

## Arguments

 - `-c` - Create a new file.

## Running tests

It uses [nodeunit](https://github.com/caolan/nodeunit/), so just run following command in package directory:

```bash
$ nodeunit tests
```

## Issues

You can find list of issues using **[this link](http://github.com/gevorg/htdigest/issues)**.

## Dependencies

 - **[commander](https://github.com/visionmedia/commander.js/)** - node.js command-line interfaces made easy.

## Development dependencies

 - **[nodeunit](https://github.com/caolan/nodeunit/)** - Easy unit testing in node.js and the browser, based on the assert module.

## License

(The MIT License)

Copyright (c) 2011 Gevorg Harutyunyan <gevorg.ha@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the **Software**), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED **AS IS**, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.