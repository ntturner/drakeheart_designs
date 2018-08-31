//Set up required modules.
var express = require("express"),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    path = require("path"),
    multer = require("multer"),
    passport = require("passport"),
    User = require("./models/user"),
    LocalStrategy = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    nodemailer = require("nodemailer"),
    flash = require("connect-flash");

var storage = multer.diskStorage({
    destination: "./images/",
    filename: function(req, file, cb){
        cb(null, Date.now() + "-" + file.originalname);
    }
})

var upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb){
        checkImgType(file, cb);
    }
}).single("newGalPic");

//Check file type
function checkImgType(file, cb){
    var filetypes = /jpeg|jpg|png/;
    var extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    var mimetype = filetypes.test(file.mimetype);
    
    if(mimetype && extname){
        return cb(null, true);
    }else{
        cb("Error: Wrong file type.");
    }
}

var app = express();

//Connect to MongoDB.
mongoose.connect(process.env.DATABASEURL);

app.use(require("express-session")({
    secret: "Snuggle Cupcake, Orange Chile, and Triple Snake",
    resave: false,
    saveUninitialized: false
}));

//Connect to other file folders inside of root directory as well as correct passages.
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("styles"));
app.use(express.static("js"));
app.use(express.static("images"));

app.set("view engine", "ejs");

app.use(flash());

//Setup passport serialization and deserialization.
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

//Set up schema for gallery stuff and create corresponding objects.
var gallerySchema = new mongoose.Schema({
    name: String,
    type: String,
    price: Number,
    description: String,
    image: String
});

var GalleryObject = mongoose.model("GalleryObject", gallerySchema);


/********* ROUTES *********/

//Home page get route.
app.get("/", function(req, res){
    res.render("index");
});

app.get("/price-estimate", function(req, res){
   res.render("calculator");
});

//Gallery page get route. 
app.get("/gallery", function(req, res){
    //Render all gallery objects contained in the galleryobjects collection of database DHD. Objects include text and images.
    
    GalleryObject.find({}, function(err, galObjects){
        if(err){
            console.log(err);
        } else{
            res.render("gallery", {aoGalObjects: galObjects, currentAdmin: req.user});
        }
    });
    
});

//Show route for gallery objects.
app.get("/gallery/:id", function(req, res){
    GalleryObject.findById(req.params.id, function(err, ShowObject){
        if(err){
            console.log(err);
        } else {
            res.render("galleryShow", {ShowObject: ShowObject});
        }
    });
});

//Post route to add a new gallery object.
app.post("/gallery/new", IsLoggedIn, upload, function(req, res){
    //Get form data and set to a variable.
    if(req.user.username == "dhd-admin"){
        var newGalName = req.body.newGalName;
        var newGalType = req.body.newGalType;
        var newGalDescription = req.body.newGalDescription;
        var newGalPrice = req.body.newGalPrice;
        var newGalPic;

        upload(req, res, (err) => {
            if(err){
                console.log(err);
            } else{
                newGalPic = req.file.filename;

                var galleryPost = {
                    name: newGalName,
                    type: newGalType,
                    price: newGalPrice,
                    description: newGalDescription,
                    image: newGalPic
                };    

        //Add gallery object to database.
                GalleryObject.create(galleryPost, function(err, galObj){
                    if(err){
                        console.log(err);
                    } else{
                        console.log("\nNew gallery object in db DHD: ");
                        console.log(galObj + "\n");
                        res.redirect("/gallery");
                    }
                });
            }
        });
    }
    /*var newGalPic = req.files.newGalPic;
    var GalPicName = newGalPic.name;
    
    newGalPic.mv("/images/" + GalPicName + req.files.newGalPic.mimetype, function(err){
        if(err){
            console.log(err);
        }
    });*/
    
});

app.post('/gallery/destroy', IsLoggedIn, function(req, res){
    if(req.user.username == "dhd-admin"){
        GalleryObject.findByIdAndRemove(req.body.galobject_id, function(err){
            if(err){
                req.flash("error", "There was an error while deleting the document. Please try again.");
                
                console.log(err);
                res.redirect("/gallery");
            } else {
                req.flash("success", "Gallery object successfully deleted.");
                
                res.redirect("/gallery");
            }
        });
    }
});

app.post('/gallery/update', IsLoggedIn, function(req, res){
    if(req.user.username == "dhd-admin"){
        GalleryObject.findByIdAndUpdate(req.body.editobject_id, req.body.editobject, function(err){
            if(err){
                req.flash("error", "There was an error while updating the document. Please try again.");
                
                console.log(err);
                res.redirect("/gallery");
            } else {
                req.flash("success", "Gallery object successfully updated.");
                
                res.redirect("/gallery");
            }
        });
    }
});

app.get("/admin", IsLoggedIn, function(req, res){
    res.render("admin", {currentAdmin: req.user});
});

app.get("/terms-and-conditions", function(req, res){
    res.render("tca");
});

app.get("/about", function(req, res){
    res.render("about");
});

app.get("/magic-shoppe", function(req, res){
    res.render("magicshoppe");
});

app.get("/order", function(req, res){
    res.render("order");
});

app.post("/send-order", function(req, res){    
    //Use nodemailer to handle commission requests to drakeheartdesigns@gmail.com.
    var output = "<h3>Commission Details</h3><ul><li>Name: " + req.body.customer_name + "</li><li>Email: " + req.body.customer_email + "</li><li>Reference: " + req.body.customer_pic + "</li><li>Message: " + req.body.customer_desc + "</li></ul>";
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', //probably will change when using dhd.com email
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: "dhdcommissions@gmail.com", //use email on server, ie commissions@drakeheartdesigns.com
            pass: process.env.MAILERPASS //password for that email
        },
        //For local testing
        tls:{
            rejectUnauthorized: false
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Commissions" <dhdcommissions@gmail.com>', // same email address as the auth user listed in the transporter let above
        to: 'drakeheartdesigns@gmail.com', // just go to dhd
        subject: 'New Commission', // Subject line
        html: output, // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            req.flash("error", "We encountered an error. Please try again later or email us using the email found at the bottom of the page.");
            
            console.log(error);
            return res.redirect('/order');;
        }
        console.log('Message sent: %s', info.messageId);
        
        req.flash("success", "Order was sent successfully! Please allow 2-3 business days for a response.");
        res.redirect('/order');
    });
});

app.get("/admin/login", function(req, res){
    res.render("login");
});

app.post("/admin/login", passport.authenticate("local", {
    successRedirect: "/gallery",
    failureRedirect: "/admin/login"
}), function(req, res){
    
});

app.get("/logout", function(req, res){
    req.logout();
});

/*app.get("/dhd/register/new-admin", function(req, res){
    res.render("register");
});

app.post("/dhd/register/new-admin", function(req, res){
    req.body.username;
    req.body.password;
    User.register(new User({username: req.body.username}), req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        } else {
            res.redirect("/admin/login");
        }
    });
});*/

//Middleware to check logged in status.
function IsLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/admin/login");
}

//If there is no automatic port, assign to port 3000.
app.listen(process.env.PORT || 3000, process.env.IP, function(){
    console.log("Server DHD has started")
});