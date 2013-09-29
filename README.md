Filepath
========

A little utility interface for working with the file system in Node.js programs.

## Installation
The most common use of Filepath is to use it as a library. In that case, just
include it in your Node.js project by adding a line for Filepath in your
`pacakge.json`. For more information about your `package.json` file, you should
check out the npm documentation by running `npm help json`.

Alternatively, you can quickly install Filepath for use in a project by running

	npm install filepath

which will install filepath in your `node_modules/` folder.

## Testing
To run the tests, just do

  ./manage test

You should see the test results output.

API Quick Reference
-------------------

### Load the module
```JS  
var FP = require('filepath')
```

### Create a new FilePath object
```JS
var path = FP.newPath(__filname)

// Defaults to current working directory:
assert(FP.newPath().toString() === process.cwd())

// Joins multiple parts:
assert(FP.newPath(__dirname, 'foo').toString() === __dirname + '/foo')
```

## #append()
```JS
var path = FP.newPath(__dirname)
assert(path.append('foo').append('bar').toString() === __dirname + '/foo/bar')
```

Copyright and License
---------------------
Copyright (c) 2013 by Kris Walker <kris@kixx.name> (http://www.kixx.name).

Unless otherwise indicated, all source code is licensed under the MIT license.
See LICENSE for details.
