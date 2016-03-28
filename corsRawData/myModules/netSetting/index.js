var myProcess = require('child_process');
var path = require('path');

exports.getEthSetting = function(ethInfoFn, errFn) {
	var ethConfig = {
		address : '',
		netmask : '',
		gateway : ''
	};
	myProcess.exec(path.join(__dirname,'shGetEthConfig'), function(error, stdout,
			stderr) {
		if (!error) {
			console.log(stdout);
			ethConfig.address = stdout.split(":")[0];
			ethConfig.netmask = stdout.split(":")[1];
			ethConfig.gateway = stdout.split(":")[2];
			// console.log('request for ethConfig replied by: '
			// + JSON.stringify(ethConfig));
			return ethInfoFn(JSON.stringify(ethConfig));
		} else {
			return errFn(stderr);
		}
	});
};

exports.setEthSetting = function(reqData, myFn) {
	var result;
	var setEthCommand = path.join(__dirname,'shSetEthConfig') +' ' + reqData.address + " "
			+ reqData.netmask + " " + reqData.gateway;
	console.log(setEthCommand);
	
	myProcess.exec(setEthCommand, function(error, stdout, stderr) {
		if (error == null) {
			result = {statusCode : 201,
					  statusMessage : "Settings Successfully Applied!"
					};
//			res.writeHead(201, "Settings Successfully Applied!");
//			res.end();
			return myFn(result);
		} else {
			result = {statusCode : 304,
					  statusMessage : "Failed due to " + stderr
					};

//			res.writeHead(304, "Failed due to " + stderr);
//			res.end();
			return myFn(result);
		}
	});

};
