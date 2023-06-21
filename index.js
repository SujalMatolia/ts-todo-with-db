"use strict";
var express = require('express');
var app = express();
var server = require('http').Server(app);
var uuidv4 = require('uuid').v4;
var session = require('express-session');
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
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
    .then(function () {
    console.log('Connected to MongoDB');
})
    .catch(function (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the application if there's an error connecting to MongoDB
});
// Create a schema for the user collection
var userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});
// Create a User model based on the schema
var User = mongoose.model('User', userSchema);
// Middleware to parse JSON data in request bodies
app.use(express.json());
app.post('/saveUser', function (req, res) {
    var _a = req.body, name = _a.name, email = _a.email, password = _a.password;
    // Create a new user instance
    var user = new User({
        name: name,
        email: email,
        password: password,
    });
    // Save the user to the database
    user.save()
        .then(function () {
        // Create a new collection in MongoDB based on the user's name
        var collectionName = name.toLowerCase().replace(' ', '-');
        mongoose.connection.createCollection(collectionName)
            .then(function () {
            res.json({ success: true });
        })
            .catch(function (error) {
            console.error('Error creating collection', error);
            res.json({ success: false });
        });
    })
        .catch(function (error) {
        console.error('Error saving user', error);
        res.json({ success: false });
    });
});
// Endpoint for login validation
app.post('/api/login', function (req, res) {
    var _a = req.body, username = _a.username, password = _a.password;
    User.findOne({ name: username, password: password })
        .then(function (user) {
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
        .catch(function (error) {
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
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/create', function (req, res) {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});
// Create a task endpoint
// Endpoint for saving a task
app.post('/tasks', isAuthenticated, function (req, res) {
    var _a = req.body, title = _a.title, description = _a.description, dueDate = _a.dueDate, priority = _a.priority, reminderDate = _a.reminderDate, attachments = _a.attachments, category = _a.category;
    // Retrieve the user's ID from the session
    var userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then(function (user) {
        if (user) {
            // Get the user's name
            var userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            var collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            var collection = mongoose.connection.collection(collectionName);
            // Create a new task object
            var newTask_1 = {
                id: uuidv4(),
                title: title,
                description: description,
                dueDate: dueDate,
                priority: priority,
                reminderDate: reminderDate,
                attachments: attachments,
                category: category,
                completed: false,
            };
            // Insert the new task into the collection
            collection.insertOne(newTask_1)
                .then(function () {
                res.json(newTask_1);
            })
                .catch(function (error) {
                console.error('Error inserting task', error);
                res.status(500).json({ error: 'Failed to create task. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch(function (error) {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to create task. Please try again.' });
    });
});
// Get all tasks endpoint
// Edit a task endpoint
// Edit a task endpoint
app.get('/tasks/:id', isAuthenticated, function (req, res) {
    var taskId = req.params.id;
    // Retrieve the user's ID from the session
    var userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then(function (user) {
        if (user) {
            // Get the user's name
            var userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            var collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            var collection = mongoose.connection.collection(collectionName);
            // Find the task by ID in the collection
            collection.findOne({ id: taskId })
                .then(function (task) {
                if (task) {
                    res.json(task);
                }
                else {
                    res.status(404).json({ error: 'Task not found' });
                }
            })
                .catch(function (error) {
                console.error('Error retrieving task', error);
                res.status(500).json({ error: 'Failed to retrieve task. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch(function (error) {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to retrieve task. Please try again.' });
    });
});
// Get completed tasks endpoint
app.get('/tasks/completed', isAuthenticated, function (req, res) {
    // Retrieve the user's ID from the session
    var userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then(function (user) {
        if (user) {
            // Get the user's name
            var userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            var collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            var collection = mongoose.connection.collection(collectionName);
            // Find completed tasks in the collection
            collection.find({ completed: true }).toArray()
                .then(function (completedTasks) {
                res.json(completedTasks);
            })
                .catch(function (error) {
                console.error('Error retrieving completed tasks', error);
                res.status(500).json({ error: 'Failed to retrieve completed tasks. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch(function (error) {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to retrieve completed tasks. Please try again.' });
    });
});
// Edit a task endpoint
app.put('/tasks/:id', isAuthenticated, function (req, res) {
    var taskId = req.params.id;
    var _a = req.body, title = _a.title, description = _a.description, dueDate = _a.dueDate, priority = _a.priority, reminderDate = _a.reminderDate, attachments = _a.attachments, category = _a.category, completed = _a.completed;
    // Retrieve the user's ID from the session
    var userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then(function (user) {
        if (user) {
            // Get the user's name
            var userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            var collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            var collection_1 = mongoose.connection.collection(collectionName);
            // Find the task by ID in the collection
            collection_1.findOne({ id: taskId })
                .then(function (task) {
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
                    collection_1.updateOne({ id: taskId }, { $set: task })
                        .then(function () {
                        res.json(task);
                    })
                        .catch(function (error) {
                        console.error('Error updating task', error);
                        res.status(500).json({ error: 'Failed to update task. Please try again.' });
                    });
                }
                else {
                    res.status(404).json({ error: 'Task not found' });
                }
            })
                .catch(function (error) {
                console.error('Error retrieving task', error);
                res.status(500).json({ error: 'Failed to update task. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch(function (error) {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to update task. Please try again.' });
    });
});
// Mark a task as completed endpoint
app.patch('/tasks/:id/complete', isAuthenticated, function (req, res) {
    var taskId = req.params.id;
    // Retrieve the user's ID from the session
    var userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then(function (user) {
        if (user) {
            // Get the user's name
            var userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            var collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            var collection = mongoose.connection.collection(collectionName);
            // Find the task in the collection based on the task ID
            collection.findOneAndUpdate({ id: taskId }, { $set: { completed: true } })
                .then(function () {
                res.json({ message: 'Task marked as completed' });
            })
                .catch(function (error) {
                console.error('Error marking task as completed', error);
                res.status(500).json({ error: 'Failed to mark task as completed. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch(function (error) {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to mark task as completed. Please try again.' });
    });
});
// Search tasks endpoint
app.get('/tasks/search', isAuthenticated, function (req, res) {
    var query = req.query.query;
    // Retrieve the user's ID from the session
    var userId = req.session.userId;
    // Find the user in the database based on their ID
    User.findById(userId)
        .then(function (user) {
        if (user) {
            // Get the user's name
            var userName = user.name;
            // Create a new collection in MongoDB based on the user's name
            var collectionName = userName.toLowerCase().replace(' ', '-');
            // Retrieve the collection
            var collection = mongoose.connection.collection(collectionName);
            // Find tasks in the collection that match the query
            collection.find({ $text: { $search: query } }).toArray()
                .then(function (tasks) {
                res.json(tasks);
            })
                .catch(function (error) {
                console.error('Error searching tasks', error);
                res.status(500).json({ error: 'Failed to search tasks. Please try again.' });
            });
        }
        else {
            res.status(404).json({ error: 'User not found' });
        }
    })
        .catch(function (error) {
        console.error('Error finding user', error);
        res.status(500).json({ error: 'Failed to search tasks. Please try again.' });
    });
});
// Start the server
server.listen(3000, function () {
    console.log('Server running on port 3000');
});
