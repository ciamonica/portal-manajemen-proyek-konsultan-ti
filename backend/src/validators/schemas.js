const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

const userCreateSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  email: z.string().email(),
  role: z.enum(['pm', 'dev', 'client'])
});

const projectCreateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold']).optional(),
  client_id: z.number().int().optional(),
  pm_id: z.number().int().optional()
});

const taskCreateSchema = z.object({
  project_id: z.number().int(),
  name: z.string().min(3),
  description: z.string().optional(),
  assigned_to: z.number().int().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  progress: z.number().min(0).max(100).optional(),
  due_date: z.string().optional()
});

const milestoneCreateSchema = z.object({
  project_id: z.number().int(),
  name: z.string().min(3),
  description: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['pending', 'achieved']).optional()
});

const teamCreateSchema = z.object({
  name: z.string().min(3),
  member_ids: z.array(z.number().int()).optional()
});

function parseSchema(schema, body) {
  try {
    return { data: schema.parse(body) };
  } catch (error) {
    return { error };
  }
}

module.exports = { loginSchema, userCreateSchema, projectCreateSchema, taskCreateSchema, parseSchema };
