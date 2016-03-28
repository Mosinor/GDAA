var fs = require('fs');
var path = require('path');
var FtpClient = require('./ftp');
var readline = require('readline');


var logFile, errorLogFile, ftpIteration, progressRelease = true;
var configDir = path.join(__dirname, '../../../configDir');
var configFilePath = path.join(configDir , 'ftpClient.ftp'); 


var uploadFile = function(ftpOptions, fileNames, remoteDir, myFn) {
	var myFtp = new FtpClient();
	var msg;
	myFtp.on('ready', function() {
		progressRelease = false;
		if (remoteDir != "/") {
			myFtp.mkdir(remoteDir, 1, function(err) {
				if(err){
					msg = 'Could not create or access remote directory.';
					writeFtpLog(logFile, errorLogFile, msg);
					myFtp.end();
					return myFn(err, msg);
				} else {
					if ( !Array.isArray(fileNames) ) {
						return myFn(err, msg);
					}
					fileNames.forEach(function(fileName, i) {
						var localFileName = path.basename(fileName);
						var remoteFileName = path.join(remoteDir,localFileName);
						
						myFtp.size(remoteFileName, function(Error,number) {
							if (Error && Error.code != 550) {
								msg =  'Could not retreive remote file size.';
								writeFtpLog(logFile, errorLogFile, msg);
								myFtp.end();
								return myFn(Error, msg);
							}
							if (Error && Error.code == 550) number = -1;
							
							
							try {
								var stats = fs.statSync(fileName);
							} catch (err) {
								msg = 'Could not get local file size.';
								writeFtpLog(logFile, errorLogFile, msg);
								return;
							}
							if (stats && number < stats.size && (Date.now()-stats.ctime.getTime()) > 5000 ) {
								if (number == -1) {
									writeFtpLog(logFile, errorLogFile, 'Start uploading '+ remoteFileName + ' with size of ' + stats.size + ' bytes');
								} else {
									writeFtpLog(logFile, errorLogFile, 'Remote file '+ remoteFileName + ' has less size than ' + localFileName + ' : ' + number +' vs '+ stats.size);
								}
								myFtp.put(fileName, remoteFileName, function(err) {
									if(err) {
										writeFtpLog(logFile, errorLogFile, 'Could not upload '+ localFileName + ' to ftp server' + err);
									}
									myFtp.size(remoteFileName, function(Error,afterFtpSize) {
										if(Error) throw Error;
										if (!Error && afterFtpSize >= stats.size) {
											writeFtpLog(logFile, errorLogFile, 'The File '+ localFileName + ' Successfully uploaded.');
										}
									});
								});
							}
						});
					});
					myFtp.end();
					msg = 'Ftp process has been finished.';
					return myFn(err, msg);
				}
				
			});
		} else {
			fileNames.forEach(function(fileName, i) {
				var localFileName = path.basename(fileName);
				var remoteFileName = path.join(remoteDir,localFileName);
				
				myFtp.size(remoteFileName, function(Error,number) {
					if (Error && Error.code != 550) {
						writeFtpLog(logFile, errorLogFile, 'Could not retreive remote file size. ' + Error);
						myFtp.end();
						msg = 'Could not retreive remote file size.'
						return myFn(Error, msg);
					}
					if (Error && Error.code == 550) number = -1;
					
					
					try {
						var stats = fs.statSync(fileName);
					} catch (err) {
						writeFtpLog(logFile, errorLogFile, 'Could not get local file size.');
					}

					if (stats && number < stats.size && (Date.now()-stats.ctime.getTime()) > 10000 ) {
						if (number == -1) {
							writeFtpLog(logFile, errorLogFile, 'Start uploading '+ remoteFileName + ' with size of ' + stats.size + ' bytes');
						} else {
							writeFtpLog(logFile, errorLogFile, 'Remote file '+ remoteFileName + ' has less size than ' + localFileName + ' : ' + number +' vs '+ stats.size);
						}
						myFtp.put(fileName, remoteFileName, function(err) {
							if(err) {
								writeFtpLog(logFile, errorLogFile, 'Could not upload '+ localFileName + ' to ftp server' + err);
							}
							myFtp.size(remoteFileName, function(Error,afterFtpSize) {
								if(Error) throw Error;
								if (!Error && afterFtpSize >= stats.size) {
									writeFtpLog(logFile, errorLogFile, 'The File '+ localFileName + ' Successfully uploaded.');
								}
							});
						});
					}
				});
			});
			myFtp.end();
			return myFn(null,'Ftp process has been finished.');
			//return myFn(err,null);
		}
				
	});

	myFtp.on('error', function(err) {
		myFtp.end();
		msg = "There are some problem during FTP progress.";
		progressRelease = true;
		return myFn(err, msg);
	});
	
	myFtp.on('end', function() {
		writeFtpLog(logFile, errorLogFile, 'Ftp process has been finished.');
	});
	
	myFtp.on('close', function(err) {
		if(err) {
			writeFtpLog(logFile, errorLogFile, 'Error Closing FTP connection.');
		} else {
			progressRelease = true;
		}
	});
	
	myFtp.connect(ftpOptions);


};

