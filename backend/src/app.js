const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const milestonesRouter = require('./routes/milestones');
const teamsRouter = require('./routes/teams');
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ success: true, message: 'Backend running. Frontend available at http://localhost:5173' }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is up' }));
app.use('/api/auth', authRouter);
app.use('/api/users', authenticateToken, usersRouter);
app.use('/api/projects', authenticateToken, projectsRouter);
app.use('/api/tasks', authenticateToken, tasksRouter);
app.use('/api/milestones', authenticateToken, milestonesRouter);
app.use('/api/teams', authenticateToken, teamsRouter);

app.use(errorHandler);

module.exports = app;
