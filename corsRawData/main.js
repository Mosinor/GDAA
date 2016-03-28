// inserting required node modules
var http = require('http');
var url = require('url');
var myProcess = require('child_process');
// var myAsyncProcess = myProcess.spawn;
var fs = require('fs');
var path = require('path');
var mime = require('./myModules/mime');


// inserting required my modules
var serveStaticFiles = require('./myModules/serveStaticFiles');
var pingMyHost = require('./myModules/pingMyHost');
var netSetting = require('./myModules/netSetting');
var dataFiles = require('./myModules/dataFiles');
var ftpApply = require('./myModules/ftpApply');
var sessionProgramming = require('./myModules/sessionProgramming');

// some prerequisite variable
var configDir = path.join(__dirname, '../configDir');
var ftpConfigFilePath = path.join(configDir , 'ftpClient.ftp'); 
var ftpTestFile =  path.join(configDir ,'ftptest.txt');
var totalSize = 2 * 1024 * 1024;


var localFilesDir, retryInterval, webServerListenPort; //ftpIteration



// create main web server
var myHttpServer = http.createServer();

// handling request based on request url
myHttpServer.on('request', function(req, res) {
	var reqData;
	//console.log("a request received!");
	var myPath, downloadable;
	if (req.url === '/') {
		myPath = "./clientSide/index.html";
		downloadable = false;
	} else if (req.url.split('/')[1] === 'download') {
		myPath = path.join("/workspace/data/" , req.url.split('/')[2]);
		console.log(myPath);
		downloadable = true;
	} else {
		myPath = "./clientSide" + req.url;
		downloadable = false;
	}

	// serving static files & actions based on request url
	var myFile = serveStaticFiles(myPath, downloadable, function(result) {
		if (result.exists && downloadable == false) {
			res.writeHead(200, result.httpHeaderInfo);
			result.deliverFile().pipe(res);
		} else if (result.exists && downloadable == true) {
	        res.writeHead(200, result.httpHeaderInfo);
	        res.write(result.deliverFile(), "binary");
	        res.end();

		} else {
			switch (req.url) {
			
			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
			// here is where the program handle requests for data file setting
			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

			case '/lsDataFiles':
				
				
				ftpApply.getFullConfig(ftpConfigFilePath, function(err,fullInfo) {
					if (err) {
						res.writeHead(304, "Failed to perform request.");
						res.end();
					} else {
						dataFiles.lsDataDir(fullInfo.localdir, '.', function(dataList) {
					        res.writeHead(200);

							res.end(JSON.stringify(dataList));
						});

					        }

					      });

				
				
				break;
				
			case '/getDataFiles':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						reqData = JSON.parse(reqData);
						ftpApply.getFullConfig(ftpConfigFilePath, function(err,fullInfo) {
							if (err) {
								res.writeHead(304, "Failed to perform request.");
								res.end();
							} else {
								dataFiles.getDataFiles(fullInfo.localdir,reqData, function(result, downloadFileName) {
									if (result.exists) {
										console.log(result.httpHeaderInfo);
										res.writeHead(200);
										res.end(downloadFileName);
									} else {
										res.writeHead(304, "Failed to perform request.");
										res.end();
									}
								});
							}
						});
						
					} catch (e) {
						// TODO: handle exception
					}
				});
//				res.end("salam");
				break;

				
			case '/deleteFiles':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						reqData = JSON.parse(reqData);
						console.log(reqData);

						ftpApply.getFullConfig(ftpConfigFilePath, function(err, fullInfo) {
							
							dataFiles.deleteFiles(fullInfo.localdir, reqData, function(err) {
								console.log(fullInfo.localdir, reqData);
								if (err) {
									res.writeHead(304, "Failed to delete files." + err);
									res.end();
								} else {
									res.writeHead(200, "The files successfully deleted.");
									res.end();
								}
							});
						});
						
					} catch (e) {
						res.writeHead(304, "Failed to perform request." + e);
						res.end();
					}
					
				});
				break;
				

			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
			// here is where the program handle requests for change ip setting
			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

			// serve network information
			case '/getNetParam':
				netSetting.getEthSetting(function(result) {
					res.end(result);
				}, function(error) {
					res.end(error);
				});
				break;

			case '/setNetParam':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					reqData = JSON.parse(reqData);

					netSetting.setEthSetting({
						address : reqData.address,
						netmask : reqData.netmask,
						gateway : reqData.gateway
					}, function(result) {
						res.writeHead(result.statusCode, result.statusMessage);
						res.end();
					});
				});
				break;

			case '/pingHost':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					console.log(reqData);
					reqData = JSON.parse(reqData);
					// res.writeHead(200, {
					// 'Content-Type' : 'text/html',
					// 'Content-Length' : '',
					// 'Transfer-Encoding' : 'chunked'
					// });
					pingMyHost(reqData.hostAddress, reqData.pingCount,
							function(result) {
								res.write(result);
							}, function() {
								res.end();
							});

				});

				break;
				
			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
			// here is where the program handle requests for FTP Client & Server setting
			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

			case '/setFtpClient':

				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						reqData = JSON.parse(reqData);
						console.log(reqData);
						ftpApply.setFtpConfig(reqData, function(err, msg) {
									if (err) {
										res.writeHead(304, msg);
									} else {
										res.writeHead(200, msg);
									}
									res.end();
								});
					} catch (error) {
						res.writeHead(304, error.toString());
						res.end("Invalid request");
					}

				});
				break;

			case '/getFtpClient':
				ftpApply.getFtpConfig(ftpConfigFilePath, function(err,ftpInfo) {
					if (err) {
						res.writeHead(304, err.toString());
						res.end(err);
					} else {
						res.writeHead(200);
						res.end(JSON.stringify(ftpInfo));
					}
				});
				break;

			case '/testFtpClient':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						reqData = JSON.parse(reqData);
						var ftpOptions = {
								host : reqData.host,
								port : reqData.port,
								user : reqData.user,
								password : reqData.password
						};
						ftpApply.uploadFile(ftpOptions, [ ftpTestFile ], (reqData.remotedir ? reqData.remotedir : '/'), function(err, msg) {
							if (err) {
								res.writeHead(304, err);
							} else {
								res.writeHead(200, msg);
							}
							res.end();
						});
						
					} catch (error) {
						res.writeHead(304, error.toString());
						res.end("Invalid request");
					}

				});

				break;
				
			case '/readLogFile':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						reqData = JSON.parse(reqData);
						
						if (reqData.numberoflines && reqData.numberoflines >= 1 && reqData.numberoflines <= 100) {
							ftpApply.readLogFile(reqData.numberoflines, function(err, logArray) {
								if (err) {
									res.writeHead(304, err.toString());
									res.end("Could not read log file.");
								} else {
									var msg = "Log file has been read successfully.";
									res.writeHead(200, msg);
									res.end(JSON.stringify(logArray));
								}
							});
							
						} else {
							res.writeHead(304, "Invalid request");
							res.end();
						}
					} catch (error) {
						res.writeHead(304, "Invalid request");
						res.end();

					}
				});

				break;

			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
			// here is where the program handle requests for Session Programming setting
			// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
				
			case '/getSessionsInfo':
					sessionProgramming.getSessions(configDir, function(err, sessions) {
						//console.log(err,sessions);
						if (err) {
							res.writeHead(304, err);
							res.end();
						} else {
							res.end(JSON.stringify(sessions));
						}
					});
				break;

			case '/setSessionInfo':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						reqData = JSON.parse(reqData);
						
						sessionProgramming.createNewSession(configDir,reqData, function(err, configFile) {
							if (err) {
								res.writeHead(304, "Failed to perform request. "+ err);
								res.end();
							} else {
								ftpApply.getFullConfig(ftpConfigFilePath, function(err,fullInfo) {
									if (err) {
										res.writeHead(304, "Failed to process session.");
										res.end();
									} else {
										sessionProgramming.processSingleConfigFile(configFile, fullInfo.localdir, function(err, myDA) {
											console.log(configFile);
											if (err) {
												res.writeHead(304, "Failed to process session." + err);
												res.end();
											} else {
												res.writeHead(200, "The session created successfully.");
												res.end();
												sessionProgramming.allDataArchivers.push(myDA);
											}
											
										});
									
									}
								});
							}
						});

					} catch (e) {
						res.writeHead(304, "Failed to perform request.");
						res.end();
					}
					
				});
				break;
				
			case '/editSessionInfo':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						reqData = JSON.parse(reqData);
						
						sessionProgramming.editSession(configDir,reqData, function(err, configFile) {
							if (err) {
								res.writeHead(304, "Failed to perform request. "+ err);
								res.end();
							} else {
								ftpApply.getFullConfig(ftpConfigFilePath, function(err,fullInfo) {
									if (err) {
										res.writeHead(304, "Failed to process session.");
										res.end();
									} else {

										// TODO: Stop and remo
										for (var i = 0; i < sessionProgramming.allDataArchivers.length; i++) {
											var da = sessionProgramming.allDataArchivers[i];
											console.log(da.config.sessionName, reqData.sessionName , da.config.id , reqData.id);
											if(da.config.sessionName === reqData.sessionName && da.config.id === reqData.id){
												try {
													console.log(da.intervalID);
													clearInterval(da.intervalID);
												} catch (e) {
													console.log(e);
													// TODO: handle exception
												}
												da.stopArchiver(function() {
													sessionProgramming.processSingleConfigFile(configFile, fullInfo.localdir, function(err, myDA) {
														if (err) {
															res.writeHead(304, "Failed to process session." + err);
															res.end();
														} else {
															res.writeHead(200, "The session modified successfully.");
															res.end();
														}
													});
												});
											}

										}
									}
								});
							}
						});

					} catch (e) {
						res.writeHead(304, "Failed to perform request.");
						res.end();
					}
					
				});
				break;
				
			case '/deleteSession':
				reqData = '';
				req.on('data', function(data) {
					reqData += data;
				});
				req.on('end', function() {
					try {
						sessionProgramming.stopSession(reqData, true, function(err) {
							console.log('stopSession');
							if (err) {
								res.writeHead(304, "Failed to delete session." + err);
								res.end();
								return; 
							}
							sessionProgramming.deleteSession(configDir, reqData, function(err) {
							if (err) {
								res.writeHead(304, "Failed to delete session." + err);
								res.end();
							} else {
								res.writeHead(200, "The session successfully deleted.");
								res.end();
//								sessionProgramming.stopAllSessions(function(err) {
//									if (err === undefined){
//										ftpApply.getFullConfig(ftpConfigFilePath, function(err,fullInfo) {
//											sessionProgramming.processConfigFiles(configDir, fullInfo.localdir, function(err) {
//												if (err === undefined){
//													res.writeHead(200, "The session successfully deleted.");
//													res.end();
//												} else {
//													res.writeHead(304, "Failed to delete session." + err);
//													res.end();
//												}
//											});
//										});
//									} 
//								});
								}
							});

						});
					} catch (e) {
						res.writeHead(304, "Failed to perform request." + e);
						res.end();
					}
					
				});
				break;
				
			case '/restartAllSessions':
				sessionProgramming.stopAllSessions(function(err) {
					if (err) {
						res.writeHead(304, err);
						res.end();
					} else {
						console.log('stop session done');
						ftpApply.getFullConfig(ftpConfigFilePath, function(err,fullInfo) {
							if (err) {
								res.writeHead(304, "Failed to process session.");
								res.end();
							} else {
								sessionProgramming.processConfigFiles(configDir, fullInfo.localdir, function(err) {
									if(err) {
										res.writeHead(304, "Failed to perform task.");
										res.end();
										return;
									}
									res.writeHead(200, "All of sessions restarted.");
									res.end();

								});
							
							}
						});

					}
				});
			break;




				// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
				// here is where the program handle requests for status
				// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
					
				case '/getDiskStatus':
					ftpApply.getFullConfig(ftpConfigFilePath, function(err, fullInfo) {
						if(err){
							res.writeHead(304, "Failed to perform request due to: "+err);
							res.end();
						} else {
							dataFiles.getDirTotalSize(fullInfo.localdir, '.', function(err,dirSize) {
								if(err){
									res.writeHead(304, "Failed to perform request.");
									res.end();
								} else {
									res.writeHead(200, "The request performed successfully.");
									res.end(JSON.stringify({totalSpace : totalSize,
															inUse : dirSize,
															available : (Number(totalSize) -  Number(dirSize))
									}));
								}
							});
						}
					});
					break;


				case '/getStationInfo':
					try {
						fs.readFile(path.join(configDir,'main.cfg'), function(err, data) {
							if (err) {
								res.writeHead(304, "Failed to perform request.");
								res.end();

							}
							var mainConfig = JSON.parse(data);
							if (mainConfig.stationCode) {
								res.writeHead(200, "The request performed successfully.");
								res.end(JSON.stringify(mainConfig));
							
							} else {
								res.writeHead(304, "Failed to perform request.");
								res.end();

							}
						});
					} catch (e) {
						res.writeHead(304, "Failed to perform request.");
						res.end();

					}


					break;

				case '/setStationInfo':
					reqData = '';
					req.on('data', function(data) {
						reqData += data;
					});
					req.on('end', function() {
						try {
							reqData = JSON.parse(reqData);
							if(reqData.stationCode){
								fs.writeFile(path.join(configDir,'main.cfg'), JSON.stringify(reqData), function(err) {
									if (err) {
										res.writeHead(304, "Failed to perform request." + err);
										res.end();
										return;
									}
									res.writeHead(200, "The request performed successfully.");
									res.end();

								});

							} else {
								res.writeHead(304, "Failed to perform request.");
								res.end();

							}
						} catch (e) {
							res.writeHead(304, "Failed to perform request." + e);
							res.end();
						}
						
					});
					break;

				
				
			default:
				res.writeHead(404, "request not found");
				res.end();
				break;
			}

		}
	});

});

ftpApply.getFullConfig(ftpConfigFilePath, function(err,fullInfo) {
	
	if (err) {
		console.log(err);
		return err;
	} else {
		localFilesDir = fullInfo.localdir;
		retryInterval = fullInfo.retryinterval;
		webServerListenPort = fullInfo.webserverport;
		sessionProgramming.processConfigFiles(configDir, localFilesDir, function(err) {
			if(err) {
				console.log(err);
			}
		});
		
		if (fullInfo.runftp === "true"){
			ftpApply.setActiveFtp(function(err, msg) {
//				console.log( Date.now(),' : ', err, msg);
			});
		}
		var threshold = 60000;
		sessionProgramming.checkForStart(configDir, localFilesDir, threshold);
		setInterval(function() {
			console.log(new Date(Date.now()));
			sessionProgramming.checkForStart(configDir, localFilesDir, threshold);
		}, threshold);
	
		myHttpServer.listen(webServerListenPort);

	}
});