var getDirFileList = function(localDir, myFn) {
	var fileList = [];
	fs.readdir(localDir, function(err, files) {
		var counter = files.length;
		if (err) {
			return myFn(err, fileList);
		} else {
			if (!counter)
				return myFn(err, fileList);

			files.forEach(function(item, i) {
				item = path.join(localDir, item);

				fs.stat(item, function(err, stats) {
					if (err) {
						return myFn(err, fileList);
					} else {
						if (stats.isDirectory()) {
							getDirFileList(item, function(err, myFileList) {
								fileList = fileList.concat(myFileList);
								if (!--counter) {
									myFn(err, fileList);
								}
							});
						} else {
							fileList.push(item);
							if (!--counter) {
								myFn(err, fileList);
							}
						}
					}
				});

			});

		}
	});

};

var ftpPush = function(configFilePath, localDir, myFn) {
	var msg;
	if (!progressRelease) {
		return myFn("Waiting for previous progress...", msg);
	}
	getFtpConfig(configFilePath, function(err, ftpInfo) {
		if (err) {
			msg = 'Could not get ftp config for ftp push.';
			writeFtpLog(logFile, errorLogFile, msg);
			return myFn(err, msg);
		} else {
			var ftpOptions = {
				host : ftpInfo.host,
				port : ftpInfo.port,
				user : ftpInfo.user,
				password : ftpInfo.password
			};
			var remoteDir = ftpInfo.remotedir;
			getDirFileList(localDir, function(err, myFileList) {
				if (err) {
					msg = "Could not get list of files for upload."
					writeFtpLog(logFile, errorLogFile, msg);
					return myFn(err, msg);
				}
				uploadFile(ftpOptions, myFileList, remoteDir, function(err) {
						if (err) {
							msg = '';
							writeFtpLog(logFile, errorLogFile, 'An error occured during upload. '+ err);
							return myFn(err, msg);
						} else {
							msg = 'FTP push process started.';
							return myFn(err, msg);
						}
				});

			});

		}

	});
};

var getFtpConfig = function(configFilePath, myFn) {
	var ftpInfo;

	fs.readFile(configFilePath, function(err, data) {
		if (err) {
			ftpInfo = '';
			return myFn(err, ftpInfo);
		} else {
			try {
				var ftpInfo = JSON.parse(data);
				ftpInfo = {
					host : ftpInfo.host,
					port : ftpInfo.port,
					user : ftpInfo.user,
					password : ftpInfo.password,
					remotedir : ftpInfo.remotedir,
					runftp : ftpInfo.runftp
				};
				return myFn(err, ftpInfo);
			} catch (error) {
				ftpInfo = '';
				return myFn(error, ftpInfo);
			}
		}
	});
};


