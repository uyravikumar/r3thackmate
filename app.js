var restify = require('restify');
var builder = require('botbuilder');
var Request = require('tedious').Request;
var Types = require('tedious').TYPES;
var email = require('./sendemail');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: 'c734e282-f433-4e96-bee0-1fdd51f9f343',
    appPassword: 'r36uO6vxkfyxJy6kinY4Nkq'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//create LUIS recognizer that points at our model and add it as a root '/' dialog
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/a4140058-f613-4a34-bab0-a90a6e088f86?subscription-key=8a6d7ac6787c4537aab3095d94985a35&verbose=true&timezoneOffset=0.0&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer]});
bot.dialog('/', dialog);

// bot.dialog('/', [
//     function (session) {
//         builder.Prompts.text(session, 'Hi');
//     }
// ]);

// bot.dialog('Hi', [
//     function (session) {
//             var msg = new builder.Message(session)
//             .textFormat(builder.TextFormat.xml)
//             .attachments([
//                 new builder.HeroCard(session)
//                     .title("Welcome to Resource technical Bot")
//                     .subtitle("Smart resource management")
//                     .text("The smart resource management is a intelligent bot for PMs/SAs/TAs or TFS/Scheduler for resource management")
//                     .images([
//                         builder.CardImage.create(session, "http://www.theoldrobots.com/images26/gakk6.JPG")
//                     ])
//                     .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
//             ]);

//             builder.Prompts.text(session, 'Hi! Type in the search for candidates ');
//     },
//         function (session, results) {
//         session.endDialogWithResult(results);
//     }
// ]);

// // // Add intent handlers
dialog.matches('SearchCandidate',[
    function (session, args, next){
        // get all the entities 
        session.send('Welcome! we are analyzing your message: \'%s\'', session.message.text);

        var cities = builder.EntityRecognizer.findEntity(args.entities, 'cities');
        var datetime = builder.EntityRecognizer.findEntity(args.entities, 'datetime');
        var email = builder.EntityRecognizer.findEntity(args.entities, 'email');
        var experienceLevel = builder.EntityRecognizer.findEntity(args.entities, 'experienceLevel');
        var leadtime = builder.EntityRecognizer.findEntity(args.entities, 'leadtime'); 
        var number = builder.EntityRecognizer.findEntity(args.entities, 'number');
        var phonenumber = builder.EntityRecognizer.findEntity(args.entities, 'phonenumber');
        var primarySkill = builder.EntityRecognizer.findEntity(args.entities, 'primarySkill');
        var secondarySkills = builder.EntityRecognizer.findEntity(args.entities, 'secondarySkills');

        var candidateprofile = session.dialogData.candidate = {
            cities : cities ? cities.entity :null,
            datetime : datetime ? datetime.entity : null,
            email : email ? email.entity : null,
            experienceLevel : experienceLevel ? experienceLevel.entity : null,
            leadtime : leadtime ? leadtime.entity : null,
            number : number ? number.entity : null,
            phonenumber : phonenumber ? phonenumber.entity : null,
            primarySkill : primarySkill ? primarySkill.entity : null,
            secondarySkills : secondarySkills ? secondarySkills.entity : null
        }
         
        if (!candidateprofile.primarySkill){
            builder.Prompts.text(session, 'what primary skill you are looking for?');
        } else {
            next();
        }
    },
    function (session, results, next){
        var pskill = session.dialogData.candidate;
        //get the duration
        if (results.response){
            pskill.primarySkill = results.response;
        }

        if (pskill.primarySkill && !pskill.experienceLevel) {
            builder.Prompts.text(session, 'what experience level candidate you are looking for ?');
        } else {
            next();
        }
    },
    function (session, results, next){

        var explevel = session.dialogData.candidate;

        if (results.response){
            explevel.experienceLevel = results.response;
        }
        if (explevel.experienceLevel && explevel.primarySkill && !explevel.leadtime){
            builder.Prompts.text(session, 'when do you need this candidate to start! eg in 1 week, in 3 months or 1st April etc..?');
        } else {
            next();
        }

    },
    function (session, results, next){

        var ltime = session.dialogData.candidate;

        if (results.response){
            ltime.leadtime = results.response;
        }
        if (ltime.experienceLevel && ltime.primarySkill && ltime.leadtime && !ltime.cities){
            builder.Prompts.text(session, 'which location candidate is required for?');
        } else {
            next();
        }

    },
    function (session, results){
        var city = session.dialogData.candidate;
        if (results.response){
            city.cities = results.response;
        }
        if (city.experienceLevel && city.primarySkill && city.leadtime && city.cities){
            city.address = session.message.address;
            console.log("Initiate database connection");
            var Connection = require('tedious').Connection;  
            var config = {
                userName: 'superuser@r3taihack.database.windows.net',
                password: 'pms2secure@2017',
                server: 'r3taihack.database.windows.net',
                options: {
                    encrypt: true, 
                    database: 'r3taihack', 
                    rowCollectionOnRequestCompletion: true
                }
            };
            var connection = new Connection(config);
            connection.on('connect', function(err){
                if (err){
                    console.log('error in connecting ' + err);
                    return;
                }
                session.send('search for candidates in %s to be available with lead time ::%s', city.cities, city.leadtime);
                executeStatement();
            });

            function executeStatement(){
                var sqlstring = "SELECT * FROM dbo.Employees";
                req = new Request(sqlstring, function(err, rowCount, rows){
                    if (err){
                        console.log(err);
                    }
                    console.log(rowCount + ' rows');
                    session.send ('we are at 1 :: %s', rowCount);
                });

                var result = "";
                req.on('row',function(columns){
                    columns.forEach(function(element) {
                        if (element.value === null){
                            console.log('NULL');
                        } else {
                            result+= element.value + " ";
                        }
                    });
                    email.sendemail(result);
                    console.log(result); 
                    session.send('record: %s',result);
                    result = "";
                });
                req.on('doneInProc',function(rowCount, more){
                console.log(rowCount + ' rows returned');

                });
                connection.execSql(req);
            
            }
       
        }

    }
]);

dialog.matches('EmailCandidate', [
    function(session, args, next){
        session.send('Thanks for using the service. try searching resources any time: \'%s\'', session.message.text);
    }
]);

dialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I can only search candidates."));