var WebSocketClient = require('ws');


// require("serialport").list(function (err, ports) {
//   ports.forEach(function(port) {
//     console.log(port.comName);
//     console.log(port.pnpId);
//     console.log(port.manufacturer);
//   });
// });

// var SerialPort = require("serialport").SerialPort
// var serialPort = new SerialPort("/dev/tty.usbmodemfa131", {
//   baudrate: 38400;//9600;300;38400;
// });

// serialPort.on("open", function () {
//   console.log('open');
//   serialPort.on('data', function(data) {
//     console.log('data received: ' + data);
//   });
//   serialPort.write("ls\n", function(err, results) {
//     console.log('err ' + err);
//     console.log('results ' + results);
//   });
// });

/**
 * Called when we receive a message from the Server.
 * @param  {websocket message} data The websocket message from the Server
 */
var receivedMessage = function(data, flags){
    // console.log(data);
    if (data){
        var json = JSON.parse(data);
        //TODO: check if json is an array, otherwise use it as solo message
        //when we hit a malformed message, output a warning
        if (!handleMessage(json)){
            for(var i = 0, end = json.length; i < end; i++){
                handleMessage(json[i]);
            }
        }
    }
};

var clientName = "limiter";

/**
 * Handle the json data from the Server and forward it to the appropriate function
 * @param  {json} json The message sent from the Server
 * @return {boolean}      True iff the message was a recognized type
 */
var handleMessage = function(json){
    if (json.message){
        handleMessageMessage(json);
    } else if (json.admin){
    } else if (json.config){
    } else if (json.route){
    } else if (json.remove){
    } else {
        return false;
    }
    return true;
};

var handleMessageMessage = function(json){
    if (json.message.name == "text"){
	console.log("received:", json.message.value);
        textList.push(json.message.value);
        sendLimited();
    } else if (json.message.name == "available"){
        available = true;
        sendLimited();
    }
};

var sendLimited = function(){
    if (available && textList.length > 0){
	available = false;
        wsClient.send(JSON.stringify({message:{clientName:clientName,name:"text",type:"string",value:textList[0]}}));
	console.log("sent:",textList[0]);
        textList.splice(0,1);
    }
}

var defaultHost = "localhost";
var defaultPort = 9000;
var available = false;
var textList = [];

var setupWSClient = function(){
    // create the wsclient and register as an admin
    wsClient = new WebSocketClient("ws://"+defaultHost+":"+defaultPort);
    wsClient.on("open", function(conn){
        console.log("connected");
        var configMsg = { "config": {"name":clientName, "description":"web crawler that publishes dead links", "publish":{"messages":[{"name":"text", "type":"string"}]}, "subscribe":{"messages":[{"name":"text", "type":"string"},{"name":"available","type":"boolean"}]}}};
        wsClient.send(JSON.stringify(configMsg));
    });
    wsClient.on("message", receivedMessage);
    wsClient.on("error", function(){console.log("ERROR"); console.log(arguments);});
    wsClient.on("close", function(){console.log("CLOSE"); console.log(arguments);});
}

//set up timer to attempt connection if it doesn't happen
setupWSClient();
