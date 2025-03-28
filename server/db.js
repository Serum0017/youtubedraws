// joeinfinity
// HeBXoTMCFOHpGsty
import secrets from './secrets.js';

import { MongoClient, ServerApiVersion, GridFSBucket } from 'mongodb';
const uri = secrets.dbUri;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    }
});

let connected = false, connecting = false;
let collection, database;

async function connect() {
    if(connected === true) return;
    if(connecting === true){
        await until(() => {return connected === true});
        return;
    }
    connecting = true;
    try {
        await client.connect();
        database = client.db("testDB");
        collection = database.collection("col");

        console.log('connected to db!');
        connecting = false; connected = true;

        // try to load the file if there is one
        (async()=>{
            const doc = await collection.findOne({isThumbnail: true});

            if(!!doc){
                global.thumbnail = doc.thumbnail;
            }
        })();
         
    } catch(e){
        console.log('mongo connecting error: ', e)
    }
}
connect();

async function saveLocalFile(thumbnail){
    await collection.deleteMany({});
    await collection.insertOne({thumbnail, isThumbnail: true});
    return true;
}

export default {saveLocalFile};