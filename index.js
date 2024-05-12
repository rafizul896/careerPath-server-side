const express = require('express');
const cors = require('cors')
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://assignment-eleven-e0849.web.app",
            "https://assignment-eleven-e0849.firebaseapp.com",
        ],
        credentials: true,
    })
);
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y7qmkns.mongodb.net/?retryWrites=true&w=majority&appName=cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Send a ping to confirm a successful connection
        const jobsCollection = client.db('job-seeking').collection('jobs');
        const applyedJobCollention = client.db('job-seeking').collection('applyedJob');
        // jwt
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            }).send({ success: true })
        })
        // jwt token clear cookie
        app.post('/logout', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })
        // get all jobs data:
        app.get('/jobs', async (req, res) => {
            const result = await jobsCollection.find().toArray();
            res.send(result)
        })
        // get a job by id
        app.get('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result);
        })
        // applyedJob
        app.get('/applyedJob', async (req, res) => {
            const result = await applyedJobCollention.find().toArray();
            res.send(result);
        })
        // get job data by email
        app.get('/job/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                'user.email': email
            };
            const result = await jobsCollection.find(query).toArray();
            res.send(result);
        })
        // delete a job data
        app.delete('/job/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.deleteOne(query);
            res.send(result);
        })
        // save a applied job in db
        app.post('/applyedJob', async (req, res) => {
            const applyedJob = req.body;
            const query = {
                email: applyedJob.email,
                job_id: applyedJob.job_id
            }
            const alreadyApplied = await applyedJobCollention.findOne(query);
            if (alreadyApplied) {
                return res.send(400).send('You have already applied on this job')
            }
            const result = await applyedJobCollention.insertOne(applyedJob);
            res.send(result);
        })
        // get all bits for a user by email by db:
        app.get('/applyedJob/:email', verifyToken, async (req, res) => {
            const tokenData = req.user.email;
            const email = req.params.email;
            if (tokenData !== email) {
                return res.status(403).send({ message: 'unauthorid access' })
            }
            const query = { email: email };
            const result = await bidsCollection.find(query).toArray();
            res.send(result);
        })
        // add jobs
        app.post('/jobs', async (req, res) => {
            const job = req.body;
            console.log(job);
            const result = await jobsCollection.insertOne(job);
            res.send(result);
        })
        // update statuse
        app.patch('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: status
            }
            const result = await jobsCollection.updateOne(query, updateDoc);
            res.send(result);
        })
        // Get all jobs data from db for pagination
        app.get('/all-jobs', async (req, res) => {
            const size = parseInt(req.query?.size);
            const page = parseInt(req.query?.page);
            const filter = req.query?.filter;
            const sort = req.query?.sort;
            const search = req?.query?.search;

            let query = {
                jobTitle: { $regex: search?.toString(), $options: 'i' }
            }
            console.log(query)
            if (filter) {
                query.category = filter
            }
            let options = {};
            if (sort) {
                options = {
                    sort: { deadline: sort === 'asc' ? 1 : -1 }
                }
            }
            const skip = (page - 1) * size
            const result = await jobsCollection.find(query, options).skip(skip).limit(size).toArray();
            res.send(result)
        })
        // get all jobs count
        app.get('/jobs-count', async (req, res) => {
            const filter = req.query?.filter;
            const search = req.query?.search;
            let query = {
                jobTitle: { $regex: search, $options: 'i' }
            }
            if (filter) {
                query.category = filter
            }
            const result = await jobsCollection.countDocuments(query);
            res.send({ count: result });
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Assignment eleven server is running..!')
})

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`)
})