var getFullConfig = function(configFilePath, myFn) {
	var fullInfo = new Object();

	fs.readFile(configFilePath, function(err, data) {
		if (err) {
			return myFn(err, fullInfo);
		} else {
			try {
				fullInfo = JSON.parse(data);
				fullInfo = {
					host : fullInfo.host,
					port : fullInfo.port,
					user : fullInfo.user,
					password : fullInfo.password,
					runftp : fullInfo.runftp,
					remotedir : fullInfo.remotedir,
					webserverport : fullInfo.webserverport,
					ftplog : fullInfo.ftplog,
					errorlog : fullInfo.errorlog,
					localdir : fullInfo.localdir,
					retryinterval : fullInfo.retryinterval
				};
				return myFn(err, fullInfo);
			} catch (error) {
				return myFn(error, fullInfo);
			}
		}
	});
};

var reqDataValidation = function(reqData) {
	var validation = true;
	var pattern;
	if (reqData.host !== 'undefined') {
		pattern = /^(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))\.(\d|[1-9]\d|1\d\d|2([0-4]\d|5[0-5]))$/;
		validation = pattern.test(reqData.host) && validation;
	}
	if (reqData.port !== 'undefined'){
		pattern = /^[0-9]{2,5}$/;
		var port = Number(reqData.port);
		validation = (pattern.test(reqData.port) && !isNaN(port) && port < 65536 && port > 19) && validation;
	}
	if (reqData.user !== 'undefined'){
		pattern = /^[\S]{1,30}$/;
		validation = pattern.test(reqData.user) && validation;
	}
	if (reqData.password !== 'undefined'){
		pattern = /^[\S]{1,30}$/;
		validation = pattern.test(reqData.password) && validation;
	}
	if (reqData.remotedir !== 'undefined'){
		pattern = /^[\S]{0,100}$/;
		validation = pattern.test(reqData.remotedir) && validation;
	}
	if (reqData.runftp == true || reqData.runftp == false){
		//pattern = /^(true|false)$/;
		validation = true && validation;
	} else {
		validation = false;

	}
	return validation;
}


var setFtpConfig = function(reqData, myFn) {
	if (!reqDataValidation(reqData)) {
		msg = "Faild to change config file due to invalid arguments.";
		return myFn("Invalid arguments", msg);
	}
	var msg;
	var ftpConfig;
	getFullConfig(configFilePath, function(err, fullInfo) {
		if (err) {
			return myFn(err, msg);
		}
		var changeDetect = false;
		for (var prop in reqData){
			if (reqData[prop] !== fullInfo[prop]){
				changeDetect = true;
				break;
			} 
		}
		if (!changeDetect){
			msg = "There aren't anything to change.";
			return myFn("No need to change", msg);
		}
		
		// TODO: received values should check before apply
		ftpConfig = {
			host : (reqData.host ? reqData.host : fullInfo.host),
			port : (reqData.port ? reqData.port : fullInfo.port),
			user : (reqData.user ? reqData.user : fullInfo.user),
			password : (reqData.password ? reqData.password
					: fullInfo.password),
			remotedir : (reqData.remotedir ? reqData.remotedir
					: fullInfo.remotedir),
			runftp : (reqData.runftp !== 'undefined' ? reqData.runftp
					: fullInfo.runftp),
			webserverport : fullInfo.webserverport,
			ftplog : fullInfo.ftplog,
			errorlog : fullInfo.errorlog,
			localdir : fullInfo.localdir,
			retryinterval : fullInfo.retryinterval
		};

		if (ftpConfig.host && ftpConfig.port && ftpConfig.user
			&& ftpConfig.password && ftpConfig.remotedir
			&& (ftpConfig.runftp !== 'undefined') && ftpConfig.webserverport
			&& ftpConfig.ftplog && ftpConfig.errorlog && ftpConfig.localdir
			&& ftpConfig.retryinterval) {
				fs.writeFile(configFilePath, JSON.stringify(ftpConfig), 'utf8',
				function(err) {
					if (err) {
						msg = "Faild to change config file.";
						writeFtpLog(logFile, errorLogFile, msg);
						return myFn(err, msg);
					} else {
						msg = "Config file has been changed successfully.";
						writeFtpLog(logFile,errorLogFile, msg);
						myFn(err, msg);
						if (fullInfo.runftp == "false" && ftpConfig.runftp == "true") {
							ftpPush(configFilePath, fullInfo.localdir,  function(err, msg) {
								if (err) {
									return myFn(err, msg);
								} else {
									writeFtpLog(fullInfo.ftplog, fullInfo.errorlog, msg);
									setActiveFtp(function(err ,msg) {
										// handle error :: if (err)
										return myFn(err, msg);
									});
								}
							});
						}
						if (fullInfo.runftp == "true" && ftpConfig.runftp == "false") {
							try {
								clearInterval(ftpIteration);
								msg = "FTP push process disabled."
								return myFn(err, msg);
							} catch (error) {
								// TODO: handle exception
								msg = "Could not cancel FTP push process."
								return myFn(error, msg);
							}
						}
					}
				});
		} else {
			msg = "Faild to change config file due to incomplete parameters.";
			console.log(ftpConfig);
			writeFtpLog(logFile, errorLogFile, msg);
			return myFn(err, msg);
		}
	});
};

