var net = require('net');
var fs = require('fs');
var path = require('path');

var Archiver = function(sessionConfig, loggingDir) {
	var options = {
			host: sessionConfig.host,
			port: sessionConfig.port};
	this.config = sessionConfig;
	var deliberateStop = false;
	this.mySocket = new net.Socket();
	var thisObject = this;
//	console.log(thisObject.mySocket);
	var temp = 0;
	var safety = setInterval(function() {
		console.log(temp, ' vs ', thisObject.mySocket.bytesRead);
		if (thisObject.mySocket.bytesRead === temp) {
			console.log('a problem encountered during data receiving');
			thisObject.mySocket.end();
			thisObject.mySocket.destroy();
//			thisObject.mySocket.unref();

		}
		temp = thisObject.mySocket.bytesRead;
		//console.log(thisObject.mySocket._connecting);
		//console.log(thisObject.mySocket.bytesRead);
	
	}, 10000);
	this.intervalID = safety;

	////////////////////////////////////////////////////
	
	this.createLoggingFilePath = function(loggingDir, sessionConfig) {
		try {
			var doy = new Date();
			var year = doy.getFullYear().toString().substr(2,2);
			doy = parseInt( (doy - (new Date(doy.getUTCFullYear(),0,1,0,0,0,1))) / 86400000 + 1) % 365;
			doy = (doy < 10 ? ('00'+doy) : (doy < 100 ? ('0'+doy) : doy));
			
			var loggingFilePath = path.join(loggingDir, sessionConfig.sessionName + year + doy + sessionConfig.id + '.gnd')
			
			//if (thisObject.myWS) {
//				thisObject.mySocket.unpipe(thisObject.myWS);
//				console.log('unpiped');
			//}
			/////use writestream and pipe and unpipe
			thisObject.myWS = fs.createWriteStream(loggingFilePath, {flags: 'a'});
			//thisObject.mySocket._readableState.buffer = [];
			thisObject.mySocket.pipe(thisObject.myWS);
			console.log("salam", loggingFilePath);


			//return myFn(null, loggingFilePath);
			
		} catch(e) {
//			return myFn(e, null);
			console.log('createLoggingFilePath Error: '+e);
		}
	};

	this.startArchiver = function() {
		deliberateStop = false;
		thisObject.mySocket.end();
		thisObject.mySocket.destroy();
//		thisObject.mySocket.setTimeout(2000);
		thisObject.createLoggingFilePath(loggingDir, sessionConfig);

//			thisObject.mySocket.on('data', function(data) {
//				fs.appendFile(loggingFilePath, data);
//			});
//		});
			console.log("archiver started");
		
		thisObject.mySocket.connect(options);



	};

	this.stopArchiver = function(softStop, myFn) {
		if (softStop === true) {
			thisObject.mySocket.unpipe(thisObject.myWS);
			console.log('unpiped');
		} else {
			thisObject.mySocket.removeAllListeners('data');
			thisObject.mySocket.end();
			thisObject.mySocket.destroy();
//			thisObject.mySocket.unref();
			deliberateStop = true;
			clearInterval(safety);
			if (myFn){
				myFn();

			}
		}
	};

	this.restartSocket = function() {
		if (!deliberateStop) {
			//thisObject.stopArchiver();
			thisObject.mySocket.removeAllListeners('data');
			console.log('restarting...');
			thisObject.startArchiver();
		}
	};

	////////////////////////////////////////////////////	



	thisObject.mySocket.on('end', function() {
		thisObject.mySocket.destroy();
//		thisObject.mySocket.unref();
	});

	thisObject.mySocket.on('error', function(err) {
		thisObject.mySocket.end();
		thisObject.mySocket.destroy();
//		thisObject.mySocket.unref();
	});

	thisObject.mySocket.on('close', function() {
		console.log('socket closed.');
		setTimeout(function() {
			thisObject.restartSocket();
		}, 3000);
	});

	
//	thisObject.mySocket.on('timeout', function() {
//		thisObject.mySocket.end();
//		thisObject.mySocket.destroy();
//		console.log('timeout...', thisObject.mySocket._events.timeout);
//	});
};



module.exports = function(sessionConfig, loggingDir) {
	var myArchiver = new Archiver(sessionConfig, loggingDir);
	
	return myArchiver;

		
};
