import * as configuration from '../config/configuration';
import * as bcrypt from 'bcrypt';

const us = require('minimist')(process.argv.slice(2), { string: "username" });
const username: String = require('minimist')(process.argv.slice(2), { string: "username" }).username;
const email: String = require('minimist')(process.argv.slice(2), { string: "email" }).email;
const passwordLength: number = 10;

if (username && email) {
    const mongoose = require('mongoose');
    mongoose.connect(configuration.mongodb_uri, {
        auth: {
            authSource: "admin"
        },
        user: configuration.mongodb_username,
        pass: configuration.mongodb_password,
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    const userSchema = new mongoose.Schema({
        username: String,
        password: String,
        userRoles: {
            type: Map,
            of: { type: [String] },
            default: {}
        },
        isAdmin: Boolean,
        resilocServiceRole: String,
        firstName: String,
        lastName: String,
        phone: String,
        email: String,
        isActive: Boolean,
        dateCreated: Date,
        dateModified: Date,
    });

    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        const User = mongoose.model('User', userSchema);
        console.log("Account: " + username);

        var date = new Date();

        const admin = new User({
            username: username,
            password: hashPassword(makeRandomPassword(passwordLength), 10),
            userRoles: {},
            isAdmin: true,
            resilocServiceRole: "",
            firstName: "",
            lastName: "",
            phone: "",
            email: email,
            isActive: true,
            dateCreated: date.toISOString(),
            dateModified: date.toISOString()
        });

        admin.save();
        console.log(`Account ${username} created`);
    });
} else {
    console.log("Incorrect syntax, please use this: npm run seed:dev -- --username=<username> --email=<email>");
}

function makeRandomPassword(passwordLength) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    const charactersLength = characters.length;
    for (var i = 0; i < passwordLength; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log("Password: " + result);
    return result;
}

function hashPassword(plain_password, saltRounds) {
    const salt = bcrypt.genSaltSync(saltRounds);
    return bcrypt.hashSync(plain_password, salt);
}





