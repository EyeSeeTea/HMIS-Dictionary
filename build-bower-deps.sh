#!/bin/sh

# install file perms
mode=u=rw,go=r

## MAKE bower_components
# jquery
install -D --mode=$mode node_modules/@bower_components/jquery/dist/jquery.min.js bower_components/jquery/jquery.min.js
install -D --mode=$mode node_modules/@bower_components/jquery/LICENSE.txt bower_components/jquery/LICENSE.txt
# bootstrap
install -D --mode=$mode node_modules/@bower_components/bootstrap/dist/js/bootstrap.min.js bower_components/bootstrap/js/bootstrap.min.js
install -D --mode=$mode node_modules/@bower_components/bootstrap/dist/css/bootstrap.min.css bower_components/bootstrap/css/bootstrap.min.css
install -D --mode=$mode node_modules/@bower_components/bootstrap/LICENSE bower_components/bootstrap/LICENSE.txt
cp -r node_modules/@bower_components/bootstrap/dist/fonts bower_components/bootstrap/fonts
# bootstrap-vertical-tabs
install -D --mode=$mode node_modules/@bower_components/bootstrap-vertical-tabs/bootstrap.vertical-tabs.css bower_components/bootstrap-vertical-tabs/bootstrap.vertical-tabs.css
install -D --mode=$mode node_modules/@bower_components/bootstrap-vertical-tabs/LICENSE bower_components/bootstrap-vertical-tabs/LICENSE.txt
# angular
install -D --mode=$mode node_modules/@bower_components/angular/angular.min.js bower_components/angular/angular.min.js
install -D --mode=$mode node_modules/@bower_components/angular/LICENSE.md bower_components/angular/LICENSE.txt
# angular-resource
install -D --mode=$mode node_modules/@bower_components/angular-resource/angular-resource.min.js bower_components/angular-resource/angular-resource.min.js
install -D --mode=$mode node_modules/@bower_components/angular-resource/LICENSE.md bower_components/angular-resource/LICENSE.txt
# angular-sanitize
install -D --mode=$mode node_modules/@bower_components/angular-sanitize/angular-sanitize.min.js bower_components/angular-sanitize/angular-sanitize.min.js
install -D --mode=$mode node_modules/@bower_components/angular-sanitize/LICENSE.md bower_components/angular-sanitize/LICENSE.txt
# angular-table
install -D --mode=$mode node_modules/@bower_components/angular-table/ng-table.min.js bower_components/angular-table/ng-table.min.js
install -D --mode=$mode node_modules/@bower_components/angular-table/ng-table.min.css bower_components/angular-table/ng-table.min.css
install -D --mode=$mode node_modules/@bower_components/angular-table/LICENSE.txt bower_components/angular-table/LICENSE.txt
# angular-translate
install -D --mode=$mode node_modules/@bower_components/angular-translate/angular-translate.min.js bower_components/angular-translate/angular-translate.min.js
install -D --mode=$mode node_modules/@bower_components/angular-translate/README.md bower_components/angular-translate/README.md
# angular-translate-loader-static-files
install -D --mode=$mode node_modules/@bower_components/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js bower_components/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js
install -D --mode=$mode node_modules/@bower_components/angular-translate-loader-static-files/README.md bower_components/angular-translate-loader-static-files/README.md
# angular-ui-bootstrap
install -D --mode=$mode node_modules/@bower_components/angular-ui-bootstrap/ui-bootstrap-tpls.min.js bower_components/angular-ui-bootstrap/ui-bootstrap-tpls-2.3.0.min.js
install -D --mode=$mode node_modules/@bower_components/angular-translate-loader-static-files/README.md bower_components/angular-translate-loader-static-files/README.md
# angular-ui-router
install -D --mode=$mode node_modules/@bower_components/angular-ui-router/release/angular-ui-router.min.js bower_components/angular-ui-router/angular-ui-router.min.js
install -D --mode=$mode node_modules/@bower_components/angular-ui-router/LICENSE bower_components/angular-ui-router/LICENSE
# angucomplete-alt
install -D --mode=$mode node_modules/@bower_components/angucomplete-alt/dist/angucomplete-alt.min.js bower_components/angucomplete-alt/angucomplete-alt.min.js
install -D --mode=$mode node_modules/@bower_components/angucomplete-alt/angucomplete-alt.css bower_components/angucomplete-alt/angucomplete-alt.css
install -D --mode=$mode node_modules/@bower_components/angucomplete-alt/LICENSE bower_components/angucomplete-alt/LICENSE
# angucomplete-alt
install -D --mode=$mode node_modules/@bower_components/d3/d3.min.js bower_components/d3/d3.min.js
install -D --mode=$mode node_modules/@bower_components/d3/LICENSE bower_components/d3/LICENSE
# lodash
cp -r node_modules/@bower_components/lodash bower_components/lodash
# tinymce
install -D --mode=$mode node_modules/@bower_components/tinymce/tinymce.min.js bower_components/tinymce/tinymce.min.js
install -D --mode=$mode node_modules/@bower_components/tinymce/license.txt bower_components/tinymce/license.txt
cp -r node_modules/@bower_components/tinymce/plugins bower_components/tinymce/plugins
cp -r node_modules/@bower_components/tinymce/skins bower_components/tinymce/skins
cp -r node_modules/@bower_components/tinymce/themes bower_components/tinymce/themes
# angular-ui-tinymce
install -D --mode=$mode node_modules/@bower_components/angular-ui-tinymce/dist/tinymce.min.js bower_components/angular-ui-tinymce/tinymce.min.js
install -D --mode=$mode node_modules/@bower_components/angular-ui-tinymce/LICENSE bower_components/angular-ui-tinymce/LICENSE.txt
# angular-sessionstorage
install -D --mode=$mode node_modules/angular-sessionstorage/angular-sessionstorage.js bower_components/angular-sessionstorage/angular-sessionstorage.js
install -D --mode=$mode node_modules/angular-sessionstorage/LICENSE bower_components/angular-sessionstorage/LICENSE
