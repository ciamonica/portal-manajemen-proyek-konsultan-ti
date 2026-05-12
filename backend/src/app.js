const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
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
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

app.get('/', (req, res) => res.json({ success: true, message: 'Backend running. Frontend available at http://localhost:5173' }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is up' }));
app.get('/api/docs', (req, res) => {
  const openApiPath = process.env.OPENAPI_PATH || path.resolve(__dirname, '../../docs/openapi.yaml');
  res.type('text/yaml').sendFile(path.resolve(openApiPath));
});
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
