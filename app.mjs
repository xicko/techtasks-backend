import express from 'express';
// import path from 'path';
// import fs, { stat } from 'fs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
import User from './userModel.js';
import Task from './taskModel.js';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = 313;

// increase payload limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// register account
app.post('/register', async (req, res, next) => {
  let {name, password, pfp} = req.body;

  const generatedSalt = await bcrypt.genSalt(10);

  let hashedPass;
  if (generatedSalt) {
    hashedPass = await bcrypt.hash(password, generatedSalt);
    console.log('hashedPass', hashedPass);
  } else {
    console.log('salt not generated');
  };

  const newUser = User({
    name,
    password: hashedPass,
    pfp,
  });

  let existingUser;
  try {
    existingUser = await User.findOne({ name: name });
  } catch {
    const error = new Error( "Error! Something went wrong." );
    return next(error);
  }

  if (existingUser === null) {
    try {
      await newUser.save();
      console.log('newUser saved:', newUser.toString());
    } catch {
      const error = new Error("Error! Something went wrong.");
      return next(error);
    };

    let tokenn;
    try {
      tokenn = jwt.sign({
        userId: newUser.id,
        name: newUser.name,
      }, 'secretkey', { expiresIn: '2h' })
    } catch {
      const error = new Error("Error! Something went wrong.");
      return next(error);
    };

    res.status(201).json({
      success: true,
      error: false,
      message: 'register.success.user_created',
      data: {
        userId: newUser.id,
        name: newUser.name,
        pfp: newUser.pfp,
        token: tokenn,
      },
    });
  } else {
    res.status(201).json({
      success: false,
      error: true,
      message: 'register.error.user_exists',
    });
  }
});

// LOGIN
app.post('/login', async (req, res, next) => {
  let {name, password} = req.body;

  try {
    const existingUser = await User.findOne({ name: name });

    const doPasswordsMatch = await bcrypt.compare(password, existingUser.password);

    if (!existingUser) {
      // if user dont exist
      console.log('login.error.user_not_found');
      res.status(201).json({
        success: false,
        error: true,
        message: 'login.error.user_not_found',
      });
    } else if (existingUser && !doPasswordsMatch) {
      // if password wrong
      console.log('login.error.wrong_password');
      res.status(201).json({
        success: false,
        error: true,
        message: 'login.error.wrong_password',
      });
    } else { // login normally
      // generate jwt
      let generatedToken;
      try {
        generatedToken = jwt.sign({
          userId: existingUser.id,
          name: existingUser.name,
        }, 'secretkey', { expiresIn: '2h' });

        res.status(201).json({
          success: true,
          error: false,
          message: 'Logging in',
          data: {
            userId: existingUser.id,
            name: existingUser.name,
            token: generatedToken,
            pfp: existingUser.pfp,
          },
        });
      } catch (error) {
        console.log('login.error.couldnt_generate_token', error);

        res.status(201).json({
          success: false,
          error: true,
          message: 'login.error.couldnt_generate_token',
        });

        return next(error);
      };
    }
  } catch (error) {
    res.status(201).json({
      success: false,
      error: true,
      message: 'login.error.unsuccessful',
    });
    console.log('/login error:', error);
  };
});

app.get('/tasks', async (req, res, next) => {
  try {
    const {userId} = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in query params' });
    }

    const tasks = await Task.find({ authorId: userId }).sort({ createdAt: -1 });

    return res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

app.post('/tasks', async (req, res, next) => {
  let {id, authorId, status, title, content, createdAt, updatedAt, duration} = req.body;

  const newTask = Task({
    id,
    authorId,
    status,
    title,
    content,
    createdAt,
    updatedAt,
    duration,
  });

  let existingTask = null;
  try {
    existingTask = await Task.findOne({ id: id });
  } catch {
    const error = new Error( "Error! Something went wrong." );
    return next(error);
  }

  if (!existingTask) {
    await newTask.save();
    console.log('newTask:', newTask.toString());

    res.status(200).json({
      success: true,
      message: 'task.success.created',
      task: newTask,
    });
    console.log({
      success: true,
      message: 'task.success.created',
      task: newTask,
    });
    
  } else {
    console.log('task already exists');
  };
});

app.put('/tasks', async (req, res) => {
  const {
    id,
    authorId,
    status,
    title,
    content,
    createdAt,
    updatedAt,
    duration,
  } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: true,
      message: 'task.error.id_not_given',
    });
  }

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      { _id: id },
      {
        ...(authorId !== undefined && { authorId }),
        ...(status !== undefined && { status }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(createdAt !== undefined && { createdAt }),
        ...(updatedAt !== undefined && { updatedAt }),
        ...(duration !== undefined && { duration }),
      },
      {
        new: true,
        runValidators: false,
        // context: 'query'
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        error: true,
        message: 'task.error.not_found',
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      message: 'task.success.updated',
      task: updatedTask,
    });

  } catch (error) {
    console.error('Modify task error:', error);
    return res.status(500).json({
      success: false,
      error: true,
      message: 'task.error.server_error',
    });
  }
});

app.delete('/tasks', async (req, res, next) => {
  const {id} = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing task \'id\' in query params' });
  };

  let a = null;
  if (id) {
    a = await Task.findOne({ _id: id });
  } else {
    console.log(a);
    
  }

  if (a !== null) {
    const tasks = await Task.findByIdAndDelete({ _id: id });

    return res.status(200).json({
      success: true,
      deleted: true,
      task: tasks,
    });
  } else {
    return res.status(404).json({ error: 'Task not found' });
  }
});

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: 'techtasks',
  }).then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log("Server is listening on port", PORT);
    });
  })
  .catch((err) => {
    console.log("Error Occurred", err);
  });

  export default serverless(app);