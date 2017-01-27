var gulp = require('gulp');
var gulpif = require('gulp-if');
var del = require('del');
var uglify = require('gulp-uglify');
var pump = require('pump');
var cleanCSS = require('gulp-clean-css');
var typescript = require('gulp-tsc');
const zip = require('gulp-zip');
var fs = require('fs');
var manifest = require('./manifest.json');

const otherDependencies = [
    'src/some-image.png',
    'src/popup.js',
    'node_modules/materialize-css/dist/css/materialize.min.css',
    'src/popup.css',
    'node_modules/materialize-css/dist/js/materialize.min.js' 
];

var destination;


// gulp.task('compile', function(){
//   gulp.src(['src/**/*.ts'])
//     .pipe(typescript())
//     .pipe(gulp.dest(destination))
// });

// it will pick everything from dist/prod and zip
gulp.task('build.zip', function () {
    gulp.src('dist/prod/*')
        .pipe(zip('dist.zip'))
        .pipe(gulp.dest('dist'))
});

gulp.task('build.dev', function () {
    destination = 'dist/dev';
    build(false);
});


gulp.task('watch.build.dev', function () {
    gulp.watch('src/**/*.*', ['build.dev']);
});

gulp.task('clean', function () {
    return del(['dist']);
});

gulp.task('build.prod', function () {
    destination = 'dist/prod';
    build(true);
});

function build(forProd) {
    if (manifest.icons) {
        moveIcons(manifest.icons);
    }
    // MOVING browser_action
    if (manifest.browser_action) {
        var browser_action_icons = manifest.browser_action.default_icon;
        moveIcons(browser_action_icons);
        if (manifest.browser_action.default_popup) {
            move(manifest.browser_action.default_popup);
        }
    }

    if (manifest.page_action) {
        var page_action_icons = manifest.page_action.default_icon;
        moveIcons(page_action_icons);
        if (manifest.page_action.default_popup) {
            move(manifest.page_action.default_popup);
        }
    }

    if (manifest.background) {
        var scripts = manifest.background.scripts;
        for (var index in scripts) {
            forProd ? uglifyThenMove(scripts[index]) : moveJS(scripts[index]);
        }

        if (manifest.background.page) {
            move(manifest.background.page);
        }
    }

    if (manifest.content_scripts) {
        for (var contentScript of manifest.content_scripts) {
            var cssFiles = contentScript.css;
            for (var index in cssFiles) {
                forProd ? minifyCssThenMove(cssFiles[index]) : moveJS(cssFiles[index]);
            }

            var jsFiles = contentScript.js;
            for (var index in jsFiles) {
                forProd ? uglifyThenMove(jsFiles[index]) : moveJS(jsFiles[index]);
            }
        }
    }

    if (manifest.devtools_page) {
        move(manifest.devtools_page);
    }

    if (manifest.options_page) {
        move(manifest.options_page);
    }

    if (manifest.options_ui && manifest.options_ui.page) {
        move(manifest.options_ui.page);
    }

    if (manifest.plugins) {
        for (var plugin of manifest.plugins) {
            move(plugin.path);
        }
    }

    if (manifest.sandbox && manifest.sandbox.pages) {
        for (var page of manifest.sandbox.pages) {
            move(page);
        }
    }

    for (var dep of otherDependencies) {
        if (IfJsFile(dep)) {
            forProd ? uglifyThenMove(dep) : moveJS(dep);
        } else if (IfCssFile(dep)) {
            forProd ? minifyCssThenMove(dep) : move(dep);
        } else {
            move(dep);
        }
    }

    //finally move manifest.json file
    move('manifest.json');
}

function minifyCssThenMove(css) {
    return gulp.src(css, { base: './' })
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(gulp.dest(destination));
}

function moveIcons(icons) {
    if (icons) {
        for (var icon in icons) {
            move(icons[icon]);
        }
    }
}

function uglifyThenMove(srcFile) {
    fileExists(srcFile, function (exists) {
        if (!exists) {
            var arr = srcFile.split('.');
            srcFile = arr[0] + '.ts';
        }
        pump([
            gulp.src(srcFile, { base: './' }),
            gulpif(!exists, typescript()),
            uglify({
                mangle: true
            }),
            gulp.dest(destination)
        ],
            undefined
        );
    });
}

function moveJS(srcFile) {
    console.log(srcFile);
    fileExists(srcFile, function (exists) {
        if (!exists) {
            var arr = srcFile.split('.');
            srcFile = arr[0] + '.ts';
        }
        pump([
            gulp.src(srcFile, { base: './' }),
            gulpif(!exists, typescript()),
            gulp.dest(destination)
        ],
            undefined
        );
    });
}

function move(srcFile) {
    gulp.src(srcFile, { base: './' })
        .pipe(gulp.dest(destination));
}

function fileExists(file, cb) {
    fs.stat(file, function (err, stat) {
        if (err == null) {
            cb(true);
        } else {
            cb(false);
        }
    });
}

function IfCssFile(file) {
    var arr = file.split('.');
    if (arr[1] === 'css')
        return true;
    else
        return false;
}

function IfJsFile(file) {
    var arr = file.split('.');
    if (arr[1] === 'js')
        return true;
    else
        return false;
}