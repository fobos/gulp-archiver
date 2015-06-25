'use strict';

var gulp = require('gulp');
var fs = require('fs');
var path = require('path');
var should = require('should');
var archive = require('../');
var assert = require('stream-assert');
var vinylAssign = require('vinyl-assign');
var unzip = require('decompress-unzip');
var tar = require('tar');

var fixtures = function (glob) {
    return path.join(__dirname, 'fixtures', glob);
};

describe('gulp-archiver', function() {
    it('should throw, when arguments is missing', function() {
        (function() {
            archive();
        }).should.throw('Missing file option for gulp-archiver');
    });

    describe('with object as argument', function () {
        it('should throw without path', function () {
            (function () {
                archive({path: undefined});
            }).should.throw('Missing path in file options for gulp-archiver');
        });
    });

    it('should throw, when incorrect archive type were passed', function() {
        (function() {
            archive('test');
        }).should.throw('Unsupported archive type for gulp-archiver');

        (function() {
            archive('test.txt');
        }).should.throw('Unsupported archive type for gulp-archiver');
    });

    it('should emit error on streamed file', function (done) {
        gulp.src(fixtures('*'), { buffer: false })
            .pipe(archive('test.zip'))
            .on('error', function (err) {
                err.message.should.eql('Streaming not supported');
                done();
            });
    });

    describe('should not fail if no files were input', function () {
        it('when argument is a string', function(done) {
            var stream = archive('test.zip');
            stream.end();
            done();
        });

        it('when argument is an object', function(done) {
            var stream = archive({path: 'test.zip'});
            stream.end();
            done();
        });
    });

    it('should archive one file', function(done) {
        var unzipper = unzip();
        var fixture = fixtures('fixture.txt');

        gulp.src(fixture)
            .pipe(archive('test.zip'))
            // check archive created correct
            .pipe(assert.length(1))
            .pipe(assert.first(function(destFile) {
                destFile.path.should.eql(__dirname + '/fixtures/test.zip');
            }))
            // unzip
            .pipe(vinylAssign({extract:true})).pipe(unzipper)
            // check unzipped result
            .pipe(assert.length(1))
            .pipe(assert.first(function(file) {
                file.path.should.eql('fixture.txt');
                file.contents.toString().should.eql(fs.readFileSync(fixture, {encoding: 'utf8'}));
            }))
            // ok
            .pipe(assert.end(done));
    });

    it('should archive directories', function(done) {
        var testStream = tar.Parse(),
            result = [];

        testStream.on('entry', function(entry) {
            result.push(entry.path);
        });
        testStream.on('end', function() {
            try {
                result.should.have.length(8);
                done();
            } catch (err) {
                done(err);
            }
        });

        gulp.src(fixtures('**'))
            .pipe(archive('test.tar'))
            // check archive created correct
            .pipe(assert.length(1))
            .pipe(assert.first(function(destFile) {
                destFile.path.should.eql(__dirname + '/fixtures/test.tar');

                // untar
                destFile.pipe(testStream);
            }));
    });

    it('should archive directories with option {read: false}', function(done) {
        var testStream = tar.Parse(),
            result = [];

        testStream.on('entry', function(entry) {
            result.push(entry.path);
        });
        testStream.on('end', function() {
            try {
                result.should.have.length(8);
                done();
            } catch (err) {
                done(err);
            }

        });

        gulp.src(fixtures('**'), {read: false})
            .pipe(archive('test.tar'))
            // check archive created correct
            .pipe(assert.length(1))
            .pipe(assert.first(function(destFile) {
                destFile.path.should.eql(__dirname + '/fixtures/test.tar');

                // untar
                destFile.pipe(testStream);
            }));
    });
});
