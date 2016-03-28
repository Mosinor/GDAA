//var sp = require('./sessionProgramming');
//
//sp.checkForStart('/root/workspace/configDir', 5000000, function(err, sessions) {
//	console.log(sessions);
//});
var fs = require('fs');

var DA = require('./sessionProgramming/dataArchiver');
var myDA = new DA('/root/workspace/configDir/tehn_0.ses', '/root/workspace/data');
console.log(myDA.config);