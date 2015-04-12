var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var Generator = require('jison').Generator;

const PLUGIN_NAME = 'gulp-jison';

module.exports = function (options) {
    options = options || {};

    return through.obj(function (file, enc, callback) {
        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams not supported'));
            return callback();
        }

        if (file.isBuffer()) {
            try {
                var generator = new Generator(file.contents.toString(), options);
                // Add acceptable first symbols to parser.
                var source = generator.generate({
                    moduleName: options.moduleName || "Parser"
                });
                if (generator.computeLookaheads) {
                    generator.computeLookaheads();
                    var firsts = generator.nonterminals.$accept.first;
                    // Text for insertion into source.
                    firsts = "parser.firsts = " + JSON.stringify(firsts) + ";\n";
                    var insertPoint = source.indexOf("return new Parser;");
                    if (insertPoint !== -1) {
                        source = source.slice(0, insertPoint) + firsts +
                            source.slice(insertPoint);
                    }
                }
                file.contents = new Buffer(source);
                file.path = gutil.replaceExtension(file.path, ".js");
                this.push(file);
            } catch (error) {
                this.emit('error', new PluginError(PLUGIN_NAME, error));
            }
            return callback();
        }
    });
};
