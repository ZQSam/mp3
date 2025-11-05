// routes/tasks.js
const Task = require('../models/task');
const User = require('../models/user');
const { parseQuery, ok, sendError } = require('./utils');

// keep User.pendingTasks <-> Task.assignedUser/assignedUserName consistent
async function syncAssignment(task, prevAssignedUserId) {
  // If assigned now, ensure it exists in that user's pendingTasks and name matches
  if (task.assignedUser) {
    const user = await User.findById(task.assignedUser);
    if (user) {
      // ensure presence in pendingTasks
      if (!user.pendingTasks.some(id => String(id) === String(task._id))) {
        user.pendingTasks.push(task._id);
        await user.save();
      }
      // ensure display name matches
      if (task.assignedUserName !== user.name) {
        task.assignedUserName = user.name;
        await task.save();
      }
    } else {
      // invalid assignedUser → reset assignment
      task.assignedUser = '';
      task.assignedUserName = 'unassigned';
      await task.save();
    }
  }

  // If assignment changed, remove from previous user's pendingTasks
  if (prevAssignedUserId && String(prevAssignedUserId) !== String(task.assignedUser)) {
    await User.updateOne({ _id: prevAssignedUserId }, { $pull: { pendingTasks: task._id } });
  }

  // If unassigned, make sure no user lists it
  if (!task.assignedUser) {
    await User.updateMany({ pendingTasks: task._id }, { $pull: { pendingTasks: task._id } });
  }
}

module.exports = function (router) {
  // GET /api/tasks
  router.get('/', async (req, res) => {
    try {
      const q = parseQuery(req.query);
      if (q.count) {
        const count = await Task.countDocuments(q.where);
        return ok(res, { count });
      }
      let query = Task.find(q.where);
      if (q.select) query = query.select(q.select);
      if (q.sort) query = query.sort(q.sort);
      if (q.skip) query = query.skip(q.skip);
      if (q.limit != null) query = query.limit(q.limit);
      const tasks = await query.exec();
      ok(res, tasks);
    } catch (e) {
      if (e.status === 400) return sendError(res, 400, 'Bad Request', e.message);
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // GET /api/tasks/:id
  router.get('/:id', async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return sendError(res, 400, 'Bad Request', 'Invalid task ID format');
      }
      const q = parseQuery(req.query);
      const task = await Task.findById(req.params.id).select(q.select || null);
      if (!task) return sendError(res, 404, 'Not Found');
      ok(res, task);
    } catch (e) {
      if (e.status === 400) return sendError(res, 400, 'Bad Request', e.message);
      if (e.name === 'CastError') return sendError(res, 400, 'Bad Request', 'Invalid task ID format');
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // POST /api/tasks
  router.post('/', async (req, res) => {
    try {
      const {
        name,
        description = '',
        deadline,
        completed = false,
        assignedUser = '',
        assignedUserName = 'unassigned',
      } = req.body;

      if (!name || !deadline) {
        return sendError(res, 400, 'Validation Error', 'name and deadline are required');
      }

      const task = await Task.create({
        name, description, deadline, completed, assignedUser, assignedUserName,
      });

      await syncAssignment(task, null);
      ok(res, task, 'Created', 201);
    } catch (e) {
      if (e.name === 'ValidationError') return sendError(res, 400, 'Validation Error', e.message);
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // PUT /api/tasks/:id
  router.put('/:id', async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return sendError(res, 400, 'Bad Request', 'Invalid task ID format');
      }
      const existing = await Task.findById(req.params.id);
      if (!existing) return sendError(res, 404, 'Not Found');

      const {
        name,
        description = '',
        deadline,
        completed = false,
        assignedUser = '',
        assignedUserName = 'unassigned',
      } = req.body;

      if (!name || !deadline) {
        return sendError(res, 400, 'Validation Error', 'name and deadline are required');
      }

      const prevAssigned = existing.assignedUser;

      existing.name = name;
      existing.description = description;
      existing.deadline = deadline;
      existing.completed = Boolean(completed);
      existing.assignedUser = assignedUser || '';
      existing.assignedUserName = assignedUser ? assignedUserName : 'unassigned';
      await existing.save();

      await syncAssignment(existing, prevAssigned);
      ok(res, existing);
    } catch (e) {
      if (e.name === 'ValidationError') return sendError(res, 400, 'Validation Error', e.message);
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // DELETE /api/tasks/:id
  router.delete('/:id', async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return sendError(res, 400, 'Bad Request', 'Invalid task ID format');
      }
      const task = await Task.findByIdAndDelete(req.params.id);
      if (!task) return sendError(res, 404, 'Not Found');

      // Remove from any user's pendingTasks
      await User.updateMany({ pendingTasks: task._id }, { $pull: { pendingTasks: task._id } });
      ok(res, { _id: task._id }, 'Deleted');
    } catch (e) {
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  return router;
};
