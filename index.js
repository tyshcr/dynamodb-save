require('dotenv').load()

var AWS = require("aws-sdk");
var http = require('https');
if (process.env.NODE_ENV == 'prod') {
  var dynamodb = new AWS.DynamoDB()
} else {
  var dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(process.env.DYNAMODB_ADDRESS) })
}

const conference = function(json, conference, callback) {
    var items = [];
    for(var x in json['standing']) {
        if (json['standing'][x]['conference'] == conference) {
            // console.log(json['standing'][x]['team_id'])
            items.push({PutRequest: { Item: { "team_id": { "S": json['standing'][x]['team_id']}, "conference": { "S": json['standing'][x]['conference']}, "division": { "S": json['standing'][x]['division']} , "wins": { "N": json['standing'][x]['won'].toString()}, "losses": { "N": json['standing'][x]['lost'].toString()}, "rank": { "N": json['standing'][x]['rank'].toString()} }}});
        }
    }

    var params = {
        RequestItems: { "mlb": items }
    };

    dynamodb.batchWriteItem(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            callback("error")
        } else {
            // console.log(data)
            callback("done")
        }
    });
}

exports.handler = function(event, context) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var options = {
        host: process.env.REQUEST_HOST,
        path: process.env.REQUEST_PATH,
        headers: {'User-Agent': 'Test'},
        method: 'GET',
    }

    var request = http.request(options, function (res) {
        var data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('end', function () {
            const json = JSON.parse(data);

            // Can only send up to 25 PutRequests in a single RequestItems
            // Therefore, make a separate request for AL and for NL
            conference(json, "AL", function(response) {
                conference(json, "NL", function(response) {
                    //  context.done();
                });
            });
        });

    });

    request.end();
}
