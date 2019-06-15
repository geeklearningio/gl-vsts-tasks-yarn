const Jasmine = require("jasmine");
const reporters = require("jasmine-reporters");
const path = require("path");

var jasmine = new Jasmine();

var junitReporter = new reporters.JUnitXmlReporter({
  savePath: path.join(__dirname, "test-results"),
  consolidateAll: false
});

jasmine.addReporter(junitReporter);

jasmine.loadConfigFile("Tests/jasmine.json");

jasmine.execute();
