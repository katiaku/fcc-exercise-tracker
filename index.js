require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: String
});

const ExerciseSchema = new Schema({
  user_id: String,
  description: String,
  duration: Number,
  date: Date,
});

const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const userObj = new User({
      username: username
    });
    const user = await userObj.save();
    res.json({
      username: user.username,
      _id: user._id
    })
  } catch(err) {
    res.send({msg: 'Error'})
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    const userArray = users.map(user => ({
      username: user.username,
      _id: user._id
    }));
    res.json(userArray);
  } catch(err) {
    res.send({ msg: 'Error' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userId = req.params._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ msg: 'User not found' });
    }

    const exercise = new Exercise({
      user_id: userId,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: new Date(savedExercise.date).toDateString(),
    });
  } catch (err) {
    res.send({ msg: 'Error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const query = { user_id: userId };

    if (from) {
      query.date = { $gte: new Date(from) };
    }
    if (to) {
      query.date = { ...query.date, $lte: new Date(to) };
    }

    let exerciseQuery = Exercise.find(query);

    if (limit) {
      exerciseQuery = exerciseQuery.limit(parseInt(limit, 10));
    }

    const exercises = await exerciseQuery.exec();
    const exerciseLog = exercises.map(({ description, duration, date }) => ({
      description: description.toString(),
      duration: Number(duration),
      date: new Date(date).toDateString(),
    }));

    const userWithLog = {
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exerciseLog,
    };

    res.json(userWithLog);
  } catch (err) {
    res.json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, function() {
  console.log("Your app is listening on port " + listener.address().port);
});
