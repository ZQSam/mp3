// routes/users.js
const User = require('../models/user');
const Task = require('../models/task');
const { parseQuery, ok, sendError } = require('./utils');

module.exports = function (router) {
  // GET /api/users
  router.get('/', async (req, res) => {
    try {
      const q = parseQuery(req.query);
      if (q.count) {
        const count = await User.countDocuments(q.where);
        return ok(res, { count });
      }
      let query = User.find(q.where);
      if (q.select) query = query.select(q.select);
      if (q.sort) query = query.sort(q.sort);
      if (q.skip) query = query.skip(q.skip);
      if (q.limit != null) query = query.limit(q.limit);
      const users = await query.exec();
      ok(res, users);
    } catch (e) {
      if (e.status === 400) return sendError(res, 400, 'Bad Request', e.message);
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // GET /api/users/:id (supports select)
  router.get('/:id', async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return sendError(res, 400, 'Bad Request', 'Invalid ID format');
      }
      const q = parseQuery(req.query);
      const user = await User.findById(req.params.id).select(q.select || null);
      if (!user) return sendError(res, 404, 'Not Found');
      ok(res, user);
    } catch (e) {
      if (e.status === 400) return sendError(res, 400, 'Bad Request', e.message);
      if (e.name === 'CastError') return sendError(res, 400, 'Bad Request', 'Invalid ID format');
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // POST /api/users
  router.post('/', async (req, res) => {
    try {
      const { name, email, pendingTasks = [] } = req.body;
      if (!name || !email) {
        return sendError(res, 400, 'Validation Error', 'name and email are required');
      }

      const user = await User.create({ name, email, pendingTasks });

      // Two-way: assign any provided tasks to this user
      if (pendingTasks.length) {
        await Task.updateMany(
          { _id: { $in: pendingTasks } },
          { $set: { assignedUser: String(user._id), assignedUserName: user.name } }
        );
      }

      ok(res, user, 'Created', 201);
    } catch (e) {
      if (e.code === 11000) return sendError(res, 400, 'Duplicate Key', e.keyValue);
      if (e.name === 'ValidationError') return sendError(res, 400, 'Validation Error', e.message);
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // PUT /api/users/:id (replace)
  router.put('/:id', async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return sendError(res, 400, 'Bad Request', 'Invalid ID format');
      }
      const existing = await User.findById(req.params.id);
      if (!existing) return sendError(res, 404, 'Not Found');

      const { name, email, pendingTasks = [] } = req.body;
      if (!name || !email) {
        return sendError(res, 400, 'Validation Error', 'name and email are required');
      }

      // Capture previous for reconciliation
      const prevPending = existing.pendingTasks.map(String);

      // Update user
      existing.name = name;
      existing.email = email;
      existing.pendingTasks = pendingTasks;
      await existing.save();

      // Two-way sync:
      // 1) Unassign tasks removed from user's pendingTasks
      const removedIds = prevPending.filter(id => !pendingTasks.map(String).includes(id));
      if (removedIds.length) {
        await Task.updateMany(
          { _id: { $in: removedIds }, assignedUser: String(existing._id) },
          { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
        );
      }

      // 2) Assign all tasks currently in pendingTasks to this user (name may have changed)
      if (pendingTasks.length) {
        await Task.updateMany(
          { _id: { $in: pendingTasks } },
          { $set: { assignedUser: String(existing._id), assignedUserName: existing.name } }
        );
      }

      ok(res, existing);
    } catch (e) {
      if (e.code === 11000) return sendError(res, 400, 'Duplicate Key', e.keyValue);
      if (e.name === 'ValidationError') return sendError(res, 400, 'Validation Error', e.message);
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  // DELETE /api/users/:id
  router.delete('/:id', async (req, res) => {
    try {
      if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
        return sendError(res, 400, 'Bad Request', 'Invalid ID format');
      }
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return sendError(res, 404, 'Not Found');

      // Unassign their tasks
      if (user.pendingTasks?.length) {
        await Task.updateMany(
          { _id: { $in: user.pendingTasks } },
          { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
        );
      }

      ok(res, { _id: user._id }, 'Deleted');
    } catch (e) {
      sendError(res, 500, 'Server Error', e.message);
    }
  });

  return router;
};
