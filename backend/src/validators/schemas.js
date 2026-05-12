const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

const passwordPolicySchema = z.string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[a-z]/, 'Password harus memiliki huruf kecil')
  .regex(/[A-Z]/, 'Password harus memiliki huruf besar')
  .regex(/[0-9]/, 'Password harus memiliki angka');

const userCreateSchema = z.object({
  username: z.string().min(3),
  password: passwordPolicySchema,
  email: z.string().email(),
  role: z.enum(['pm', 'dev', 'client'])
});

const projectCreateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'on_track', 'at_risk', 'delayed']).optional(),
  client_id: z.number().int().optional(),
  pm_id: z.number().int().optional(),
  cover_image_url: z.string().url().optional().or(z.literal(''))
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

const projectLinkSchema = z.object({
  project_id: z.number().int().optional().nullable(),
  title: z.string().min(2),
  url: z.string().url(),
  type: z.enum(['api_docs', 'brd', 'repository', 'staging', 'other']).default('other'),
  sort_order: z.number().int().min(0).optional()
});

const riskSchema = z.object({
  project_id: z.number().int(),
  title: z.string().min(3),
  description: z.string().optional(),
  probability: z.enum(['low', 'medium', 'high']).default('medium'),
  impact: z.enum(['low', 'medium', 'high']).default('medium'),
  mitigation: z.string().optional(),
  status: z.enum(['open', 'mitigating', 'resolved']).default('open'),
  owner_id: z.number().int().optional().nullable(),
  due_date: z.string().optional().nullable()
});

const timeLogSchema = z.object({
  user_id: z.number().int().optional(),
  task_id: z.number().int(),
  hours: z.number().positive().max(24),
  log_date: z.string().optional()
});

const taskDependencySchema = z.object({
  task_id: z.number().int(),
  depends_on_task_id: z.number().int()
}).refine((value) => value.task_id !== value.depends_on_task_id, {
  message: 'Task cannot depend on itself'
});

const projectFileSchema = z.object({
  project_id: z.number().int(),
  title: z.string().min(2),
  file_url: z.string().url(),
  file_type: z.string().min(2).max(50).optional()
});

const taskCommentSchema = z.object({
  task_id: z.number().int(),
  comment: z.string().min(2)
});

function parseSchema(schema, body) {
  try {
    return { data: schema.parse(body) };
  } catch (error) {
    return { error };
  }
}

module.exports = {
  loginSchema,
  userCreateSchema,
  projectCreateSchema,
  taskCreateSchema,
  milestoneCreateSchema,
  teamCreateSchema,
  projectLinkSchema,
  riskSchema,
  timeLogSchema,
  taskDependencySchema,
  projectFileSchema,
  taskCommentSchema,
  parseSchema
};
