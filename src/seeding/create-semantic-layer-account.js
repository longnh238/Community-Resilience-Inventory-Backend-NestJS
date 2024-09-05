"use strict";
exports.__esModule = true;
var configuration = require("../config/configuration");
var bcrypt = require("bcrypt");
var resiloc_service_role_enum_1 = require("../user-roles/enum/resiloc-service-role.enum");
var us = require('minimist')(process.argv.slice(2), { string: "username" });
var username = require('minimist')(process.argv.slice(2), { string: "username" }).username;
var email = require('minimist')(process.argv.slice(2), { string: "email" }).email;
var passwordLength = 10;
if (username && email) {
    var mongoose_1 = require('mongoose');
    mongoose_1.connect(configuration.mongodb_uri, {
        auth: {
            authSource: "admin"
        },
        user: configuration.mongodb_username,
        pass: configuration.mongodb_password,
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    var userSchema_1 = new mongoose_1.Schema({
        username: String,
        password: String,
        userRoles: {
            type: Map,
            of: { type: [String] },
            "default": {}
        },
        isAdmin: Boolean,
        resilocServiceRole: String,
        firstName: String,
        lastName: String,
        phone: String,
        email: String,
        dateCreated: Date,
        dateModified: Date
    });
    var db = mongoose_1.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        var User = mongoose_1.model('User', userSchema_1);
        console.log("Account: " + username);
        var date = new Date();
        var admin = new User({
            username: username,
            password: hashPassword(makeRandomPassword(passwordLength), 10),
            userRoles: {},
            isAdmin: false,
            resilocServiceRole: resiloc_service_role_enum_1.ResilocServiceRole.SemanticLayer,
            firstName: "",
            lastName: "",
            phone: "",
            email: email,
            dateCreated: date.toISOString(),
            dateModified: date.toISOString()
        });
        admin.save();
        console.log("Account " + username + " created");
    });
}
else {
    console.log("Incorrect syntax, please use this: npm run seed:dev -- --username=<username> --email=<email>");
}
function makeRandomPassword(passwordLength) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    var charactersLength = characters.length;
    for (var i = 0; i < passwordLength; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log("Password: " + result);
    return result;
}
function hashPassword(plain_password, saltRounds) {
    var salt = bcrypt.genSaltSync(saltRounds);
    return bcrypt.hashSync(plain_password, salt);
}
