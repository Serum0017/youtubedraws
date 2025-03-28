Youtube Draws!

To run this site, all you need to do is specify a few things. Create a file in the server directory called secrets.js in the following format:

```
const dbUri = "a mongodb connection uri, probably starting with mongodb+srv://";

const ytClientSecret = Your youtube api client_secret (probably starts with {"web":{"client_id": ... }})

const titleVideoId = "yourVideoId";// e.g. dQw4w9WgXcQ
const thumbnailVideoId = "yourOtherVideoId";

export default {dbUri, ytClientSecret};
```

You can get the mongodb secret just from setting up a free database (mongodb.com) and you can get your youtube token from the google developer dashboard, or by following this tutorial: https://developers.google.com/youtube/v3/quickstart/nodejs.

Then, install node.js and npm and run `npm install` in a terminal to install the project-specific dependencies. After you've verified your youtube channel, you should see "Server Listening to Port 3000". You can then go onto localhost:3000 in a web browser and you should see the app working. 🥳 If you have any questions, contact me on discord, @serum17

If you only want to update one video's title or one video's thumbnail, comment out the setInterval at the bottom in server/index.js and the route (/ or /title) near the top of the file.