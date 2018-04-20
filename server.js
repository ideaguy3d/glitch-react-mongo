// server.js
// where your node app starts

// init
// setup express for handling http requests
var express = require("express");
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public')); // http://expressjs.com/en/starter/static-files.html
var connected=false;
app.listen(process.env.PORT);
console.log('Listening on port 3000');

// setup nunjucks for templating in views/index.html
var nunjucks = require('nunjucks');
nunjucks.configure('views', { autoescape: true, express: app });

// setup our datastore
var datastore = require("./datastore").async;

// create routes
app.get("/", function (request, response) {
  try {
    connectOnProjectCreation()
      .then(function(){
        initializeDatastoreOnProjectCreation()
          .then(function(){
            datastore.get("posts")
              .then(function(posts){ 
                response.render('index.html', {
                  title: "Welcome!",
                  posts: posts.reverse()
                });
              });
          });        
      });
  } catch (err) {
    console.log("Error: " + err);
    handleError(err, response);
  }
});

app.post("/posts", function (request, response) {
  try {
    // Get the existing posts from the MongoDB and put it into an array called posts
    var posts = datastore.get("posts")
      .then(function(posts){
        // We get the contents of the submitted form and append it to the posts array
        posts.push(request.body); // the form data is in request.body because we're using the body-parser library to help make dealing with requests easier
        // We store the updated posts array back in our database posts entry
        datastore.set("posts", posts)
          .then(function(posts){
            // And then we redirect the view back to the homepage
            response.redirect("/");
          });
      });
  } catch (err) {
    handleError(err, response);
  }
});

app.get("/reset", function (request, response) {
  try {
    datastore.removeMany(["posts", "initialized"])
      .then(function(){
        response.redirect("/");
      });
  } catch (err) {
    handleError(err, response);
  }
});

app.get("/delete", function (request, response) {
  try {
    datastore.set("posts", [])
      .then(function(){
        response.redirect("/");
      });
  } catch (err) {
    handleError(err, response);
  }
});

function handleError(err, response) {
  response.status(500);
  response.send(
    "<html><head><title>Internal Server Error!</title></head><body><pre>"
    + JSON.stringify(err, null, 2) + "</pre></body></pre>"
  );
}

// ------------------------
// DATASTORE INITIALIZATION

function connectOnProjectCreation() {
  return new Promise(function (resolving) {
    if(!connected){
      connected = datastore.connect().then(function(){
        resolving();
      });
    } else {
      resolving();
    }
  });
}

function initializeDatastoreOnProjectCreation() {
  return new Promise(function (resolving) {
    datastore.get("initialized")
      .then(function(init){
        if (!init) {
          datastore.set("posts", initialPosts)
            .then(function(){
              datastore.set("initialized", true)
                .then(function(){
                  resolving();
                });
            });
        } else {
          resolving();
        }
      });
  });
}

var initialPosts = [
  {
    title: "Hello!",
    body: "Among other things, you could make a pretty sweet blog."
  },
  {
    title: "Another Post",
    body: "Today I saw a double rainbow. It was pretty neat."
  }
];