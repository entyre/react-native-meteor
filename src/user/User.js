import { SecureStore } from "expo";

import Data from "../Data";
import { hashPassword } from "../../lib/utils";
import call from "../Call";

const TOKEN_KEY = "reactnativemeteor_usertoken";
const USER_ID_KEY = "reactnativemeteor_userid";

let userIdSaved = null;

module.exports = {
    user() {
        if (!userIdSaved) return null;

        return this.collection("users").findOne(userIdSaved);
    },
    userId() {
        return userIdSaved;
    },
    _isLoggingIn: true,
    loggingIn() {
        return this._isLoggingIn;
    },
    logout(callback) {
        call("logout", err => {
            this.handleLogout();
            this.connect();
            Data.notify("onLogout");

            typeof callback == "function" && callback(err);
        });
    },
    handleLogout() {
        SecureStore.deleteItemAsync(TOKEN_KEY);
        SecureStore.deleteItemAsync(USER_ID_KEY);
        Data._tokenIdSaved = null;
        userIdSaved = null;
    },
    loginWithPassword(selector, password, callback) {
        if (typeof selector === "string") {
            if (selector.indexOf("@") === -1)
                selector = { username: selector };
            else
                selector = { email: selector };
        }

        this._startLoggingIn();
        call("login", {
            user: selector,
            password: hashPassword(password)
        }, (err, result) => {
            this._endLoggingIn();

            this._handleLoginCallback(err, result);

            typeof callback == "function" && callback(err);
        });
    },
    logoutOtherClients(callback = () => {}) {
        call("getNewToken", (err, res) => {
            if (err) return callback(err);

            this._handleLoginCallback(err, res);

            call("removeOtherTokens", err => {
                callback(err);
            });
        });
    },
    _login(user, callback) {
        this._startLoggingIn();
        this.call("login", user, (err, result) => {
            this._endLoggingIn();

            this._handleLoginCallback(err, result);

            typeof callback == "function" && callback(err);
        });
    },
    _startLoggingIn() {
        this._isLoggingIn = true;
        Data.notify("loggingIn");
    },
    _endLoggingIn() {
        this._isLoggingIn = false;
        Data.notify("loggingIn");
    },
    _handleLoginCallback(err, result) {
        if (!err) {//save user id and token
            SecureStore.setItemAsync(TOKEN_KEY, result.token);
            SecureStore.setItemAsync(USER_ID_KEY, result.id);
            Data._tokenIdSaved = result.token;
            userIdSaved = result.id;
            Data.notify("onLogin");
        } else {
            Data.notify("onLoginFailure");
            this.handleLogout();
        }
        Data.notify("change");
    },
    _loginWithToken(value) {
        Data._tokenIdSaved = value;
        if (value !== null) {
            this._startLoggingIn();
            call("login", { resume: value }, (err, result) => {
                this._endLoggingIn();
                this._handleLoginCallback(err, result);
            });
        } else {
            this._endLoggingIn();
        }
    },
    getAuthToken() {
        return Data._tokenIdSaved;
    },
    async restoreSession() {
        if (Data.ddp && Data.ddp.status === "connected") {
            console.log("restoreSession: using server (online)");

            await this._loadInitialUser();
            console.log("restoreSession: result unknown, used online server");
        } else {
            console.log("restoreSession: using stored token and userId (offline)");

            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            const userId = await SecureStore.getItemAsync(USER_ID_KEY);

            if (token && userId) {
                this._startLoggingIn();

                // ... we do not call the server here, because we are not connected

                this._endLoggingIn();

                Data._tokenIdSaved = token;
                userIdSaved = userId;
                Data.notify("onLogin");

                Data.notify("change");
                console.log("restoreSession: success");
            } else {
                // either incomplete or missing session data
                // -> reset session

                Data.notify("onLoginFailure");
                this.handleLogout();
                Data.notify("change");

                console.log(`restoreSession: incomplete session (${token}, ${userId})`);
            }
        }
    },
    async _loadInitialUser() {
        var value = null;
        try {
            console.log("restore session: getItemAsync");
            value = await SecureStore.getItemAsync(TOKEN_KEY);
        } catch (error) {
            console.warn("restore session error: " + error.message);
        } finally {
            console.log("restore session: _loginWithToken with " + value);
            this._loginWithToken(value);
        }

    }
};
