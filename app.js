var restify = require('restify');
var builder = require('botbuilder');
var Request = require('tedious').Request;
var Types = require('tedious').TYPES;
var email = require('./sendemail');
var chalk = require('chalk');
var fs = require('fs');
var moment = require('moment');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
//    server.post('hello');
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: '6a298216-0a41-4d76-bcb4-aac9360f3bcf',
    appPassword:'g3vym1ux6LzTXctrbfaKsTx'
    //appId: 'c734e282-f433-4e96-bee0-1fdd51f9f343',
    //appPassword: 'r36uO6vxkfyxJy6kinY4Nkq'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//create LUIS recognizer that points at our model and add it as a root '/' dialog
//var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/b23f5c98-8066-4fbe-b512-0c1e3d19f983?subscription-key=8a6d7ac6787c4537aab3095d94985a35&verbose=true&timezoneOffset=0.0&q=';
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/088b8e55-9834-4e59-8cb5-e88c4be6ea03?subscription-key=0bd36f66fb754b21b40ab530264d948d&verbose=true&timezoneOffset=0&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer]});
bot.dialog('/', dialog);

var msg = " ";
var greeted = 0;

dialog.onBegin(function (session, args, next) {
            msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.HeroCard(session)
                    .title("Welcome to Meet Accenture Talent for Engagement (MATE)")
                    .subtitle("I am a Smart resource management Bot")
                    .text("The smart resource management Bot is a intelligent bot for PMs/SAs/TAs or TFS/Scheduler for resource management")
                    .images([
                        builder.CardImage.create(session, "https://thumbs.dreamstime.com/z/teamwork-handle-group-logo-22538327.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
            ]);
            session.send(msg);
            greeted = 1;
            // args.entities ? args.entities :null;
            // session.send('Begin search for candidates like search java candidates in <location> etc..');
            session.send('Hi Sam! How can I help today.. ');
            session.send('Candidates search : eg : I am searching for candidates with Hadoop skiils:');
            
});



// dialog.onBegin(builder.DialogAction.send("I can search candidates."));

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
        if (greeted===0){
            session.send(msg);
        } 
        //session.send('Search for candidates : eg : Search for java Candidates:\'%s\'', session.message.text);

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
            session.sendTyping();
            builder.Prompts.text(session, 'What skill candidates you are looking for?');
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
            session.sendTyping();
            builder.Prompts.text(session, 'OK! what is the level of experience are you looking for');
        } else {
            next();
        }
    },
    function (session, results, next){

        var explevel = session.dialogData.candidate;

        if (results.response){
            explevel.experienceLevel = results.response;
            // implement the string to pick a number 
            explevel.experienceLevel = explevel.experienceLevel.substring(0,1);
            console.log(explevel.experienceLevel);
        }
        if (explevel.experienceLevel && explevel.primarySkill && !explevel.leadtime){
            session.sendTyping();
            builder.Prompts.text(session, 'Thanks! what is the start date! eg in 1st April 2017 etc..?');
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
            session.sendTyping();
            builder.Prompts.text(session, 'Do you prefer sydney based candidates or specify location');
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
                password: 'Pms2Secure2017',
                server: 'r3taihack.database.windows.net',
                options: {
                    encrypt: true, 
                    database: 'r3taihackmate', 
                    rowCollectionOnRequestCompletion: true
                }
            };
            var connection = new Connection(config);
            connection.on('connect', function(err){
                if (err){
                    console.log('error in connecting ' + err);
                    return;
                }
                session.send('search for candidates in %s to be available on ::%s', city.cities, city.leadtime);
                //executeDemandstatement();
                //executeDemandinsert();
                executeStatement();
            });
            
            var deamndrowcount = 0;
            var totalrowcount = 0;

            function executeDemandstatement(){
                var demquerystring = "SELECT max(Role_Id) from dbo.Demand$";
                console.log("Demand query :"+ demquerystring);
                demroleid =  new Request(demquerystring, function(err, rowCount, rows){
                    if (err){
                        console.log(err);
                    }
                    console.log(rowCount + ' rows in Demand');
                    // console.log(demroleid + ' role ID');
                    // session.send ('we are at 1 :: %s', rowCount);
                    
                });
                var result = "";
                demroleid.on('row', function(columns) {
                    console.log('row in select of demand');
                    columns.forEach(function(column) {
                    if (column.value === null) {
                        console.log('NULL');
                    } else {
                        result+= column.value + " ";
                    }
                    });
                    console.log(result);
                    totalrowcount=result;
                    console.log("total number of rows in demand:"+totalrowcount);
                    result ="";
                });
                demroleid.on('doneInProc', function(rowCount, more) {
                    console.log(rowCount + ' rows returned');
                
                });
                connection.execSql(demroleid);
            }

            function executeDemandinsert(){
                // insert a record in Demand DB
                totalrowcount += 1;
                var insertsqlstring ="insert into dbo.Demand$ values ("+totalrowcount+",null,null,null,"+city.cities+",null,"+city.experienceLevel+",null,null,null,null,null,"+city.primarySkill+",null,null,null)";
                console.log("demand insert query :"+ insertsqlstring);
                deminsert =  new Request(insertsqlstring, function(err, rowCount, rows){
                if (err){
                        console.log(err);
                    }
                    console.log(rowCount + ' in demand table rows');
                    // console.log(deminsert + 'insert results in demand table');
                    // session.send ('we are at 2 :: %s', rowCount);
                });
                var result = "";
                deminsert.on('row', function(columns) {
                    console.log('row in insert');
                    columns.forEach(function(column) {
                    if (column.value === null) {
                        console.log('NULL');
                    } else {
                        result+= column.value + " ";
                    }
                    });
                    console.log(result);
                    totalrowcount=result;
                    result ="";
                });
                deminsert.on('doneInProc', function(rowCount, more) {
                    console.log(rowCount + ' rows returned');
                
                });
                connection.execSql(deminsert);
            }

            function executeStatement(){
 
                // Query the employee table with skill , location
                var querysqlstring = "SELECT top 10 e.PersonalID,e.Employment_Status, e.Career_Track, e.Talent_Segment, e.Standard_Job FROM dbo.Skill$ s, dbo.Employee$ e where lower(s.Skill) like '%"+city.primarySkill+"%' and s.Experience ="+city.experienceLevel+" and e.Metro_City ='"+city.cities+"' and s.PersonalID = e.PersonalID";
                console.log(querysqlstring +': The query u want to send to DB');
                req = new Request(querysqlstring, function(err, rowCount, rows){
                    if (err){
                        console.log(err);
                    }
                    console.log(rowCount + ' rows in employee and skill table');
                    // session.send ('we are at 3 :: %s', rowCount);
                });

                var timenow = moment();
                // var formatted = timenow.format('YYYY-MM-DD HH:mm:ss Z');
                var formatted = timenow.format('YYYYMMDDHHmmss');
                // console.log(formatted);

                var result = "";
                var filename = "CandidateRecords"+formatted;
                console.log(filename);

                var stream = fs.createWriteStream(filename);
                stream.once('open', function(fd) {

                       req.on('row',function(columns){
                            columns.forEach(function(element) {
                                if (element.value === null){
                                    console.log('NULL');
                                } else {
                                    result+= element.value + " || ";
                                }
                            });
                            console.log(result);
                            // email.sendemail(result);
                            stream.write(result, function(err) { stream.end(); });
                            
                            session.send('[%s]',result);
                            result = "\n";
                        });
                });

                req.on('doneInProc',function(rowCount, more){

                    console.log(rowCount + ' rows returned');
                    // if row count is 0 , ask option to raise RRD
                    // If row count is 

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