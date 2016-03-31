var gulp = require('gulp');

require('@ftbl/gulp')(gulp, { test: { coverage: 0 }});

gulp.task('default', [ 'test' ]);