var writeFtpLog = function(logFile, errorLogFile, logContent){
	var myDate = new Date();
	logContent = myDate.toUTCString() + "---" + logContent + "\n";
	fs.appendFile(logFile, logContent, function(err) {
		if (err) {
			errorLogContent = myDate.toUTCString() + "---" +  err + " Error writing ftp log " + logContent;
			fs.appendFile(errorLogFile, errorLogContent, function(err) {
				 if (err) throw err;
			});
		}
	});
};

var setActiveFtp = function(myFn) {
	var msg;
	getFullConfig(configFilePath, function(err, fullInfo) {
		if (err) {
			msg = '';
			return myFn(err, msg);
		} else {
			try {
				ftpIteration = setInterval(function() {
					ftpPush(configFilePath, fullInfo.localdir,  function(err, msg) {
						if (err) {
							msg = '';
							return myFn(err, msg);
						} else {
							writeFtpLog(fullInfo.ftplog, fullInfo.errorlog, msg);
							return myFn(err, msg);
						}
					});
				}, fullInfo.retryinterval);
			} catch (error) {
				// TODO: handle exception
				return myFn(error, msg);
			}
		}
	});

};

getFullConfig(configFilePath, function(err,fullInfo) {
	if (err) {
		console.log(err);
	} else {
		logFile = fullInfo.ftplog;
		errorLogFile = fullInfo.errorlog;
	}
});


var readLogFile = function(numberOfLastLogs, myFn) {
	var logArray = [];
	getFullConfig(configFilePath, function(err,fullInfo) {
		if (err) {
			return myFn(err, logArray);
		} else {
			try {
				logFile = fullInfo.ftplog;
				errorLogFile = fullInfo.errorlog;
				var rl = readline.createInterface({
					input : fs.createReadStream(logFile),
					historySize : 5,
					terminal: false
				});
				var counter = 0;
				rl.on('line', function(line) {
					if (counter < numberOfLastLogs) {
						logArray[counter] = line;
					} else {
						logArray.shift();
						logArray[numberOfLastLogs -1] = line;
					}
					counter++;
				});
				rl.on('close', function(){
					logArray = logArray.reverse();
					return myFn(err, logArray);
				});

			} catch (error) {
				// TODO: handle exception
				return myFn(error, logArray);
			}
			
		}
	});

};


module.exports = {
	uploadFile : uploadFile,
	setFtpConfig : setFtpConfig,
	getFtpConfig : getFtpConfig,
	getFullConfig : getFullConfig,
	ftpPush : ftpPush,
	getDirFileList : getDirFileList,
	setActiveFtp : setActiveFtp,
	writeFtpLog : writeFtpLog,
	readLogFile : readLogFile,
	reqDataValidation : reqDataValidation
	};