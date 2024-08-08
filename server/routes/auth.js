const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const otpGenerator = require('otp-generator');
const jwt = require("jsonwebtoken");
const {passport} = require("../passportConfig");
const User = require("../models/user"); // Assuming you have a User model
// Assuming you have a LibStudent model
const redisClient = require('../redis');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

router.post("/register", async (req, res) => {
    let { password, email } = req.body;
    email = email.toLowerCase();
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }

        const existingUser = await User.findOne({ username: email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const sentOTP = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
        const userDetails = JSON.stringify({ password, otp: sentOTP });
        await redisClient.set(email, userDetails, 'EX', 30000);

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Chat App Otp Verification',
            text: `Dear Student,\n\nYour OTP for registration is: ${sentOTP}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Error sending OTP email" });
            } else {
                return res.status(200).json({ message: "OTP sent successfully", email });
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/otp-verify", async (req, res) => {
    let { otp, id } = req.body;
    id = id.toLowerCase();
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }

        const userDetails = await redisClient.get(id);
        if (!userDetails) {
            return res.status(400).json({ message: "Invalid OTP or user details not found" });
        }

        const { otp: storedOTP, password } = JSON.parse(userDetails);

        if (otp === storedOTP) {
            const newUser = await User.register(
                new User({ strategy: "local", username: id }),
                password
            );

            req.login(newUser, async (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Internal Server Error" });
                }


                res.status(201).json({ message: "User registered successfully", user: newUser });
            });
        } else {
            return res.status(400).json({ message: "Invalid OTP" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post('/reset-password/:id/:token', async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;

    try {
        const decoded = jwt.verify(token, "jwt_secret_key");
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        await user.setPassword(password);
        await user.save();
        res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            res.status(400).json({ success: false, message: "Error with token" });
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

router.post("/forgot-password", async (req, res) => {
    let { email } = req.body;
    email = email.toLowerCase();
    try {
        const user = await User.findOne({ username: email });
        if (!user) {
            return res.send({ Status: "User not existed" });
        }
        const token = jwt.sign({ id: user._id }, "jwt_secret_key", { expiresIn: "1d" });
        const url = process.env.NODE_ENV === 'production' ? process.env.FRONTEND_PROD : process.env.FRONTEND_DEV;
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Reset Password Link',
            html: `<p>Dear Student,</p><p>Click the following link to reset your password:</p><a href="${url}/reset-password/${user._id}/${token}">Reset Password Link</a>`
        };
        await transporter.sendMail(mailOptions);
        res.send({ Status: "Success" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ Status: "Internal Server Error" });
    }
});

router.get("/fetchAuth", function (req, res) {

    if (req.isAuthenticated()) {
        res.json(req.user);
    } else {
        res.json(null);
    }
});



router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?auth_success=false' }),
    async (req, res) => {
        const frontendUrl = process.env.NODE_ENV === 'production' ? process.env.FRONTEND_PROD : process.env.FRONTEND_DEV;
        const userInfo = { ...req.user._doc, token: req.user.token };
      
        const encodedUserInfo = encodeURIComponent(JSON.stringify(userInfo));
        res.redirect(`${frontendUrl}/login?auth_success=true&user_info=${encodedUserInfo}`);
    }
);

router.post("/logout", (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.send("Logout Successful");
    });
});

module.exports = router;