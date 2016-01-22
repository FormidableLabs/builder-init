#!/usr/bin/env node
"use strict";

var Task = require("../lib/task");
var task = new Task();
task.execute(function (err) {
  /*eslint-disable no-process-exit*/
  process.exit(err ? err.code || 1 : 0);
});

// var path = require("path");
// var async = require("async");

// var prompts = require("../lib/prompts");
// var init = require(path.resolve(__dirname, "../../builder-react-component/init.js"));
// var Templates = require("../lib/templates");

// // TODO: REMOVE AND IMPLEMENT INSTALL FROM ARCHETYPE
// // https://github.com/FormidableLabs/builder-init/issues/2
// async.auto({
//   "prompts": prompts.bind(null, init),

//   "templates": ["prompts", function (cb, results) {
//     var data = results.prompts;

//     var templates = new Templates({
//       src: path.resolve(__dirname, "../../builder-react-component/init"),
//       dest: path.resolve(process.env.HOME, "Desktop/builder-init-temp"),
//       data: data
//     });

//     templates.process(cb);
//   }]
// }, function (err) {
//   // TODO: REAL LOGGING
//   // https://github.com/FormidableLabs/builder-init/issues/4
//   /*eslint-disable no-console*/
//   if (err) {
//     console.error(err);
//   }
//   /*eslint-enable no-console*/

//   /*eslint-disable no-process-exit*/
//   process.exit(err ? err.code || 1 : 0);
// });
