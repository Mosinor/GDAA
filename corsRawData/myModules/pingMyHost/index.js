var process = require('child_process').spawn;

var Ping = function() {
	this.pingResult = function(hostAddress, pingCount, anyDataFn, endProcessFn) {
		var pingProcess = process('ping', [ hostAddress, '-c', pingCount ]);

		pingProcess.stdout.on('data', function(data) {
			return anyDataFn(data.toString());
		});
		pingProcess.stderr.on('data', function(data) {
			return anyDataFn(data.toString());
		});
		pingProcess.on('close', function() {
			return endProcessFn();
		});

	};
};

module.exports = function(hostAddress, pingCount, anyDataFn, endProcessFn) {
	var myPing = new Ping();
	myPing.pingResult(hostAddress, pingCount, function(result) {
		return anyDataFn(result);
	}, function() {
		return endProcessFn();
	});
};
