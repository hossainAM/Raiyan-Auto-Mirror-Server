const express = require('express');
const cors = require('cors');
const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
// const corsConfig = {
//     origin: true,
//     credentials: true,
// };
// app.use(cors(corsConfig));
// app.options("*", cors(cors(corsConfig)));
app.use(express.json());

//connect to db
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lia1v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1
});

async function run() {
    try{
        await client.connect();
        // console.log('db connected')
        const mirrorCollection = client.db('Raiyan_Auto_Mirror').collection('mirrors');

        //get all mirrors API
        app.get('/item', async (req, res) => {
            const result = await mirrorCollection.find().toArray();
            res.send(result);
        });
 
        //get mirror by user Id API
        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await mirrorCollection.findOne(query);
            res.send(result);
        })
    }
    finally{

    }

}
    run().catch(console.dir);




//Root API
app.get('/', (req, res) => {
    res.send('Server is running')
})

//Dynamic route
app.listen(port, () => {
    console.log(`Listening to port ${port}`)
});