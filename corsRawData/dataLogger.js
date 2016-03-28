
var stream = require('stream');
var fs = require('fs');
var net = require('net');

var myConnection = net.createConnection({
	host : '91.98.225.139',
	port : 28002
});
myConnection.on('connect', function() {
	console.log('connected!');
});

myConnection.on('readable', function() {
	var chunk = myConnection.read();
	var myOutputFile = fs.createWriteStream('myData.str');
	myConnection.pipe(myOutputFile);
	//var outputInfo = fs.accessSync('myData.str');
	//console.log(outputInfo);
});