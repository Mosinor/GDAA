var dataArchiver = require('./dataArchiver/index');
var options = {
	host : '10.100.2.214',
	port : 6008
};

var myDA = dataArchiver(options, '/home/mostafa/workspace/configDir/main.cfg', '/home/mostafa/workspace/data', '0', function(err) {
	console.log(err);
});
myDA.startArchiver();

setTimeout(function() {
	myDA.stopArchiver();

}, 60000);
