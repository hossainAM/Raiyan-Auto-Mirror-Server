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

//Verify JWT
// const verifyJWT = (req, res, next) => {
//     //check authorization
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//         return res.status(401).send({
//             message: 'Unauthorized access'
//         })
//     }
//     //verify authorization
//     const token = authHeader.split(' ')[1]; 
//     jwt.verify(token, process.env.SECRET_KEY_TOKEN, function (err, decoded) {
//         if (err) {
//             return res.status(403).send({
//                 message: 'Forbidden access'
//             })
//         }
//         req.decoded = decoded;
//         next();
//     });
// }

async function run() {
    try{
        await client.connect();
        // console.log('db connected')
        const mirrorCollection = client.db('Raiyan_Auto_Mirror').collection('mirrors');
        const orderCollection = client.db('Raiyan_Auto_Mirror').collection('orders')

        // //AUTH
        // app.post('/login', async (req, res) => {
        //     const user = req.body;
        //     const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        //         expiresIn: '1d'
        //     });
        //     res.send({accessToken});
        // });

        //get all items API
        app.get('/item', async (req, res) => {
            const result = await mirrorCollection.find().toArray();
            res.send(result);
        });
 
        //get item by user Id API
        app.get('/item/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await mirrorCollection.findOne(query);
            res.send(result);
        });

        //add new order API
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });
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