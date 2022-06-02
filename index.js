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
// app.use(cors());
const corsConfig = {
    origin: true,
    credentials: true,
};
app.use(cors(corsConfig));
app.options("*", cors(cors(corsConfig)));
app.use(express.json());

//connect to db
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lia1v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1
});

//Verify JWT
const verifyJWT = (req, res, next) => {
    //check authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({
            message: 'Unauthorized access'
        })
    }
    //verify authorization
    const token = authHeader.split(' ')[1]; 
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({
                message: 'Forbidden access'
            })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try{
        await client.connect();
        // console.log('db connected')
        const mirrorCollection = client.db('Raiyan_Auto_Mirror').collection('mirrors');
        const orderCollection = client.db('Raiyan_Auto_Mirror').collection('orders');
        const userCollection = client.db('Raiyan_Auto_Mirror').collection('users');
        const paymentCollection = client.db('Raiyan_Auto_Mirror').collection('payments');
        const reviewCollection = client.db('Raiyan_Auto_Mirror').collection('reviews');
        const profileCollection = client.db('Raiyan_Auto_Mirror').collection('profiles');

        //Verify Admin
        const verifyAdmin = async (req, res, next) => {
            const reqSender = req.decoded.email;
            const reqSenderAccount = await userCollection.findOne({
                email: reqSender
            });
            if (reqSenderAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({
                    message: 'Forbidden Access'
                });
            }
        }

        //Item APIs
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

        //add new item API
        app.post('/item', verifyJWT, async (req, res) => {
            const newProduct = req.body;
            const result = await mirrorCollection.insertOne(newProduct);
            res.send(result);
        });

        //delete item API
        app.delete('/item/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await mirrorCollection.deleteOne(filter);
            res.send(result);
        });

        //Order APIs
        //add new order API
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        // get all order API
        app.get('/order', verifyJWT, async (req, res) => {
            const result = await orderCollection.find().toArray();
            res.send(result);
        });

        //get orders by user email API
        app.get('/order', verifyJWT, async(req, res) => {
            const email = req.query.email;
            // console.log(email)
            if(email){
                const decodedEmail = req.decoded.email;
            if(email === decodedEmail) {
                const query = {email: email};
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({message: 'Forbidden Access'});
            }
            }
            else{
                const result = await orderCollection.find().toArray();
                res.send(result);
            }
        });

        //get order by id API
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await orderCollection.findOne(query);
            res.send(order);
        });

        //Payment API
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const {price} = req.body;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'],
            });
            res.send({clientSecret: paymentIntent.client_secret})
        });

         //cancel order API
         app.delete('/order/:id', verifyJWT, async (req, res) => {
             const id = req.params.id;
             const filter = {
                 _id: ObjectId(id)
             };
             const result = await orderCollection.deleteOne(filter);
             res.send(result);
         });

        //update payment information API
        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                    status: true,
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);
        });

        //User APIs
        //get all users API 
         app.get('/user', verifyJWT, async (req, res) => {
             const users = await userCollection.find().toArray();
             res.send(users);
         });

       //update a user API 
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const updatedDoc = {
                $set: {role: 'admin'},
            };
            const result = await userCollection.updateOne(query, updatedDoc);
            res.send(result);
            }
        );

       //update a user API
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            //generate and send token
            const token = jwt.sign({
                email: email
            }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '1d'
            })
            res.send({result, token});
        });

        //get user by user roll API
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});
        });

        //Review APIs
        //add a review API
        app.post('/review', async (req, res) => {
            const addReview = req.body;
            const result = await reviewCollection.insertOne(addReview);
            res.send(result);
        });

        //add a review API
        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        });

        //user profile APIs
        //add new profile API
        app.post('/profile', verifyJWT, async (req, res) => {
            const addProfile = req.body;
            const result = await profileCollection.insertOne(addProfile);
            res.send(result);
        });

        //update user profile API
        app.patch('/profile/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const profile = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    ...profile
                }
            };
            const result = await profileCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        //get user profile info API
        app.get('/profile/:email', verifyJWT, async(req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const result = await profileCollection.findOne(query);
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