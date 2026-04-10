import { Task, TaskStatus } from '@prisma/client';
import { CreateTaskDto } from '../../modules/tasks/dto/request/create-task.dto';

export const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 1,
  title: 'Default Task Title',
  description: 'Default Description',
  status: TaskStatus.TODO,
  projectId: 1,
  assigneeId: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCreateTaskDto = (overrides: Partial<CreateTaskDto> = {}): CreateTaskDto => ({
  title: 'Default Task Title',
  description: 'Default Description',
  assigneeId: 1,
  status: TaskStatus.TODO,
  ...overrides,
});