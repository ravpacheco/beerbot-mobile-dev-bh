/* eslint-disable no-console */
'use strict';

let Lime = require('lime-js');
let WebSocketTransport = require('lime-transport-websocket');
let MessagingHub = require('messaginghub-client');
let request = require('request-promise');

// These are the MessagingHub credentials for this bot.
// If you want to create your own bot, see http://blip.ai
const IDENTIFIER = 'beerbot';
const ACCESS_KEY = 'NE9raWdwSDB3eVd6MFlkbWVZakY=';
const API_ENDPOINT = 'http://randomword.setgetgo.com/get.php';
const CHALLENGE_ENDPOINT = 'https://hooks.zapier.com/hooks/catch/275658/mlzgvd/';

const users = [];

// instantiate and setup client
let client = new MessagingHub.ClientBuilder()
    .withIdentifier(IDENTIFIER)
    .withAccessKey(ACCESS_KEY)
    .withTransportFactory(() => new WebSocketTransport())
    .build();

let lastAnswerForUser = {};

client.addMessageReceiver(() => true, (m) => {
    //if (m.type !== 'text/plain') return;
    //console.log(`<< ${m.from}: ${JSON.stringify(m.content)}`);

    var userState = users[m.from];

    if (userState == undefined) {
        userState = {
            state: 'init',
            name: ''
        }
        users[m.from] = userState;
    }

    let message = {};
    switch (userState.state) {

        case 'init':

            var directoryCommand = {
                "id": Lime.Guid(),
                "to": "postmaster@messenger.gw.msging.net",
                "method": "get",
                "uri": "lime://messenger.gw.msging.net/accounts/" + m.from.split("@")[0]
            }

            //console.log('directoryCommand >>' + JSON.stringify(directoryCommand));

            client.sendCommand(directoryCommand)
                .then((res) => {
                    
                    console.log(JSON.stringify(res));

                    var userName = res.resource.fullName;

                    userState.name = userName;
                    userState.state = 'picture';
                    users[m.from] = userState;

                    console.log("Result" + JSON.stringify(res))

                    message = {
                        id: Lime.Guid(),
                        type: 'text/plain',
                        content: `Olá ${userState.name} me envie a imagem de uma cerveja.`,
                        to: m.from
                    };
                    console.log(`>> ${message.to}: ${message.content}`);

                    client.sendMessage(message);
                });

            break;

        case 'picture':

            message = {
                id: Lime.Guid(),
                type: 'text/plain',
                content: 'Olá me envie o login do seu twitter.',
                to: m.from
            };
            
            userState.picture = m.content.uri;
            userState.state = 'twitter';
            users[m.from] = userState;

            console.log('UserState: ' + JSON.stringify(userState));

            client.sendMessage(message);

            break;

        case 'twitter':

            message = {
                id: Lime.Guid(),
                type: 'text/plain',
                content: 'Confira o twitter e veja se funcionou.',
                to: m.from
            };
            console.log(`>> ${message.to}: ${message.content}`);

            userState.twitter = m.content;
            userState.state = 'init';
            users[m.from] = userState;

            client.sendMessage(message);

            var options = {
                method: 'POST',
                uri: CHALLENGE_ENDPOINT,
                body: {
                    "experience": "mobile-dev-bh",
                    "event": "untappd-checkin",
                    "data": {
                        "first_name": userState.name,
                        "twitter": userState.twitter,
                        "image-uri": userState.picture
                    }
                },
                json: true // Automatically stringifies the body to JSON
            };

            request(options)
                .then(function (parsedBody) {
                    console.log(parsedBody);
                })
                .catch(function (err) {
                    console.log(err);
                });

            break;
    }

    // answer with a random word
    //request
    //    .get(API_ENDPOINT)
    //    .then((res) => {
    //        let message = {
    //            id: Lime.Guid(),
    //            type: 'text/plain',
    //            content: res,
    //            to: m.from
    //        };
    //        console.log(`>> ${message.to}: ${message.content}`);
    //        lastAnswerForUser[m.from] = res;
    //        registerAction({ category: 'Bot', action: 'answered' });
    //        client.sendMessage(message);
    //    })
    //    .catch((err) => console.error(err));
});

// connect to the MessagingHub server
client.connect()
    .then(() => console.log('Listening...'))
    .catch((err) => console.error(err));

// analytics helper functions
function registerAction(resource) {
    return client.sendCommand({
        id: Lime.Guid(),
        method: Lime.CommandMethod.SET,
        type: 'application/vnd.iris.eventTrack+json',
        uri: '/event-track',
        resource: resource
    })
        .catch(e => console.log(e));
}
