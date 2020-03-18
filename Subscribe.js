import { Auth } from "aws-amplify";
import SigV4Utils from "./SigV4Utils";
var mqtt = require("mqtt");

var firTimeConnect = true;
export class StoreAPI {
  async Subscribe() {
    try {
      console.log("Subscribing..........");
      let credentials = {};
      let iotauthurl = config.IOT.POLICY_URL;
      let identity;
      await Auth.currentCredentials().then(info => {
        identity = info._identityId;
        credentials.accessKeyId =
          info &&
          info.data &&
          info.data.Credentials &&
          info.data.Credentials.AccessKeyId;
        credentials.secretAccessKey =
          info &&
          info.data &&
          info.data.Credentials &&
          info.data.Credentials.SecretKey;
        credentials.sessionToken =
          info &&
          info.data &&
          info.data.Credentials &&
          info.data.Credentials.SessionToken;
      });
      await fetch(iotauthurl, {
        method: "POST",
        headers: {
          Authorization: Store.get("JWTTOKEN"),
          Identity: identity
        }
      })
        .then(function(response) {
          console.log("Iot Auth Success");
        })
        .catch(err => {
          console.log("Iot Auth Failure: ", err);
        });//Doing this to add policy. It can be done once when user logs in.
      let host = process.env.REACT_APP_MQTT_URL;//MQTT url which looks like a23xxxxxxxxxx-ats.iot.xxxxxxxeast-1.amazonaws.com
      let region = process.env.REACT_APP_REGION; //xxxxxxxeast-1
      let MQTT_ORG_TOPIC = process.env.REACT_APP_MQTT_ORG_TOPIC;//MQTT Topic to be subscribed to.
      const ioturl = SigV4Utils.getSignedUrl(host, region, credentials);
      let client = mqtt.connect(ioturl);
      client.on("connect", () => {
        client.subscribe(MQTT_ORG_TOPIC, err => {
          if (!err) {
            console.log("Subscribed successfully");
            if (!firTimeConnect) {
              this.callApis();//Just making sure that when dis-connecting and re-connected I don't miss on any updates and calling all the required api's, not calling for the first time as I am doing it in some other controller.
            }
            firTimeConnect = false;
          }
        });
      });
      client.on("message", (topic, message) => {
        console.log("Message Topic from IOTT", topic);
        console.log(
          "Message received from IOTT",
          JSON.parse(message.toString())
        );
        message = JSON.parse(message.toString());//By default it's returning a buffer stream so parsing it as I have to use some parameters got from message JSON.
      });
    } catch (e) {
      console.log("Exception: ", e);
    }
  }
}
