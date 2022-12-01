#!/bin/sh

## DEPS
# jquery
install -D node_modules/@bower_components/jquery/dist/jquery.min.js build/bower_components/jquery/jquery.min.js
install -D node_modules/@bower_components/jquery/LICENSE.txt build/bower_components/jquery/LICENSE.txt
# bootstrap
install -D node_modules/@bower_components/bootstrap/dist/js/bootstrap.min.js build/bower_components/bootstrap/js/bootstrap.min.js
install -D node_modules/@bower_components/bootstrap/dist/css/bootstrap.min.css build/bower_components/bootstrap/css/bootstrap.min.css
install -D node_modules/@bower_components/bootstrap/LICENSE build/bower_components/bootstrap/LICENSE.txt
cp -r node_modules/@bower_components/bootstrap/dist/fonts build/bower_components/bootstrap/fonts
# bootstrap-vertical-tabs
install -D node_modules/@bower_components/bootstrap-vertical-tabs/bootstrap.vertical-tabs.css build/bower_components/bootstrap-vertical-tabs/bootstrap.vertical-tabs.css
install -D node_modules/@bower_components/bootstrap-vertical-tabs/LICENSE build/bower_components/bootstrap-vertical-tabs/LICENSE.txt
# angular
install -D node_modules/@bower_components/angular/angular.min.js build/bower_components/angular/angular.min.js
install -D node_modules/@bower_components/angular/LICENSE.md build/bower_components/angular/LICENSE.txt
# angular-resource
install -D node_modules/@bower_components/angular-resource/angular-resource.min.js build/bower_components/angular-resource/angular-resource.min.js
install -D node_modules/@bower_components/angular-resource/LICENSE.md build/bower_components/angular-resource/LICENSE.txt
# angular-sanitize
install -D node_modules/@bower_components/angular-sanitize/angular-sanitize.min.js build/bower_components/angular-sanitize/angular-sanitize.min.js
install -D node_modules/@bower_components/angular-sanitize/LICENSE.md build/bower_components/angular-sanitize/LICENSE.txt
# angular-table
install -D node_modules/@bower_components/angular-table/ng-table.min.js build/bower_components/angular-table/ng-table.min.js
install -D node_modules/@bower_components/angular-table/ng-table.min.css build/bower_components/angular-table/ng-table.min.css
install -D node_modules/@bower_components/angular-table/LICENSE.txt build/bower_components/angular-table/LICENSE.txt
# angular-translate
install -D node_modules/@bower_components/angular-translate/angular-translate.min.js build/bower_components/angular-translate/angular-translate.min.js
install -D node_modules/@bower_components/angular-translate/README.md build/bower_components/angular-translate/README.md
# angular-translate-loader-static-files
install -D node_modules/@bower_components/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js build/bower_components/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js
install -D node_modules/@bower_components/angular-translate-loader-static-files/README.md build/bower_components/angular-translate-loader-static-files/README.md
# angular-ui-bootstrap
install -D node_modules/@bower_components/angular-ui-bootstrap/ui-bootstrap-tpls.min.js build/bower_components/angular-ui-bootstrap/ui-bootstrap-tpls-2.3.0.min.js
install -D node_modules/@bower_components/angular-translate-loader-static-files/README.md build/bower_components/angular-translate-loader-static-files/README.md
# angular-ui-router
install -D node_modules/@bower_components/angular-ui-router/release/angular-ui-router.min.js build/bower_components/angular-ui-router/angular-ui-router.min.js
install -D node_modules/@bower_components/angular-ui-router/LICENSE build/bower_components/angular-ui-router/LICENSE
# angucomplete-alt
install -D node_modules/@bower_components/angucomplete-alt/dist/angucomplete-alt.min.js build/bower_components/angucomplete-alt/angucomplete-alt.min.js
install -D node_modules/@bower_components/angucomplete-alt/angucomplete-alt.css build/bower_components/angucomplete-alt/angucomplete-alt.css
install -D node_modules/@bower_components/angucomplete-alt/LICENSE build/bower_components/angucomplete-alt/LICENSE
# angucomplete-alt
install -D node_modules/@bower_components/d3/d3.min.js build/bower_components/d3/d3.min.js
install -D node_modules/@bower_components/d3/LICENSE build/bower_components/d3/LICENSE
# lodash
cp -r node_modules/@bower_components/lodash build/bower_components/lodash
# tinymce
install -D node_modules/@bower_components/tinymce/tinymce.min.js build/bower_components/tinymce/tinymce.min.js
install -D node_modules/@bower_components/tinymce/license.txt build/bower_components/tinymce/license.txt
cp -r node_modules/@bower_components/tinymce/plugins build/bower_components/tinymce/plugins
cp -r node_modules/@bower_components/tinymce/skins build/bower_components/tinymce/skins
cp -r node_modules/@bower_components/tinymce/themes build/bower_components/tinymce/themes
# angular-ui-tinymce
install -D node_modules/@bower_components/angular-ui-tinymce/dist/tinymce.min.js build/bower_components/angular-ui-tinymce/tinymce.min.js
install -D node_modules/@bower_components/angular-ui-tinymce/LICENSE build/bower_components/angular-ui-tinymce/LICENSE.txt
## APP
cp -r app assets languages doc assets/img/Logo_48.png index.html build