var FS   = require('fs')
  , PATH = require('path')

  , Promise = require('iou').Promise
  , slice   = Array.prototype.slice


function FilePath(path) {
  this.path = path;
};

FilePath.prototype = {

  resolve: function resolve(to) {
    var p
    if (typeof to === 'string') {
      p = PATH.resolve(this.path, to);
    } else {
      p = PATH.resolve(this.path);
    }
    return FilePath.create(p);
  },

  relative: function relative(to) {
    to = typeof to === 'string' ? to : process.cwd();
    return PATH.relative(this.path, to);
  },

  append: function append() {
    // Join an arbitrary number of arguments.
    var args = [this.path].concat(slice.call(arguments))
    return FilePath.create.apply(null, args);
  },

  split: function split() {
    return this.path
      .replace(/\\/g, '/')
      .split('/')
      .filter(FilePath.partsFilter);
  },

  basename: function basename(ext) {
    return PATH.basename(this.path, ext);
  },

  extname: function extname() {
    return PATH.extname(this.path);
  },

  dir: function dir() {
    var p = PATH.dirname(this.path);
    return FilePath.create(p);
  },

  exists: function exists() {
    return FS.existsSync(this.path) ? true : false;
  },

  isFile: function isFile() {
    try {
      var stats = FS.statSync(this.path);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
    return !!stats.isFile();
  },

  isDirectory: function isDirectory() {
    try {
      var stats = FS.statSync(this.path);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
    return !!stats.isDirectory();
  },

  newReadStream: function newReadStream(opts) {
    return FS.createReadStream(this.path, opts);
  },

  newWriteStream: function newWriteStream(opts) {
    opts = opts || (opts || {});
    if (opts.encoding === void 0) {
      opts.encoding = 'utf8';
    }
    return FS.createWriteStream(this.path, opts);
  },

  read: function read(opts) {
    opts = (opts || Object.create(null));

    if (opts.encoding === void 0) {
      opts.encoding = 'utf8';
    }

    var self = this
      , promise

    function handleError(err, reject) {
        if (err.code === 'ENOENT') {
          return null;
        } else if (err.code === 'EISDIR') {
          err = new Error("Cannot read '"+ self.path +"'; it is a directory.");
          err.code = "PATH_IS_DIRECTORY";
          throw err;
        }
        throw err;
    }

    if (opts.sync || opts.synchronous) {
      try {
        return FS.readFileSync(this.path, opts);
      } catch (err) {
        return handleError(err);
      }
    }

    promise = new Promise(function (resolve, reject) {
      FS.readFile(self.path, opts, function (err, data) {
        if (err) {
          try {
            return resolve(handleError(err));
          } catch (e) {
            return reject(e);
          }
        }

        return resolve(data);
      });
    });

    return promise;
  },

  write: function write(data, opts) {
    opts = (opts || Object.create(null));

    var self = this
      , promise
      , dir = this.dirname()

    if (!dir.exists()) {
      dir.mkdir();
    }

    function handleError(err, reject) {
        if (err.code === 'ENOENT') {
          return null;
        } else if (err.code === 'EISDIR') {
          err = new Error("Cannot write to '"+ self.path +"'; it is a directory.");
          err.code = "PATH_IS_DIRECTORY";
          throw err;
        }
        throw err;
    }

    if (opts.sync || opts.synchronous) {
      try {
        FS.writeFileSync(self.path, data, opts);
        return self;
      } catch (err) {
        return handleError(err);
      }
    }

    promise = new Promise(function (resolve, reject) {
      FS.writeFile(self.path, data, opts, function (err) {
        var e

        if (err && err.code === 'ENOENT') {
          return resolve(null);
        } else if (err && err.code === 'EISDIR') {
          e = new Error("Cannot write to '"+ self.path +"'; it is a directory.");
          e.code = "PATH_IS_DIRECTORY";
          return reject(e);
        } else if (err) {
          return reject(err);
        }

        return resolve(self);
      });
    });

    return promise;
  },

  copy: function copy(opts) {
    var opts, target
      , args = slice.call(arguments)
      , lastArg = args[args.length -1]

    if (!args.length || lastArg instanceof FilePath || typeof lastArg === 'string') {
      opts = Object.create(null);
    } else {
      opts = args.pop();
    }

    target = FilePath.create.apply(null, args)

    // Use a buffer.
    opts.encoding = null;

    if (opts.sync || opts.synchronous) {
      var contents = this.read(opts);
      return target.write(contents, opts);
    }

    function copyContents(contents) {
      return target.write(contents, opts);
    }


    return this.read(opts).then(copyContents);
  },

  remove: function remove() {
    try {
      FS.unlinkSync(this.path);
    } catch (e) {}
    return this;
  },

  require: function path_require(contextualRequire) {
    if (typeof contextualRequire !== 'function') {
      var err = new Error("Must pass a require function to #require().");
      err.code = 'NO_REQUIRE_CONTEXT';
      throw err;
    }
    return contextualRequire(this.path);
  },

  list: function list() {
    try {
      var list = FS.readdirSync(this.path);
    } catch (err) {
      var e;
      if (err.code === 'ENOTDIR') {
        e = new Error("Cannot list '"+ this.path +"'; it is a file.");
        e.code = "PATH_IS_FILE";
      } else if (err.code === 'ENOENT') {
        e = new Error("Cannot list '"+ this.path +"'; it does not exist.");
        e.code = "PATH_NO_EXIST";
      }

      if (e) throw e;
      throw err;
    }

    return list.map(function (item) {
      return FilePath.create(this.path, item);
    }, this);
  },

  mkdir: function mkdir() {
    var _this = this
      , parts = this.resolve().toString().split(PATH.sep)
      , fullpath

    // Shift off the empty string.
    parts.shift();

    fullpath = parts.reduce(function (fullpath, part) {
      fullpath = fullpath.append(part);
      if (fullpath.exists()) {
        if (fullpath.isDirectory()) return fullpath;
        var e = new Error("Cannot create directory '"+ _this.path +"'; it is a file.");
        e.code = "PATH_IS_FILE";
        throw e;
      }

      FS.mkdirSync(fullpath.toString());
      return fullpath;
    }, FilePath.root());

    return FilePath.create(fullpath);
  },

  recurse: function recurse(callback) {
    var p = this.resolve();

    if (!p.isDirectory()) {
      return callback(p);
    }

    try {
      var listing = p.list();
    } catch (err) {
      if (err.code === 'PATH_IS_FILE') {
        return p;
      }

      throw err;
    }

    listing.sort(FilePath.alphaSort).forEach(function (li) {
      callback(li);
      if (li.isDirectory()) {
        li.recurse(callback);
      }
    });

    return this;
  },

  toString: function toString() {
    return this.path;
  }
};

// For backwards compatibility:
FilePath.prototype.dirname = FilePath.prototype.dir;

FilePath.create = function create() {
  var path, args

  if (arguments.length === 1 && arguments[0]) {
    path = arguments[0];
  } else if (arguments.length < 1) {
    path = process.cwd();
  } else {
    args = slice.call(arguments).map(function (item) {
      if (item == void 0) return '';
      return item +'';
    }).filter(FilePath.partsFilter);

    if (args.length < 1) {
      path = process.cwd();
    } else {
      path = PATH.join.apply(PATH, args);
    }
  }

  return new FilePath(PATH.resolve(path.toString()));
};

FilePath.root = function root() {
  return FilePath.create(process.platform === 'win32' ? '\\' : '/');
};

FilePath.home = function home() {
  var path = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME
  return FilePath.create(path);
};

FilePath.alphaSort = function alphaSort(a, b) {
  a = a.toString();
  b = b.toString();
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

FilePath.partsFilter = function partsFilter(part) {
  return part ? true : false;
};


exports.FilePath = FilePath;
exports.create   = exports.newPath = FilePath.create;
exports.root     = FilePath.root;
exports.home     = FilePath.home;
