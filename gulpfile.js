var connect = require('gulp-connect'),
    gulp = require('gulp'),
    open = require('gulp-open'),
    paths = {
      html: {
        build: 'build'
      }
    };

// HTML Reloader
gulp.task('reloadHTML', function(){
  return gulp.src(paths.html.build + '/index.html')
             .pipe(connect.reload());
});

// Start Dev Server
gulp.task('connect', function(){
  connect.server({
    root: paths.html.build,
    port: '8080',
    host: 'localhost',
    livereload: true
  });
});

// Open Site
gulp.task('openSite', function(){
  return gulp.src('')
             .pipe(open({uri: 'http://localhost:8080'}));
});

// The Watcher
gulp.task('watch', function(){
  gulp.watch(paths.html.build + '/index.html', ['reloadHTML']);
  gulp.watch(paths.html.build + '/js/app.js', ['reloadHTML']);
});

gulp.task('default', ['watch', 'connect', 'openSite']);