const express = require('express')
const app = express()
const passport = require('passport');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');;
const productInfoJsonSchema = require('./schemas/productInformation.schema.json');
const {request} = require('chai');
const Ajv = require('ajv');

app.set('port', (process.env.PORT || 80));

var multer = require('multer');
var cloudinary = require('cloudinary');
var cloudinaryStorage = require('multer-cloudinary-storage');

app.use(express.json());

const jwt = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy, ExtractJwt = require('passport-jwt').ExtractJwt;
let jwtSecretKey = null;
if (process.env.JWTKEY === undefined) {
    jwtSecretKey = require('./jwt-key.json').secret;
} else {
    jwtSecretKey = process.env.JWTKEY;
}

let options = {}

options.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();

options.secretOrKey = jwtKey;

passport.use(new JwtStrategy(options, function(jwt_payload, done) {
    console.log("Processing JWT payload for token content:");
    console.log(jwt_payload)
    
    const now = Date.now();
    if (jwt_payload.exp > now) {
        done(null, jwt_payload.user);
    }
    else {
        done(null, false);
    }
}));

app.get('/jwtProtectedResource', passport.authenticate('jwt', { session: false}), (req, res) => {
    console.log("jwt");
    res.json({
        status: "Successfully accessed protected resource with JWT",
        user: req.user
    });
});

app.post('/loginForJWT', passport.authenticate('basic', { session: false}), (req, res) => {
    const body = {
        id: req.user.id,
        email: req.user.email
    };

    const payload = {
        user :body
    };

    const options = {
        expiresIn: '1d'
    }

    const token = jwt.sign(payload, jwtKey, options);

    return res.json({token});
})

app.get('/', (req, res) => {
    res.send("Welcome to Tori")
})

let productData = [];

app.post('/products/:id', (req, res) => {
    const ajv = new Ajv();
    const validate = ajv.compile(productInfoJsonSchema);
    const valid = validate(req.body);
    if (!valid) {
        console.log(validate.errors);
        res.status(400);
        res.json(validate.errors);
    }

    productData.push({
        id: productData.length,
        name: req.body.productName,
        category: req.body.category,
        location: req.body.location,
        price: req.body.price,
        postingDate: req.body.postingDate,
        deliveryType: req.body.deliveryType,
        sellerInfo: req.body.sellerInfo,
    })
    var storage = cloudinaryStorage({
        cloudinary: cloudinary,
        folder: 'products',
        allowedFormats: ['jpg', 'png'],
    });

    var parser = multer({ storage: storage});
    app.post('/products', parser.single('image'), function (req, res) {
        console.log(req.file);
        res.status(201);
        res.json(req.file);
    })

    res.status(200).send("OK!");
});

app.get('/products', (req, res) => {
    res.json({ "productData": productData});
})

let serverInstance = null;

module.exports = {
    start: () => {
        serverInstance = app.listen(port, () => {
        console.log('Node app is running on port ', app.get('port'));    
        })
    },
    close: () => {
        serverInstance.close();
    }    
}
