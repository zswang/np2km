var fs = require('fs');
var path = require('path');

module.exports = function(filename, opts) {
    opts = opts || {};
    var root = {};

    function parse(filename, node, level) {
        if (!/\.json$/i.test(filename)) {
            filename = path.join(filename, 'package.json');
        }

        if (!fs.existsSync(filename)) {
            throw new Error('file not exits.');
        }

        var json = JSON.parse(fs.readFileSync(filename));
        node.data = {
            text: json.name + '@' + json.version,
            note: json.description,
            hyperlink: json.homepage,
            hyperlinkTitle: json.homepage ? 'homepage' : undefined,
            expandState: level < 3 ? 'expand' : undefined
        };

        var children = [];
        for (var key in json.dependencies) {
            var item = {};
            parse(
                path.join(path.dirname(filename), 'node_modules', key),
                item, level + 1
            );
            children.push(item);
        }
        if (children.length) {
            node.children = children;
        }
    }

    parse(filename, root, 0);

    return root;
};
