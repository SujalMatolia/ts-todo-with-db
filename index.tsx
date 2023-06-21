"use strict";
const express = require('express');
const app = express();
const server = require('http').Server(app);
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
// Configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));
// Connect to MongoDB
mongoose
    .connect('mongodb+srv://matoliasujal:asdfghjkl@cluster0.f0axrz0.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'test', // Replace with your database name
})
    .then(() => {
    console.log('Connected to MongoDB');
})
    .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the application if there's an error connecting to MongoDB
});
// Create a schema for the user collection
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});
// Create a User model based on the schema
const User = mongoose.model('User', userSchema);
// Middleware to parse JSON data in request bodies
app.use(express.json());
app.post('/saveUser', (req, res) => {
    const { name, email, password } = req.body;
    // Create a new user instance
    const user = new User({
        name,
        email,
        password,
    });
    // Save the user to the database
    user.save()
        .then(() => {
        // Create a new collection in MongoDB based on the user's name
        const collectionName = name.toLowerCase().replace(' ', '-');
        mongoose.connection.createCollection(collectionName)
            .then(() => {
            res.json({ success: true });
        })
            .catch((error) => {
            console.error('Error creating collection', error);
            res.json({ success: false });
        });
    })
        .catch((error) => {
        console.error('Error saving user', error);
        res.json({ success: false });
    });
});
// Endpoint for login validation
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    User.findOne({ name: username, password: password })
        .then((user) => {
        if (user) {
            // User found, return success response
            req.session.userId = user._id; // Store the user's ID in the session
            res.json({ success: true });
        }
        else {
            // User not found or invalid credentials, return failure response
            res.json({ success: false });
        }
    })
        .catch((error) => {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to perform login. Please try again.' });
    });
});
// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    }
    else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}
app.use(express.json());
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});
// Create a task endpoint
// Endpoint for saving a task
app.post('/tasks', isAuthenticated, (req, res) => {
    const { title, description, dueDate, priority, reminderDate, attachments, category } = req.body;
    // Retrieve the user's ID from the session
    const userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then((user) => {
        if (user) {
            // Get the user's name
            const userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            const collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            const collection = mongoose.connection.collection(collectionName);
            // Create a new task object
            const newTask = {
                id: uuidv4(),
                title,
                description,
                dueDate,
                priority,
                reminderDate,
                attachments,
                category,
                completed: false,
            };
            // Insert the new task into the collection
            collection.insertOne(newTask)
                .then(() => {
                res.json(newTask);
            })
                .catch((error) => {
                console.error('Error inserting task', error);
                res.status(500).json({ error: 'Failed to create task. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch((error) => {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to create task. Please try again.' });
    });
});
// Get all tasks endpoint
// Edit a task endpoint
// Edit a task endpoint
app.get('/tasks/:id', isAuthenticated, (req, res) => {
    const taskId = req.params.id;
    // Retrieve the user's ID from the session
    const userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then((user) => {
        if (user) {
            // Get the user's name
            const userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            const collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            const collection = mongoose.connection.collection(collectionName);
            // Find the task by ID in the collection
            collection.findOne({ id: taskId })
                .then((task) => {
                if (task) {
                    res.json(task);
                }
                else {
                    res.status(404).json({ error: 'Task not found' });
                }
            })
                .catch((error) => {
                console.error('Error retrieving task', error);
                res.status(500).json({ error: 'Failed to retrieve task. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch((error) => {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to retrieve task. Please try again.' });
    });
});
// Get completed tasks endpoint
app.get('/tasks/completed', isAuthenticated, (req, res) => {
    // Retrieve the user's ID from the session
    const userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then((user) => {
        if (user) {
            // Get the user's name
            const userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            const collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            const collection = mongoose.connection.collection(collectionName);
            // Find completed tasks in the collection
            collection.find({ completed: true }).toArray()
                .then((completedTasks) => {
                res.json(completedTasks);
            })
                .catch((error) => {
                console.error('Error retrieving completed tasks', error);
                res.status(500).json({ error: 'Failed to retrieve completed tasks. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch((error) => {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to retrieve completed tasks. Please try again.' });
    });
});
// Edit a task endpoint
app.put('/tasks/:id', isAuthenticated, (req, res) => {
    const taskId = req.params.id;
    const { title, description, dueDate, priority, reminderDate, attachments, category, completed } = req.body;
    // Retrieve the user's ID from the session
    const userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then((user) => {
        if (user) {
            // Get the user's name
            const userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            const collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            const collection = mongoose.connection.collection(collectionName);
            // Find the task by ID in the collection
            collection.findOne({ id: taskId })
                .then((task) => {
                if (task) {
                    // Update the task properties
                    task.title = title;
                    task.description = description;
                    task.dueDate = dueDate;
                    task.priority = priority;
                    task.reminderDate = reminderDate;
                    task.attachments = attachments;
                    task.category = category;
                    task.completed = completed;
                    // Update the task in the collection
                    collection.updateOne({ id: taskId }, { $set: task })
                        .then(() => {
                        res.json(task);
                    })
                        .catch((error) => {
                        console.error('Error updating task', error);
                        res.status(500).json({ error: 'Failed to update task. Please try again.' });
                    });
                }
                else {
                    res.status(404).json({ error: 'Task not found' });
                }
            })
                .catch((error) => {
                console.error('Error retrieving task', error);
                res.status(500).json({ error: 'Failed to update task. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch((error) => {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to update task. Please try again.' });
    });
});
// Mark a task as completed endpoint
app.patch('/tasks/:id/complete', isAuthenticated, (req, res) => {
    const taskId = req.params.id;
    // Retrieve the user's ID from the session
    const userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then((user) => {
        if (user) {
            // Get the user's name
            const userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            const collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            const collection = mongoose.connection.collection(collectionName);
            // Find the task in the collection based on the task ID
            collection.findOneAndUpdate({ id: taskId }, { $set: { completed: true } })
                .then(() => {
                res.json({ message: 'Task marked as completed' });
            })
                .catch((error) => {
                console.error('Error marking task as completed', error);
                res.status(500).json({ error: 'Failed to mark task as completed. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch((error) => {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to mark task as completed. Please try again.' });
    });
});
// Search tasks endpoint
app.get('/tasks/search', isAuthenticated, (req, res) => {
    const { query } = req.query;
    // Retrieve the user's ID from the session
    const userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then((user) => {
        if (user) {
            // Get the user's name
            const userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            const collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            const collection = mongoose.connection.collection(collectionName);
            // Find tasks in the collection that match the query
            collection.find({ $text: { $search: query } }).toArray()
                .then((tasks) => {
                res.json(tasks);
            })
                .catch((error) => {
                console.error('Error searching tasks', error);
                res.status(500).json({ error: 'Failed to search tasks. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch((error) => {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to search tasks. Please try again.' });
    });
});
// Start the server
server.listen(3000, () => {
    console.log('Server running on port 3000');
});
