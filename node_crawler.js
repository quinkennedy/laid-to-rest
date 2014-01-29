var Crawler = require("crawler").Crawler;
var WebSocketClient = require('ws');

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

var clientName = "404'd";

/**
 * Handle the json data from the Server and forward it to the appropriate function
 * @param  {json} json The message sent from the Server
 * @return {boolean}      True iff the message was a recognized type
 */
var handleMessage = function(json){
    if (json.message || json.admin){
        //do nothing
    } else if (json.config){
        handleConfigMessage(json);
    } else if (json.route){
    } else if (json.remove){
    } else {
        return false;
    }
    return true;
};

var setupWSClient = function(){ 
    // create the wsclient and register as an admin
    wsClient = new WebSocketClient("ws://"+defaultHost+":"+defaultPort);
    wsClient.on("open", function(conn){
        console.log("connected");
        var configMsg = { "config": {"name":clientName, "description":"web crawler that publishes dead links", "publish":{"messages":[{"name":"R.I.P.", "type":"string"}]}, "subscribe":{"messages":[]}}};
        wsClient.send(JSON.stringify(configMsg));
    });
    wsClient.on("message", receivedMessage);
    wsClient.on("error", function(){console.log("ERROR"); console.log(arguments);});
    wsClient.on("close", function(){console.log("CLOSE"); console.log(arguments);});
}

//set up timer to attempt connection if it doesn't happen
setupWSClient();

var c = new Crawler({
	"maxConnections":100,
	"skipDuplicates":true,
	"timeout":20000,
	"retryTimeout":5000,

	// This will be called for each crawled page
	"callback":function(error,result,$) {
		if (error != undefined){
			//hmm
		}else if(result != undefined){
			//console.log(result.statusCode);
			if (result.statusCode == 200){
				process.stdout.write(".");
			} else {
				process.stdout.write(""+result.statusCode);
				if (result.statusCode == 404){
					console.log(result.uri);
					wsClient.send(JSON.stringify({message:{clientName:clientName, name:"R.I.P.", type:"string", value:result.uri}}));
				}
			}
			try{
				// $ is a jQuery instance scoped to the server-side DOM of the page
			    $("#content a").each(function(index,a) {
			        c.queue(a.href);
			    });
		    } catch (err){
		    	console.log("oops");
		    }
		}
	}
});

// Queue a list of URLs
// good sources of 404
//c.queue(["http://allaboutee.com/2011/12/31/arduino-adk-board-blink-an-led-with-your-phone-code-and-explanation/","http://tedxparis.com"]);
c.queue(["http://parishackers.org/","http://joshfire.com","http://jamendo.com/"]);
