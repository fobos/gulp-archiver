'use strict';

var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var through = require('through2');
var archiver = require('archiver');
var concatStream = require('concat-stream');

module.exports = function (file, opts) {
    if (!file) {
        throw new PluginError('gulp-archiver', 'Missing file option for gulp-archiver');
    }
    opts = opts || {};

    var firstFile,
        fileName,
        archiveType;

    if (typeof file === 'string' && file !== '') {
        fileName = file;
    } else if (typeof file.path === 'string') {
        fileName = path.basename(file.path);
    } else {
        throw new PluginError('gulp-archiver', 'Missing path in file options for gulp-archiver');
    }

    var matches = fileName.match(/\.(zip|tar)$|\.(tar).gz$/);
    if (matches !== null) {
        archiveType = matches[1] || matches[2];
    } else {
        throw new PluginError('gulp-archiver', 'Unsupported archive type for gulp-archiver');
    }

    var archive = archiver.create(archiveType, opts);

    return through.obj(function(file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new PluginError('gulp-archiver',  'Streaming not supported'));
            cb();
            return;
        }

        if (!firstFile) {
            firstFile = file;
        }

        // Add to archive
        if (file.isNull()) { // directories or file with empty .contents field
            if (file.relative.length) {
                archive.file(file.path, {name: file.relative});
            }
        } else {
            archive.append(file.contents, {name: file.relative});
        }

        cb();
    }, function(cb) {
        if (!firstFile) {
            cb();
            return;
        }

        archive.finalize();
        archive.pipe(concatStream(function(data) {
            this.push(new File({
                cwd: firstFile.cwd,
                base: firstFile.base,
                path: path.join(firstFile.base, fileName),
                contents: data
            }));

            cb();
        }.bind(this)));
    });
};
