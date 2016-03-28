var net = require('net');
var http = require('http');
var stream = require('stream');
var Emitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var TransformStream = require('stream').Transform;
var sntp = require('../sntp');

var gnssConnections = [];

var loggingRootDir = "/home/mostafa/Desktop";

// ------------------------ SNTP Related Functions & Variables ---------------------------------

var sntpConfigFile = "/home/mostafa/workspace/ftpClient/node_modules/sntp/sntpClient.cfg";
var sntpLogFile = "/home/mostafa/workspace/ftpClient/node_modules/sntp/sntp.log";
var errorLogFile = "/home/mostafa/workspace/ftpClient/node_modules/sntp/sntp.err";
var timeOffset = 0;
var leapSecond = 17000;
var sntpOptions;
var setSNTP = function(input, myFn) {
	loadSntpOptions(
			sntpConfigFile,
			function(err, sntpOptions) {
				try {
					var mySntpOptions = {
						host : (input.host ? input.host : sntpOptions.host),
						port : (input.port ? input.port : sntpOptions.port),
						resolveReference : (input.resolveReference ? input.resolveReference
								: sntpOptions.resolveReference),
						timeout : (input.timeout ? input.timeout
								: sntpOptions.timeout)
					};

					sntp.time(mySntpOptions, function(err, time) {
						if (err) {
							return myFn(err, sntpOptions);
						} else {
							timeOffset = time.t;
							sntpOptions = mySntpOptions;
							fs.writeFile(sntpConfigFile, JSON
									.stringify(sntpOptions), function(err) {
								return myFn(err, sntpOptions);
							});
						}
					});

				} catch (err) {
					// TODO: handle exception
					return myFn(err, sntpOptions);
				}
			});
};

var loadSntpOptions = function(sntpConfigFile, myFn) {
	fs.readFile(sntpConfigFile, function(err, data) {
		if (err) {
			return myFn(err, sntpOptions);
		}
		try {
			var options = JSON.parse(data);
			var sntpIteration = [ 1, 2, 3 ];
			sntpIteration.forEach(function(i) {
				sntp.time(options, function(err, time) {
					if (err) {
						if (i == 3) {
							myFn(err, sntpOptions);
							return false;
						}
					} else {
						sntpOptions = options;
						myFn(err, sntpOptions);
						return false;
					}
				});
			});
		} catch (err) {
			// TODO: handle exception
			return myFn(err, sntpOptions);
		}
	});
};

loadSntpOptions(sntpConfigFile, function(err, sntpOptions) {

});

var writeSntpLog = function(sntpLogFile, errorLogFile, logContent) {
	var myDate = new Date(Date.now() + timeOffset);
	logContent = myDate.toUTCString() + "---" + logContent + "\n";
	fs.appendFile(sntpLogFile, logContent, function(err) {
		if (err) {
			errorLogContent = myDate.toUTCString() + "---" + err
					+ " Error writing sntp log " + logContent;
			fs.appendFile(errorLogFile, errorLogContent, function(err) {
				if (err)
					throw err;
			});
		}
	});
};

var triggerSNTP = function() {
	sntp.time(sntpOptions, function(err, time) {
		if (err) {
			writeSntpLog(sntpLogFile, errorLogFile, err);
		} else {
			timeOffset = time.t;
			writeSntpLog(sntpLogFile, errorLogFile,
					'The time offset successfully updated: ' + timeOffset
							+ ' ms');
		}
	});
};

setInterval(triggerSNTP, 60000);

// --------------------------------------------------------------------------------------------

// ------------------- GNSS Data Stream Source Functions & Variables --------------------------

var ntripServerHostPort = 62101;
TransformStream.prototype._transform = function(chunk, encoding, callback) {
	this.push(chunk);
	callback();
};

var dataPool = new TransformStream();

var startNtripServerHost = function() {
	var ntripServerHost = http.createServer().listen(ntripServerHostPort);

	ntripServerHost.on('request', function(req, res) {
		var ntripServerIP = req.headers['x-forwarded-for']
				|| req.connection.remoteAddress || req.socket.remoteAddress
				|| req.connection.socket.remoteAddress;

		if (ntripServerIP === '127.0.0.1') {
			console.log(ntripServerIP);
			res.writeHead(200);

			res.write("ok");

			req.on('data', function(data) {
				dataPool._transform(data, 'utf8', function() {
				});
			});
			req.on('close', function() {
				res.end();
			});
		} else {
			res.writeHead(403);
			res.end();
		}

	});
};


// --------------------------------------------------------------------------------------------


//--------------------- GNSS Data Stream Consumers Functions & Variables ----------------------

var createTCPServer = function(port) {
	var myServer = new TCPServer();
	myServer.createServer(port, function(err) {
		console.log('error: ' + err);
	});
};


var TCPServer = function() {
	var count = 0;
	this.container = null;
	var myServerEmitter = new Emitter();

	this.createServer = function(port, myFn) {
		if (this.container && this.container.address().port == port) {
			var err = 'the server exists';
			return myFn(err);
		}
		var myServer = net.createServer().listen(port);
		myServer.on('connection', function(sock) {
			count++;
			console.log('current connections: ' + count);

			dataPool._readableState.buffer = [];
			dataPool.pipe(sock);

			sock.on('error', function(err) {
				console.log(err);
				sock.destroy();
				sock.end();
			});
			sock.on('end', function() {
				console.log('socket ended');
			});
			sock.on('close', function() {
				console.log('socket closed');
				count--;
				console.log('current connections: ' + count);
			});
			myServerEmitter.on('askToClose', function() {
				sock.destroy();
				sock.end();
			});
		});

		this.container = myServer;
		return myFn();
	};

	this.killServer = function(myFn) {
		myServerEmitter.emit('askToClose');
		this.container.close(function(err) {
			if (err)
				return myFn(err);
			console.log('target server was killed');
			return myFn();
		});
	};

	this.changePort = function(newPort, myFn) {
		if (!this.container) {
			var err = 'there isnot any server to change port';
			return myFn(err);
		}
		var that = this;
		this.killServer(function(err) {
			if (err) {
				return myFn(err);
			}
			that.container = null;
			that.createServer(newPort, function(err) {
				return myFn(err);
			});
		});
	};
};


//--------------------------------------------------------------------------------------------


//--------------------- GNSS Data Stream Logging Functions & Variables -----------------------
var sessions = [];

var DataLogger = function(options, myFn) {

	var dataLoggerEmitter = new Emitter();
	var filePath = path.join(options.loggingRootDir, options.filename);

	dataLoggerEmitter.on('startLogging', function() {
		var streamDataFile = fs.createWriteStream(filePath, {
			flags : 'a',
			autoClose: true
		});
		dataPool.pipe(streamDataFile);
		dataLoggerEmitter.on('stopLogging', function() {
			dataPool.unpipe(streamDataFile);
			console.log('logging finished!');
		});

	});

	this.start = function() {
		dataLoggerEmitter.emit('startLogging');
		setTimeout(function() {
			dataLoggerEmitter.emit('stopLogging');
		}, options.duration);
	};
	
	this.stop = function() {
		dataLoggerEmitter.emit('stopLogging');
	};
};



//--------------------------------------------------------------------------------------------



module.exports = {
	createTCPServer : createTCPServer,
	startNtripServerHost : startNtripServerHost,
	DataLogger : DataLogger,
	setSNTP : setSNTP
};