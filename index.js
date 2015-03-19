var fs = require('fs');
var path = require('path');
var glob = require('glob');
var semver = require('semver');

// http://registry.npmjs.org/%s/
// {"dist-tags":{"latest":"0.7.5"},"versions":{"0.0.1":...}}
// http://registry.npmjs.org/%s/%s

module.exports = function(opts) {
  opts = opts || {};
  var modules = {};

  function loadModule(filename) {
    try {
      var json = JSON.parse(fs.readFileSync(filename));
    }
    catch (ex) {
      console.log(ex);
      return;
    }
    modules[json.name] = modules[json.name] || {
      name: json.name,
      $$versions: []
    };
    if (modules[json.name][json.version]) {
      return;
    }
    modules[json.name].versions = modules[json.name].versions || {};
    modules[json.name].versions[json.version] = {
      name: json.name + '@' + json.version,
      $$package: json
    };
    modules[json.name].$$versions.push(json.version);
  }

  glob('package.json', {
    sync: true
  }).forEach(loadModule);

  var rootModule = modules[Object.keys(modules)[0]];
  if (!rootModule) {
    return;
  }

  glob('node_modules/**/package.json', {
    sync: true
  }).forEach(loadModule);

  var root = {};

  function parse(node, name, version, level) {
    // console.log('parse(name = %j, version = %j)', name, version);
    var module = modules[name];
    if (!module) {
      console.log('error');
      return;
    }

    var versions = module.$$versions.filter(function(v) {
      return semver.satisfies(v, version, true);
    }).sort(semver.compareLoose);

    var currVersion = module.versions[versions[0] || module.$$versions[0]];
    if (!currVersion) {
      console.log('error');
      return;
    }

    node.data = {
      text: currVersion.$$package.name + '@' + currVersion.$$package.version,
      note: currVersion.$$package.description,
      hyperlink: currVersion.$$package.homepage,
      hyperlinkTitle: currVersion.$$package.homepage ? 'homepage' : undefined,
      expandState: level < 3 ? 'expand' : 'collapse'
    };

    var children = [];
    for (var key in currVersion.$$package.dependencies) {
      var item = {};
      parse(item,
        key,
        currVersion.$$package.dependencies[key],
        level + 1
      );
      if (Object.keys(item).length) {
        children.push(item);
      }
    }
    if (children.length) {
      node.children = children;
    }
  }
  parse(root, rootModule.name, rootModule.$$versions[0], 0);

  return root;
};