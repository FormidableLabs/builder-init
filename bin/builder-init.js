#!/usr/bin/env node
"use strict";

var path = require("path");
var Templates = require("../lib/templates");

// TODO: REMOVE AND IMPLEMENT PROMPTS
// https://github.com/FormidableLabs/builder-init/issues/3
var data = {
  licenseDate: (new Date()).getFullYear(), // DEFAULT
  licenseOrg: "ACME Corp.", // REQUIRED
  packageName: "whiz-bang-component", // REQUIRED
  packageGitHubOrg: "AcmeCorp", // REQUIRED
  packageDescription: "Whizzically bang React component", // OPTIONAL ("")
  componentPath: "whiz-bang-component", // DERIVED: packageName
  componentName: "WhizBangComponent" // DERIVED: pascal(packageName)
};

// TODO: REMOVE AND IMPLEMENT INSTALL FROM ARCHETYPE
// https://github.com/FormidableLabs/builder-init/issues/2
var templates = new Templates({
  src: path.join(__dirname, "../../builder-react-component/init"),
  dest: path.join(process.env.HOME, "Desktop/builder-init-temp"),
  data: data
});

templates.process(function (err) {
  // TODO: REAL LOGGING
  // https://github.com/FormidableLabs/builder-init/issues/4
  /*eslint-disable no-console*/
  if (err) {
    console.error(err);
  }
  /*eslint-enable no-console*/

  /*eslint-disable no-process-exit*/
  process.exit(err ? err.code || 1 : 0);
});
