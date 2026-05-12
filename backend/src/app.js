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
const projectLinksRouter = require('./routes/projectLinks');
const risksRouter = require('./routes/risks');
const timeLogsRouter = require('./routes/timeLogs');
const taskDependenciesRouter = require('./routes/taskDependencies');
const projectFilesRouter = require('./routes/projectFiles');
const taskCommentsRouter = require('./routes/taskComments');
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
app.use('/api/project-links', authenticateToken, projectLinksRouter);
app.use('/api/risks', authenticateToken, risksRouter);
app.use('/api/time-logs', authenticateToken, timeLogsRouter);
app.use('/api/task-dependencies', authenticateToken, taskDependenciesRouter);
app.use('/api/project-files', authenticateToken, projectFilesRouter);
app.use('/api/task-comments', authenticateToken, taskCommentsRouter);

app.use(errorHandler);

module.exports = app;
